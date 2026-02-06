# 🌱 Agricultural Supply Chain Management System

A comprehensive blockchain-based platform for managing agricultural products from farm to consumer, built with Ethereum smart contracts and React.

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [User Roles](#user-roles)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Deployment](#deployment)
- [Usage Guide](#usage-guide)
- [Smart Contract Details](#smart-contract-details)
- [Frontend Components](#frontend-components)
- [Security Features](#security-features)
- [Future Enhancements](#future-enhancements)

## 🎯 Overview

This project implements a decentralized agricultural supply chain management system that enables:

- **Traceability**: Complete product journey from farmer to customer
- **Transparency**: All transactions recorded on blockchain
- **Role-Based Access**: Secure role management for different stakeholders
- **Marketplace**: Direct buying and selling between supply chain participants
- **Payment Processing**: Automated payment handling with fallback mechanisms

The system uses Ethereum smart contracts (Solidity) for backend logic and a React frontend for user interaction, connected via ethers.js.

## 🏗️ Architecture

### System Flow

```
Farmer → Distributor → Retailer → Customer
   ↓         ↓            ↓          ↓
Products  Batches     Packs      Units
```

### Components

1. **Smart Contract** (`Supplychain.sol`)
   - Single contract handling all supply chain logic
   - Role-based access control
   - Payment processing with pull-on-failure pattern
   - Traceability functions

2. **Frontend Application** (React + Vite)
   - Role-specific dashboards
   - Wallet integration (MetaMask)
   - Real-time blockchain interaction
   - Responsive UI

3. **Development Tools**
   - Hardhat for contract compilation and deployment
   - ethers.js for blockchain interaction
   - Vite for fast frontend development

## ✨ Features

### Core Functionalities

#### 1. Role Management
- **Admin**: Approves/revokes user roles, manages system
- **Farmer**: Adds products, sets prices, manages inventory
- **Distributor**: Purchases from farmers, creates retail packs
- **Retailer**: Buys packs from distributors, sells to customers
- **Customer**: Browses and purchases products

#### 2. Product Management
- Add products with metadata (crop name, location, harvest period)
- Set visibility (Public/Private)
- Update prices and quantities
- Track inventory levels

#### 3. Supply Chain Flow
- **Farmer** creates product batches
- **Distributor** purchases batches and splits into packs
- **Retailer** requests packs via buy requests
- **Distributor** approves requests and creates retail units
- **Customer** purchases retail units

#### 4. Traceability
- Complete product history from origin to sale
- View farmer batch details
- Track distributor batches and packs
- See retail unit information
- Purchase history tracking

#### 5. Payment System
- Automatic payment transfers
- Pull-on-failure pattern for failed transfers
- Pending withdrawals mechanism
- Secure payment handling

#### 6. Buy Request System
- Request-based purchasing for retailers
- Distributor approval workflow
- Automatic role assignment (Retailer)
- Refund mechanism for rejected requests

## 👥 User Roles

### 1. Admin (Role ID: 5)
**Responsibilities:**
- Approve/revoke user roles
- View all registered users
- Manage pending role requests
- System oversight

**Key Functions:**
- `approveRole()` - Approve user role requests
- `revokeRole()` - Revoke user roles
- `getPendingUsers()` - View pending requests
- `getUsersByRole()` - Filter users by role
- `getAllUsers()` - View all registered users

### 2. Farmer (Role ID: 1)
**Responsibilities:**
- Add agricultural products
- Set prices and quantities
- Manage product visibility
- Track inventory

**Key Functions:**
- `addProduct()` - Create new product batch
- `updateProduct()` - Modify product details
- `getMyProducts()` - View own products

**Dashboard Features:**
- Add new products form
- View all products
- Update product information
- Track sales

### 3. Distributor (Role ID: 2)
**Responsibilities:**
- Purchase batches from farmers
- Split batches into retail packs
- Manage pack visibility
- Approve buy requests from retailers

**Key Functions:**
- `buyFarmerBatch()` - Purchase from farmer
- `splitDistributorBatch()` - Create retail packs
- `listPack()` - Set pack visibility
- `approveBuyRequest()` - Approve retailer requests
- `getDistributorInventory()` - View inventory

**Dashboard Features:**
- Browse available farmer products
- Purchase batches
- Split batches into packs
- Manage pack listings
- Approve/reject buy requests
- View inventory (batches and packs)

### 4. Retailer (Role ID: 3)
**Responsibilities:**
- Request packs from distributors
- Split retail units for customers
- List products for sale
- Manage inventory

**Key Functions:**
- `createBuyRequest()` - Request pack purchase
- `splitRetailUnit()` - Split units for customers
- `listUnitForCustomers()` - Make units available
- `getRetailerInventory()` - View inventory

**Dashboard Features:**
- Browse available distributor packs
- Create buy requests
- Split units into smaller quantities
- List units for customers
- View purchase history
- Manage inventory

### 5. Customer (Role ID: 4)
**Responsibilities:**
- Browse available products
- Purchase retail units
- View purchase history
- Trace product origins

**Key Functions:**
- `buyRetailUnit()` - Purchase products
- `getPurchaseHistory()` - View past purchases
- `getUnitTrace()` - Trace product origin

**Dashboard Features:**
- Browse available products
- Purchase products
- View purchase history
- Trace product origins
- Create buy requests (to become retailer)

## 🛠️ Technology Stack

### Backend
- **Solidity** ^0.8.19 - Smart contract language
- **Hardhat** ^2.26.3 - Development environment
- **OpenZeppelin Contracts** ^4.9.6 - Security libraries
  - Ownable - Access control
  - ReentrancyGuard - Security protection
- **ethers.js** - Blockchain interaction

### Frontend
- **React** ^19.1.1 - UI framework
- **Vite** ^7.1.2 - Build tool
- **ethers** ^6.15.0 - Ethereum library
- **qrcode.react** ^4.2.0 - QR code generation

### Development Tools
- **ESLint** - Code linting
- **dotenv** - Environment variables
- **MetaMask** - Wallet integration

### Network
- **Sepolia Testnet** - Ethereum test network
- **Alchemy/Infura** - RPC provider

## 📁 Project Structure

```
Supply-Chain/
├── agri-supply-chain/          # Smart Contract Backend
│   ├── contracts/
│   │   └── Supplychain.sol     # Main smart contract
│   ├── scripts/
│   │   └── deploy.js           # Deployment script
│   ├── artifacts/              # Compiled contracts
│   ├── hardhat.config.js       # Hardhat configuration
│   └── package.json
│
├── agri-frontend/              # React Frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── FarmerDashboard.jsx
│   │   │   ├── DistributorDashboard.jsx
│   │   │   ├── RetailerDashboard.jsx
│   │   │   ├── CustomerDashboard.jsx
│   │   │   └── LandingPage.jsx
│   │   ├── styles/            # CSS files
│   │   ├── apis/              # Contract ABI
│   │   ├── contract.js        # Contract interaction utilities
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── public/                # Static assets
│   ├── vite.config.js         # Vite configuration
│   └── package.json
│
├── README.md                   # This file
└── QUICKSTART.md              # Quick start guide
```

## 🔧 Installation

### Prerequisites
- Node.js (v16+)
- npm or yarn
- MetaMask browser extension
- Sepolia testnet ETH

### Step-by-Step Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Supply-Chain
   ```

2. **Install backend dependencies**
   ```bash
   cd agri-supply-chain
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../agri-frontend
   npm install
   ```

4. **Configure environment variables**
   
   Create `.env` in `agri-supply-chain/`:
   ```env
   ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   PRIVATE_KEY=your_private_key_without_0x_prefix
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

5. **Update contract address** (if deploying new contract)
   
   Edit `agri-frontend/src/contract.js`:
   ```javascript
   export const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
   ```

## 🚀 Deployment

### Deploy Smart Contract

1. **Compile contracts**
   ```bash
   cd agri-supply-chain
   npx hardhat compile
   ```

2. **Deploy to Sepolia**
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

3. **Copy deployed address**
   - Update `CONTRACT_ADDRESS` in frontend
   - Save the address for reference

### Start Frontend

```bash
cd agri-frontend
npm run dev
```

Access at `http://localhost:5173`

## 📖 Usage Guide

### Getting Started

1. **Install MetaMask**
   - Install browser extension
   - Create/import wallet
   - Switch to Sepolia network

2. **Get Test ETH**
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Request test ETH

3. **Connect Wallet**
   - Open the application
   - Click "Connect Wallet"
   - Approve MetaMask connection

### Workflow Examples

#### Farmer Workflow
1. Request Farmer role (wait for Admin approval)
2. Add product with details
3. Set price and quantity
4. Make product public/private
5. Wait for distributor purchases

#### Distributor Workflow
1. Request Distributor role (wait for Admin approval)
2. Browse farmer products
3. Purchase batches
4. Split batches into retail packs
5. List packs (public/private)
6. Approve retailer buy requests

#### Retailer Workflow
1. Browse distributor packs
2. Create buy request (with wantsRetailer=true)
3. Wait for distributor approval
4. Receive retail units
5. Split units for customers
6. List units for sale

#### Customer Workflow
1. Browse available retail units
2. Select product and quantity
3. Purchase with MetaMask
4. View purchase history
5. Trace product origin

## 🔐 Smart Contract Details

### Key Data Structures

#### UserInfo
```solidity
struct UserInfo {
    Role role;
    bool requested;
    string idHash;
    string meta;
    uint256 appliedAt;
    bool exists;
}
```

#### FarmerProduct
```solidity
struct FarmerProduct {
    uint256 batchId;
    address farmer;
    string cropName;
    string cropPeriod;
    uint256 daysToHarvest;
    uint256 quantityKg;
    uint256 pricePerKg;
    string location;
    Visibility visibility;
    string ipfsHash;
    uint256 createdAt;
    bool active;
}
```

#### DistributorBatch
```solidity
struct DistributorBatch {
    uint256 batchId;
    uint256 originBatchId;
    address distributor;
    uint256 quantityKg;
    uint256 purchasePricePerKg;
    uint256 listedPricePerKg;
    Visibility visibility;
    uint256 createdAt;
    bool active;
}
```

#### RetailPack
```solidity
struct RetailPack {
    uint256 packId;
    uint256 distributorBatchId;
    address distributor;
    uint256 quantityKg;
    uint256 pricePerKg;
    Visibility visibility;
    address privateBuyer;
    bool available;
    string ipfsHash;
    uint256 createdAt;
}
```

#### RetailUnit
```solidity
struct RetailUnit {
    uint256 unitId;
    uint256 parentPackId;
    address retailer;
    uint256 quantityKg;
    uint256 pricePerKg;
    bool available;
    string ipfsHash;
    uint256 createdAt;
}
```

### Important Functions

#### Role Management
- `requestRole(uint8 role, string idHash, string meta)` - Request a role
- `approveRole(address user, uint8 role)` - Admin approves role
- `revokeRole(address user)` - Admin revokes role

#### Farmer Functions
- `addProduct(...)` - Add new product batch
- `updateProduct(...)` - Update product details
- `getMyProducts()` - Get farmer's products

#### Distributor Functions
- `buyFarmerBatch(uint256 farmerBatchId, uint256 qtyKg)` - Purchase from farmer
- `splitDistributorBatch(...)` - Create retail packs
- `listPack(...)` - Set pack visibility
- `approveBuyRequest(...)` - Approve retailer requests

#### Retailer Functions
- `createBuyRequest(...)` - Request pack purchase
- `splitRetailUnit(...)` - Split units
- `listUnitForCustomers(...)` - List for sale

#### Customer Functions
- `buyRetailUnit(uint256 unitId, uint256 qtyKg)` - Purchase product
- `getPurchaseHistory(address user)` - View purchases
- `getUnitTrace(uint256 unitId)` - Trace product origin

### Security Features

1. **ReentrancyGuard** - Prevents reentrancy attacks
2. **Ownable** - Admin-only functions protected
3. **Role-based Access** - Functions restricted by role
4. **Pull-on-Failure Pattern** - Safe payment handling
5. **Input Validation** - All inputs validated

## 🎨 Frontend Components

### AdminDashboard
- View approved farmers/distributors
- Manage pending requests
- Approve/revoke roles
- User statistics

### FarmerDashboard
- Add products form
- View own products
- Update product details
- Inventory management

### DistributorDashboard
- Browse farmer products
- Purchase batches
- Split into packs
- Manage buy requests
- Inventory view

### RetailerDashboard
- Browse distributor packs
- Create buy requests
- Split units
- List products
- Purchase history

### CustomerDashboard
- Browse available products
- Purchase products
- View purchase history
- Trace product origins
- Create buy requests

## 🔒 Security Features

### Smart Contract Security
- **Reentrancy Protection**: All payable functions protected
- **Access Control**: Role-based permissions
- **Input Validation**: Comprehensive checks
- **Safe Math**: Solidity 0.8+ overflow protection
- **Pull Pattern**: Safe payment withdrawals

### Frontend Security
- **Wallet Validation**: MetaMask verification
- **Network Check**: Sepolia network enforcement
- **Input Sanitization**: Form validation
- **Error Handling**: Comprehensive error messages

## 🚧 Future Enhancements

### Planned Features
- [ ] IPFS integration for product images
- [ ] QR code generation for products
- [ ] Mobile responsive design improvements
- [ ] Email notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Escrow system for disputes
- [ ] Rating and review system
- [ ] Automated testing suite
- [ ] Gas optimization improvements

### Potential Improvements
- [ ] Layer 2 integration (Polygon, Arbitrum)
- [ ] NFT-based product certificates
- [ ] Oracle integration for price feeds
- [ ] Multi-signature wallet support
- [ ] Advanced search and filtering
- [ ] Product certification system
- [ ] Supply chain analytics
- [ ] Export/import functionality

## 📝 Contract Address

**Current Deployment:**
- **Address**: `0x4f461A14E525DF4af4869a2f3Cf03c8905BD072A`
- **Network**: Sepolia Testnet
- **Explorer**: [View on Etherscan](https://sepolia.etherscan.io/address/0x4f461A14E525DF4af4869a2f3Cf03c8905BD072A)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenZeppelin for security libraries
- Hardhat team for development tools
- Ethereum Foundation for blockchain infrastructure
- React team for the frontend framework

## 📞 Support

For issues, questions, or contributions:
- Check the [QUICKSTART.md](./QUICKSTART.md) for setup help
- Review smart contract code for implementation details
- Check component files for frontend functionality

---

**Built with ❤️ for transparent agricultural supply chains**
