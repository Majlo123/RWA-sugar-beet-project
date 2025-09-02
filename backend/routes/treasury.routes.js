const express = require("express");
const router = express.Router();
const treasuryController = require("../controllers/treasury.controller");

router.get("/token-price", treasuryController.getTokenPrice);
router.post("/record-investment", treasuryController.recordInvestment);

module.exports = router;