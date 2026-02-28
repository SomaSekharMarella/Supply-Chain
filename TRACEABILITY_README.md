# Traceability and QR Traceability Guide

## Purpose

This document explains:

- How traceability is implemented in the current project
- Which contract methods are used for tracing
- How frontend builds and shows the trace
- Available options for QR-based traceability (current and upgrade paths)

---

## Current Traceability Design

The project uses **on-chain relational links** between supply chain entities:

- `FarmerProduct` (origin)
- `DistributorBatch` (references farmer batch via `originBatchId`)
- `RetailPack` (references distributor batch via `distributorBatchId`)
- `RetailUnit` (references pack via `parentPackId`)
- `PurchaseRecord` (stores buyer/seller transaction history)

This gives deterministic traceability from customer-facing unit back to farm origin.

---

## Core Contract Methods Used for Traceability

From `agri-supply-chain/contracts/Supplychain.sol`:

- `getUnitTrace(uint256 unitId)`
  - Returns full chain for a unit:
    - `FarmerProduct`
    - `DistributorBatch`
    - `RetailPack`
    - `RetailUnit`
  - This is the primary method for product-level trace view.

- `getPackOrigin(uint256 packId)`
  - Returns farmer origin batch id for a distributor pack.
  - Useful for lightweight pack-level origin lookup.

- `getBatchTrace(uint256 farmerBatchId)`
  - Returns one farmer product + all related distributor batches + all related packs.
  - Useful for batch-level investigation and admin analytics.

- `getPurchaseHistory(address user)`
  - Returns purchase records where user is buyer or seller.
  - Used in UI to show commercial movement and timeline.

---

## Frontend Traceability Flow (Current)

### 1) Customer Dashboard

In `agri-frontend/src/components/CustomerDashboard.jsx`:

- Loads units from `retailUnits`
- For each visible unit, calls `getUnitTrace(unitId)`
- Extracts:
  - Product identity (`cropName`, `cropPeriod`, `location`, farmer address)
  - Distributor and retailer addresses
  - Stage prices and timestamps
- Builds a stage-wise trace object:
  - Farm to Distribution
  - Distribution to Retail
  - Retail to Customer

### 2) Retailer/Customer Pack Display

For public distributor packs:

- Reads `retailPacks(i)`
- Resolves `distributorBatchId -> originBatchId -> farmerProducts`
- Shows product name/location/image before buying (important UX fix).

### 3) Image-linked trace context

- Farmer images are uploaded to IPFS (Filebase RPC)
- CID list is stored in product `ipfsHash` field (JSON array string)
- Frontend derives gateway URLs and shows images in downstream levels

This makes traceability both **data trace + visual trace**.

---

## Data Integrity Characteristics

### Strengths

- Trace IDs are on-chain and immutable once written
- Parent-child links create verifiable chain
- Any UI can recompute trace from IDs

### Current limitations

- No explicit lot certification hash/signature model yet
- No event-indexed analytics service (subgraph/indexer) yet
- QR generation component dependency exists (`qrcode.react`) but dedicated QR screens are not yet fully integrated

---

## QR-Based Traceability: Available Options

## Option A: QR carries only `unitId` (Recommended baseline)

### QR payload

```json
{"type":"unit","id":123}
```

### Verification flow

1. Scanner reads unit id
2. App calls `getUnitTrace(123)`
3. App displays on-chain result

### Pros

- Very small QR
- Always reads latest chain state
- Easy to implement

### Cons

- Needs network access to chain RPC

---

## Option B: QR carries a deep-link URL

Example:

`https://your-domain/trace/unit/123`

### Verification flow

- Scanner opens web page
- Page fetches `getUnitTrace(123)`
- Displays result

### Pros

- Best UX for end users
- Easy to share and support on mobile

### Cons

- Requires hosting and route handling

---

## Option C: QR carries signed trace snapshot (advanced)

### QR payload

- Unit id
- Snapshot hash
- Issuer signature

### Verification flow

- App verifies signature
- Optionally compares with live on-chain data

### Pros

- Works partially offline
- Tamper-evident snapshot

### Cons

- More complex key/signature lifecycle

---

## Option D: Hybrid QR (ID + hash)

Payload contains `unitId` + optional metadata hash (e.g., farmer image metadata hash).

Good compromise between Option A and C:

- Lightweight
- Extra integrity check
- Still simple to maintain

---

## Recommended Implementation Roadmap for This Project

### Phase 1 (quick, production-friendly)

1. Generate QR for each customer-visible unit (`unitId` based)
2. Add `/trace/unit/:unitId` route in frontend
3. Use `getUnitTrace` + `getPurchaseHistory` for detailed timeline card

### Phase 2 (better trust and auditability)

1. Add trace event timeline UI (block number, tx hash, timestamp)
2. Add "Verify on Explorer" links (Etherscan)
3. Optional: include `farmerBatchId`, `packId`, `unitId` all in one view

### Phase 3 (enterprise-grade)

1. Add signed metadata for certificates (quality, compliance)
2. Add indexer/subgraph for fast trace queries and analytics
3. Add QR revocation/expiry policy (if business requires)

---

## Suggested QR Payload Standard for This Project

Use this schema:

```json
{
  "v": 1,
  "network": "sepolia",
  "contract": "0xYourContract",
  "entity": "unit",
  "unitId": 123
}
```

Why:

- Versioned (`v`) for future compatibility
- Network + contract-aware
- Prevents wrong-contract decoding

---

## Traceability Methods Summary

- **Primary on-chain trace method**: `getUnitTrace`
- **Batch analytics trace method**: `getBatchTrace`
- **Pack origin method**: `getPackOrigin`
- **Commercial movement method**: `getPurchaseHistory`
- **Visual trace support**: IPFS image CID retrieval via gateway

---

## Practical Testing Checklist

1. Farmer adds product with images
2. Distributor buys farmer batch
3. Distributor creates/list pack
4. Customer creates buy request with/without retailer role
5. Distributor approves request
6. Retailer lists unit for customers
7. Customer buys listed unit
8. Open trace view and verify all 3 stages show correct participants and prices
9. Scan QR (once implemented) and confirm same trace output

---

## Security and Reliability Notes

- Keep contract address and ABI synchronized after every redeploy.
- Frontend should gracefully handle missing historical fields in old units.
- For QR links, never trust UI-only data; always re-fetch from chain.
- For IPFS images, validate CID format before render if hardening is needed.

---

## Next Optional Enhancements

- Add dedicated `TraceabilityDashboard.jsx`
- Add QR generation/scan pages using `qrcode.react`
- Add exportable PDF trace certificate per unit
- Add multilingual consumer trace page

