// src/components/CustomerDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract, getContractInstance } from "../Contract";
import { ethers } from "ethers";
import "../styles/CustomerDashboard.css";

export default function CustomerDashboard({ account }) {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [buyForm, setBuyForm] = useState({ unitId: "", qty: "" });
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [publicPacks, setPublicPacks] = useState([]);
  const [buyRequestForm, setBuyRequestForm] = useState({
    packId: "",
    qty: "",
    wantsRetailer: false,
  });

  // map enum Role (uint in contract) -> readable string
  const roleNames = ["None", "Farmer", "Distributor", "Retailer", "Customer"];

  // shorten addresses for display
  const shorten = (addr) =>
    addr && addr !== "0x0000000000000000000000000000000000000000"
      ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
      : "Unknown";

  useEffect(() => {
    loadAvailableUnits();
    loadPurchaseHistory();
    loadPublicPacks();
  }, []);

  // ---------------- Load Available Units ----------------
  async function loadAvailableUnits() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalRetailUnits());
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const u = await contract.retailUnits(i);
        if (Number(u.unitId) !== 0 && u.available) {
          arr.push({
            unitId: Number(u.unitId),
            retailer: shorten(u.retailer),
            qty: Number(u.quantityKg),
            pricePerKg: Number(u.pricePerKg),
            ipfs: u.ipfsHash,
          });
        }
      }
      setAvailableUnits(arr);
    } catch (err) {
      console.error("Error loading units:", err);
    }
  }

  // ---------------- Buy Unit ----------------
  async function buyUnit() {
    try {
      const contract = await getContract(true);
      const unit = await contract.retailUnits(Number(buyForm.unitId));
      const price = BigInt(unit.pricePerKg);
      const qty = BigInt(buyForm.qty);
      const total = price * qty;

      const tx = await contract.buyRetailUnit(
        Number(buyForm.unitId),
        Number(buyForm.qty),
        { value: total.toString() }
      );
      await tx.wait();
      alert("Unit purchased ✅");
      loadAvailableUnits();
      loadPurchaseHistory();
    } catch (err) {
      console.error("Buy failed:", err);
      alert("Buy failed: " + (err?.message || err));
    }
  }

  // ---------------- Load Purchase History & Traceability ----------------
  async function loadPurchaseHistory() {
    try {
      const contract = await getContract(false);
      const arr = await contract.getPurchaseHistory(account);

      const mapped = await Promise.all(
        arr.map(async (p) => {
          const traceRaw = await contract.getUnitTrace(Number(p.unitId));
          
          // getUnitTrace returns: (FarmerProduct, DistributorBatch, RetailPack, RetailUnit)
          const [farmerProduct, distributorBatch, retailPack, retailUnit] = traceRaw;

          // Build trace chain with proper names and addresses
          const traceFormatted = [];
          
          // 1. Farmer → Distributor
          if (farmerProduct.batchId !== 0 && distributorBatch.batchId !== 0) {
            traceFormatted.push({
              seller: shorten(farmerProduct.farmer),
              sellerRole: "Farmer",
              buyer: shorten(distributorBatch.distributor),
              buyerRole: "Distributor",
              pricePerKg: Number(distributorBatch.purchasePricePerKg),
              stage: "Farm to Distribution"
            });
          }
          
          // 2. Distributor → Retailer (via pack)
          if (distributorBatch.batchId !== 0 && retailPack.packId !== 0) {
            traceFormatted.push({
              seller: shorten(distributorBatch.distributor),
              sellerRole: "Distributor",
              buyer: "Retailer", // Pack buyer is determined by buy request
              buyerRole: "Retailer",
              pricePerKg: Number(retailPack.pricePerKg),
              stage: "Distribution to Retail"
            });
          }
          
          // 3. Retailer → Customer (via unit)
          if (retailUnit.unitId !== 0) {
            traceFormatted.push({
              seller: shorten(retailUnit.retailer),
              sellerRole: "Retailer",
              buyer: shorten(p.buyer),
              buyerRole: "Customer",
              pricePerKg: Number(retailUnit.pricePerKg),
              stage: "Retail to Customer"
            });
          }

          return {
            purchaseId: Number(p.purchaseId),
            unitId: Number(p.unitId),
            buyer: shorten(p.buyer),
            seller: shorten(p.seller),
            qty: Number(p.qtyKg),
            pricePerKg: Number(p.pricePerKg),
            timestamp: Number(p.timestamp),
            trace: traceFormatted,
            // Additional trace info
            farmerInfo: {
              cropName: farmerProduct.cropName,
              location: farmerProduct.location,
              farmer: shorten(farmerProduct.farmer)
            },
            distributorInfo: {
              distributor: shorten(distributorBatch.distributor),
              purchasePrice: Number(distributorBatch.purchasePricePerKg)
            },
            retailerInfo: {
              retailer: shorten(retailUnit.retailer),
              retailPrice: Number(retailUnit.pricePerKg)
            }
          };
        })
      );

      setPurchaseHistory(mapped);
    } catch (err) {
      console.error("Error loading history:", err);
    }
  }

  // ---------------- Load Public Packs ----------------
  async function loadPublicPacks() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalRetailPacks());
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const p = await contract.retailPacks(i);
        if (Number(p.packId) !== 0 && Number(p.visibility) === 1 && p.available) {
          arr.push({
            packId: Number(p.packId),
            distributor: shorten(p.distributor),
            qty: Number(p.quantityKg),
            pricePerKg: Number(p.pricePerKg),
            ipfs: p.ipfsHash,
          });
        }
      }
      setPublicPacks(arr);
    } catch (err) {
      console.error("Error loading packs:", err);
    }
  }

  // ---------------- Create Buy Request ----------------
  async function createBuyRequest() {
    try {
      const contract = await getContract(true);
      const pack = await contract.retailPacks(Number(buyRequestForm.packId));
      const price = BigInt(pack.pricePerKg);
      const qty = BigInt(buyRequestForm.qty);
      const total = price * qty;

      const tx = await contract.createBuyRequest(
        Number(buyRequestForm.packId),
        Number(buyRequestForm.qty),
        buyRequestForm.wantsRetailer,
        { value: total.toString() }
      );
      await tx.wait();
      alert("Buy request created ✅");
      loadPublicPacks();
    } catch (err) {
      console.error("Buy request failed:", err);
      alert("Buy request failed: " + (err?.message || err));
    }
  }

  // ---------------- Render ----------------
  return (
    <div className="customer-dashboard">
      <h2>Customer Dashboard</h2>
      <p>
        Customer: <b>{account}</b>
      </p>

      {/* Public Packs */}
      <section>
        <h3>Public Distributor Packs (to request buy)</h3>
        <button onClick={loadPublicPacks}>Refresh</button>
        {publicPacks.map((p) => (
          <div key={p.packId}>
            PackId: {p.packId} | Distributor: {p.distributor} | Qty: {p.qty} |
            Price/Kg: {p.pricePerKg}
          </div>
        ))}
        <div>
          <input
            placeholder="packId"
            value={buyRequestForm.packId}
            onChange={(e) =>
              setBuyRequestForm({ ...buyRequestForm, packId: e.target.value })
            }
          />
          <input
            placeholder="qty"
            value={buyRequestForm.qty}
            onChange={(e) =>
              setBuyRequestForm({ ...buyRequestForm, qty: e.target.value })
            }
          />
          <label>
            Wants Retailer Role:{" "}
            <input
              type="checkbox"
              checked={buyRequestForm.wantsRetailer}
              onChange={(e) =>
                setBuyRequestForm({
                  ...buyRequestForm,
                  wantsRetailer: e.target.checked,
                })
              }
            />
          </label>
          <button onClick={createBuyRequest}>Create Buy Request</button>
        </div>
      </section>

      {/* Available Retail Units */}
      <section>
        <h3>Available Retail Units</h3>
        <button onClick={loadAvailableUnits}>Refresh</button>
        {availableUnits.map((u) => (
          <div key={u.unitId}>
            UnitId: {u.unitId} | Retailer: {u.retailer} | Qty: {u.qty} |
            Price/Kg: {u.pricePerKg}
          </div>
        ))}
      </section>

      {/* Buy Unit */}
      <section>
        <h3>Buy Unit</h3>
        <input
          placeholder="unitId"
          value={buyForm.unitId}
          onChange={(e) => setBuyForm({ ...buyForm, unitId: e.target.value })}
        />
        <input
          placeholder="qty"
          value={buyForm.qty}
          onChange={(e) => setBuyForm({ ...buyForm, qty: e.target.value })}
        />
        <button onClick={buyUnit}>Buy</button>
      </section>

      {/* Purchase History + Traceability */}
      <section>
        <h3>Purchase History & Traceability</h3>
        <button onClick={loadPurchaseHistory}>Refresh</button>
        {purchaseHistory.map((p) => (
          <div key={p.purchaseId} className="purchase-card">
            <div className="purchase-header">
              <h4>Purchase #{p.purchaseId}</h4>
              <p><strong>Unit ID:</strong> {p.unitId} | <strong>Quantity:</strong> {p.qty} kg | <strong>Price:</strong> {p.pricePerKg} wei/kg</p>
            </div>
            
            {/* Product Information */}
            <div className="product-info">
              <h5>🌱 Product Information</h5>
              <p><strong>Crop:</strong> {p.farmerInfo.cropName}</p>
              <p><strong>Farm Location:</strong> {p.farmerInfo.location}</p>
              <p><strong>Original Farmer:</strong> {p.farmerInfo.farmer}</p>
            </div>

            {/* Supply Chain Trace */}
            <div className="trace-info">
              <h5>🔍 Supply Chain Trace</h5>
              {p.trace.length === 0 ? (
                <p className="no-trace">No trace information available</p>
              ) : (
                <div className="trace-chain">
                  {p.trace.map((t, idx) => (
                    <div key={idx} className="trace-step">
                      <div className="trace-stage">{t.stage}</div>
                      <div className="trace-details">
                        <span className="seller">{t.sellerRole} ({t.seller})</span>
                        <span className="arrow">→</span>
                        <span className="buyer">{t.buyerRole} ({t.buyer})</span>
                        <span className="price">@ {t.pricePerKg} wei/kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="additional-info">
              <h5>📊 Additional Details</h5>
              <div className="info-grid">
                <div className="info-item">
                  <strong>Distributor:</strong> {p.distributorInfo.distributor}
                  <br />
                  <small>Purchase Price: {p.distributorInfo.purchasePrice} wei/kg</small>
                </div>
                <div className="info-item">
                  <strong>Retailer:</strong> {p.retailerInfo.retailer}
                  <br />
                  <small>Retail Price: {p.retailerInfo.retailPrice} wei/kg</small>
                </div>
                <div className="info-item">
                  <strong>Purchase Date:</strong> {new Date(p.timestamp * 1000).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
