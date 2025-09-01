// Uvozimo ethers iz hardhat biblioteke
import { ethers } from "hardhat";

async function main() {
  // Dobijamo nalog (adresu) koji će izvršiti deployment.
  // U Hardhat okruženju, ovo je podrazumevano prvi nalog.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy-ujemo BEET token ugovor
  const beetToken = await ethers.deployContract("BEET", [deployer.address]);
  await beetToken.waitForDeployment();
  console.log("BEET token deployed to:", await beetToken.getAddress());

  // 2. Deploy-ujemo Treasury ugovor, dajući mu adresu BEET tokena
  const treasury = await ethers.deployContract("Treasury", [
    await beetToken.getAddress(),
    deployer.address,
  ]);
  await treasury.waitForDeployment();
  console.log("Treasury contract deployed to:", await treasury.getAddress());

  // 3. Prenosimo vlasništvo nad BEET tokenom na Treasury ugovor
  // Ovo je ključan korak koji smo otkrili tokom testiranja!
  console.log("Transferring ownership of BEET token to Treasury contract...");
  const tx = await beetToken.transferOwnership(await treasury.getAddress());
  await tx.wait(); // Čekamo da se transakcija potvrdi
  console.log("Ownership transferred.");
}

// Standardni Hardhat obrazac za pokretanje main funkcije i hvatanje grešaka
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});