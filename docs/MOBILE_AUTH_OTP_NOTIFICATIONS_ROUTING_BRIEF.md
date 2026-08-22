# Tolatola mobile — auth, OTP, notifications, role routing

**Use this document as a task brief** for whoever implements or audits the Expo client. Paste the whole file into an issue/PR description, or trim sections as needed.

---

## Goals

1. **OTP and email verification UX** matches API contracts (flags, errors, resend, messaging when SMS is off).
2. **Transporters** reliably see **assignment notifications in-app** (polling / Realtime today; push only when explicitly wired).
3. After login/signup, **vendor / transporter / customer** land on the **correct home stack** — no wrong dashboard.

---

## Backend facts (do not assume push without wiring it)

- `NotificationService` only **inserts** into `notifications` (in-app feed). There is **no automatic FCM** from this API path; use **polling** `GET /notifications`, **Supabase Realtime** on `notifications`, or a future push bridge.
- List notifications with **`user_type`** query param when the API supports it (`customer` | `vendor` | `transporter`) so vendor/transporter inboxes are not polluted by customer-only rows. Respect **`data.for_role`** / **`audience_role`** if returned.
- SMS OTP requires server **`SMS_PROVIDER`**; use response flag **`otp_sent`** and fallbacks (email code flow, resend) per [`BACKEND_AUTH_VERIFICATION_SIGNUP.md`](./BACKEND_AUTH_VERIFICATION_SIGNUP.md).

---

## Repo map (this codebase)

| Area | Location |
|------|-----------|
| Buyer / default signed-in home | `app/(tabs)/` (not a group named `(customer)`) |
| Vendor stack | `app/(vendor)/` + `components/VendorOnboardingGate.tsx` |
| Transporter stack | `app/(transporter)/` + `components/TransporterOnboardingGate.tsx` |
| Admin | `app/(admin)/` |
| Post-login path | `src/lib/roleRedirect.ts` — `resolvePostLoginDestination`, `normalizeUserType`, `getUserRoleFromSession` |
| Root gate | `components/RoleLayoutGate.tsx` |
| Profile hydration | `src/contexts/AuthContext.tsx` — `GET /profile` after login / cold start |
| Notifications API | `src/api/notifications.ts` — `user_type` query param already supported |
| Notifications UI + TanStack | `src/contexts/NotificationsContext.tsx` — passes `userType` to list/unread; client-side `filterNotificationsForRole` |
| Signup / verify parsing | `src/lib/signupResponse.ts`, `app/(auth)/otp.tsx`, `app/(auth)/verify-email.tsx` |
| Vendor shop id / products | `src/lib/vendorShop.ts`, `app/(vendor)/dashboard.tsx` |

---

## Implement / verify in the app

### A. OTP

- On **signup** and **login** responses, handle:
  - **`otp_required`**
  - **`otp_sent`** (and align naming with existing parsers: `verification_sms_sent`, `phone_otp_sent`, etc. — **normalize in one place**)
  - **422** errors with **`field` / `fields`** (show per-field or summary messages).
- **OTP verify:** send **`password`** in the verify payload **when the API requires it** to return a **session in one step**; if the API returns tokens without password, keep current flow; if verify returns tokens, **parse `user` + `session`** and persist like login.
- When **`otp_sent: false`** (SMS not configured), show **clear in-app copy** (no silent failure); steer user to **email verification** or **support** per product policy.
- After phone verify, backend may insert an in-app row (e.g. **`phone_verified`**): **invalidate** `GET /notifications` (or rely on Realtime) so the feed updates.

### B. Transporter assignments

- On **cold start** and when the app returns **foreground** (`AppState`), **refresh** `GET /notifications` (invalidate TanStack queries scoped to token — see `queryKeys.api.notifications`) and/or any **assignments** endpoint the product uses.
- **Deep link / tap handler:** read notification **`data`** and navigate, e.g.:
  - `order_id`, `assignmentId`
  - `screen` (map to Expo routes; transporter dashboard is `/(transporter)/dashboard` — adjust if you add `/(transporter)/assignments`)
  - `for_role: "transporter"`
- Treat **`order_assigned`** (manual assign) and **`delivery_assigned`** (payment/auto path) as **both** routing to the **same assignments / jobs UI** (extend `src/lib/notificationsForRole.ts` **`inferNotificationAudience`** / type handling if types are new).

### C. Vendor vs transporter vs customer routing

- After auth, **`GET /profile`** must drive **`user_type`** (`customer` | `vendor` | `transporter` | `admin` where applicable). **Persist** on the session user object (already merged in `hydrateProfileIntoSession`).
- **Vendor:** `GET /vendor/shop` (or `/vendors` fallback) — **404 / no shop** → onboarding; **`kyc_status`** pending/rejected → KYC screens before full vendor area (`resolveVendorGate` in `src/lib/dashboardBootstrap.ts`).
- **Transporter:** `GET /transporters/me` **or** `GET /transporter/me` (try **both** or configure via env if backend only exposes one) — **404** → transporter onboarding.
- **Guards:** `(tabs)` vs `(vendor)` vs `(transporter)` must **not** rely only on “last opened screen”. **`RoleLayoutGate`** (and onboarding gates) should **reconcile** with **`GET /profile`** on each authenticated session; **refresh role** after **`PATCH /users/:id`** if role can change.
- Do **not** infer role solely from deep link or bookmark; **always** reconcile with **`GET /profile`**.

---

## Acceptance criteria

- Transporter with **no email** still receives **in-app** assignment notification after backend fix (client must **poll/refetch** or subscribe — **pull latest API**).
- OTP flows show **correct messaging** when SMS is not configured (`otp_sent: false`).
- **New install:** correct dashboard for each **`user_type`**; vendor **cannot** land on buyer `(tabs)` home and vice versa.

---

## Optional backend follow-up (coordination)

Align OTP verify’s in-app notification **`for_role`** with the **verifying user’s `user_type`** (today enrichment may default to **customer**).

---

## Already partially implemented (audit checklist)

Use this to avoid duplicate work; **verify** behaviour end-to-end against production API.

- [x] `GET /notifications?user_type=…` from `fetchNotifications` / `NotificationsContext`
- [x] Client filter `filterNotificationsForRole` using `data.for_role` / `audience_role` / type heuristics
- [x] `parseSignupPayload` reads several OTP/email-sent flags (extend for **`otp_required`** / **`otp_sent`** explicitly)
- [x] Post-login routing + profile hydration in `AuthContext` / `roleRedirect`
- [x] Vendor shop id normalization (`vendorShop.ts`) and vendor gate (`dashboardBootstrap.ts`)
- [ ] **`otp_required` / `otp_sent`** on **login** response (not only signup)
- [ ] **422 `field`/`fields`** mapping to UI
- [ ] OTP verify body optionally includes **`password`**
- [ ] **AppState** foreground → notification refetch
- [ ] Notification press → **deep link** by `data.order_id` / `data.screen` / assignment types **`order_assigned`** & **`delivery_assigned`**
- [ ] **Transporter me** endpoint fallback (`/transporters/me` vs `/transporter/me`)

---

*Last updated: brief for TolatolaMobile repo; keep in sync with API OpenAPI or backend changelog.*
