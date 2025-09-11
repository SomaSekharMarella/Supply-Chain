const hre = require("hardhat");

async function main() {
  const SupplyChain = await hre.ethers.getContractFactory("SupplyChain");
  const supplyChain = await SupplyChain.deploy();

  // Wait for deployment to complete
  await supplyChain.waitForDeployment();

  console.log("✅ SupplyChain deployed to:", await supplyChain.getAddress());
}

// Run with: npx hardhat run scripts/deploy.js --network sepolia
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
