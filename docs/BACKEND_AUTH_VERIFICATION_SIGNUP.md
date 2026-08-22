# Backend specification: signup notifications, email verification, and phone OTP

This document describes what **TolatolaAPI** (or the auth service) should implement so the **mobile app** can confirm registration, verify email, and verify phone numbers. The mobile client changes in this repo assume these contracts.

## Goals

1. After **any** successful signup (`POST /api/auth/signup`), the user receives a **clear signal** in-app (flags + optional session) and, when configured, **transactional email** and/or **SMS**.
2. **Email verification** and **phone OTP** can be completed inside the app using dedicated endpoints.
3. Responses use a **consistent JSON shape** so the client can parse `user` + `session` when issuing tokens.

---

## 1. `POST /api/auth/signup`

### Request body (already sent by mobile)

| Field | Notes |
|--------|--------|
| `email`, `password`, `full_name`, `user_type` | Required for signup. |
| `phone` | Optional; recommended for transporters and when SMS OTP is required. |
| `vendor_type` | When `user_type` is `vendor`. |
| `accepted_terms`, `terms_accepted`, … | Several boolean aliases are sent; treat any as “accepted”. |

### Behaviour (required fixes)

1. **Transactional email**  
   After creating the user (or queue job), send a **registration confirmation** and/or **email verification** message to `email`.  
   - Include a short plain-text explanation and, if using link-based verification, a signed URL.  
   - If using **code-based** verification in the app, include the numeric code in the email body (or send a separate “Your code is …” template).

2. **SMS OTP** (when `phone` is present and product policy requires it)  
   Call the SMS provider to send a **one-time code** to the normalized E.164 number (e.g. `+255…`).  
   - Respect rate limits and idempotency for repeated signups.

3. **Response JSON** — include **at least one** of the following patterns so the app can route correctly.

#### A. Signed-in immediately (current behaviour)

Return `200` with the same envelope as login:

```json
{
  "user": { "id": "…", "email": "…", "user_type": "transporter", … },
  "session": {
    "access_token": "…",
    "refresh_token": "…",
    "expires_at": 1234567890
  }
}
```

Optional **flags** (snake_case preferred; client also tolerates similar names):

| Flag | Type | Meaning |
|------|------|--------|
| `requires_email_verification` | boolean | User must verify email before full access (app opens **Verify email**). |
| `requires_phone_verification` | boolean | User must complete SMS OTP (app opens **Verify phone**). |
| `verification_email_sent` | boolean | Confirmation/verification email was queued or sent. |
| `verification_sms_sent` | boolean | SMS OTP was queued or sent. |
| `message` | string | Optional human-readable hint for UI. |

**Routing rule in app:** If `requires_email_verification` is true, **email flow runs before** phone. If both are true, user completes email, then phone.

#### B. Registered but not signed in (verification-first)

Return `200` or `201` **without** `session.access_token`, but with flags:

```json
{
  "user": { "id": "…", "email": "…", "user_type": "transporter" },
  "requires_email_verification": true,
  "verification_email_sent": true,
  "requires_phone_verification": true,
  "verification_sms_sent": true,
  "phone": "+2557XXXXXXXX",
  "message": "Check your email and SMS for verification codes."
}
```

The app shows **Check your email** / routes to **OTP** when appropriate.

#### C. Wrapper

If the API wraps payloads in `data`, the client merges `data` with the top-level object, so this is also accepted:

```json
{ "data": { "user": {…}, "session": {…}, "requires_email_verification": true } }
```

---

## 2. `POST /api/auth/email/resend`

Resends the email verification message (link and/or code).

**Request (JSON)**

```json
{ "email": "user@example.com" }
```

**Auth:** Optional `Authorization: Bearer <token>` if the user already has a partial session; otherwise allow **unauthenticated** resend for the given `email` with **rate limiting** (per email + IP).

**Response:** `204` or `200` with `{ "message": "sent" }`. Errors: `422` validation, `429` rate limit.

---

## 3. `POST /api/auth/email/verify`

Confirms email ownership using a **code** typed in the app (align with the code sent by email).

**Request (JSON)**

```json
{ "email": "user@example.com", "code": "123456" }
```

**Auth:** Same as resend — optional Bearer if you require it for logged-in users; support unverified users who have **no** token yet.

**Response — preferred (issues session)**

```json
{
  "user": { "id": "…", "email": "…", "user_type": "transporter", … },
  "session": {
    "access_token": "…",
    "refresh_token": "…",
    "expires_at": 1234567890
  }
}
```

**Response — minimal**

- `204` / `200` without body: client will send the user to **login** if no session was created (discouraged; prefer returning tokens when policy allows).

Invalid code: `422` with `{ "message": "…" }`.

---

## 4. `POST /api/auth/otp/request`

**Request**

```json
{ "phone": "+2557XXXXXXXX" }
```

**Auth:** Optional Bearer (logged-in verification) or **none** for signup completion.

Queue SMS with OTP; apply rate limits.

---

## 5. `POST /api/auth/otp/verify`

**Request**

```json
{ "phone": "+2557XXXXXXXX", "code": "123456" }
```

**Auth:** Optional Bearer.

**Response — preferred after signup without prior session**

Return the same **`user` + `session`** object as login so the app can persist the session:

```json
{
  "user": { "id": "…", "email": "…", "user_type": "transporter", … },
  "session": { "access_token": "…", "refresh_token": "…", "expires_at": … }
}
```

If the user was already logged in and you only mark `phone_verified`, `200` with `{ "message": "ok" }` is acceptable (the app will continue to the previous redirect).

---

## 6. Operational checklist (why users see nothing today)

| Check | Action |
|--------|--------|
| Mail not sent | Configure SMTP/API (SendGrid, SES, etc.); ensure signup handler calls the mailer. |
| SMS not sent | Configure provider (Twilio, Africa’s Talking, etc.); ensure `otp/request` sends on signup when required. |
| Emails in spam | SPF, DKIM, DMARC on sending domain; use a dedicated transactional From address. |
| Wrong environment | Staging often disables outbound email/SMS — document behaviour for QA. |

---

## 7. Mobile configuration overrides

Defaults under `/api`:

| Purpose | Default path | Env override |
|---------|----------------|--------------|
| Email verify submit | `/auth/email/verify` | `EXPO_PUBLIC_AUTH_EMAIL_VERIFY_SUBMIT_PATH` |
| Email resend | `/auth/email/resend` | `EXPO_PUBLIC_AUTH_EMAIL_VERIFY_RESEND_PATH` |
| OTP request | `/auth/otp/request` | `EXPO_PUBLIC_AUTH_OTP_REQUEST_PATH` |
| OTP verify | `/auth/otp/verify` | `EXPO_PUBLIC_AUTH_OTP_VERIFY_PATH` |

Paths are relative to `APP_API_URL` + `/api`.

---

## 8. Security notes

- Rate-limit **resend**, **otp/request**, and failed **verify** attempts.
- Do not leak whether an email exists in production (optional generic messages).
- OTP codes: short TTL, single-use, constant-time comparison.
- Email verification tokens/codes: signed or random with server-side storage and expiry.

This spec is the **source of truth** for backend work to match the app behaviour shipped with `parseSignupPayload`, `verify-email`, and updated `otp` handling.
