const hre = require("hardhat");

/**
 * @title SupplyChain Deployment Script
 * @notice Deploys the SupplyChain contract and logs deployment information
 * @dev Includes proper error handling and deployment verification
 */
async function main() {
  console.log("🚀 Starting SupplyChain deployment...");
  
  try {
    // Get the contract factory
    const SupplyChain = await hre.ethers.getContractFactory("SupplyChain");
    console.log("📋 Contract factory loaded successfully");

    // Deploy the contract
    console.log("⏳ Deploying contract...");
    const supplyChain = await SupplyChain.deploy();

    // Wait for deployment to complete
    await supplyChain.waitForDeployment();
    const contractAddress = await supplyChain.getAddress();

    console.log("✅ SupplyChain deployed successfully!");
    console.log("📍 Contract Address:", contractAddress);
    console.log("🌐 Network:", hre.network.name);
    
    // Verify deployment by calling a view function
    const owner = await supplyChain.owner();
    console.log("👤 Contract Owner:", owner);
    
    // Log gas estimation for future reference
    const deploymentTx = await supplyChain.deploymentTransaction();
    if (deploymentTx) {
      console.log("⛽ Gas Used:", deploymentTx.gasLimit?.toString() || "Unknown");
    }

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

// Execute deployment with proper error handling
main()
  .then(() => {
    console.log("🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment failed:", error);
    process.exitCode = 1;
  });
