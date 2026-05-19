# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Master's thesis project (extending the original bachelor's thesis): a blockchain-based sugar beet production tokenization system. Users invest in sugar beet production, receive BEET ERC-20 tokens on the Ethereum Sepolia testnet, and can claim yield after a 1-year cycle.

The monorepo has three independent sub-projects:

- `frontend/` — React 19 + Vite SPA (Tailwind CSS v4)
- `backend/` — **Go (Gin + GORM + go-ethereum) REST API**
- `smart-contracts/` — Solidity 0.8.28 contracts + Hardhat

## Commands

### Frontend
```bash
cd frontend
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # Production build
npm run lint       # ESLint (flat config, eslint.config.js)
npm run preview    # Preview production build
```

### Backend (Go)
```bash
cd backend
go run ./cmd/server   # Start server on http://localhost:5000
                      # Swagger UI available at http://localhost:5000/api-docs
go build ./...        # Compile everything
go mod tidy           # Sync dependencies
```

### Smart Contracts
```bash
cd smart-contracts
npx hardhat compile                                        # Compile contracts
npm run test                                               # Run all tests (Mocha + Chai)
npx hardhat run scripts/deploy.js --network sepolia        # Deploy to Sepolia
```

## Architecture

### Data Flow
1. User registers → backend stores `{username, hashedPassword, ethAddress, role}` in PostgreSQL
2. User logs in → backend returns JWT (1-hour expiry), stored in frontend localStorage
3. User connects MetaMask → frontend verifies wallet matches the registered `ethAddress`
4. Admin records investment → backend calls `Treasury.recordInvestment()` on-chain via go-ethereum → Treasury mints BEET tokens to investor
5. User views portfolio → frontend reads BEET balance and investment details directly from blockchain via ethers.js
6. After 1 year → user calls `Treasury.claimYield()` via MetaMask

### Backend Layering (Go)
Entry point: `cmd/server/main.go`. Layered as Controllers → Services → Repositories:

- **Controllers** (`controllers/`): Gin handlers — parse requests, call services, return JSON responses (`auth_controller.go`, `user_controller.go`, `treasury_controller.go`, `admin_controller.go`)
- **Services** (`services/`): business logic and orchestration (`auth_service.go`, `treasury_service.go`, `analytics_service.go`)
- **Repositories** (`repositories/`): data access — `user_repository.go` uses GORM against PostgreSQL; `treasury_repository.go` uses go-ethereum's `bind.BoundContract` to interact with the Treasury contract
- **Config** (`config/database.go`, `config/blockchain.go`): instantiates the GORM `*gorm.DB` and the go-ethereum `ethclient.Client` + `BoundContract` instances
- **Middleware** (`middleware/auth_middleware.go`, `admin_middleware.go`): JWT verification, role checks, attaches user claims to the Gin context
- **Models** (`models/user.go`): GORM model structs with tags
- **Routes** (`routes/routes.go`): registers all Gin routes in one place
- **Docs** (`docs/swagger.go`): OpenAPI 3.0 spec served at `/api-docs`

### Frontend Structure
- `AuthContext.jsx` — global state: JWT token, user object, connected MetaMask account; shared via React context
- `ProtectedRoute.jsx` / `AdminProtectedRoute.jsx` — route guards checking token and `user.role === 'admin'`
- `services/` — thin wrappers around `fetch` that attach the `Authorization: Bearer <token>` header (`userService.js`, `adminService.js`, `treasuryService.js`)
- `pages/admin/` — split admin panel: `AdminLayout.jsx` provides tab navigation between `AnalyticsPage.jsx` (Recharts dashboard) and `RecordInvestmentPage.jsx`
- Pages interact with the blockchain directly via ethers.js (using ABIs in `src/beetAbi.json` and `src/treasuryAbi.json`) for read-only calls; write operations (claimYield) go through MetaMask
- Design system: Tailwind CSS v4 with `@theme {}` tokens in `src/index.css`, Plus Jakarta Sans (headings) + Inter (body), dark navy + emerald palette, layout capped at `max-w-[1600px]` for 1920×1080 desktop

### Smart Contracts
- `BEET.sol` — ERC-20 (OpenZeppelin), Ownable; only the Treasury (as owner) can mint
- `Treasury.sol` — records investments, mints BEET, tracks yields per investor, enforces 1-year lock before claim
- `treasuryAbi.json` is duplicated in both `backend/` and `frontend/src/` — keep them in sync when redeploying

## Environment Setup

**Backend** requires `backend/.env`:
```
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=       # wallet that owns the Treasury contract (for signing txs)
TREASURY_CONTRACT_ADDRESS=
DB_HOST=localhost
DB_USER=postgres
DB_PASS=
DB_NAME=sugar_beet_db
DB_PORT=5432
JWT_SECRET=
```

**Smart Contracts** requires `smart-contracts/.env`:
```
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
```

PostgreSQL must be running locally with the database created before starting the backend. GORM `AutoMigrate` syncs models on startup if the table doesn't already exist.

## Key Conventions

- ESLint uses the flat config format (`eslint.config.js`) — not `.eslintrc`
- `smart-contracts/hardhat.config.cjs` uses CommonJS (`.cjs`) because the package is `"type": "module"`
- Backend routes are registered in `backend/routes/routes.go`
- JWT is stored in `localStorage` on the frontend (not httpOnly cookies)
- The backend signer wallet (from `SEPOLIA_PRIVATE_KEY`) must be the Treasury contract owner for `recordInvestment` to succeed
- **go-ethereum quirk**: when calling Solidity functions with multiple return values via `BoundContract.Call`, pass an empty `[]interface{}{}` (not pre-populated pointers) — go-ethereum then uses `Unpack()` which returns all values in order, and you type-assert each element
- **PostgreSQL case-folding**: unquoted identifiers in `Order(...)` clauses are case-folded to lowercase; use `id` instead of `createdAt` for ordering, or wrap the column in quotes
- GORM `AutoMigrate` is run conditionally (only if the table doesn't exist) to avoid conflicts with Sequelize-era unique constraint names from the bachelor's thesis database
