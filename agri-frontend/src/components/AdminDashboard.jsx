// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../contract";
import "../styles/AdminDashboard.css";

export default function AdminDashboard({ account }) {
  const [approvedFarmers, setApprovedFarmers] = useState([]);
  const [approvedDistributors, setApprovedDistributors] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("farmers"); // default tab

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

      const farmers = await contract.getUsersByRole(1);
      setApprovedFarmers(farmers);

      const distributors = await contract.getUsersByRole(2);
      setApprovedDistributors(distributors);

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
    <div className="admin-dashboard">
      <h2>Admin Dashboard </h2>
      <p>
        Admin address: <b>{account}</b>
      </p>

      {/* Dashboard Cards */}
      <div className="dashboard-cards">
        <div
          className={`dashboard-card ${activeTab === "farmers" ? "active" : ""}`}
          onClick={() => setActiveTab("farmers")}
        >
          <h3>Approved Farmers 🌾</h3>
          <p>{approvedFarmers.length}</p>
        </div>

        <div
          className={`dashboard-card ${activeTab === "distributors" ? "active" : ""}`}
          onClick={() => setActiveTab("distributors")}
        >
          <h3>Approved Distributors 📦</h3>
          <p>{approvedDistributors.length}</p>
        </div>

        <div
          className={`dashboard-card ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <h3>Pending Requests 📬</h3>
          <p>{pendingRequests.length}</p>
        </div>
      </div>

      {/* Conditional Section */}
      <div className="dashboard-content">
        {activeTab === "farmers" && (
          <section>
            <h3>Approved Farmers</h3>
            <ul>
              {approvedFarmers.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === "distributors" && (
          <section>
            <h3>Approved Distributors</h3>
            <ul>
              {approvedDistributors.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === "pending" && (
          <section>
            <h3>Pending Requests</h3>
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
                    <button onClick={() => approve(req.addr, 1)}>
                      Approve as Farmer
                    </button>{" "}
                    <button onClick={() => approve(req.addr, 2)}>
                      Approve as Distributor
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}