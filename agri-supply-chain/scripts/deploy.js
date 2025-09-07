const { ethers } = require("hardhat");

async function main() {
  // Get the ContractFactory of the SupplyChainRoles contract
  const SupplyChainRoles = await ethers.getContractFactory("SupplyChainRoles");

  console.log("Deploying SupplyChainRoles contract...");

  // Start deployment, returning a promise that resolves to a contract object
  const supplyChainRoles = await SupplyChainRoles.deploy();

  // Wait for the deployment transaction to be mined
  await supplyChainRoles.waitForDeployment();

  console.log("SupplyChainRoles contract deployed to:", await supplyChainRoles.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});