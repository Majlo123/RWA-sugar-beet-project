# Backend E2E tests

Playwright test suite that exercises the Go backend (port 5000) — covers auth, users, KYC (user + admin), the full payment flow (initiate, confirm, simulate, QR, card, PayPal, history), treasury read-only calls, admin analytics, and the Swagger UI.

## Prerequisites

1. **The Go backend must be running** on port 5000 — start it from `backend/`:
   ```bash
   go run ./cmd/server
   ```
   Or, if you run the full Docker stack (`docker compose up -d` from the repo root), the backend is already on `localhost:5000` and the tests will hit that.

2. **PostgreSQL** must be running locally with database `sugar_beet_db` (credentials in `backend/.env`). In the Docker stack this is the `beet-db` service.

3. **Internet** — the `/token-price` test reads from the Polygon RPC.

4. **Admin user (optional)** — to run the admin happy-path tests (`/admin/analytics` 200, `/admin/kyc` items, and KYC approve/reject flows), an account with `role='admin'` must exist in the DB and the following env vars must be set:
   ```powershell
   # PowerShell (Windows)
   $env:ADMIN_USERNAME = "admin"
   $env:ADMIN_PASSWORD = "password"
   npm run test:e2e
   ```
   ```bash
   # bash (Linux/Mac)
   ADMIN_USERNAME=admin ADMIN_PASSWORD=password npm run test:e2e
   ```
   The admin is created manually (there is no promotion endpoint): register a normal user via `/auth/register`, then update the DB: `UPDATE "Users" SET role='admin' WHERE username='admin';`. If the env vars are not set, admin happy-path tests are skipped, but the 401/403 guards still run.

## Installation

```bash
cd backend/tests/e2e
npm install
npx playwright install chromium
```

`npx playwright install chromium` is only needed for the browser test (`swagger.spec.ts`).

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
npx playwright test --project=api            # API tests only (no browser)
npx playwright test --project=browser        # only the Swagger UI browser test
```

## What is tested

| File | Endpoints | Scenarios |
|---|---|---|
| `auth.spec.ts` | `POST /auth/register`, `POST /auth/login` | happy paths (201/200), missing fields, duplicate username, wrong password, non-existing user |
| `users.spec.ts` | `GET /users/profile` | no token (401), wrong header format (401), invalid token (403), valid token (200, no password field) |
| `kyc.spec.ts` | `GET /users/kyc`, `POST /users/kyc/submit`, `GET /admin/kyc`, `POST /admin/kyc/:id/approve`, `POST /admin/kyc/:id/reject` | auth guards (401/403), missing file, missing fullName, invalid documentType, happy-path submit (multipart upload), double-submit rejection, admin list/approve/reject guards, full admin approval flow (requires admin creds) |
| `payments.spec.ts` | `POST /payments/initiate`, `POST /payments/:id/confirm`, `GET /payments/:id`, `GET /payments/:id/qr-code`, `POST /payments/:id/simulate`, `POST /payments/:id/submit-card`, `POST /payments/paypal/capture`, `POST /payments/paypal/cancel`, `GET /payments/history` | auth guards (401/403), id parsing (400), missing payment (400/404), KYC-not-verified gate, invalid payment method, non-multiple-of-1000 amount, empty PayPal capture body, empty history for fresh user |
| `treasury.spec.ts` | `GET /token-price` | 200 with `tokenPriceUSD` as a numeric string read from the Treasury smart contract |
| `admin.spec.ts` | `GET /admin/analytics` | no token (401), non-admin token (403), invalid token (403), happy path with admin token (200 — validates summary, investments[], users[]) |
| `swagger.spec.ts` | `GET /api-docs`, `GET /api-docs/swagger.json` | Swagger UI renders in Chromium with all 5 tags visible (Auth, Treasury, Users, Admin, KYC), OpenAPI 3.0 JSON exposes every live endpoint |

Most happy-path admin tests (analytics, KYC approve/reject) are gated by the optional `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars. Without them, the suite still runs all auth/validation tests but skips the admin-only assertions — Playwright marks these with `-` instead of `ok`.

## Conventions

- **Unique username** per test run — tests use `testuser_<prefix>_<timestamp>_<random>` to avoid clashes. The DB accumulates test users, but there is no cleanup.
- **`workers: 1`** in config — sequential execution avoids races on shared DB state.
- **Two Playwright projects:**
  - `api` (default reporter) — every spec except swagger; uses the `request` fixture, does not launch a browser
  - `browser` — `swagger.spec.ts`, launches Chromium
- **KYC submission** uses Playwright's `multipart` field. Global `Content-Type` is intentionally NOT set in `playwright.config.ts` so Playwright can set `application/json` for JSON requests and `multipart/form-data` (with boundary) for file uploads.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5000` | Go backend not running | `cd backend && go run ./cmd/server` or `docker compose up -d beet-backend` |
| QR-code or new-payment tests return 404 unexpectedly | Stale Docker image | `docker compose up -d --build beet-backend` |
| `Browser executable not found` | Chromium not installed | `npx playwright install chromium` |
| `/token-price` test timeout | Polygon RPC slow / blocked | check the internet connection and `POLYGON_RPC_URL` in `backend/.env` |

## Out of scope (next steps)

- Performance benchmarking (wrk/bombardier) to compare the Go vs legacy Node backend
- Full end-to-end happy path including a real PSP `PAID` simulation and an on-chain mint (requires Sepolia ETH on the admin signer; currently skipped)
