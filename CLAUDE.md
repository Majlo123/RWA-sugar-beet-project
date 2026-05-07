# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bachelor thesis project: a blockchain-based sugar beet production tokenization system. Users invest in sugar beet production, receive BEET ERC-20 tokens on the Ethereum Sepolia testnet, and can claim yield after a 1-year cycle.

The monorepo has three independent sub-projects, each with its own `package.json`:

- `frontend/` — React 19 + Vite SPA
- `backend/` — Node.js + Express 5 REST API
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

### Backend
```bash
cd backend
node index.js      # Start server on http://localhost:5000
                   # Swagger UI available at http://localhost:5000/api-docs
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
4. Admin records investment → backend calls `Treasury.recordInvestment()` on-chain → Treasury mints BEET tokens to investor
5. User views portfolio → frontend reads BEET balance and investment details directly from blockchain via ethers.js
6. After 1 year → user calls `Treasury.claimYield()` via MetaMask

### Backend Layering
Controllers → Services → Repositories, with a clear separation:
- **Controllers** (`controllers/`): parse requests, call services, return responses
- **Services** (`services/`): business logic and orchestration
- **Repositories** (`repositories/`): data access — `user.repository.js` talks to PostgreSQL via Sequelize; `treasury.repository.js` talks to the Treasury contract via ethers.js
- **Config** (`config/database.js`, `config/blockchain.js`): instantiates Sequelize and the ethers.js provider/signer/contract instances — imported by repositories
- **Middleware** (`middleware/auth.middleware.js`): JWT verification, attaches `req.user`

### Frontend Structure
- `AuthContext.jsx` — global state: JWT token, user object, connected MetaMask account; shared via React context
- `ProtectedRoute.jsx` / `AdminProtectedRoute.jsx` — route guards checking token and `user.role === 'admin'`
- `services/` — thin wrappers around `fetch` that attach the `Authorization: Bearer <token>` header
- Pages interact with the blockchain directly via ethers.js (using ABIs in `src/beetAbi.json` and `src/treasuryAbi.json`) for read-only calls; write operations (claimYield) go through MetaMask

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
DB_DIALECT=postgres
JWT_SECRET=
```

**Smart Contracts** requires `smart-contracts/.env`:
```
SEPOLIA_RPC_URL=
SEPOLIA_PRIVATE_KEY=
```

PostgreSQL must be running locally with the database created before starting the backend. Sequelize auto-syncs models on startup.

## Key Conventions

- ESLint uses the flat config format (`eslint.config.js`) — not `.eslintrc`
- `smart-contracts/hardhat.config.cjs` uses CommonJS (`.cjs`) because the package is `"type": "module"`
- Backend routes are registered directly in `backend/index.js` — no separate router barrel file
- JWT is stored in `localStorage` on the frontend (not httpOnly cookies)
- The backend signer wallet (from `SEPOLIA_PRIVATE_KEY`) must be the Treasury contract owner for `recordInvestment` to succeed
