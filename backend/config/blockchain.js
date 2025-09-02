require("dotenv").config();
const { ethers } = require("ethers");
const treasuryAbi = require("../treasuryAbi.json");

const { SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, TREASURY_CONTRACT_ADDRESS } = process.env;

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(SEPOLIA_PRIVATE_KEY, provider);
const treasuryContract = new ethers.Contract(
  TREASURY_CONTRACT_ADDRESS,
  treasuryAbi,
  signer
);

console.log("Povezan na Treasury ugovor na adresi:", TREASURY_CONTRACT_ADDRESS);

module.exports = { treasuryContract };