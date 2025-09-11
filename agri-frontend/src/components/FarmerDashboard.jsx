// src/components/FarmerDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../contract";

export default function FarmerDashboard({ account }) {
  const [form, setForm] = useState({
    cropName: "",
    cropPeriod: "",
    daysToHarvest: 0,
    quantityKg: 0,
    pricePerKg: 0,
    location: "",
    visibility: 1,
    ipfsHash: "",
  });
  const [myProducts, setMyProducts] = useState([]);

  useEffect(() => {
    loadMyProducts();
  }, []);

  async function loadMyProducts() {
    try {
      const contract = await getContract(false);
      const arr = await contract.getMyProducts(); // uses msg.sender internally
      // arr are structs; convert numbers to JS numbers for display
      const mapped = arr.map((p) => ({
        batchId: Number(p.batchId),
        cropName: p.cropName,
        qty: Number(p.quantityKg),
        pricePerKg: Number(p.pricePerKg),
        visibility: Number(p.visibility),
        ipfs: p.ipfsHash,
        createdAt: Number(p.createdAt),
        active: p.active,
      }));
      setMyProducts(mapped);
    } catch (err) {
      console.error(err);
    }
  }

  async function addProduct(e) {
    e.preventDefault();
    try {
      const contract = await getContract(true);
      const tx = await contract.addProduct(
        form.cropName,
        form.cropPeriod,
        Number(form.daysToHarvest),
        Number(form.quantityKg),
        Number(form.pricePerKg),
        form.location,
        Number(form.visibility),
        form.ipfsHash
      );
      await tx.wait();
      alert("Product added");
      setForm({
        cropName: "",
        cropPeriod: "",
        daysToHarvest: 0,
        quantityKg: 0,
        pricePerKg: 0,
        location: "",
        visibility: 1,
        ipfsHash: "",
      });
      loadMyProducts();
    } catch (err) {
      console.error(err);
      alert("Add product failed: " + (err?.message || err));
    }
  }

  return (
    <div>
      <h2>Farmer Dashboard</h2>
      <p>Farmer: <b>{account}</b></p>

      <section style={{ marginTop: 12 }}>
        <h3>Add Product / Batch</h3>
        <form onSubmit={addProduct}>
          <input placeholder="Crop name" value={form.cropName} onChange={(e) => setForm({...form, cropName: e.target.value})} required />
          <br />
          <input placeholder="Crop period (e.g., Jan-Feb)" value={form.cropPeriod} onChange={(e) => setForm({...form, cropPeriod: e.target.value})} />
          <br />
          <input placeholder="Days to harvest" type="number" value={form.daysToHarvest} onChange={(e) => setForm({...form, daysToHarvest: e.target.value})} />
          <br />
          <input placeholder="Quantity (kg)" type="number" value={form.quantityKg} onChange={(e) => setForm({...form, quantityKg: e.target.value})} required />
          <br />
          <input placeholder="Price per kg (wei-like integer)" type="number" value={form.pricePerKg} onChange={(e) => setForm({...form, pricePerKg: e.target.value})} required />
          <br />
          <input placeholder="Location" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} />
          <br />
          <label>
            Visibility:
            <select value={form.visibility} onChange={(e) => setForm({...form, visibility: e.target.value})}>
              <option value={1}>Public</option>
              <option value={0}>Private</option>
            </select>
          </label>
          <br />
          <input placeholder="IPFS hash (optional)" value={form.ipfsHash} onChange={(e) => setForm({...form, ipfsHash: e.target.value})} />
          <br />
          <button type="submit">Add Product</button>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>My Products</h3>
        {myProducts.length === 0 ? <p>No products yet.</p> : myProducts.map((p) => (
          <div key={p.batchId} style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
            <p><b>BatchId:</b> {p.batchId}</p>
            <p><b>Name:</b> {p.cropName}</p>
            <p><b>Qty:</b> {p.qty} kg</p>
            <p><b>PricePerKg:</b> {p.pricePerKg}</p>
            <p><b>Visibility:</b> {p.visibility === 1 ? "Public" : "Private"}</p>
            <p><b>IPFS:</b> {p.ipfs}</p>
            <p><b>Active:</b> {p.active ? "Yes" : "No"}</p>
          </div>
        ))}
        <button onClick={loadMyProducts}>Refresh</button>
      </section>
    </div>
  );
}