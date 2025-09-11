// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../contract";

export default function AdminDashboard({ account }) {
  const [approvedFarmers, setApprovedFarmers] = useState([]);
  const [approvedDistributors, setApprovedDistributors] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function getContractInstance(withSigner = false) {
    const res = await getContract(withSigner);
    return res && res.contract ? res.contract : res;
  }

  async function loadData() {
    try {
      const contract = await getContractInstance(false);

      // Use getUsersByRole for approved farmers and distributors
      const farmers = await contract.getUsersByRole(1);
      setApprovedFarmers(farmers);

      const distributors = await contract.getUsersByRole(2);
      setApprovedDistributors(distributors);

      // Use getPendingUsers for pending requests
      const [pendingAddrs, pendingInfos] = await contract.getPendingUsers();
      const pending = pendingAddrs.map((addr, i) => ({
        addr,
        idHash: pendingInfos[i].idHash,
        meta: pendingInfos[i].meta,
        appliedAt: Number(pendingInfos[i].appliedAt),
      }));
      setPendingRequests(pending);
    } catch (err) {
      console.error("Error loading data", err);
    }
  }

  async function approve(addr, role) {
    try {
      const contract = await getContractInstance(true);
      const tx = await contract.approveRole(addr, role);
      await tx.wait();
      alert(`Approved ${addr} as ${role === 1 ? "Farmer" : "Distributor"}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Approve failed: " + (err?.message || err));
    }
  }

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p>Admin address: <b>{account}</b></p>

      <section style={{ marginTop: 20 }}>
        <h3>Approved Farmers ({approvedFarmers.length})</h3>
        <ul>
          {approvedFarmers.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>Approved Distributors ({approvedDistributors.length})</h3>
        <ul>
          {approvedDistributors.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3>Pending Requests ({pendingRequests.length})</h3>
        {pendingRequests.length === 0 ? (
          <p>No pending requests</p>
        ) : (
          <ul>
            {pendingRequests.map((req) => (
              <li key={req.addr}>
                <b>{req.addr}</b>  
                <br />
                idHash: {req.idHash} | meta: {req.meta}
                <br />
                <button onClick={() => approve(req.addr, 1)}>Approve as Farmer</button>{" "}
                <button onClick={() => approve(req.addr, 2)}>Approve as Distributor</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}