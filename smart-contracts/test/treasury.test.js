import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;


describe("Treasury", function () {
  async function deployTreasuryAndTokenFixture() {
    const [owner, investor] = await ethers.getSigners();

    const BEET = await ethers.getContractFactory("BEET");
    const beetToken = await BEET.deploy(owner.address);

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(await beetToken.getAddress(), owner.address);
    await beetToken.transferOwnership(await treasury.getAddress());
    return { treasury, beetToken, owner, investor };
  }

  describe("Deployment", function () {
    it("Should set the right owner for both contracts", async function () {
      const { treasury, beetToken, owner } = await loadFixture(deployTreasuryAndTokenFixture);
      expect(await treasury.owner()).to.equal(owner.address);
      expect(await beetToken.owner()).to.equal(await treasury.getAddress());
    });
  });

  describe("recordInvestment", function () {
    it("Should allow owner to record an investment and mint correct amount of tokens", async function () {
      const { treasury, beetToken, owner, investor } = await loadFixture(deployTreasuryAndTokenFixture);

      const investmentAmountUSD = 2000;
      const expectedTokenAmount = ethers.parseUnits("2", 18);

      await treasury.connect(owner).recordInvestment(investor.address, investmentAmountUSD);

      expect(await beetToken.balanceOf(investor.address)).to.equal(expectedTokenAmount);

      const investment = await treasury.investments(0);
      expect(investment.investor).to.equal(investor.address);
      expect(investment.amountUSD).to.equal(investmentAmountUSD);
    });

    it("Should NOT allow a non-owner to record an investment", async function () {
      const { treasury, investor } = await loadFixture(deployTreasuryAndTokenFixture);
      const investmentAmountUSD = 1000;

      await expect(
        treasury.connect(investor).recordInvestment(investor.address, investmentAmountUSD)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });
});
