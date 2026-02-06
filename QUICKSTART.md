# 🚀 Quick Start Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **MetaMask** browser extension - [Install MetaMask](https://metamask.io/)
- **Git** (optional, for cloning)

## ⚡ Quick Setup (5 Minutes)

### 1. Install Dependencies

#### Backend (Smart Contracts)
```bash
cd agri-supply-chain
npm install
```

#### Frontend (React App)
```bash
cd agri-frontend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `agri-supply-chain` directory:

```env
ALCHEMY_SEPOLIA_URL=your_alchemy_sepolia_url
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key (optional)
```

### 3. Deploy Smart Contract (Optional - Contract Already Deployed)

If you need to deploy a new contract:

```bash
cd agri-supply-chain
npx hardhat run scripts/deploy.js --network sepolia
```

**Note:** The contract is already deployed at: `0x4f461A14E525DF4af4869a2f3Cf03c8905BD072A`

### 4. Update Contract Address (If Using New Deployment)

If you deployed a new contract, update the address in:
```
agri-frontend/src/contract.js
```

Change the `CONTRACT_ADDRESS` constant to your deployed contract address.

### 5. Start the Frontend

```bash
cd agri-frontend
npm run dev
```

The app will open at `http://localhost:5173` (or the port shown in terminal).

### 6. Connect MetaMask

1. Open MetaMask extension
2. Switch to **Sepolia Test Network**
3. Get Sepolia ETH from a [faucet](https://sepoliafaucet.com/)
4. Click "Connect Wallet" in the app
5. Approve the connection request

## 🎯 First Steps

### For Admin (Contract Owner)
- Connect with the wallet that deployed the contract
- You'll automatically see the Admin Dashboard
- Approve Farmer/Distributor role requests

### For New Users
1. Connect your MetaMask wallet
2. Request a role (Farmer or Distributor)
3. Wait for Admin approval
4. Start using your dashboard!

### For Customers
- No approval needed! Click "View as Customer" to browse and purchase products

## 📋 Common Commands

### Backend
```bash
# Compile contracts
npx hardhat compile

# Run tests (if available)
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia
```

### Frontend
```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## ⚠️ Troubleshooting

### MetaMask Connection Issues
- Ensure MetaMask is installed and unlocked
- Check that you're on Sepolia network
- Refresh the page and try again

### Contract Not Found
- Verify contract address in `agri-frontend/src/contract.js`
- Ensure you're connected to Sepolia network
- Check that the contract is deployed

### Transaction Failures
- Ensure you have enough Sepolia ETH for gas
- Check that you have the correct role for the action
- Verify all input fields are correctly filled

### Build Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear browser cache

## 🔗 Important Links

- **Contract Address:** `0x4f461A14E525DF4af4869a2f3Cf03c8905BD072A`
- **Network:** Sepolia Testnet
- **Frontend:** http://localhost:5173 (when running)
- **MetaMask:** https://metamask.io/
- **Sepolia Faucet:** https://sepoliafaucet.com/

## 📞 Need Help?

1. Check the detailed [README.md](./README.md) for comprehensive documentation
2. Review smart contract code in `agri-supply-chain/contracts/Supplychain.sol`
3. Check frontend components in `agri-frontend/src/components/`

---

**Ready to go!** 🎉 Connect your wallet and start exploring the agricultural supply chain platform.
