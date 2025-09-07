// src/components/AdminDashboard.jsx
import React from "react";

import { useEffect, useState } from "react";
import { getProviderAndContract, getProviderAndReadContract } from "../Contract.js";

export default function AdminDashboard({ onRefreshRequested }) {
  const [adminAddr, setAdminAddr] = useState(null);
  const [farmerCount, setFarmerCount] = useState(0);
  const [distributorCount, setDistributorCount] = useState(0);
  const [pendingFarmers, setPendingFarmers] = useState([]);
  const [pendingDistributors, setPendingDistributors] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const { contract } = await getProviderAndReadContract();
      const fCount = await contract.farmerCount();
      const dCount = await contract.distributorCount();
      setFarmerCount(Number(fCount));
      setDistributorCount(Number(dCount));
      const pfl = await contract.getPendingFarmers();
      const pdl = await contract.getPendingDistributors();
      setPendingFarmers(pfl);
      setPendingDistributors(pdl);

      // read admin from contract
      const admin = await contract.admin();
      setAdminAddr(admin);
    } catch (err) {
      console.error("loadStats error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // also allow parent to trigger refresh
    if (onRefreshRequested) onRefreshRequested.current = loadStats;
    // eslint-disable-next-line
  }, []);

  const approve = async (addr, roleStr) => {
    try {
      const { contract } = await getProviderAndContract();
      const roleEnum = roleStr === "Farmer" ? 1 : 2; // matches Solidity enum order
      const tx = await contract.approveRole(addr, roleEnum);
      await tx.wait();
      console.log(`Approved ${addr} as ${roleStr}`);
      await loadStats();
    } catch (err) {
      console.error("approve error:", err);
      alert("Approval failed: " + (err?.reason || err?.message || err));
    }
  };

  return (
    <div className="card p-4 border rounded">
      <h2 className="text-lg font-bold">Admin Dashboard</h2>
      {loading ? <p>Loading...</p> : (
        <>
          <p>Admin Address: <code>{adminAddr}</code></p>
          <div className="flex gap-4 mt-2">
            <div>Approved Farmers: <strong>{farmerCount}</strong></div>
            <div>Approved Distributors: <strong>{distributorCount}</strong></div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold">Pending Farmer Requests ({pendingFarmers.length})</h3>
            {pendingFarmers.length === 0 && <p>No pending farmer requests</p>}
            <ul>
              {pendingFarmers.map((addr) => (
                <li key={addr} className="flex justify-between items-center py-1">
                  <span>{addr}</span>
                  <div>
                    <button onClick={() => approve(addr, "Farmer")} className="px-2 py-1 bg-green-600 text-white rounded">
                      Approve Farmer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold">Pending Distributor Requests ({pendingDistributors.length})</h3>
            {pendingDistributors.length === 0 && <p>No pending distributor requests</p>}
            <ul>
              {pendingDistributors.map((addr) => (
                <li key={addr} className="flex justify-between items-center py-1">
                  <span>{addr}</span>
                  <div>
                    <button onClick={() => approve(addr, "Distributor")} className="px-2 py-1 bg-green-600 text-white rounded">
                      Approve Distributor
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
