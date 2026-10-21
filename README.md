# TOLA Mobile

React Native (Expo) mobile app for the **TOLA Digital Trade & Supply Chain Ecosystem**. It targets **Android** and **iOS** and talks to the same TOLA backend and Supabase project as the web client.

## Where this app lives

This directory is a **sibling** to the backend and web client — not inside either repo:

```
TolaTola/
├── TolatolaAPI/        ← Backend (TOLA API)
├── Tolatola-Client/    ← Web frontend
└── TolatolaMobile/     ← This app (mobile for Android & iOS)
```

Do not place TolatolaMobile inside `TolatolaAPI/` or `Tolatola-Client/`.

## Tech stack

- **React Native** with **Expo** (SDK 54+), TypeScript
- **Supabase JS** (`@supabase/supabase-js`) — same project as backend; optional for auth/realtime
- **API client** — `fetch`-based helpers in `src/services/api.ts` that call the TOLA backend with `Authorization: Bearer <access_token>`. Domain services in `src/services/` (checkout, assignments, support) validate those payloads with Zod schemas in `src/schemas/` before UI state changes.
- **Errors** — `src/lib/errorTracking.ts` forwards exceptions and structured logs to Sentry when `EXPO_PUBLIC_SENTRY_DSN` is set.
- **Auth** — `AuthContext` in `src/contexts/AuthContext.tsx` holds session (from `POST /api/auth/login` or signup), persists with AsyncStorage, exposes `login`, `signup`, `logout`, and `accessToken` for API calls
- **Navigation** — Expo Router (file-based), with tabs template

## Environment variables

Set these before building or running (e.g. in your shell, `.env` loaded by your app.config, or EAS secrets):

| Variable | Description |
|----------|-------------|
| `APP_API_URL` | Backend API base URL (no trailing slash). Production: `https://api.tolatola.co`. Local: `http://localhost:8080` or `http://YOUR_IP:8080` |
| `SUPABASE_URL` | Supabase project URL (same as backend) |
| `SUPABASE_ANON_KEY` | Supabase anon key (same as backend) |
| `APP_URL` | (Optional) App URL scheme for deep links, e.g. `tola://` |
| `EXPO_PUBLIC_APP_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_APP_URL` | Same values as above, prefixed for `EXPO_PUBLIC_*` access. `src/config/env.ts` uses these as a fallback when `Constants.expoConfig?.extra` isn't populated (e.g. running under Jest). Keep both sets of vars in sync. |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_URL_SCHEME` | Google Sign-In OAuth client config |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional Sentry DSN. When empty, `captureException` stays on the local logger and Sentry is not initialized. |

Copy `.env.example` to `.env` and fill in values. For Expo, `app.config.js` reads `process.env` and passes them into the app via `expo-constants`; `src/config/env.ts` reads them from there (or from `EXPO_PUBLIC_*` in some setups). `SUPABASE_URL`/`SUPABASE_ANON_KEY` have no hardcoded fallback — the app throws a clear startup error if they're missing, so `.env` must be set up before running.

## How to run

- **Install:** `npm install`
- **Start dev server:** `npx expo start`
- **Android:** `npx expo start --android` or press `a` in the dev server
- **iOS:** `npx expo start --ios` or press `i` in the dev server (macOS with Xcode)
- **Web:** `npx expo start --web` (optional)

For a physical device, ensure `APP_API_URL` points to your machine’s IP (e.g. `http://192.168.1.x:8080`) so the device can reach the backend; use the same `/api` path prefix.

### Docker (web preview only)

`docker compose up` (after `cp .env.example .env` and filling in real values) starts the Expo **web** build in a container at `http://localhost:19006`. This is a convenience wrapper, not the primary dev workflow: it cannot run Android or iOS builds (those need native tooling — Xcode/Android Studio — that doesn't run in a Linux container), and it still talks to the real external backend/Supabase project, not a bundled one. For actual mobile development, use `npx expo start` directly as described above.

## Testing and linting

- **Run tests:** `npm test` (Jest + `jest-expo` + React Native Testing Library)
- **Watch mode:** `npm run test:watch`
- **Type check:** `npm run typecheck`
- **Lint:** `npm run lint`

The test suite requires no `.env` file, no live backend, and no real Supabase project — it runs fully offline:
- `jest.setup.js` provides dummy `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` values so `src/config/env.ts`'s `requireEnv` check never fails under Jest.
- `src/services/__mocks__/api.ts` is a manual mock of `src/services/api.ts` (stubs for `apiGet`/`apiPost`/`apiPatch`/`apiPut`/`apiDelete`). Any test file that calls `jest.mock('@/src/services/api')` (no factory needed) gets these stubs automatically instead of hitting a real backend — see `src/hooks/__tests__/useAgentDashboardData.test.ts` for the pattern.
- `jest.config.js` enforces a coverage floor (`coverageThreshold`) so overall coverage can't silently regress; `npm test -- --coverage` prints the breakdown.

CI (`.github/workflows/ci.yml`) runs `npm audit`, lint, typecheck, and tests (with coverage) on every push/PR to `main`.

### iOS: "This app is not made for this device" / Apple TV

If pressing `i` opens **Apple TV** and Expo Go fails to install (device family 3), Expo is using the wrong simulator. Expo Go supports **iPhone** and **iPad** only.

**Fix:**

1. **Choose an iPhone simulator before pressing `i`:**  
   With `npx expo start` running, press **`Shift + I`** (capital I) to see a list of simulators and pick an **iPhone** (e.g. iPhone 15).

2. **Or set the default simulator to an iPhone:**  
   Open the Simulator app (`open -a Simulator`), then **File → Open Simulator → iOS 17.x (or your version) → iPhone 15** (or any iPhone). Quit Simulator (Cmd+Q), then run `npx expo start` and press `i` — it will use the last-opened iPhone.

## Project structure (relevant parts)

- `app/` — Expo Router entry and tabs (screens live here or in `src/screens`)
- `src/config/env.ts` — Reads `APP_API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_URL`
- `src/services/api.ts` — Base URL and `apiFetch` / `apiGet` / `apiPost` / `apiPatch` / `apiPut` with optional `Authorization: Bearer <token>`
- `src/contexts/AuthContext.tsx` — Session state, `login`, `signup`, `logout`, `accessToken`
- `src/screens/` — Placeholder screens (Auth, Home, Profile, Orders)
- `src/lib/supabase.ts` — Supabase client (optional use)
- `constants/layout.ts` — Responsive scaling (`scaleByWidth`, `horizontalPadding`, `gap`, `getGridCardWidth`, etc.) for all phone sizes
- `components/OptimizedImage.tsx` — Product/card images with placeholder; pass `source` (URI) for remote images (uses `resizeMode` for load speed)
- `src/lib/imageUpload.ts` — Optional resize/compress before upload (e.g. avatar, complaint photo); install `expo-image-manipulator` for best results
- `components/BackToHomeButton.tsx` — “Back to Home” arrow on auth screens for easy navigation

## Backend API (short reference)

- **Base:** All routes under `/api` (e.g. `https://api.tolatola.co/api`).
- **Auth:** Login `POST /api/auth/login`, signup `POST /api/auth/signup` (include `accepted_policies: true`), logout `POST /api/auth/logout` with Bearer, current user `GET /api/auth/me`.
- **Profile:** `GET /api/profile`, `PUT` or `PATCH /api/profile` (e.g. `full_name`, `phone`), avatar, FCM.
- **Orders, products, shops, etc.:** Same backend; see **Swagger** at `https://api.tolatola.co/api-docs` or `http://localhost:8080/api-docs`; OpenAPI spec: `GET /api-docs/openapi.json`.

This app does not contain any TOLA API source code; only mobile app code and its own config.

## Screens and features (aligned with TOLA Web)

- **Post-login routing by `user_type`:** `admin` → Admin dashboard, `vendor` → Vendor dashboard, `transporter` → Transporter dashboard, `customer`/default → Shop (buyer tabs). See `src/lib/roleRedirect.ts`.
- **Guest:** Landing `(guest)/home` (promotions placeholder, categories, CTA: Shop, Become Vendor, Become Transporter, Track order). Track order: enter code & phone → request OTP → verify OTP → status dashboard → raise complaint. Guest shop: product list, product detail, shop detail (`GET /categories`, `/products`, `/products/:id`, `/shops/:id`, `/shops/:id/products`).
- **Auth:** Login, Sign up, Sign up success, Forgot password, Reset password, Welcome, Verify (OTP). Logout → `(guest)/home`.
- **Buyer (tabs):** Home (shop), Favorites, Cart, Orders, Profile. Payment success screen. Orders → payment-success demo link.
- **Vendor:** Dashboard with tabs (Overview/Products, Orders, Wallet, Subscription, Shop).
- **Transporter:** Dashboard with tabs (Assignments, Payments, Withdrawals, Membership, Profile).
- **Admin:** Dashboard with tabs (Analytics, Vendor KYC, Transporter KYC, Product approval, Orders, Payouts, Support, Promotions).
- **Tracking API:** `POST /tracking/request-otp`, `POST /tracking/verify-otp`, `GET /tracking/status?token=`, `POST /tracking/complaint` (FormData). Complaint form uses reason + description; token/orderId from status screen.
- **API client:** `apiFetch` does not set `Content-Type` when body is `FormData` (for complaint upload).
