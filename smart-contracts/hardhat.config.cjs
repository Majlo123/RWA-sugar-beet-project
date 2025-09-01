require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Uvozimo dotenv paket

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      // Koristimo URL iz .env fajla
      url: process.env.SEPOLIA_RPC_URL || "",
      // Koristimo privatni ključ iz .env fajla
      accounts:
        process.env.SEPOLIA_PRIVATE_KEY !== undefined
          ? [process.env.SEPOLIA_PRIVATE_KEY]
          : [],
    },
  },
};