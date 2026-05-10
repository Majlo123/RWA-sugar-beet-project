# Backend E2E testovi

Playwright test suite koja verifikuje da Go bekend (port 5000) ispunjava isti API contract kao stari Node bekend. Pokriva sve endpoint-e: register, login, profile, token-price, record-investment, admin/analytics, plus Swagger UI.

## Preduslovi

1. **Go bekend mora da radi** na portu 5000 — pokreni iz `backend/`:
   ```bash
   go run ./cmd/server
   ```
   U logu treba da vidiš:
   - `Konekcija sa bazom podataka je uspešno uspostavljena.`
   - `Svi modeli su uspešno sinhronizovani.`
   - `Povezan na Treasury ugovor na adresi: ...`
   - `Server sluša na portu 5000`

2. **PostgreSQL** mora da radi lokalno sa bazom `sugar_beet_db` (kredencijali u `backend/.env`).

3. **Internet** — `/token-price` test poziva Sepolia RPC preko `ethers` ugovora.

4. **Admin korisnik (opciono)** — za pokretanje admin happy-path testova (`/admin/analytics` 200 i `/record-investment` admin scenariji), potrebno je da postoji korisnik sa `role='admin'` u DB-u i da postave env varijable:
   ```bash
   # PowerShell (Windows)
   $env:ADMIN_USERNAME = "admin"
   $env:ADMIN_PASSWORD = "lozinka"
   npm run test:e2e

   # bash (Linux/Mac)
   ADMIN_USERNAME=admin ADMIN_PASSWORD=lozinka npm run test:e2e
   ```
   Admin se kreira ručno (nema endpoint za promociju): registruj normalnog korisnika preko `/auth/register`, pa update u DB-u: `UPDATE "Users" SET role='admin' WHERE username='admin';`. Ako env vars nisu postavljene, admin happy path testovi se preskaču (skip), ali 401/403 testovi se i dalje izvršavaju.

## Instalacija

```bash
cd backend/tests/e2e
npm install
npx playwright install chromium
```

`npx playwright install chromium` je potreban samo za browser test (`swagger.spec.ts`); ako imaš već instaliran Chromium iz drugog Playwright projekta, ovaj korak možeš preskočiti.

## Pokretanje

```bash
npm run test:e2e          # default: headless, list reporter, HTML report
npm run test:e2e:headed   # otvara Chromium prozor (vizuelno za swagger.spec.ts)
npm run test:e2e:ui       # Playwright Test UI mode (interaktivno debagovanje)
npm run test:e2e:report   # otvori HTML izveštaj posle run-a
```

Filtriranje po fajlu / projektu:
```bash
npx playwright test auth.spec.ts             # samo auth testovi
npx playwright test --project=api            # samo API testovi (bez browser-a)
npx playwright test --project=browser        # samo Swagger UI browser test
```

## Šta se testira

| Fajl | Endpoint | Test scenariji |
|---|---|---|
| `auth.spec.ts` | `POST /auth/register`, `POST /auth/login` | happy path (201/200), missing fields, duplicate username, wrong password, non-existing user |
| `users.spec.ts` | `GET /users/profile` | bez tokena (401), pogrešan format header-a (401), nevalidan token (403), validan token (200, bez password polja) |
| `treasury.spec.ts` | `GET /token-price`, `POST /record-investment` | token cena (200, string format), bez tokena (401), non-admin token (403), missing fields sa admin tokenom (400), ne-multiplo od 1000 (500), happy path skipovan |
| `admin.spec.ts` | `GET /admin/analytics` | bez tokena (401), non-admin token (403), nevalidan token (403), happy path sa admin tokenom (200, validacija strukture summary/investments/users) |
| `swagger.spec.ts` | `GET /api-docs`, `GET /api-docs/swagger.json` | Swagger UI se renderuje u Chromium-u, OpenAPI 3.0 JSON validan |

## Konvencije

- **Unique username** po test run-u — testovi koriste `testuser_<timestamp>_<random>` da izbegnu konflikte. DB akumulira test korisnike, ali nema cleanup-a.
- **`workers: 1`** u config-u — sekvencijalno izvršavanje, izbegava race-ove na deljenom DB stanju.
- **Dva Playwright projekta:**
  - `api` (default reporter) — auth/users/treasury, koristi `request` fixture, ne pokreće browser
  - `browser` — `swagger.spec.ts`, otvara Chromium

## Troubleshooting

| Simptom | Uzrok | Rešenje |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5000` | Go bekend nije pokrenut | `cd backend && go run ./cmd/server` |
| `Browser executable not found` | Chromium nije instaliran | `npx playwright install chromium` |
| `/token-price` test fail (timeout) | Sepolia RPC sporo / blokirano | proveri internet i `SEPOLIA_RPC_URL` u `backend/.env` |
| `Username is already taken` na duplicate testu prolazi prvi put pa fail-uje drugi | DB ima zaostali test korisnik iz prethodnog run-a sa istim timestamp-om | praktično nemoguće, ali ručno obriši red iz `Users` tabele |

## Dalji koraci (van opsega)

- Performance benchmarking (wrk/bombardier) za poređenje Go vs Node bekenda
- Cross-version JWT kompatibilnost (token izdat od Node bekenda → verifikovan od Go bekenda)
