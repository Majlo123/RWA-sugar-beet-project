# Backend E2E tests

Playwright test suite that verifies the Go backend (port 5000) fulfils the same API contract as the legacy Node backend. Covers every endpoint: register, login, profile, token-price, record-investment, admin/analytics, plus the Swagger UI.

## Prerequisites

1. **The Go backend must be running** on port 5000 — start it from `backend/`:
   ```bash
   go run ./cmd/server
   ```
   In the logs you should see:
   - `Database connection successfully established.`
   - `All models synced successfully.`
   - `Connected to Treasury contract at address: ...`
   - `Server listening on port 5000`

2. **PostgreSQL** must be running locally with database `sugar_beet_db` (credentials in `backend/.env`).

3. **Internet** — the `/token-price` test calls the Sepolia RPC through the `ethers` contract.

4. **Admin user (optional)** — to run the admin happy-path tests (`/admin/analytics` 200 and `/record-investment` admin scenarios), an account with `role='admin'` must exist in the DB and the following env vars must be set:
   ```bash
   # PowerShell (Windows)
   $env:ADMIN_USERNAME = "admin"
   $env:ADMIN_PASSWORD = "password"
   npm run test:e2e

   # bash (Linux/Mac)
   ADMIN_USERNAME=admin ADMIN_PASSWORD=password npm run test:e2e
   ```
   The admin is created manually (there is no promotion endpoint): register a normal user via `/auth/register`, then update the DB: `UPDATE "Users" SET role='admin' WHERE username='admin';`. If the env vars are not set, the admin happy-path tests are skipped, but the 401/403 tests still run.

## Installation

```bash
cd backend/tests/e2e
npm install
npx playwright install chromium
```

`npx playwright install chromium` is only needed for the browser test (`swagger.spec.ts`); if you already have Chromium installed from another Playwright project, you can skip this step.

## Running

```bash
npm run test:e2e          # default: headless, list reporter, HTML report
npm run test:e2e:headed   # opens a Chromium window (visual for swagger.spec.ts)
npm run test:e2e:ui       # Playwright Test UI mode (interactive debugging)
npm run test:e2e:report   # open the HTML report after a run
```

Filtering by file / project:
```bash
npx playwright test auth.spec.ts             # only auth tests
npx playwright test --project=api            # only API tests (no browser)
npx playwright test --project=browser        # only the Swagger UI browser test
```

## What is tested

| File | Endpoint | Test scenarios |
|---|---|---|
| `auth.spec.ts` | `POST /auth/register`, `POST /auth/login` | happy path (201/200), missing fields, duplicate username, wrong password, non-existing user |
| `users.spec.ts` | `GET /users/profile` | no token (401), wrong header format (401), invalid token (403), valid token (200, no password field) |
| `treasury.spec.ts` | `GET /token-price`, `POST /record-investment` | token price (200, string format), no token (401), non-admin token (403), missing fields with admin token (400), not a multiple of 1000 (500), happy path skipped |
| `admin.spec.ts` | `GET /admin/analytics` | no token (401), non-admin token (403), invalid token (403), happy path with admin token (200, validates summary/investments/users structure) |
| `swagger.spec.ts` | `GET /api-docs`, `GET /api-docs/swagger.json` | Swagger UI renders in Chromium, OpenAPI 3.0 JSON is valid |

## Conventions

- **Unique username** per test run — tests use `testuser_<timestamp>_<random>` to avoid clashes. The DB accumulates test users, but there is no cleanup.
- **`workers: 1`** in config — sequential execution avoids races on shared DB state.
- **Two Playwright projects:**
  - `api` (default reporter) — auth/users/treasury, uses the `request` fixture, does not launch a browser
  - `browser` — `swagger.spec.ts`, launches Chromium

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5000` | Go backend not running | `cd backend && go run ./cmd/server` |
| `Browser executable not found` | Chromium not installed | `npx playwright install chromium` |
| `/token-price` test failure (timeout) | Sepolia RPC slow / blocked | check the internet connection and `SEPOLIA_RPC_URL` in `backend/.env` |
| `Username is already taken` on the duplicate test passes once and fails the next | DB has a leftover test user from a previous run with the same timestamp | practically impossible, but manually delete the row from the `Users` table |

## Out of scope (next steps)

- Performance benchmarking (wrk/bombardier) to compare the Go vs Node backend
- Cross-version JWT compatibility (token issued by the Node backend → verified by the Go backend)
