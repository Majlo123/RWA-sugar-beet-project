# RWA Sugar Beet Tokenization — Master's Thesis Project

This repository contains the source code for a full-stack decentralized application developed as a Master's thesis (extending the original Bachelor's thesis). The project demonstrates the tokenization of real-world assets (RWA) using the example of investing in sugar beet production. Investors receive ERC-20 tokens as proof of their investment and can claim a yield after a one-year cycle.

## Master's Thesis — What's New

The Master's thesis extends the original Bachelor's project with the following additions:

* **Backend migrated from Node.js/Express to Go (Gin + GORM + go-ethereum)** — for better performance, type safety, and concurrency.
* **PSP payment microservices** — a separate Spring Boot stack handling real card, PayPal, cryptocurrency, and QR payments (PCI DSS compliant: audit logging, PAN masking, AES encryption, password hashing).
* **User-facing payment flow** — investors can now buy tokens directly through 4 payment methods (Card, PayPal, Crypto, QR), no longer dependent on manual admin recording.
* **KYC (Know Your Customer)** — identity verification with document upload before users can invest.
* **Advanced admin panel with analytics** — Recharts dashboard showing investment volume, user growth, token distribution, and revenue metrics.
* **Full Docker stack** — entire system (BEET + PSP + databases + RabbitMQ) runs with one command.
* **E2E test suite** — Playwright tests covering all backend endpoints, used to verify functional equivalence with the Bachelor's-era Node.js backend.

## Architecture Overview

The system is designed with a modern full-stack architecture, separating concerns between the frontend, backend, payment provider services, and blockchain layers:

* **Frontend:** A single-page application built with **React 19 + Vite + Tailwind CSS v4**, providing the user interface for registration, login, KYC, buying tokens, viewing investments, and interacting with the blockchain via MetaMask.
* **Backend:** A REST API built with **Go (Gin + GORM + go-ethereum)**, responsible for user management, JWT authentication, KYC document storage, analytics aggregation, and orchestrating payments through the PSP.
* **PSP (Payment Service Provider):** A Spring Boot microservice stack handling card, PayPal, cryptocurrency, and QR payments. Services communicate through an API Gateway with RabbitMQ for async messaging.
* **Database:** **PostgreSQL** for the BEET backend (users, investments, KYC); per-service Postgres/MongoDB instances for PSP services.
* **Smart Contracts:** **Solidity 0.8.x** contracts deployed on the **Polygon PoS network**, forming the immutable on-chain logic.
* **Blockchain Interaction:** **go-ethereum** (backend) and **Ethers.js** (frontend) for communication with the Ethereum blockchain.

## Key Features

### User-facing
* **Registration & Login** with JWT authentication (1-hour expiry).
* **MetaMask wallet binding** — frontend verifies the connected wallet matches the registered `ethAddress`.
* **KYC verification** — users upload identity documents before being allowed to invest.
* **Buy Tokens** — purchase BEET tokens through 4 payment methods (card, PayPal, crypto, QR), routed through the PSP stack.
* **Payment history** — view all past payments with status and method.
* **Investment portfolio** — view BEET token balance and individual investments (including Etherscan links to on-chain transactions).
* **Yield claim** — after a one-year period (configurable, currently 20 seconds for testing), the investor calls `claimYield` on-chain through MetaMask.

### Admin-facing
* **Analytics dashboard** — Recharts-based panel showing investment volume over time, user growth, token distribution, KYC approval rates, revenue per payment method.
* **KYC approval** — review and approve/reject submitted KYC documents.
* **Manual investment recording** — fallback for off-chain payments (admin calls `Treasury.recordInvestment()` directly).

## Repository Structure

This is a monorepo containing all components of the project:

```
.
├── backend/             # Go REST API (Gin + GORM + go-ethereum)
│   └── tests/e2e/       # Playwright E2E tests
├── frontend/            # React 19 + Vite SPA
├── smart-contracts/     # Solidity contracts + Hardhat
├── psp-services/        # PSP microservices (Spring Boot)
│   ├── api-gateway/
│   ├── core-service/
│   ├── bank-service/
│   ├── card-service/
│   ├── paypal-service/
│   └── crypto-service/
├── docker/              # Dockerfiles and helper configs
└── docker-compose.yml   # Full stack orchestration
```

## Technology Stack

* **Smart Contracts:** Solidity 0.8.x, Hardhat, OpenZeppelin (ERC-20, Ownable)
* **Backend:** Go 1.25+, Gin, GORM, go-ethereum, JWT, bcrypt, PostgreSQL
* **Frontend:** React 19, Vite, Tailwind CSS v4, Ethers.js, React Router, Recharts
* **PSP:** Spring Boot 3, Spring Cloud Gateway, RabbitMQ, PostgreSQL, MongoDB
* **DevOps:** Docker, Docker Compose
* **Testing:** Playwright (e2e), Mocha + Chai (smart contracts)

## Quick Start with Docker (recommended)

The entire stack — BEET (Go backend + React frontend + PostgreSQL) **and** the PSP payment microservices (core/bank/card/paypal/crypto + API gateway + RabbitMQ) — runs with a single command.

### Prerequisites
* Docker Desktop (or Docker Engine + Docker Compose v2)
* MetaMask browser extension (for blockchain interactions)

### Steps
1.  Copy the env template and fill in your secrets:
    ```bash
    cp .env.example .env
    # edit .env: POLYGON_RPC_URL, POLYGON_PRIVATE_KEY, JWT_SECRET, TREASURY_CONTRACT_ADDRESS
    ```
2.  Build and start the whole stack:
    ```bash
    docker compose up --build
    ```
3.  Once everything is healthy, open:
    * BEET frontend → http://localhost:5173
    * BEET backend / Swagger → http://localhost:5000/api-docs
    * PSP API Gateway → http://localhost:8080
    * RabbitMQ UI → http://localhost:15672 (user/password)

### Exposed ports
| Service          | Host port |
|------------------|-----------|
| BEET frontend    | 5173      |
| BEET backend     | 5000      |
| BEET PostgreSQL  | 5432      |
| PSP API Gateway  | 8080      |
| Core service     | 8081      |
| Bank service     | 8082      |
| Card service     | 8083      |
| PayPal service   | 8084      |
| Crypto service   | 8086      |
| PSP core DB      | 5444      |
| PSP card DB      | 5433      |
| Bank DB          | 5445      |
| PayPal MongoDB   | 27017     |
| Crypto MongoDB   | 27018     |
| RabbitMQ AMQP    | 5672      |
| RabbitMQ UI      | 15672     |

To stop: `docker compose down`. To wipe data: `docker compose down -v`.

## Manual setup (without Docker)

### Prerequisites
* Go 1.25+
* Node.js 20+ and npm
* Java 17+ and Maven (for PSP services)
* A running instance of PostgreSQL
* MetaMask browser extension

### 1. Smart Contracts
1.  Navigate to the `smart-contracts` directory: `cd smart-contracts`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and add your `POLYGON_RPC_URL` and `POLYGON_PRIVATE_KEY`.
4.  Compile the contracts: `npx hardhat compile`
5.  Deploy to Polygon: `npx hardhat run scripts/deploy.js --network polygon`

### 2. Backend (Go)
1.  Navigate to the `backend` directory: `cd backend`
2.  Create a `.env` file and configure your database connection, JWT secret, and the deployed `TREASURY_CONTRACT_ADDRESS` (see `.env.example` at the repo root).
3.  Run the server: `go run ./cmd/server`
4.  Swagger UI is available at http://localhost:5000/api-docs

### 3. Frontend
1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Run the application: `npm run dev`

### 4. PSP services (optional — only needed for end-to-end payment testing)
Each PSP service has its own `pom.xml` and runs independently. The Docker stack is the easier path; manual setup requires running each Spring Boot service plus its database. See `psp-services/README.md` (if present) or the individual service folders.

## Running E2E Tests

```bash
cd backend/tests/e2e
npm install
npx playwright install chromium
npm run test:e2e          # headless
npm run test:e2e:headed   # visible browser (for swagger.spec.ts)
npm run test:e2e:report   # open HTML report
```

Prerequisites: the Go backend must be running at http://localhost:5000 and PostgreSQL must be reachable.

## Documentation

* **API documentation** — Swagger UI at http://localhost:5000/api-docs (OpenAPI 3.0)
* **Original Bachelor's thesis demo** — `Demo_diplomski_RA_64_2021.mp4`
* **Original Bachelor's thesis presentation** — `Prezentacija_diplomski_RA_64_2021.pptx` (Serbian) and `Prototype-of-a-Blockchain-Based-Sugar-Beet-Tokenization-Platform.pdf` (English)
