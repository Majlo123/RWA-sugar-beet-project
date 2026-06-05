require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      chainId: 137,
      accounts:
        process.env.POLYGON_PRIVATE_KEY !== undefined
          ? [process.env.POLYGON_PRIVATE_KEY]
          : [],
    },
  },
};