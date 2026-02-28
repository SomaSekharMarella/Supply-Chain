# Agri Frontend Context Guide

This document gives an in-depth overview of the `agri-frontend` codebase so you can plan UI/UX improvements (colors, typography, spacing, layout system) without re-reading every file.

---

## 1) Frontend Purpose

`agri-frontend` is a React + Vite decentralized app UI for a blockchain-based supply-chain workflow:

- Farmer adds products
- Distributor buys/splits/lists packs
- Retailer buys/splits/lists units
- Customer buys units and views full traceability
- Admin approves role requests
- Public users can verify a unit trace via a QR-powered route (no wallet needed)

---

## 2) Tech Stack

- React 19 (`react`, `react-dom`)
- Vite 7
- React Router DOM 7
- Ethers v6
- `qrcode.react` for QR generation
- CSS files (global + per-component styles, no Tailwind)
- IPFS integration via Filebase RPC + gateway

Reference: `agri-frontend/package.json`

---

## 3) Top-Level Structure

```text
agri-frontend/
  .env
  index.html
  package.json
  vite.config.js
  vercel.json
  src/
    App.jsx
    App.css
    Contract.js
    index.css
    main.jsx
    apis/
      SupplyChain.json
    assets/
      react.svg
    components/
      AdminDashboard.jsx
      CustomerDashboard.jsx
      DistributorDashboard.jsx
      FarmerDashboard.jsx
      LandingPage.jsx
      RetailerDashboard.jsx
      TraceUnitPage.jsx
    styles/
      AdminDashboard.css
      CustomerDashboard.css
      DistributorDashboard.css
      FarmerDashboard.css
      LandingPage.css
      RetailerDashboard.css
      TraceUnitPage.css
    utils/
      ipfs.js
      url.js
```

---

## 4) App Entry + Routing

### `src/main.jsx`

- Wraps app in `BrowserRouter`
- Imports global token file `index.css`
- Renders `App.jsx` root

### `src/App.jsx`

Contains two layers:

1. **`App`**: wallet-gated role dashboard logic  
2. **`RootApp`**: router wrapper exposing public trace route

Routes:

- `/trace/unit/:unitId` -> `TraceUnitPage` (public read-only page)
- `/*` -> `App` (wallet/role-based dashboards)

Important behavior:

- If wallet not connected, app shows `LandingPage`
- Connected wallet role decides dashboard:
  - Admin
  - Farmer
  - Distributor
  - Retailer
  - Customer
- Users without role can request role or view as customer

---

## 5) Contract Layer (Blockchain Access)

### `src/Contract.js`

Primary contract access utility.

- `CONTRACT_ADDRESS` and ABI binding (`SupplyChain.json`)
- `getContract(withSigner)`:
  - Uses MetaMask (`window.ethereum`)
  - signer for writes, provider for wallet reads
- `getContractInstance(withSigner)`:
  - wrapper with error handling
- Read-only flow for public trace:
  - `getReadOnlyProvider()` (Sepolia RPC)
  - `getReadOnlyContract()`
  - `getUnitTraceReadOnly(unitId)`

Read-only fallback RPC:

- `VITE_SEPOLIA_RPC_URL`
- default: `https://ethereum-sepolia.publicnode.com`

---

## 6) Environment Variables

From `.env`:

- `VITE_IPFS_GATEWAY` -> convert IPFS CIDs to image URLs
- `VITE_IPFS_RPC_URL` -> Filebase RPC endpoint
- `VITE_IPFS_RPC_AUTH` -> Filebase auth token
- `VITE_PUBLIC_WEB_URL` -> public base URL used in QR link generation

If this URL points to production domain, QR links are device/browser independent.

---

## 7) Utility Modules

### `src/utils/ipfs.js`

Handles:

- Uploading images to Filebase/IPFS
- CID encoding for on-chain storage
- Gateway URL generation for display

Used mainly in Farmer, Distributor, Retailer, Customer, and Trace pages.

### `src/utils/url.js`

- `getPublicBaseUrl()`:
  - Uses `VITE_PUBLIC_WEB_URL` if present
  - Falls back to current `window.location.origin`

Used by `TraceUnitPage` for generating QR link URL.

---

## 8) Component-by-Component Breakdown

## `components/LandingPage.jsx`

Role:

- First screen before wallet connection.

Main section:

- App intro + connect button (`onConnect` callback)

Style:

- `styles/LandingPage.css`

---

## `components/AdminDashboard.jsx`

Role:

- Admin controls role approval and user monitoring.

Main sections:

- Approved Farmers
- Approved Distributors
- Pending Role Requests

Contract interaction examples:

- `getUsersByRole()`
- `getPendingUsers()`
- `approveRole()`

Style:

- `styles/AdminDashboard.css`

---

## `components/FarmerDashboard.jsx`

Role:

- Farmer creates/listings products and manages own product list.

Main sections:

- Add Product form
- My Products listing

Key actions:

- Upload images to IPFS
- call `addProduct(...)`
- fetch `getMyProducts()`

Style:

- `styles/FarmerDashboard.css`

---

## `components/DistributorDashboard.jsx`

Role:

- Distributor buys farmer products, manages batches/packs, approves requests.

Main sections:

- Public Farmer Batches
- Distributor Inventory
- Split Distributor Batch
- List Pack (public/private)
- Pending Buy Requests

Key contract calls:

- `buyFarmerBatch`
- `getDistributorInventory`
- `splitDistributorBatch`
- `listPack`
- `getPendingRequestsForDistributor`
- `approveBuyRequest`

Style:

- `styles/DistributorDashboard.css`

---

## `components/RetailerDashboard.jsx`

Role:

- Retailer buys packs, manages units, lists units to customers.

Main sections:

- Public Distributor Packs
- Retailer Inventory
- Split Unit
- List Unit for Customers
- Purchase History

Key contract calls:

- `createBuyRequest`
- `getRetailerInventory`
- `splitRetailUnit`
- `listUnitForCustomers`
- `getPurchaseHistory`

Style:

- `styles/RetailerDashboard.css`

---

## `components/CustomerDashboard.jsx`

Role:

- Customer marketplace + purchases + traceability.

Main sections:

- Public Distributor Packs (retailer-role request path)
- Available Retail Units
- Manual Purchase by Unit ID
- Purchase History & Traceability timeline

Important UX/action:

- `View Trace + QR Code` button navigates to `/trace/unit/:unitId`

Key contract calls:

- `totalRetailUnits`, `retailUnits`, `buyRetailUnit`
- `getPurchaseHistory`
- `getUnitTrace`
- `totalRetailPacks`, `retailPacks`
- `distributorBatches`, `farmerProducts`

Style:

- `styles/CustomerDashboard.css`

---

## `components/TraceUnitPage.jsx`

Role:

- Public verification page for scanned QR links.

Main sections:

- QR code card (share URL)
- Product summary (crop/location/farmer + IPFS image)
- Supply chain timeline
- Price breakdown

Data source:

- `getUnitTraceReadOnly(unitId)` via RPC (no MetaMask)

Routing:

- URL param `unitId` from `/trace/unit/:unitId`

Style:

- `styles/TraceUnitPage.css`

---

## 9) Styling System Overview

### Global Layers

- `index.css`:
  - design tokens in `:root` (colors, shadows, base typography)
- `App.css`:
  - app shell, header, global forms/buttons, role request styles

### Component Layers

- Each dashboard/major page has one dedicated CSS file in `src/styles/`

Current state:

- Visual design is functional but heavily duplicated:
  - many repeated card/button/form styles across dashboards
  - mixed naming conventions (`card`, `product-card`, `purchase-card`, etc.)

This is the key reason UI feels inconsistent.

---

## 10) Data Flow Summary

### Wallet-required actions

- Dashboard buttons -> component handler -> `getContract(true)` -> tx -> `await tx.wait()` -> reload section data

### Read actions (inside wallet area)

- component mount/refresh -> `getContract(false)` -> fetch arrays/structs -> map to UI model -> render cards

### Public trace actions (no wallet)

- browser opens `/trace/unit/:unitId` -> `TraceUnitPage` -> `getUnitTraceReadOnly()` -> map tuple into timeline + price + images -> render

---

## 11) Deployment Notes (Important for QR)

- For React Router deep links (`/trace/unit/:id`) to work in production, SPA rewrite is required.
- Config file: `agri-frontend/vercel.json`
- Root-level fallback config also exists: `vercel.json`

Production checks:

1. `https://<domain>/` loads app  
2. `https://<domain>/trace/unit/1` does not 404  
3. QR text under code shows production domain, not localhost

---

## 12) Suggested Next UI Phase (for design discussion)

When you are ready for implementation, good next steps are:

- Define a design system layer:
  - color scale
  - typography scale
  - spacing scale
  - border radius/shadow system
- Create shared UI classes/components:
  - `Card`, `SectionHeader`, `PrimaryButton`, `EmptyState`, `Badge`
- Refactor dashboards to use shared patterns first, then apply theme updates.

This sequence gives a clean visual upgrade without breaking blockchain logic.

