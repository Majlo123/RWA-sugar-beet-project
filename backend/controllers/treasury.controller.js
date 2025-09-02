const treasuryService = require("../services/treasury.service");

const getTokenPrice = async (req, res) => {
  try {
    const result = await treasuryService.fetchTokenPrice();
    res.json(result);
  } catch (error) {
    console.error("Greška pri dohvatanju cene tokena:", error);
    res.status(500).json({ error: "Došlo je do greške na serveru." });
  }
};

const recordInvestment = async (req, res) => {
  try {
    const { investorAddress, amountUSD } = req.body;
    if (!investorAddress || !amountUSD) {
      return res.status(400).json({ error: "Potrebno je uneti adresu investitora i iznos." });
    }
    const result = await treasuryService.recordNewInvestment(investorAddress, amountUSD);
    res.json(result);
  } catch (error) {
    console.error("Greška pri evidentiranju investicije:", error);
    res.status(500).json({ error: "Došlo je do greške na serveru." });
  }
};

module.exports = {
  getTokenPrice,
  recordInvestment,
};