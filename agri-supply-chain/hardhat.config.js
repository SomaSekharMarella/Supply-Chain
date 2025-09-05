require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load environment variables

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};