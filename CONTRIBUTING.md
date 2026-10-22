# Contributing

## Before opening a PR

Run all three checks locally — CI runs the same commands and will fail the build otherwise:

```bash
npm run lint
npm run typecheck
npm test -- --coverage
```

## Branch naming

`<type>/<short-description>`, e.g. `fix/checkout-delivery-fee`, `feat/vendor-wallet-tab`.

## Branching & review

1. Branch from `main` with `<type>/<short-description>` (see Branch naming).
2. Keep PRs small: one concern per PR when practical. Multi-file features should land as **2–3 commits** scoped by layer (e.g. schema → service/UI → tests), not one bulk commit.
3. Every feature/fix PR must include the source change **and** its corresponding test file in the same commit (or an immediately following `test:` commit on the same PR).
4. Request review before merge; CI (`lint`, `typecheck`, `test --coverage`, `npm audit`) must be green.

## Commits

This repo follows [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`). Keep each commit focused on one change:

- Ship a feature or fix together with the tests that pin its behavior, in the same commit.
- Don't bundle formatting, refactors, and feature work into one commit — split them so each one is reviewable and revertable on its own.
- Prefer pairing `src/components/<domain>/` changes with `src/components/<domain>/__tests__/` (or nearest `__tests__/`) updates in that same commit.

## Tests

- New hooks and pure logic (`src/lib/`, `src/hooks/`, `src/api/`) should ship with a test file under the nearest `__tests__/` directory.
- Mock the backend with `jest.mock('@/src/services/api')` — it resolves to the manual mock at `src/services/__mocks__/api.ts`, so tests never need a live server or real Supabase credentials. See `src/hooks/__tests__/useAgentDashboardData.test.ts` for the pattern.
- `jest.config.js` enforces a coverage floor (`coverageThreshold`); a PR that drops coverage below it will fail CI.

## Code style

- Screens that outgrow a few hundred lines should have their data-fetching extracted into a hook (`src/hooks/`) and their view broken into components (`src/components/<domain>/`) — see `src/hooks/useAgentDashboardData.ts` + `src/components/agent/` for the reference pattern.
- Use `logger` from `src/lib/logger.ts` instead of `console.*`.
- Prefer the typed `AppError` (`src/lib/errors.ts`) over raw `Error` for anything surfaced from `src/services/api.ts` — check `.kind` (`network`/`validation`/`auth`/`server`) rather than parsing `.message`.

## Error tracking

`src/lib/errorTracking.ts` is the app's error-reporting boundary — `components/ErrorBoundary.tsx` already calls `captureException` on every caught render error, in every build (not just `__DEV__`). By default it routes through `logger`; to wire a real service (Sentry, Bugsnag, etc.), call `setErrorTrackingProvider({...})` once at startup (e.g. in `app/_layout.tsx`) with an object matching the `captureException`/`captureMessage`/`setUser` shape — no call sites need to change. Use `captureException`/`captureMessage` directly in any `catch` block that handles a failure a user shouldn't have to report manually.
