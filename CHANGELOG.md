# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-08-22

### Added
- Guest, buyer, vendor, transporter, and admin experiences with role-based post-login routing.
- Guest shop browsing (categories, products, shop pages) and order tracking by code + phone (OTP-verified) with complaint filing.
- Buyer tabs: home/shop, favorites, cart, checkout (delivery pricing, mobile money / card / cash-on-delivery), orders, profile.
- Vendor dashboard: product catalog (create/edit), orders, wallet, subscription, shop management.
- Transporter dashboard: assignments, payments, withdrawals, membership/subscription, profile.
- Admin dashboard: analytics, vendor/transporter KYC review, product approval, orders, payouts, support, promotions.
- Jest + `jest-expo` + React Native Testing Library test suite, running fully offline via a manual `src/services/api.ts` mock.
- CI (`npm audit`, lint, typecheck, test-with-coverage) on every push/PR to `main`, plus Dependabot for dependency updates.
- Typed `AppError` (`src/lib/errors.ts`) with `kind` classification (`network`/`validation`/`auth`/`server`) thrown from all `src/services/api.ts` calls.
- Zod schema validation at the `/products/:id` API boundary consumed by checkout pricing.
