# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Fitness Log: a personal meals + weight-training tracker. pnpm monorepo (`apps/api`, `apps/web`, `packages/shared`). See `README.md` for setup, env vars and the full API route table.

**The whole project is plain JavaScript (ES modules).** No TypeScript, no JSDoc type-checking, no `typecheck` script. Runtime shapes are enforced with the Zod schemas in `packages/shared`. Don't add TanStack (Router/Query/Form), SWR or similar: the web app is Next.js (App Router, every page a client component), with its own `useApi` and its own `useForm`. Ask before adding any new dependency.

## Commands

Run from the repo root (Node 24+, pnpm 10):

```bash
docker compose up -d   # Postgres 16 on :5432; creates `fitness` and `fitness_test`
pnpm dev               # api :3000 (node --watch) + web :5173 (Next, rewrites /api → api)
pnpm lint              # Biome lint + format check (pnpm lint:fix to apply)
pnpm test              # Jest in every package; api tests need Postgres running
pnpm build             # web production build (also catches broken imports)
pnpm db:generate       # new migration after editing apps/api/src/db/schema
pnpm db:migrate        # apply migrations
pnpm db:seed [--demo]  # global foods/exercises; --demo adds demo@example.com / demo-password
```

Single test file or test name:

```bash
pnpm --filter @fitness/api test src/services/meals.service.test.js
pnpm --filter @fitness/shared test -t "movingAverage"
```

CI (`.github/workflows/ci.yml`) runs three parallel jobs: `pnpm lint`; `pnpm test` against Postgres, plus a check that `pnpm db:generate` produces no new migration and a `pnpm db:seed --demo` run done twice; and `pnpm build`. Run lint, test and build before committing, and commit the migration whenever you change the schema.

Biome skips `apps/web/src/components/ui` (shadcn-generated) and `drizzle/meta`.

## Architecture

### Request flow (api)

`apps/api/src/app.js` `createApp()` builds the Express 5 app without listening, which lets tests start it on a random port. Order matters:

1. `express.json()` then `cookie-parser` (fills `req.cookies`).
2. `routes/index.js`: `/api/health` and `/api/auth` (signup/login/refresh/logout) are public, then `requireAuth` verifies the `access_token` cookie JWT (no DB lookup) and puts its `sub` in `res.locals.userId` for every other router.
3. Routers stay thin: parse `req.body` / `req.query` / `req.params` with a shared Zod schema, call a service, respond. No try/catch, because Express 5 forwards async rejections to the error handler.
4. Services (`services/*.service.js`) hold the queries and business logic. **Every query is scoped to the `userId` argument**, never to a user id from the request (Zod strips unknown keys, so a `userId` in the body is dropped). Foods and exercises with `user_id IS NULL` are global and visible to everyone, but users can only modify their own.
5. Errors: services throw `AppError` helpers from `lib/errors.js` (`notFound`, `forbidden`, `conflict`). `middleware/error-handler.js` maps `AppError`, `ZodError` (400 `VALIDATION_ERROR`) and bad JSON to `{ error: { code, message } }`. Postgres constraint errors are detected with `pgErrorCode()` in `lib/db-errors.js` (Drizzle wraps the pg error in `cause`).

Env: one `.env` at the repo root, loaded by `apps/api/src/load-env.js` (used by the api, drizzle-kit and jest) and validated in `src/env.js`. `apps/web/scripts/next.js` (wraps the `next` CLI for dev/build/start) loads the same file, listens on `WEB_PORT` and passes the api's `PORT` to `next.config.js` as `API_PORT` (Next overwrites `PORT` with its own). `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` sign the two token types; keep them different so one can't pass as the other.

### Auth

Own implementation, no auth library. `lib/password.js` (scrypt, Better Auth's old hash format so pre-switch accounts still log in), `lib/tokens.js` (sign/verify with `jsonwebtoken`, HS256 pinned; access 15 min, refresh 30 days), `lib/auth-cookies.js` (httpOnly, `SameSite=Lax`; access cookie path `/api`, refresh cookie path `/api/auth`), `services/auth.service.js`. Each refresh token has a `refresh_token` row keyed by its `jti`; refresh deletes the row and issues a new pair (rotation), logout deletes it. A failed refresh doesn't clear cookies, because another tab may have just rotated them.

Drizzle uses `casing: "snake_case"` (in both the client and `drizzle.config.js`), so the schema uses camelCase JS keys and gets snake_case columns without explicit names.

### Shared package

`@fitness/shared` (`packages/shared/src/index.js` re-exports everything) contains:
- `schemas/`: Zod schemas used by the api for validation and by the web app for form validation, plus `apiErrorSchema`.
- `logic/`: pure, unit-tested functions (dates, nutrition totals, Epley e1RM, 7-day moving average, workout helpers). Put any calculation needed by both sides here.

### Web

- Routes are files under `src/app/` (Next App Router). Pages are `"use client"` and load data in the browser through the api; there are no Server Components fetching data, because the access cookie's path is `/api`. Route groups: `(guest)/layout.jsx` wraps login/signup in `<GuestOnly>`, `(app)/layout.jsx` wraps everything else in `<RequireAuth>` + `<AppLayout>`. Both guards use `useAuth()` from `lib/auth.jsx` (`AuthProvider` in `app/layout.jsx` loads the user with `GET /api/me`) and redirect with `router.replace`; `RequireAuth` sends `?from=<path>` so login can return there. Use `next/link` and `next/navigation` (`useRouter`, `useParams`, `useSearchParams`). Don't create `src/pages/`: Next would treat it as the Pages Router.
- `lib/api.js` `api(path, { method, body, query })` adds the `/api` prefix and throws `ApiError` with the server's `code` / `message`. On a 401 (outside `/auth/*`) it calls `/api/auth/refresh` once (shared by concurrent requests), retries, and if still 401 tells `AuthProvider` the user is logged out. `lib/use-api.js` `useApi` fetches on mount or input change, aborts stale requests, and exposes `setData` so a page can patch local state with a mutation's response instead of refetching.
- `lib/use-form.js` `useForm({ schema, initialValues, prepare, onSubmit })`: controlled inputs via `field(name)`, with errors from the shared Zod schema. `prepare` converts input strings (e.g. `toNumber`) before validation.
- UI is Tailwind v4 + shadcn (`components.json`, JS not TSX, `@/` alias → `src/`). The app is mobile-first.

### Tests

Jest runs native ES modules: each package's `test` script sets `NODE_OPTIONS=--experimental-vm-modules` and `transform: {}` turns Babel off, so run tests through `pnpm test` (not a bare `jest`). Import `describe` / `it` / `expect` / hooks from `@jest/globals`.

Api tests run against a real Postgres (`TEST_DATABASE_URL`). `apps/api/jest.config.js` points `DATABASE_URL` at it, `test/global-setup.js` migrates once, and `test/setup.js` truncates all tables before **each test**. Files run serially (`maxWorkers: 1`) because they share the database. Helpers:
- `test/factories.js` inserts users/foods/exercises directly (pass `userId = null` for global rows), for service tests.
- `test/http.js` `listen(createApp())` + `test/auth.js` `signUp(baseUrl)` returns the auth cookies as a `cookie` header, for route tests over real HTTP.

## Conventions

- **Dates**: `log_date` is a Postgres `DATE` holding the user's local day (Asia/Bangkok), passed around as `"YYYY-MM-DD"` strings, never as JS `Date`. Use the helpers in `packages/shared/src/logic/date.js`.
- **Units**: weight is always stored in kg. Meal `quantity` is a number of servings.
- **Moving average**: trailing 7 *calendar* days `[d-6, d]`. The body-logs endpoint reads 6 extra days before `from` so the first points have a full window.
- **Weight training only**: workouts have no activity type. Each exercise has one primary `muscleGroup` and optional `secondaryMuscles` (13 muscles, `MUSCLE_GROUPS` in `schemas/exercise.js`, also the DB enum order). `pnpm db:seed` upserts global exercises by name, so `seed-data/exercises.js` is the source of truth for their muscles.
- **Muscle volume**: a set counts 1 for the primary muscle and 0.5 for each secondary one; sets with 0 reps don't count. The muscle map colors by sets per week (`heatLevel`: <10 low/green, 10–19 medium/yellow, 20+ high/red). Logic is in `packages/shared/src/logic/muscle-volume.js`.
- **e1RM**: Epley `weight × (1 + reps/30)`, and a 1-rep set counts as its own weight. History keeps the best set per training day.
- **Formatting**: Biome, 2 spaces, line width 100, imports auto-organized.
