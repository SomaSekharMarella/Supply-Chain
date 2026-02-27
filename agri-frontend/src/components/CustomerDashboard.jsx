// src/components/CustomerDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract, getContractInstance } from "../Contract";
import { ethers } from "ethers";
import { getProductImageUrls } from "../utils/ipfs";
import "../styles/CustomerDashboard.css";

// Product Card Component with Buy Functionality
function ProductCard({ unit, onBuy, isBuying }) {
  const [qtyInput, setQtyInput] = useState("1");
  const totalPrice = Number(unit.pricePerKg) * Number(qtyInput || 1);

  return (
    <div className="product-card">
      <div className="product-header">
        <h4>{unit.cropName}</h4>
        <span className="unit-badge">Unit #{unit.unitId}</span>
      </div>
      <div className="product-details">
        {unit.imageUrls?.[0] && (
          <div className="detail-row">
            <img
              src={unit.imageUrls[0]}
              alt={unit.cropName}
              style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8 }}
            />
          </div>
        )}
        <div className="detail-row">
          <span className="label">📍 Location:</span>
          <span className="value">{unit.location}</span>
        </div>
        <div className="detail-row">
          <span className="label">📦 Available:</span>
          <span className="value">{unit.qty} kg</span>
        </div>
        <div className="detail-row">
          <span className="label">💰 Price per Kg:</span>
          <span className="value">{unit.pricePerKg} wei</span>
        </div>
        <div className="detail-row">
          <span className="label">🏪 Retailer:</span>
          <span className="value">{unit.retailer}</span>
        </div>
      </div>
      
      {/* Purchase Section */}
      <div className="purchase-section">
        <div className="purchase-form">
          <label>Quantity (kg)</label>
          <input
            type="number"
            min="1"
            max={unit.qty}
            value={qtyInput}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || (Number(val) > 0 && Number(val) <= unit.qty)) {
                setQtyInput(val);
              }
            }}
            placeholder="Enter quantity"
            className="qty-input"
            disabled={isBuying}
          />
          {qtyInput && Number(qtyInput) > 0 && Number(qtyInput) <= unit.qty && (
            <div className="price-calculation">
              <span className="total-label">Total Price:</span>
              <span className="total-price">{totalPrice.toLocaleString()} wei</span>
            </div>
          )}
          {qtyInput && Number(qtyInput) > unit.qty && (
            <div className="error-text">Quantity exceeds available stock</div>
          )}
          <button
            onClick={() => onBuy(unit.unitId, qtyInput || "1")}
            disabled={isBuying || !qtyInput || Number(qtyInput) <= 0 || Number(qtyInput) > unit.qty}
            className="buy-button"
          >
            {isBuying ? "⏳ Processing..." : "🛒 Buy Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [buyingUnits, setBuyingUnits] = useState({}); // Track which units are being purchased

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

  // ---------------- Load Available Units with Product Names ---------------- 
  async function loadAvailableUnits() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalRetailUnits());
      const arr = [];
      
      for (let i = 1; i <= total; i++) {
        const u = await contract.retailUnits(i);
        if (Number(u.unitId) !== 0 && u.available && u.listedForCustomers) {
          // Get trace to find product name
          let cropName = "Unknown Product";
          let location = "Unknown";
          let imageUrls = [];
          try {
            const trace = await contract.getUnitTrace(Number(u.unitId));
            if (trace[0].batchId !== 0) {
              cropName = trace[0].cropName || "Unknown Product";
              location = trace[0].location || "Unknown";
              imageUrls = getProductImageUrls(trace[0].ipfsHash);
            }
          } catch (err) {
            console.warn("Could not fetch trace for unit:", i, err);
          }
          
          arr.push({
            unitId: Number(u.unitId),
            retailer: shorten(u.retailer),
            qty: Number(u.quantityKg),
            pricePerKg: Number(u.pricePerKg),
            ipfs: u.ipfsHash,
            cropName: cropName,
            location: location,
            imageUrls: imageUrls,
          });
        }
      }
      setAvailableUnits(arr);
    } catch (err) {
      console.error("Error loading units:", err);
    }
  }

  // ---------------- Buy Unit ----------------
  async function buyUnit(unitId, qty) {
    try {
      setBuyingUnits(prev => ({ ...prev, [unitId]: true }));
      const contract = await getContract(true);
      const unit = await contract.retailUnits(Number(unitId));
      const price = BigInt(unit.pricePerKg);
      const quantity = BigInt(qty);
      const total = price * quantity;

      const tx = await contract.buyRetailUnit(
        Number(unitId),
        Number(qty),
        { value: total.toString() }
      );
      await tx.wait();
      alert(`✅ Successfully purchased ${qty} kg of product!`);
      loadAvailableUnits();
      loadPurchaseHistory();
      setBuyForm({ unitId: "", qty: "" });
    } catch (err) {
      console.error("Buy failed:", err);
      alert("Purchase failed: " + (err?.message || err));
    } finally {
      setBuyingUnits(prev => ({ ...prev, [unitId]: false }));
    }
  }

  // Quick buy with default quantity
  async function quickBuy(unitId) {
    const unit = availableUnits.find(u => u.unitId === unitId);
    if (unit) {
      const defaultQty = Math.min(1, unit.qty); // Buy 1 kg or available quantity
      await buyUnit(unitId, defaultQty);
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
              stage: "Farm to Distribution",
              timestamp: Number(distributorBatch.createdAt || 0)
            });
          }
          
          // 2. Distributor → Retailer (via pack)
          if (distributorBatch.batchId !== 0 && retailPack.packId !== 0) {
            traceFormatted.push({
              seller: shorten(distributorBatch.distributor),
              sellerRole: "Distributor",
              buyer: shorten(retailUnit.retailer),
              buyerRole: "Retailer",
              pricePerKg: Number(retailPack.pricePerKg),
              stage: "Distribution to Retail",
              timestamp: Number(retailPack.createdAt || 0)
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
              stage: "Retail to Customer",
              timestamp: Number(p.timestamp)
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
            // Product Information
            farmerInfo: {
              cropName: farmerProduct.cropName || "Unknown",
              cropPeriod: farmerProduct.cropPeriod || "Unknown",
              location: farmerProduct.location || "Unknown",
              farmer: shorten(farmerProduct.farmer),
              daysToHarvest: Number(farmerProduct.daysToHarvest || 0)
            },
            distributorInfo: {
              distributor: shorten(distributorBatch.distributor),
              purchasePrice: Number(distributorBatch.purchasePricePerKg || 0)
            },
            retailerInfo: {
              retailer: shorten(retailUnit.retailer),
              retailPrice: Number(retailUnit.pricePerKg || 0)
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
          let cropName = "Unknown Product";
          let location = "Unknown";
          let imageUrls = [];
          try {
            const distributorBatch = await contract.distributorBatches(Number(p.distributorBatchId));
            if (distributorBatch.batchId !== 0) {
              const farmerProduct = await contract.farmerProducts(Number(distributorBatch.originBatchId));
              if (farmerProduct.batchId !== 0) {
                cropName = farmerProduct.cropName || "Unknown Product";
                location = farmerProduct.location || "Unknown";
                imageUrls = getProductImageUrls(farmerProduct.ipfsHash);
              }
            }
          } catch (err) {
            console.warn("Could not load pack product details:", err);
          }

          arr.push({
            packId: Number(p.packId),
            distributor: shorten(p.distributor),
            qty: Number(p.quantityKg),
            pricePerKg: Number(p.pricePerKg),
            ipfs: p.ipfsHash,
            cropName: (cropName || "").trim(),
            location,
            imageUrls,
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
      setBuyRequestForm({ packId: "", qty: "", wantsRetailer: false });
    } catch (err) {
      console.error("Buy request failed:", err);
      alert("Buy request failed: " + (err?.message || err));
    }
  }

  // ---------------- Render ----------------
  return (
    <div className="customer-dashboard">
      <h2>🛒 Customer Dashboard</h2>
      <p>
        Customer: <b>{account}</b>
      </p>

      {/* Distributor Packs + Retailer Role Request */}
      <section>
        <div className="section-header">
          <h3>📦 Public Distributor Packs</h3>
          <button onClick={loadPublicPacks} className="refresh-button">🔄 Refresh</button>
        </div>
        <p className="section-description">
          Buy from a distributor and enable <b>Wants Retailer Role</b> to become a retailer after distributor approval.
        </p>

        {publicPacks.length === 0 ? (
          <div className="empty-state">
            <p>No public distributor packs available.</p>
          </div>
        ) : (
          <div className="products-grid">
            {publicPacks.map((p) => {
              const displayName =
                (p.cropName || "").trim() || `Product (Pack #${p.packId})`;
              return (
              <div key={p.packId} className="product-card">
                <div className="product-header">
                  <h4>{displayName}</h4>
                  <span className="unit-badge">Pack #{p.packId}</span>
                </div>
                <div className="product-details">
                  {p.imageUrls?.[0] && (
                    <div className="detail-row">
                      <img
                        src={p.imageUrls[0]}
                        alt={p.cropName}
                        style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8 }}
                      />
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">🌾 Product:</span>
                    <span className="value">{displayName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">📍 Location:</span>
                    <span className="value">{p.location}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">📦 Available:</span>
                    <span className="value">{p.qty} kg</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">💰 Price per Kg:</span>
                    <span className="value">{p.pricePerKg} wei</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">🚚 Distributor:</span>
                    <span className="value">{p.distributor}</span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        <div className="form">
          <div className="form-field">
            <label>Pack ID</label>
            <input
              placeholder="Enter distributor pack ID"
              value={buyRequestForm.packId}
              onChange={(e) => setBuyRequestForm({ ...buyRequestForm, packId: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Quantity (Kg)</label>
            <input
              type="number"
              placeholder="Enter quantity"
              value={buyRequestForm.qty}
              onChange={(e) => setBuyRequestForm({ ...buyRequestForm, qty: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={buyRequestForm.wantsRetailer}
                onChange={(e) =>
                  setBuyRequestForm({ ...buyRequestForm, wantsRetailer: e.target.checked })
                }
              />{" "}
              Wants Retailer Role
            </label>
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button
              onClick={createBuyRequest}
              disabled={!buyRequestForm.packId || !buyRequestForm.qty}
              className="btn-primary"
            >
              📝 Create Buy Request
            </button>
          </div>
        </div>
      </section>

      {/* Available Retail Units */}
      <section>
        <div className="section-header">
          <h3>🛍️ Available Products</h3>
          <button onClick={loadAvailableUnits} className="refresh-button">🔄 Refresh</button>
        </div>
        
        {availableUnits.length === 0 ? (
          <div className="empty-state">
            <p>No products available at the moment.</p>
          </div>
        ) : (
          <div className="products-grid">
            {availableUnits.map((u) => (
              <ProductCard 
                key={u.unitId} 
                unit={u} 
                onBuy={buyUnit}
                isBuying={buyingUnits[u.unitId] || false}
              />
            ))}
          </div>
        )}
      </section>

      {/* Alternative Buy Method - Manual Entry */}
      <section>
        <h3>🛒 Purchase by Unit ID (Alternative Method)</h3>
        <p className="section-description">If you know the Unit ID, you can purchase directly using this form:</p>
        <div className="form">
          <div className="form-field">
            <label>Unit ID</label>
            <input
              placeholder="Enter unit ID"
              value={buyForm.unitId}
              onChange={(e) => setBuyForm({ ...buyForm, unitId: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Quantity (Kg)</label>
            <input
              type="number"
              placeholder="Enter quantity"
              value={buyForm.qty}
              onChange={(e) => setBuyForm({ ...buyForm, qty: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button 
              onClick={() => buyUnit(buyForm.unitId, buyForm.qty)} 
              disabled={!buyForm.unitId || !buyForm.qty || buyingUnits[buyForm.unitId]}
              className="btn-primary"
            >
              {buyingUnits[buyForm.unitId] ? "⏳ Processing..." : "🛒 Buy Now"}
            </button>
          </div>
        </div>
      </section>

      {/* Purchase History + Traceability */}
      <section>
        <div className="section-header">
          <h3>📜 Purchase History & Traceability</h3>
          <button onClick={loadPurchaseHistory} className="refresh-button">🔄 Refresh</button>
        </div>
        
        {purchaseHistory.length === 0 ? (
          <div className="empty-state">
            <p>No purchase history yet.</p>
          </div>
        ) : (
          purchaseHistory.map((p) => (
            <div key={p.purchaseId} className="purchase-card">
              <div className="purchase-header">
                <h4>Purchase #{p.purchaseId}</h4>
                <p className="purchase-meta">
                  <strong>Unit ID:</strong> {p.unitId} | <strong>Quantity:</strong> {p.qty} kg | 
                  <strong> Price:</strong> {p.pricePerKg} wei/kg
                </p>
              </div>
              
              {/* Product Information */}
              <div className="product-info">
                <h5>🌱 Product Information</h5>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Crop Name:</strong> {p.farmerInfo.cropName}
                  </div>
                  <div className="info-item">
                    <strong>Crop Period:</strong> {p.farmerInfo.cropPeriod}
                  </div>
                  <div className="info-item">
                    <strong>Farm Location:</strong> {p.farmerInfo.location}
                  </div>
                  <div className="info-item">
                    <strong>Days to Harvest:</strong> {p.farmerInfo.daysToHarvest} days
                  </div>
                  <div className="info-item">
                    <strong>Original Farmer:</strong> {p.farmerInfo.farmer}
                  </div>
                </div>
              </div>

              {/* Supply Chain Trace */}
              <div className="trace-info">
                <h5>🔍 Complete Supply Chain Trace</h5>
                {p.trace.length === 0 ? (
                  <p className="no-trace">No trace information available</p>
                ) : (
                  <div className="trace-chain">
                    {p.trace.map((t, idx) => (
                      <div key={idx} className="trace-step">
                        <div className="trace-stage">{t.stage}</div>
                        <div className="trace-details">
                          <div className="trace-participant">
                            <span className="role-badge seller">{t.sellerRole}</span>
                            <span className="address">{t.seller}</span>
                          </div>
                          <span className="arrow">→</span>
                          <div className="trace-participant">
                            <span className="role-badge buyer">{t.buyerRole}</span>
                            <span className="address">{t.buyer}</span>
                          </div>
                          <span className="price-badge">@{t.pricePerKg} wei/kg</span>
                        </div>
                        {t.timestamp > 0 && (
                          <div className="trace-timestamp">
                            {new Date(t.timestamp * 1000).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="additional-info">
                <h5>📊 Transaction Details</h5>
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
                    <strong>Purchase Date:</strong>
                    <br />
                    <small>{new Date(p.timestamp * 1000).toLocaleString()}</small>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
