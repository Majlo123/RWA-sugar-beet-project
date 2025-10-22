# RWA Sugar Beet Tokenization - Diploma Thesis Project

This repository contains the source code for a full-stack decentralized application developed as a diploma thesis. The project demonstrates the tokenization of real-world assets (RWA) using the example of investing in sugar beet production. The system allows investors to receive digital tokens as proof of their investment and claim a yield after a one-year cycle.

## Architecture Overview

The system is designed with a modern full-stack architecture, separating concerns between the frontend, backend, and blockchain layers:

* **Frontend:** A single-page application built with **React**, providing the user interface for registration, login, viewing investments, and interacting with the blockchain via MetaMask.
* **Backend:** A server built with **Node.js** and **Express.js**, responsible for user management, authentication with JWT, and handling secure administrative functions.
* **Database:** A **PostgreSQL** database for storing user account information, including usernames, hashed passwords, and roles.
* **Smart Contracts:** **Solidity** smart contracts deployed on the **Sepolia testnet**, which form the immutable on-chain logic of the system.
* **Blockchain Interaction:** **Ethers.js** is used on both the frontend and backend to communicate with the Ethereum blockchain.

## Key Features

Based on the project specification, the application implements the following features:

* **User Roles:** The system supports two main roles:
    * **User (Investor):** Can register, log in, connect their MetaMask wallet, view their investment portfolio, and initiate a yield claim.
    * **Admin:** Manages the system and confirms "off-chain" payments to mint tokens for investors.

* **Investment Lifecycle:**
    1.  **Registration & Login:** Users create an account which is stored in the PostgreSQL database.
    2.  **Investment Simulation:** An administrator simulates an "off-chain" payment by using an admin panel to record an investment for a user. This action calls the `recordInvestment` function on the `Treasury` smart contract.
    3.  **Token Minting:** The `Treasury` contract then calls the `mint` function on the `BEET` (ERC-20) token contract, issuing new tokens directly to the investor's wallet address.
    4.  **Portfolio Viewing:** The investor can log in, connect their wallet, and view their `BEET` token balance and the status of their investments directly from the blockchain.
    5.  **Yield Claim:** After a one-year period, the investor can call the `claimYield` function through the frontend, which updates the investment status on-chain.

## Repository Structure

This is a monorepo containing all three main components of the project:
## Technology Stack

* **Smart Contracts:** Solidity, Hardhat, OpenZeppelin
* **Backend:** Node.js, Express.js, PostgreSQL, Sequelize, JWT, Bcrypt.js, Ethers.js
* **Frontend:** React, Vite, Ethers.js, React Router

## Setup and Installation

### Prerequisites
* Node.js and npm
* A running instance of PostgreSQL
* MetaMask browser extension

### 1. Smart Contracts
1.  Navigate to the `smart-contracts` directory: `cd smart-contracts`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and add your `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY`.
4.  Compile the contracts: `npx hardhat compile`
5.  Deploy to Sepolia: `npx hardhat run scripts/deploy.js --network sepolia`

### 2. Backend
1.  Navigate to the `backend` directory: `cd backend`
2.  Install dependencies: `npm install`
3.  Create a `.env` file and configure your database connection, JWT secret, and the deployed `TREASURY_CONTRACT_ADDRESS`.
4.  Run the server: `node index.js`

### 3. Frontend
1.  Navigate to the `frontend` directory: `cd frontend`
2.  Install dependencies: `npm install`
3.  Update the smart contract addresses in `src/pages/ProfilePage.jsx`.
4.  Run the application: `npm run dev`
