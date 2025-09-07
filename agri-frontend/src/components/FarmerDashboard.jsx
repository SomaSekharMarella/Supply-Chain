// src/components/FarmerDashboard.jsx
import React from "react";

import { useState } from "react";
import { getProviderAndContract } from "../Contract.js";

export default function FarmerDashboard({ isApproved }) {
  const [uniqueId, setUniqueId] = useState("");
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [days, setDays] = useState("");
  const [price, setPrice] = useState("");

  const requestFarmer = async () => {
    try {
      const { contract } = await getProviderAndContract();
      // role enum index 1 => Farmer
      const tx = await contract.requestRole(1, uniqueId || "", ""); // second param id, third ip
      await tx.wait();
      alert("Requested Farmer role. Wait for admin approval.");
    } catch (err) {
      console.error("requestFarmer error:", err);
      alert("Request failed: " + (err?.reason || err?.message || err));
    }
  };

  const addProduct = async () => {
    try {
      const { contract } = await getProviderAndContract();
      // convert numeric fields
      const daysNum = Number(days) || 0;
      const priceNum = Number(price) || 0;
      const tx = await contract.addProduct(name, month, daysNum, priceNum);
      await tx.wait();
      alert("Product added on-chain");
    } catch (err) {
      console.error("addProduct error:", err);
      alert("Add product failed: " + (err?.reason || err?.message || err));
    }
  };

  if (!isApproved) {
    return (
      <div className="card p-4 border rounded">
        <h3>Farmer — Request Access</h3>
        <input value={uniqueId} onChange={e => setUniqueId(e.target.value)} placeholder="Your ID (optional)" />
        <button onClick={requestFarmer} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Request Farmer Role</button>
      </div>
    );
  }

  return (
    <div className="card p-4 border rounded">
      <h3>Farmer Dashboard</h3>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Crop name" />
      <input value={month} onChange={e => setMonth(e.target.value)} placeholder="Crop Month" />
      <input value={days} onChange={e => setDays(e.target.value)} placeholder="Days to finish" />
      <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price (number)" />
      <button onClick={addProduct} className="mt-2 px-3 py-1 bg-green-600 text-white rounded">Add Product</button>
    </div>
  );
}
