# Fitness Log

Personal web app for logging meals and weight-training workouts.

- **Today** — meals grouped by breakfast/lunch/dinner/snack, kcal and protein vs goals
- **Food log** — search ~30 built-in foods (incl. Thai dishes) or create your own
- **Workout logger** — mobile-first: big steppers, one-tap "Log set", "Copy last session"
- **Muscle map** — front/back body figure colored by sets per week for each muscle (7 / 14 / 30 days)
- **Body weight** — daily weigh-ins with a 7-day moving average chart
- **Progress** — estimated 1RM (Epley) per exercise over time

pnpm monorepo:

| Package | What |
|---|---|
| `apps/web` | Next.js (App Router, client components), Tailwind v4, shadcn/ui, Recharts |
| `apps/api` | Express 5 + Drizzle ORM + JWT auth (httpOnly cookies), plain Node (no build step) |
| `packages/shared` | Zod schemas and pure logic shared by web and api |

Everything is plain JavaScript (ES modules). Request/response shapes are
enforced at runtime with the Zod schemas in `packages/shared`.

## Prerequisites

- Node 24+
- pnpm 10+ (`corepack enable` works)
- Docker (for Postgres 16)

## Setup

```bash
pnpm install
cp .env.example .env
# put real secrets in .env (a different one for each):
#   JWT_ACCESS_SECRET=$(openssl rand -base64 32)
#   JWT_REFRESH_SECRET=$(openssl rand -base64 32)

docker compose up -d     # Postgres on :5432, creates `fitness` and `fitness_test`
pnpm db:migrate          # apply migrations in apps/api/drizzle
pnpm db:seed             # global foods + exercises (safe to re-run; updates exercise muscles)
pnpm dev                 # api on :3000, web on http://localhost:5173
```

### Demo data

```bash
pnpm db:seed --demo
```

Creates **demo@example.com / demo-password** with ~4 months of weigh-ins,
12 weeks of progressive training and today's meals, so every chart has data.
Re-running replaces the demo user (and only that user).

Open http://localhost:5173. Next rewrites `/api/*` to the API, so
the browser only ever sees one origin (no CORS, first-party cookies).

## Environment variables

All in the root `.env`, loaded by `apps/api/src/load-env.js` (dotenv). Variables already set in the environment win.

| Var | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | api, drizzle-kit | dev database |
| `TEST_DATABASE_URL` | api tests | separate DB, truncated by tests |
| `PORT` | api, Next `/api` rewrite | default 3000 |
| `WEB_PORT` | Next (dev / start) | default 5173 |
| `JWT_ACCESS_SECRET` | api | ≥ 32 chars, signs access tokens |
| `JWT_REFRESH_SECRET` | api | ≥ 32 chars, signs refresh tokens; must differ from the access secret |

## Scripts (root)

| Script | |
|---|---|
| `pnpm dev` | api + web in watch mode |
| `pnpm build` | production build of the web app (also catches broken imports) |
| `pnpm lint` / `pnpm lint:fix` | Biome lint + format check |
| `pnpm test` | Jest in every package (api tests need `docker compose up -d`) |
| `pnpm db:generate` | create a migration after editing `apps/api/src/db/schema` |
| `pnpm db:migrate` | apply pending migrations |
| `pnpm db:seed` | insert global foods/exercises (`--demo` adds the demo user) |

## Project structure

```
apps/api/src
  app.js            Express app (JSON + cookie parsing, routes, error handler)
  routes/           thin routers: parse with Zod -> call a service -> respond
  services/         business logic + queries, always scoped to the user (+ tests)
  middleware/       requireAuth, central error handler
  db/               Drizzle schema, client, seed (+ seed-demo)
apps/api/drizzle    generated SQL migrations
apps/web/src
  app/              Next App Router: (guest)/ login + signup, (app)/ pages behind login
  components/       ui/ (shadcn), charts/, nutrition/, workouts/, auth/, layout/
  lib/              api fetch wrapper, useApi, useForm, formatting
packages/shared/src
  schemas/          Zod schemas used by both api (validation) and web (forms)
  logic/            pure, tested functions: dates, totals, 1RM, moving average
```

## Testing

`pnpm test` runs Jest (native ES modules) everywhere. Pure logic is unit-tested in
`packages/shared`; API services are tested against a real Postgres database
(`TEST_DATABASE_URL`), migrated once per run and truncated before each test.
CI (GitHub Actions) runs lint, tests and the web build with a Postgres service.

## Conventions

- **Dates**: `log_date` columns are Postgres `DATE` holding the user's local
  calendar day (Asia/Bangkok), passed around as `"YYYY-MM-DD"` strings — never
  as JS `Date`. See `packages/shared/src/logic/date.js`.
- **Units**: weight is always stored in kg.
- **Moving average**: trailing 7 *calendar* days (`[d-6, d]`), so missed
  weigh-ins don't stretch the window. The API reads 6 extra days before the
  requested range so the first points have a full window.
- **e1RM**: Epley, `weight × (1 + reps / 30)`; a single (1 rep) counts as its
  own weight. History shows the best set of each training day.
- **Errors**: every API error is `{ "error": { "code": "...", "message": "..." } }`.

## Auth

Email + password, with two JWTs (HS256, `jsonwebtoken`) in httpOnly,
`SameSite=Lax` cookies (`Secure` in production):

| Cookie | Lifetime | Path | Signed with |
|---|---|---|---|
| `access_token` | 15 min | `/api` | `JWT_ACCESS_SECRET` |
| `refresh_token` | 30 days | `/api/auth` | `JWT_REFRESH_SECRET` |

| Method & path | |
|---|---|
| `POST /auth/signup` | `{ name, email, password }` → 201 `{ user }` + cookies; 409 `EMAIL_TAKEN` |
| `POST /auth/login` | `{ email, password }` → `{ user }` + cookies; 401 `INVALID_CREDENTIALS` |
| `POST /auth/refresh` | refresh cookie → 204 + a new pair of cookies (rotation) |
| `POST /auth/logout` | revokes the refresh token, clears both cookies → 204 |

- Passwords are hashed with scrypt (`apps/api/src/lib/password.js`), in the
  same format Better Auth used, so accounts from before the switch still work.
- Every refresh token has a row in `refresh_token` (its `jti`). Refreshing
  deletes that row and issues a new pair, so each refresh token works once;
  logout deletes it too. Access tokens aren't stored: they stay valid until
  they expire (at most 15 min after logout).
- `requireAuth` (`apps/api/src/middleware/require-auth.js`) guards every `/api`
  route except `/api/health` and puts the user id in `res.locals.userId`.
  Services always scope queries to that id, never to a `user_id` in the body.
- Web: `useAuth()` from `apps/web/src/lib/auth.jsx` (`user`, `logIn`,
  `signUp`, `logOut`; loads the user with `GET /me`). On a 401, `api()`
  calls `/auth/refresh` once and retries; if it's still 401 the user is
  logged out. `<RequireAuth>` and
  `<GuestOnly>` layout routes in `apps/web/src/App.jsx` handle redirects.

## API

All routes are under `/api` and require a valid access token except
`/api/health` and `/api/auth/*`. Bodies and queries are validated with the Zod schemas in
`packages/shared`; unknown fields (including any `userId`) are dropped.

| Method & path | |
|---|---|
| `GET /foods?q=&limit=` | search global + own foods (own first) |
| `POST /foods` | create a custom food |
| `PATCH /foods/:id`, `DELETE /foods/:id` | own foods only; 409 `FOOD_IN_USE` if logged |
| `GET /meals?date=YYYY-MM-DD` | `{ date, entries, totals, goals }` for the Today page |
| `POST /meals` | `{ logDate, mealType, foodId, quantity }` (quantity = servings) |
| `PATCH /meals/:id`, `DELETE /meals/:id` | own entries only |
| `GET /goals`, `PUT /goals` | daily kcal/protein targets (defaults until set) |
| `GET /exercises`, `POST /exercises` | global + own exercises; create a custom one (`{ name, muscleGroup, secondaryMuscles? }`) |
| `GET /exercises/:id/last-sets?beforeWorkoutId=` | sets from the most recent earlier session with that exercise |
| `GET /workouts?limit=` | recent workouts with set/exercise counts |
| `GET /workouts/muscle-sets?from=&to=` | sets per muscle in the range (secondary muscles count half), every muscle included |
| `POST /workouts`, `GET/PATCH/DELETE /workouts/:id` | workout + its sets grouped by exercise |
| `POST /workouts/:id/sets` | `{ exerciseId, weightKg, reps, rpe? }`; `setNo` assigned by the server |
| `PATCH/DELETE /workouts/:id/sets/:setId` | edit or remove a set |
| `POST /workouts/:id/copy-last` | `{ exerciseId }` — append the previous session's sets |
| `GET /exercises/performed` | exercises the user has trained, most recent first |
| `GET /exercises/:id/history` | best e1RM per training day |
| `GET /body-logs?from=&to=` | weigh-ins with `avgKg` (7-day moving average) |
| `PUT /body-logs/:date`, `DELETE /body-logs/:date` | set (upsert) or remove a day's weight |
| `GET /me` | current user |
