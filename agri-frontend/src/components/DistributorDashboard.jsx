// src/components/DistributorDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../contract";
import { ethers } from "ethers";

export default function DistributorDashboard({ account }) {
  const [publicFarmerProducts, setPublicFarmerProducts] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [buyQty, setBuyQty] = useState("");
  const [distributorInventory, setDistributorInventory] = useState({ batches: [], packs: [] });
  const [splitForm, setSplitForm] = useState({ distributorBatchId: "", quantitiesCSV: "", pricesCSV: "", ipfsCSV: "" });
  const [packListForm, setPackListForm] = useState({ packId: "", visibility: "1", privateAddr: "" });
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    loadPublicFarmerProducts();
    loadInventory();
    loadPendingRequests();
    // eslint-disable-next-line
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
            ipfs: p.ipfsHash
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
      const tx = await contract.buyFarmerBatch(Number(selectedBatchId), Number(buyQty), { value: total.toString() });
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
      // res is tuple (DistributorBatch[], RetailPack[])
      const batches = res[0].map((b) => ({
        batchId: Number(b.batchId),
        originBatchId: Number(b.originBatchId),
        qty: Number(b.quantityKg),
        purchasePrice: Number(b.purchasePricePerKg),
        active: b.active
      }));
      const packs = res[1].map((p) => ({
        packId: Number(p.packId),
        distributorBatchId: Number(p.distributorBatchId),
        qty: Number(p.quantityKg),
        pricePerKg: Number(p.pricePerKg),
        available: p.available,
        visibility: Number(p.visibility),
        privateBuyer: p.privateBuyer
      }));
      setDistributorInventory({ batches, packs });
    } catch (err) {
      console.error(err);
    }
  }

  async function splitDistributor() {
    try {
      const contract = await getContract(true);
      const qtys = splitForm.quantitiesCSV.split(",").map(s => Number(s.trim()));
      const prices = splitForm.pricesCSV.split(",").map(s => Number(s.trim()));
      const ipfs = splitForm.ipfsCSV.split(",").map(s => s.trim());
      const tx = await contract.splitDistributorBatch(Number(splitForm.distributorBatchId), qtys, prices, ipfs);
      await tx.wait();
      alert("Split created");
      setSplitForm({ distributorBatchId: "", quantitiesCSV: "", pricesCSV: "", ipfsCSV: "" });
      loadInventory();
    } catch (err) {
      console.error(err);
      alert("Split failed: " + (err?.message || err));
    }
  }

  async function listPack() {
    try {
      const contract = await getContract(true);
      const tx = await contract.listPack(Number(packListForm.packId), Number(packListForm.visibility), packListForm.privateAddr || ethers.ZeroAddress);
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
        amountPaid: Number(r.amountPaid) // raw units
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
    <div>
      <h2>Distributor Dashboard</h2>
      <p>Distributor: <b>{account}</b></p>

      <section>
        <h3>Public Farmer Batches</h3>
        <button onClick={loadPublicFarmerProducts}>Refresh list</button>
        {publicFarmerProducts.length === 0 ? <p>No public farmer batches</p> : publicFarmerProducts.map(p => (
          <div key={p.batchId} style={{ border: "1px dashed #ccc", padding: 8, marginBottom: 8 }}>
            <p><b>Batch:</b> {p.batchId} | Crop: {p.cropName} | Qty: {p.qty} kg | PricePerKg: {p.pricePerKg}</p>
            <p><b>Farmer:</b> {p.farmer}</p>
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <h4>Buy farmer batch</h4>
          <input placeholder="farmerBatchId" value={selectedBatchId} onChange={(e)=>setSelectedBatchId(e.target.value)} />
          <input placeholder="qty" value={buyQty} onChange={(e)=>setBuyQty(e.target.value)} />
          <button onClick={buyBatch}>Buy (send value)</button>
        </div>
      </section>

      <hr />

      <section>
        <h3>Your Distributor Inventory</h3>
        <button onClick={loadInventory}>Refresh Inventory</button>
        <div>
          <h4>Batches</h4>
          {distributorInventory.batches.map(b => (
            <div key={b.batchId} style={{ border: "1px solid #eee", padding: 8, marginBottom: 6 }}>
              <p>BatchId: {b.batchId} | Origin: {b.originBatchId} | Qty: {b.qty} | purchasePrice: {b.purchasePrice}</p>
            </div>
          ))}
          <h4>Packs</h4>
          {distributorInventory.packs.map(p => (
            <div key={p.packId} style={{ border: "1px solid #eee", padding: 8, marginBottom: 6 }}>
              <p>PackId: {p.packId} | FromBatch: {p.distributorBatchId} | Qty: {p.qty} | pricePerKg: {p.pricePerKg} | avail: {p.available ? "Yes":"No"} | vis: {p.visibility}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>Split Distributor Batch → Create Packs</h4>
          <input placeholder="distributorBatchId" value={splitForm.distributorBatchId} onChange={(e)=>setSplitForm({...splitForm, distributorBatchId: e.target.value})} />
          <input placeholder="quantities CSV (e.g. 10,20)" value={splitForm.quantitiesCSV} onChange={(e)=>setSplitForm({...splitForm, quantitiesCSV: e.target.value})} />
          <input placeholder="prices CSV (e.g. 120,130)" value={splitForm.pricesCSV} onChange={(e)=>setSplitForm({...splitForm, pricesCSV: e.target.value})} />
          <input placeholder="ipfs CSV (optional)" value={splitForm.ipfsCSV} onChange={(e)=>setSplitForm({...splitForm, ipfsCSV: e.target.value})} />
          <button onClick={splitDistributor}>Create Packs</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <h4>List Pack (Public/Private)</h4>
          <input placeholder="packId" value={packListForm.packId} onChange={(e)=>setPackListForm({...packListForm, packId: e.target.value})} />
          <select value={packListForm.visibility} onChange={(e)=>setPackListForm({...packListForm, visibility: e.target.value})}>
            <option value="1">Public</option>
            <option value="0">Private</option>
          </select>
          <input placeholder="private address (if private)" value={packListForm.privateAddr} onChange={(e)=>setPackListForm({...packListForm, privateAddr: e.target.value})} />
          <button onClick={listPack}>List Pack</button>
        </div>
      </section>

      <hr />

      <section>
        <h3>Pending Buy Requests (for your packs)</h3>
        <button onClick={loadPendingRequests}>Refresh Requests</button>
        {pendingRequests.length === 0 ? <p>No pending requests</p> : pendingRequests.map(r => (
          <div key={r.requestId} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 6 }}>
            <p>RequestId: {r.requestId} | PackId: {r.packId} | Requester: {r.requester} | Qty: {r.qtyKg} | Paid: {r.amountPaid}</p>
            <button onClick={() => resolveRequest(r.requestId, true)}>Accept</button>{" "}
            <button onClick={() => resolveRequest(r.requestId, false)}>Reject</button>
          </div>
        ))}
      </section>
    </div>
  );
}