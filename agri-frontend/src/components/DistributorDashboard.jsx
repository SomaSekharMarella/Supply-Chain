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
      const batches = res[0].map((b) => ({
        batchId: Number(b.batchId),
        originBatchId: Number(b.originBatchId),
        qty: Number(b.quantityKg),
        purchasePrice: Number(b.purchasePricePerKg),
        active: b.active,
      }));
      const packs = res[1].map((p) => ({
        packId: Number(p.packId),
        distributorBatchId: Number(p.distributorBatchId),
        qty: Number(p.quantityKg),
        pricePerKg: Number(p.pricePerKg),
        available: p.available,
        visibility: Number(p.visibility),
        privateBuyer: p.privateBuyer,
      }));
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
            <p>No public farmer batches</p>
          ) : (
            publicFarmerProducts.map((p) => (
              <div key={p.batchId} className="distributor-card">
                <p>
                  <b>Batch:</b> {p.batchId} | Crop: {p.cropName} | Qty: {p.qty} kg |
                  PricePerKg: {p.pricePerKg}
                </p>
                <p>
                  <b>Farmer:</b> {p.farmer}
                </p>
              </div>
            ))
          )}
          <div className="distributor-form">
            <h4>Buy farmer batch</h4>
            <input
              placeholder="farmerBatchId"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            />
            <input
              placeholder="qty"
              value={buyQty}
              onChange={(e) => setBuyQty(e.target.value)}
            />
            <button onClick={buyBatch}>Buy (send value)</button>
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
            {distributorInventory.batches.map((b) => (
              <div key={b.batchId} className="distributor-card">
                <p>
                  BatchId: {b.batchId} | Origin: {b.originBatchId} | Qty: {b.qty} |
                  purchasePrice: {b.purchasePrice}
                </p>
              </div>
            ))}
            <h4>Packs</h4>
            {distributorInventory.packs.map((p) => (
              <div key={p.packId} className="distributor-card">
                <p>
                  PackId: {p.packId} | FromBatch: {p.distributorBatchId} | Qty: {p.qty} |
                  pricePerKg: {p.pricePerKg} | avail: {p.available ? "Yes" : "No"} |
                  vis: {p.visibility}
                </p>
              </div>
            ))}
          </div>

          <div className="distributor-form">
            <h4>Split Distributor Batch → Create Packs</h4>
            <input
              placeholder="distributorBatchId"
              value={splitForm.distributorBatchId}
              onChange={(e) =>
                setSplitForm({ ...splitForm, distributorBatchId: e.target.value })
              }
            />
            <input
              placeholder="quantities CSV (e.g. 10,20)"
              value={splitForm.quantitiesCSV}
              onChange={(e) =>
                setSplitForm({ ...splitForm, quantitiesCSV: e.target.value })
              }
            />
            <input
              placeholder="prices CSV (e.g. 120,130)"
              value={splitForm.pricesCSV}
              onChange={(e) =>
                setSplitForm({ ...splitForm, pricesCSV: e.target.value })
              }
            />
            <input
              placeholder="ipfs CSV (optional)"
              value={splitForm.ipfsCSV}
              onChange={(e) =>
                setSplitForm({ ...splitForm, ipfsCSV: e.target.value })
              }
            />
            <button onClick={splitDistributor}>Create Packs</button>
          </div>

          <div className="distributor-form">
            <h4>List Pack (Public/Private)</h4>
            <input
              placeholder="packId"
              value={packListForm.packId}
              onChange={(e) =>
                setPackListForm({ ...packListForm, packId: e.target.value })
              }
            />
            <select
              value={packListForm.visibility}
              onChange={(e) =>
                setPackListForm({ ...packListForm, visibility: e.target.value })
              }
            >
              <option value="1">Public</option>
              <option value="0">Private</option>
            </select>
            <input
              placeholder="private address (if private)"
              value={packListForm.privateAddr}
              onChange={(e) =>
                setPackListForm({ ...packListForm, privateAddr: e.target.value })
              }
            />
            <button onClick={listPack}>List Pack</button>
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
              <div key={r.requestId} className="distributor-card">
                <p>
                  RequestId: {r.requestId} | PackId: {r.packId} | Requester:{" "}
                  {r.requester} | Qty: {r.qtyKg} | Paid: {r.amountPaid}
                </p>
                <button onClick={() => resolveRequest(r.requestId, true)}>
                  Accept
                </button>{" "}
                <button onClick={() => resolveRequest(r.requestId, false)}>
                  Reject
                </button>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}