// src/components/RetailerDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract, getContractInstance } from "../Contract";
// removed unused ethers import
import "../styles/RetailerDashboard.css";

export default function RetailerDashboard({ account }) {
  const [retailerInventory, setRetailerInventory] = useState([]);
  const [splitForm, setSplitForm] = useState({
    unitId: "",
    quantitiesCSV: "",
    pricesCSV: "",
    ipfsCSV: "",
  });
  const [listForm, setListForm] = useState({ unitId: "" });
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [publicPacks, setPublicPacks] = useState([]);
  const [buyRequestForm, setBuyRequestForm] = useState({
    packId: "",
    qty: "",
    wantsRetailer: true,
  });

  useEffect(() => {
    loadInventory();
    loadPurchaseHistory();
    loadPublicPacks();
  }, []);

  async function loadInventory() {
    try {
      const contract = await getContract(false);
      const arr = await contract.getRetailerInventory(account);
      const mapped = arr.map((u) => ({
        unitId: Number(u.unitId),
        parentPackId: Number(u.parentPackId),
        qty: Number(u.quantityKg),
        pricePerKg: Number(u.pricePerKg),
        available: u.available,
        ipfs: u.ipfsHash,
      }));
      setRetailerInventory(mapped);
    } catch (err) {
      console.error(err);
    }
  }

  async function splitUnit() {
    try {
      const contract = await getContract(true);
      const qtys = splitForm.quantitiesCSV.split(",").map((s) => Number(s.trim()));
      const prices = splitForm.pricesCSV.split(",").map((s) => Number(s.trim()));
      const ipfs = splitForm.ipfsCSV.split(",").map((s) => s.trim());
      const tx = await contract.splitRetailUnit(Number(splitForm.unitId), qtys, prices, ipfs);
      await tx.wait();
      alert("Unit split successfully.");
      setSplitForm({ unitId: "", quantitiesCSV: "", pricesCSV: "", ipfsCSV: "" });
      loadInventory();
    } catch (err) {
      console.error(err);
      alert("Split failed: " + (err?.message || err));
    }
  }

  async function listUnit() {
    try {
      const contract = await getContract(true);
      const tx = await contract.listUnitForCustomers(Number(listForm.unitId), 1);
      await tx.wait();
      alert("Unit listed for customers.");
      loadInventory();
    } catch (err) {
      console.error(err);
      alert("List failed: " + (err?.message || err));
    }
  }

  async function loadPurchaseHistory() {
    try {
      const contract = await getContract(false);
      const arr = await contract.getPurchaseHistory(account);
      const mapped = arr.map((p) => ({
        purchaseId: Number(p.purchaseId),
        unitId: Number(p.unitId),
        buyer: p.buyer,
        seller: p.seller,
        qty: Number(p.qtyKg),
        pricePerKg: Number(p.pricePerKg),
        timestamp: Number(p.timestamp),
      }));
      setPurchaseHistory(mapped);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPublicPacks() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalRetailPacks());
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const p = await contract.retailPacks(i);
        if (p.packId !== 0 && Number(p.visibility) === 1 && p.available) {
          arr.push({
            packId: Number(p.packId),
            distributor: p.distributor,
            qty: Number(p.quantityKg),
            pricePerKg: Number(p.pricePerKg),
            ipfs: p.ipfsHash,
          });
        }
      }
      setPublicPacks(arr);
    } catch (err) {
      console.error(err);
    }
  }

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
      alert("Buy request created.");
      loadPublicPacks();
    } catch (err) {
      console.error(err);
      alert("Buy request failed: " + (err?.message || err));
    }
  }

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">Retailer Dashboard</h2>
      <p className="account">Retailer: <b>{account}</b></p>

      {/* Public Distributor Packs */}
      <section className="section">
        <h3>Public Distributor Packs (to buy more)</h3>
        <button className="btn-primary" onClick={loadPublicPacks}>Refresh</button>
        <div className="card-list">
          {publicPacks.map((p) => (
            <div key={p.packId} className="card">
              <p>PackId: {p.packId}</p>
              <p>Distributor: {p.distributor}</p>
              <p>Qty: {p.qty} Kg</p>
              <p>Price/Kg: {p.pricePerKg}</p>
            </div>
          ))}
        </div>
        <div className="form">
          <div className="form-field">
            <label>Pack ID</label>
            <input
              placeholder="Enter pack ID"
              value={buyRequestForm.packId}
              onChange={(e) => setBuyRequestForm({ ...buyRequestForm, packId: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Quantity (Kg)</label>
            <input
              placeholder="Enter quantity"
              value={buyRequestForm.qty}
              onChange={(e) => setBuyRequestForm({ ...buyRequestForm, qty: e.target.value })}
            />
          </div>
          <div className="form-field checkbox-field">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={buyRequestForm.wantsRetailer}
                onChange={(e) =>
                  setBuyRequestForm({ ...buyRequestForm, wantsRetailer: e.target.checked })
                }
              />
              Wants Retailer Role
            </label>
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button className="btn-primary" onClick={createBuyRequest}>Create Buy Request</button>
          </div>
        </div>
      </section>

      {/* Inventory */}
      <section className="section">
        <h3>Your Inventory</h3>
        <button className="btn-primary" onClick={loadInventory}>Refresh</button>
        <div className="card-list">
          {retailerInventory.map((u) => (
            <div key={u.unitId} className="card">
              <p>UnitId: {u.unitId}</p>
              <p>Qty: {u.qty} Kg</p>
              <p>Price/Kg: {u.pricePerKg}</p>
              <p>Available: {u.available ? "Yes" : "No"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Split Unit */}
      <section className="section">
        <h3>Split Unit</h3>
        <div className="form">
          <div className="form-field">
            <label>Unit ID</label>
            <input
              placeholder="Enter unit ID"
              value={splitForm.unitId}
              onChange={(e) => setSplitForm({ ...splitForm, unitId: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Quantities (CSV)</label>
            <input
              placeholder="e.g., 10,20,30"
              value={splitForm.quantitiesCSV}
              onChange={(e) => setSplitForm({ ...splitForm, quantitiesCSV: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Prices (CSV)</label>
            <input
              placeholder="e.g., 100,200,300"
              value={splitForm.pricesCSV}
              onChange={(e) => setSplitForm({ ...splitForm, pricesCSV: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>IPFS Hashes (CSV)</label>
            <input
              placeholder="e.g., hash1,hash2,hash3"
              value={splitForm.ipfsCSV}
              onChange={(e) => setSplitForm({ ...splitForm, ipfsCSV: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button className="btn-primary" onClick={splitUnit}>Split</button>
          </div>
        </div>
      </section>

      {/* List Unit */}
      <section className="section">
        <h3>List Unit for Customers</h3>
        <div className="form">
          <div className="form-field">
            <label>Unit ID</label>
            <input
              placeholder="Enter unit ID to list"
              value={listForm.unitId}
              onChange={(e) => setListForm({ ...listForm, unitId: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>&nbsp;</label>
            <button className="btn-primary" onClick={listUnit}>List</button>
          </div>
        </div>
      </section>

      {/* Purchase History */}
      <section className="section">
        <h3>Purchase History</h3>
        <button className="btn-primary" onClick={loadPurchaseHistory}>Refresh</button>
        <div className="card-list">
          {purchaseHistory.map((p) => (
            <div key={p.purchaseId} className="card">
              <p>PurchaseId: {p.purchaseId}</p>
              <p>Unit: {p.unitId}</p>
              <p>Buyer: {p.buyer}</p>
              <p>Seller: {p.seller}</p>
              <p>Qty: {p.qty} Kg</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}