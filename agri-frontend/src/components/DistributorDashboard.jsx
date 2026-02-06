// src/components/DistributorDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract, getContractInstance } from "../Contract";
import { ethers } from "ethers";
import "../styles/DistributorDashboard.css";

export default function DistributorDashboard({ account }) {
  const [publicFarmerProducts, setPublicFarmerProducts] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [distributorInventory, setDistributorInventory] = useState({
    batches: [],
    packs: [],
  });
  const [splitForm, setSplitForm] = useState({
    distributorBatchId: "",
    quantitiesCSV: "",
    pricesCSV: "",
    ipfsCSV: "",
  });
  const [packListForm, setPackListForm] = useState({
    packId: "",
    visibility: "1",
    privateAddr: "",
  });
  const [pendingRequests, setPendingRequests] = useState([]);

  // UI states for collapsible sections
  const [showFarmerBatches, setShowFarmerBatches] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  useEffect(() => {
    loadPublicFarmerProducts();
    loadInventory();
    loadPendingRequests();
  }, []);

  async function loadPublicFarmerProducts() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalFarmerProducts());
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const p = await contract.farmerProducts(i);
        if (p.batchId !== 0 && Number(p.visibility) === 1 && p.active) {
          arr.push({
            batchId: Number(p.batchId),
            farmer: p.farmer,
            cropName: p.cropName,
            qty: Number(p.quantityKg),
            pricePerKg: Number(p.pricePerKg),
            ipfs: p.ipfsHash,
          });
        }
      }
      setPublicFarmerProducts(arr);
    } catch (err) {
      console.error(err);
    }
  }

  async function buyBatch() {
    try {
      const contract = await getContract(true);
      const batch = await contract.farmerProducts(Number(selectedBatchId));
      const price = BigInt(batch.pricePerKg);
      const qty = BigInt(buyQty);
      const total = price * qty;
      const tx = await contract.buyFarmerBatch(
        Number(selectedBatchId),
        Number(buyQty),
        { value: total.toString() }
      );
      await tx.wait();
      alert("Batch purchased");
      loadPublicFarmerProducts();
      loadInventory();
    } catch (err) {
      console.error(err);
      alert("Buy failed: " + (err?.message || err));
    }
  }

  async function loadInventory() {
    try {
      const contract = await getContract(false);
      const res = await contract.getDistributorInventory(account);
      
      // Load batches with product info
      const batches = await Promise.all(
        res[0].map(async (b) => {
          let cropName = "Unknown";
          let location = "Unknown";
          try {
            const farmerProduct = await contract.farmerProducts(Number(b.originBatchId));
            if (farmerProduct.batchId !== 0) {
              cropName = farmerProduct.cropName || "Unknown";
              location = farmerProduct.location || "Unknown";
            }
          } catch (err) {
            console.warn("Could not fetch farmer product:", err);
          }
          
          return {
            batchId: Number(b.batchId),
            originBatchId: Number(b.originBatchId),
            qty: Number(b.quantityKg),
            purchasePrice: Number(b.purchasePricePerKg),
            active: b.active,
            cropName: cropName,
            location: location,
          };
        })
      );
      
      // Load packs with product info
      const packs = await Promise.all(
        res[1].map(async (p) => {
          let cropName = "Unknown";
          let location = "Unknown";
          try {
            const distributorBatch = await contract.distributorBatches(Number(p.distributorBatchId));
            if (distributorBatch.batchId !== 0) {
              const farmerProduct = await contract.farmerProducts(Number(distributorBatch.originBatchId));
              if (farmerProduct.batchId !== 0) {
                cropName = farmerProduct.cropName || "Unknown";
                location = farmerProduct.location || "Unknown";
              }
            }
          } catch (err) {
            console.warn("Could not fetch product info:", err);
          }
          
          return {
            packId: Number(p.packId),
            distributorBatchId: Number(p.distributorBatchId),
            qty: Number(p.quantityKg),
            pricePerKg: Number(p.pricePerKg),
            available: p.available,
            visibility: Number(p.visibility),
            privateBuyer: p.privateBuyer,
            cropName: cropName,
            location: location,
          };
        })
      );
      
      setDistributorInventory({ batches, packs });
    } catch (err) {
      console.error(err);
    }
  }

  async function splitDistributor() {
    try {
      const contract = await getContract(true);
      const qtys = splitForm.quantitiesCSV.split(",").map((s) => Number(s.trim()));
      const prices = splitForm.pricesCSV.split(",").map((s) => Number(s.trim()));
      const ipfs = splitForm.ipfsCSV.split(",").map((s) => s.trim());
      const tx = await contract.splitDistributorBatch(
        Number(splitForm.distributorBatchId),
        qtys,
        prices,
        ipfs
      );
      await tx.wait();
      alert("Split created");
      setSplitForm({
        distributorBatchId: "",
        quantitiesCSV: "",
        pricesCSV: "",
        ipfsCSV: "",
      });
      loadInventory();
    } catch (err) {
      console.error(err);
      alert("Split failed: " + (err?.message || err));
    }
  }

  async function listPack() {
    try {
      const contract = await getContract(true);
      const tx = await contract.listPack(
        Number(packListForm.packId),
        Number(packListForm.visibility),
        packListForm.privateAddr || ethers.ZeroAddress
      );
      await tx.wait();
      alert("Pack listed");
      loadInventory();
    } catch (err) {
      console.error(err);
      alert("List failed: " + (err?.message || err));
    }
  }

  async function loadPendingRequests() {
    try {
      const contract = await getContract(false);
      const arr = await contract.getPendingRequestsForDistributor(account);
      const mapped = arr.map((r) => ({
        requestId: Number(r.requestId),
        packId: Number(r.packId),
        requester: r.requester,
        qtyKg: Number(r.qtyKg),
        wantsRetailer: r.wantsRetailer,
        amountPaid: Number(r.amountPaid),
      }));
      setPendingRequests(mapped);
    } catch (err) {
      console.error(err);
    }
  }

  async function resolveRequest(requestId, accept) {
    try {
      const contract = await getContract(true);
      const tx = await contract.approveBuyRequest(Number(requestId), accept);
      await tx.wait();
      alert("Request resolved");
      loadInventory();
      loadPendingRequests();
    } catch (err) {
      console.error(err);
      alert("Resolve failed: " + (err?.message || err));
    }
  }

  return (
    <div className="distributor-dashboard">
      <h2>Distributor Dashboard</h2>
      <p>
        Distributor: <b>{account}</b>
      </p>

      {/* Collapsible Section 1 */}
      <button
        className="toggle-btn"
        onClick={() => setShowFarmerBatches(!showFarmerBatches)}
      >
        {showFarmerBatches ? "▼" : "►"} Public Farmer Batches
      </button>
      {showFarmerBatches && (
        <section className="section-content">
          <button onClick={loadPublicFarmerProducts}>Refresh list</button>
          {publicFarmerProducts.length === 0 ? (
            <div className="empty-state">
              <p>No public farmer batches available</p>
            </div>
          ) : (
            <div className="products-grid">
              {publicFarmerProducts.map((p) => (
                <div key={p.batchId} className="product-card">
                  <div className="product-header">
                    <h5>{p.cropName}</h5>
                    <span className="batch-badge">Batch #{p.batchId}</span>
                  </div>
                  <div className="product-details">
                    <p><strong>Quantity:</strong> {p.qty} kg</p>
                    <p><strong>Price per Kg:</strong> {p.pricePerKg} wei</p>
                    <p><strong>Farmer:</strong> {p.farmer}</p>
                    {p.ipfs && <p><strong>IPFS:</strong> <small>{p.ipfs}</small></p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="distributor-form">
            <h4>Buy Farmer Batch</h4>
            <div className="form-field">
              <label>Farmer Batch ID</label>
              <input
                placeholder="Enter batch ID"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Quantity (Kg)</label>
              <input
                placeholder="Enter quantity"
                value={buyQty}
                onChange={(e) => setBuyQty(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>&nbsp;</label>
              <button onClick={buyBatch} className="btn-primary">Buy Batch</button>
            </div>
          </div>
        </section>
      )}

      {/* Collapsible Section 2 */}
      <button
        className="toggle-btn"
        onClick={() => setShowInventory(!showInventory)}
      >
        {showInventory ? "▼" : "►"} Your Distributor Inventory
      </button>
      {showInventory && (
        <section className="section-content">
          <button onClick={loadInventory}>Refresh Inventory</button>
          <div>
            <h4>Batches</h4>
            {distributorInventory.batches.length === 0 ? (
              <p className="empty-state">No batches in inventory</p>
            ) : (
              <div className="inventory-grid">
                {distributorInventory.batches.map((b) => (
                  <div key={b.batchId} className="inventory-card">
                    <div className="card-header">
                      <h5>{b.cropName}</h5>
                      <span className={`status-badge ${b.active ? "active" : "inactive"}`}>
                        {b.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="card-details">
                      <p><strong>Batch ID:</strong> #{b.batchId}</p>
                      <p><strong>Origin Batch:</strong> #{b.originBatchId}</p>
                      <p><strong>Quantity:</strong> {b.qty} kg</p>
                      <p><strong>Purchase Price:</strong> {b.purchasePrice} wei/kg</p>
                      <p><strong>Location:</strong> {b.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h4>Packs</h4>
            {distributorInventory.packs.length === 0 ? (
              <p className="empty-state">No packs in inventory</p>
            ) : (
              <div className="inventory-grid">
                {distributorInventory.packs.map((p) => (
                  <div key={p.packId} className="inventory-card">
                    <div className="card-header">
                      <h5>{p.cropName}</h5>
                      <span className={`status-badge ${p.available ? "active" : "inactive"}`}>
                        {p.available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <div className="card-details">
                      <p><strong>Pack ID:</strong> #{p.packId}</p>
                      <p><strong>From Batch:</strong> #{p.distributorBatchId}</p>
                      <p><strong>Quantity:</strong> {p.qty} kg</p>
                      <p><strong>Price per Kg:</strong> {p.pricePerKg} wei</p>
                      <p><strong>Location:</strong> {p.location}</p>
                      <p><strong>Visibility:</strong> {p.visibility === 1 ? "🌍 Public" : "🔒 Private"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="distributor-form">
            <h4>Split Distributor Batch → Create Packs</h4>
            <div className="form-field">
              <label>Distributor Batch ID</label>
              <input
                placeholder="Enter batch ID"
                value={splitForm.distributorBatchId}
                onChange={(e) =>
                  setSplitForm({ ...splitForm, distributorBatchId: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label>Quantities (CSV)</label>
              <input
                placeholder="e.g., 10,20,30"
                value={splitForm.quantitiesCSV}
                onChange={(e) =>
                  setSplitForm({ ...splitForm, quantitiesCSV: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label>Prices (CSV)</label>
              <input
                placeholder="e.g., 120,130,140"
                value={splitForm.pricesCSV}
                onChange={(e) =>
                  setSplitForm({ ...splitForm, pricesCSV: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label>IPFS Hashes (CSV, optional)</label>
              <input
                placeholder="e.g., hash1,hash2,hash3"
                value={splitForm.ipfsCSV}
                onChange={(e) =>
                  setSplitForm({ ...splitForm, ipfsCSV: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label>&nbsp;</label>
              <button onClick={splitDistributor} className="btn-primary">Create Packs</button>
            </div>
          </div>

          <div className="distributor-form">
            <h4>List Pack (Public/Private)</h4>
            <div className="form-field">
              <label>Pack ID</label>
              <input
                placeholder="Enter pack ID"
                value={packListForm.packId}
                onChange={(e) =>
                  setPackListForm({ ...packListForm, packId: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label>Visibility</label>
              <select
                value={packListForm.visibility}
                onChange={(e) =>
                  setPackListForm({ ...packListForm, visibility: e.target.value })
                }
              >
                <option value="1">🌍 Public</option>
                <option value="0">🔒 Private</option>
              </select>
            </div>
            <div className="form-field">
              <label>Private Address (if private)</label>
              <input
                placeholder="Enter private buyer address"
                value={packListForm.privateAddr}
                onChange={(e) =>
                  setPackListForm({ ...packListForm, privateAddr: e.target.value })
                }
              />
            </div>
            <div className="form-field">
              <label>&nbsp;</label>
              <button onClick={listPack} className="btn-primary">List Pack</button>
            </div>
          </div>
        </section>
      )}

      {/* Collapsible Section 3 */}
      <button
        className="toggle-btn"
        onClick={() => setShowRequests(!showRequests)}
      >
        {showRequests ? "▼" : "►"} Pending Buy Requests
      </button>
      {showRequests && (
        <section className="section-content">
          <button onClick={loadPendingRequests}>Refresh Requests</button>
          {pendingRequests.length === 0 ? (
            <p>No pending requests</p>
          ) : (
            pendingRequests.map((r) => (
              <div key={r.requestId} className="request-card">
                <div className="request-header">
                  <h5>Request #{r.requestId}</h5>
                </div>
                <div className="request-details">
                  <p><strong>Pack ID:</strong> #{r.packId}</p>
                  <p><strong>Requester:</strong> {r.requester}</p>
                  <p><strong>Quantity:</strong> {r.qtyKg} kg</p>
                  <p><strong>Amount Paid:</strong> {r.amountPaid} wei</p>
                  <p><strong>Wants Retailer Role:</strong> {r.wantsRetailer ? "Yes" : "No"}</p>
                </div>
                <div className="request-actions">
                  <button 
                    onClick={() => resolveRequest(r.requestId, true)}
                    className="btn-accept"
                  >
                    ✅ Accept
                  </button>
                  <button 
                    onClick={() => resolveRequest(r.requestId, false)}
                    className="btn-reject"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}