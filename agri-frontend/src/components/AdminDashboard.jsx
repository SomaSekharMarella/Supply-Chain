/**
 * @fileoverview Admin Dashboard Component
 * @description Provides admin functionality for managing users and roles
 * @author Supply Chain Management Team
 */

import React, { useEffect, useState } from "react";
import { getContract, getContractInstance } from "../Contract";
import "../styles/AdminDashboard.css";

/**
 * @description Admin Dashboard Component
 * @param {Object} props - Component props
 * @param {string} props.account - Admin wallet address
 * @returns {JSX.Element} Admin dashboard component
 */
export default function AdminDashboard({ account }) {
  // State management
  const [approvedFarmers, setApprovedFarmers] = useState([]);
  const [approvedDistributors, setApprovedDistributors] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("farmers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);


  /**
   * @description Load all admin data from the contract
   */
  async function loadData() {
    try {
      setLoading(true);
      setError("");
      
      const contract = await getContractInstance(false);

      // Load approved farmers
      const farmers = await contract.getUsersByRole(1);
      setApprovedFarmers(farmers);

      // Load approved distributors
      const distributors = await contract.getUsersByRole(2);
      setApprovedDistributors(distributors);

      // Load pending requests
      const [pendingAddrs, pendingInfos] = await contract.getPendingUsers();
      const pending = pendingAddrs.map((addr, i) => ({
        addr,
        idHash: pendingInfos[i].idHash,
        meta: pendingInfos[i].meta,
        appliedAt: Number(pendingInfos[i].appliedAt),
      }));
      setPendingRequests(pending);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  /**
   * @description Approve a user's role request
   * @param {string} addr - User address to approve
   * @param {number} role - Role to assign (1=Farmer, 2=Distributor)
   */
  async function approve(addr, role) {
    try {
      setError("");
      const contract = await getContractInstance(true);
      const tx = await contract.approveRole(addr, role);
      await tx.wait();
      
      const roleName = role === 1 ? "Farmer" : "Distributor";
      alert(`✅ Successfully approved ${addr} as ${roleName}`);
      
      // Refresh data
      await loadData();
    } catch (err) {
      console.error("Approval failed:", err);
      setError("Failed to approve user: " + (err.message || err));
    }
  }

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h2>👑 Admin Dashboard</h2>
        <p className="admin-address">
          Admin address: <b>{account}</b>
        </p>
        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
            <button onClick={() => setError("")} className="dismiss-error">
              Dismiss
            </button>
          </div>
        )}
      </header>

      {/* Dashboard Cards */}
      <div className="dashboard-cards">
        <div
          className={`dashboard-card ${activeTab === "farmers" ? "active" : ""}`}
          onClick={() => setActiveTab("farmers")}
        >
          <h3>🌾 Approved Farmers</h3>
          <p className="count">{approvedFarmers.length}</p>
        </div>

        <div
          className={`dashboard-card ${activeTab === "distributors" ? "active" : ""}`}
          onClick={() => setActiveTab("distributors")}
        >
          <h3>📦 Approved Distributors</h3>
          <p className="count">{approvedDistributors.length}</p>
        </div>

        <div
          className={`dashboard-card ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          <h3>📬 Pending Requests</h3>
          <p className="count">{pendingRequests.length}</p>
        </div>
      </div>

      {/* Content Area */}
      <div className="dashboard-content">
        {loading && (
          <div className="loading-indicator">
            <p>⏳ Loading data...</p>
          </div>
        )}

        {activeTab === "farmers" && (
          <section className="content-section">
            <div className="section-header">
              <h3>🌾 Approved Farmers</h3>
              <button onClick={loadData} className="refresh-button">
                🔄 Refresh
              </button>
            </div>
            {approvedFarmers.length === 0 ? (
              <p className="empty-state">No approved farmers yet.</p>
            ) : (
              <ul className="user-list">
                {approvedFarmers.map((farmer, index) => (
                  <li key={farmer} className="user-item">
                    <span className="user-address">{farmer}</span>
                    <span className="user-index">#{index + 1}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "distributors" && (
          <section className="content-section">
            <div className="section-header">
              <h3>📦 Approved Distributors</h3>
              <button onClick={loadData} className="refresh-button">
                🔄 Refresh
              </button>
            </div>
            {approvedDistributors.length === 0 ? (
              <p className="empty-state">No approved distributors yet.</p>
            ) : (
              <ul className="user-list">
                {approvedDistributors.map((distributor, index) => (
                  <li key={distributor} className="user-item">
                    <span className="user-address">{distributor}</span>
                    <span className="user-index">#{index + 1}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === "pending" && (
          <section className="content-section">
            <div className="section-header">
              <h3>📬 Pending Requests</h3>
              <button onClick={loadData} className="refresh-button">
                🔄 Refresh
              </button>
            </div>
            {pendingRequests.length === 0 ? (
              <p className="empty-state">No pending requests.</p>
            ) : (
              <ul className="request-list">
                {pendingRequests.map((request) => (
                  <li key={request.addr} className="request-item">
                    <div className="request-info">
                      <p className="request-address">
                        <strong>Address:</strong> {request.addr}
                      </p>
                      <p className="request-details">
                        <strong>ID Hash:</strong> {request.idHash || "None"} | 
                        <strong> Meta:</strong> {request.meta || "None"}
                      </p>
                      <p className="request-date">
                        <strong>Applied:</strong> {new Date(request.appliedAt * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="request-actions">
                      <button 
                        onClick={() => approve(request.addr, 1)}
                        className="approve-button farmer"
                      >
                        🌾 Approve as Farmer
                      </button>
                      <button 
                        onClick={() => approve(request.addr, 2)}
                        className="approve-button distributor"
                      >
                        📦 Approve as Distributor
                      </button>
                    </div>
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