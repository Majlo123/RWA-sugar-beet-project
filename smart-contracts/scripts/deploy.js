// Import ethers from the hardhat package.
import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  // Get the account (address) that will perform the deployment.
  // In the Hardhat environment, this defaults to the first account.
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy the BEET token contract.
  const beetToken = await ethers.deployContract("BEET", [deployer.address]);
  await beetToken.waitForDeployment();
  console.log("BEET token deployed to:", await beetToken.getAddress());

  // 2. Deploy the Treasury contract, passing it the BEET token address.
  const treasury = await ethers.deployContract("Treasury", [
    await beetToken.getAddress(),
    deployer.address,
  ]);
  await treasury.waitForDeployment();
  console.log("Treasury contract deployed to:", await treasury.getAddress());

  // 3. Transfer ownership of the BEET token to the Treasury contract.
  // This is the critical step we discovered during testing.
  console.log("Transferring ownership of BEET token to Treasury contract...");
  const tx = await beetToken.transferOwnership(await treasury.getAddress());
  await tx.wait(); // Wait for the transaction to be confirmed.
  console.log("Ownership transferred.");
}

// Standard Hardhat pattern for running main and catching errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});