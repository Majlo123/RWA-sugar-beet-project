const treasuryRepository = require("../repositories/treasury.repository");

const fetchTokenPrice = async () => {
  const tokenPrice = await treasuryRepository.getTokenPrice();
  return { tokenPriceUSD: tokenPrice.toString() };
};

const recordNewInvestment = async (investorAddress, amountUSD) => {
  console.log(`Započinjem transakciju za evidentiranje investicije za ${investorAddress} u iznosu od ${amountUSD} USD...`);
  const tx = await treasuryRepository.createInvestment(investorAddress, amountUSD);
  console.log(`Transakcija uspešna! Hash: ${tx.hash}`);
  return { success: true, txHash: tx.hash };
};

module.exports = {
  fetchTokenPrice,
  recordNewInvestment,
};