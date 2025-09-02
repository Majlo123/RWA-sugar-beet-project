const { treasuryContract } = require("../config/blockchain");

const getTokenPrice = async () => {
  return await treasuryContract.TOKEN_PRICE_USD();
};

const createInvestment = async (investorAddress, amountUSD) => {
  const tx = await treasuryContract.recordInvestment(investorAddress, amountUSD);
  await tx.wait();
  return tx;
};

module.exports = {
  getTokenPrice,
  createInvestment,
};