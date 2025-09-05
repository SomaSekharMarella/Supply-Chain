const { ethers } = require("hardhat");

async function main() {
  // Get the deployer's account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Get the ContractFactory for our AgriLot contract
  const AgriLot = await ethers.getContractFactory("AgriLot");

  // Deploy the contract
  console.log("Deploying AgriLot...");
  const agriLot = await AgriLot.deploy();

  // Wait for the deployment to be finalized on the blockchain
  await agriLot.waitForDeployment();

  // Get the contract's address
  const contractAddress = await agriLot.getAddress();
  console.log("AgriLot contract deployed to:", contractAddress);
}

// This pattern is recommended to properly handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});