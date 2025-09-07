// src/components/DistributorDashboard.jsx
import React from "react";

import { useState } from "react";
import { getProviderAndContract } from "../Contract.js";

export default function DistributorDashboard({ isApproved }) {
  const [fromPlace, setFromPlace] = useState("");
  const [toPlace, setToPlace] = useState("");
  const [price, setPrice] = useState("");

  const requestDistributor = async () => {
    try {
      const { contract } = await getProviderAndContract();
      // role enum index 2 => Distributor
      const tx = await contract.requestRole(2, "", "");
      await tx.wait();
      alert("Requested Distributor role. Wait for admin approval.");
    } catch (err) {
      console.error("requestDistributor error:", err);
      alert("Request failed: " + (err?.reason || err?.message || err));
    }
  };

  const addDistribution = async () => {
    try {
      const { contract } = await getProviderAndContract();
      const priceNum = Number(price) || 0;
      const tx = await contract.addDistribution(fromPlace, toPlace, priceNum);
      await tx.wait();
      alert("Distribution added on-chain");
    } catch (err) {
      console.error("addDistribution error:", err);
      alert("Add distribution failed: " + (err?.reason || err?.message || err));
    }
  };

  if (!isApproved) {
    return (
      <div className="card p-4 border rounded">
        <h3>Distributor — Request Access</h3>
        <button onClick={requestDistributor} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Request Distributor Role</button>
      </div>
    );
  }

  return (
    <div className="card p-4 border rounded">
      <h3>Distributor Dashboard</h3>
      <input value={fromPlace} onChange={e => setFromPlace(e.target.value)} placeholder="From place" />
      <input value={toPlace} onChange={e => setToPlace(e.target.value)} placeholder="To place" />
      <input value={price} onChange={e => setPrice(e.target.value)} placeholder="Price (number)" />
      <button onClick={addDistribution} className="mt-2 px-3 py-1 bg-green-600 text-white rounded">Add Distribution</button>
    </div>
  );
}
