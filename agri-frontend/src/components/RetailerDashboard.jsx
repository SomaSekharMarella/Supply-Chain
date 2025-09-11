// src/components/RetailerDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../contract";
import { ethers } from "ethers";

export default function RetailerDashboard({ account }) {
  const [retailerInventory, setRetailerInventory] = useState([]);
  const [splitForm, setSplitForm] = useState({ unitId: "", quantitiesCSV: "", pricesCSV: "", ipfsCSV: "" });
  const [listForm, setListForm] = useState({ unitId: "" });
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [publicPacks, setPublicPacks] = useState([]);
  const [buyRequestForm, setBuyRequestForm] = useState({ packId: "", qty: "", wantsRetailer: true });

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
      const qtys = splitForm.quantitiesCSV.split(",").map(s => Number(s.trim()));
      const prices = splitForm.pricesCSV.split(",").map(s => Number(s.trim()));
      const ipfs = splitForm.ipfsCSV.split(",").map(s => s.trim());
      const tx = await contract.splitRetailUnit(Number(splitForm.unitId), qtys, prices, ipfs);
      await tx.wait();
      alert("Unit split");
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
      const tx = await contract.listUnitForCustomers(Number(listForm.unitId), 1); // visibility=1 (public)
      await tx.wait();
      alert("Unit listed");
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
      const tx = await contract.createBuyRequest(Number(buyRequestForm.packId), Number(buyRequestForm.qty), buyRequestForm.wantsRetailer, { value: total.toString() });
      await tx.wait();
      alert("Buy request created");
      loadPublicPacks();
    } catch (err) {
      console.error(err);
      alert("Buy request failed: " + (err?.message || err));
    }
  }

  return (
    <div>
      <h2>Retailer Dashboard</h2>
      <p>Retailer: <b>{account}</b></p>

      <section>
        <h3>Public Distributor Packs (to buy more)</h3>
        <button onClick={loadPublicPacks}>Refresh</button>
        {publicPacks.map(p => (
          <div key={p.packId}>
            PackId: {p.packId} | Distributor: {p.distributor} | Qty: {p.qty} | Price/Kg: {p.pricePerKg}
          </div>
        ))}
        <div>
          <input placeholder="packId" value={buyRequestForm.packId} onChange={e => setBuyRequestForm({...buyRequestForm, packId: e.target.value})} />
          <input placeholder="qty" value={buyRequestForm.qty} onChange={e => setBuyRequestForm({...buyRequestForm, qty: e.target.value})} />
          <label>
            Wants Retailer Role: <input type="checkbox" checked={buyRequestForm.wantsRetailer} onChange={e => setBuyRequestForm({...buyRequestForm, wantsRetailer: e.target.checked})} />
          </label>
          <button onClick={createBuyRequest}>Create Buy Request</button>
        </div>
      </section>

      <section>
        <h3>Your Inventory (Units)</h3>
        <button onClick={loadInventory}>Refresh</button>
        {retailerInventory.map(u => (
          <div key={u.unitId}>
            UnitId: {u.unitId} | Qty: {u.qty} | Price/Kg: {u.pricePerKg} | Available: {u.available ? "Yes" : "No"}
          </div>
        ))}
      </section>

      <section>
        <h3>Split Unit</h3>
        <input placeholder="unitId" value={splitForm.unitId} onChange={e => setSplitForm({...splitForm, unitId: e.target.value})} />
        <input placeholder="quantities CSV" value={splitForm.quantitiesCSV} onChange={e => setSplitForm({...splitForm, quantitiesCSV: e.target.value})} />
        <input placeholder="prices CSV" value={splitForm.pricesCSV} onChange={e => setSplitForm({...splitForm, pricesCSV: e.target.value})} />
        <input placeholder="ipfs CSV" value={splitForm.ipfsCSV} onChange={e => setSplitForm({...splitForm, ipfsCSV: e.target.value})} />
        <button onClick={splitUnit}>Split</button>
      </section>

      <section>
        <h3>List Unit for Customers</h3>
        <input placeholder="unitId" value={listForm.unitId} onChange={e => setListForm({...listForm, unitId: e.target.value})} />
        <button onClick={listUnit}>List</button>
      </section>

      <section>
        <h3>Purchase History</h3>
        <button onClick={loadPurchaseHistory}>Refresh</button>
        {purchaseHistory.map(p => (
          <div key={p.purchaseId}>
            PurchaseId: {p.purchaseId} | Unit: {p.unitId} | Buyer: {p.buyer} | Seller: {p.seller} | Qty: {p.qty}
          </div>
        ))}
      </section>
    </div>
  );
}