// Uvozimo potrebne biblioteke
require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const treasuryAbi = require("./treasuryAbi.json");

// Učitavamo podatke iz .env fajla
const { SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY, TREASURY_CONTRACT_ADDRESS } = process.env;

// Inicijalizujemo Express aplikaciju
const app = express();
const PORT = process.env.PORT || 5000;

// Podešavamo konekciju sa Sepolia mrežom
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(SEPOLIA_PRIVATE_KEY, provider);
const treasuryContract = new ethers.Contract(
  TREASURY_CONTRACT_ADDRESS,
  treasuryAbi,
  signer
);

console.log("Povezan na Treasury ugovor na adresi:", TREASURY_CONTRACT_ADDRESS);

// Kreiramo testnu rutu da proverimo konekciju sa ugovorom
app.get("/token-price", async (req, res) => {
  try {
    // Pozivamo javnu, read-only funkciju sa našeg ugovora
    const tokenPrice = await treasuryContract.TOKEN_PRICE_USD();
    
    // Vraćamo rezultat kao JSON. BigInt pretvaramo u string.
    res.json({ tokenPriceUSD: tokenPrice.toString() });
  } catch (error) {
    console.error("Greška pri dohvatanju cene tokena:", error);
    res.status(500).json({ error: "Došlo je do greške na serveru." });
  }
});

// Pokrećemo server
app.listen(PORT, () => {
  console.log(`Server sluša na portu ${PORT}`);
});