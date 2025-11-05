/**
 * @fileoverview Main App component for Supply Chain Management System
 * @description Handles wallet connection, role management, and dashboard routing
 * @author Supply Chain Management Team
 */

import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract, getContractInstance } from "./Contract";

import "./App.css";

// Dashboard Components
import LandingPage from "./components/LandingPage";
import AdminDashboard from "./components/AdminDashboard";
import FarmerDashboard from "./components/FarmerDashboard";
import DistributorDashboard from "./components/DistributorDashboard";
import RetailerDashboard from "./components/RetailerDashboard";
import CustomerDashboard from "./components/CustomerDashboard";


/**
 * @description Main App component
 * @returns {JSX.Element} The main application component
 */
function App() {
  // State management
  const [account, setAccount] = useState("");
  const [roleId, setRoleId] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewAsCustomer, setViewAsCustomer] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (!accounts || accounts.length === 0) {
          setAccount("");
          setRoleId(0);
          setIsAdmin(false);
          setViewAsCustomer(false);
        } else {
          setAccount(accounts[0]);
          fetchRole(accounts[0]);
        }
      });
      window.ethereum.on("chainChanged", () => window.location.reload());
    }

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", () => {});
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
    // eslint-disable-next-line
  }, []);


  /**
   * @description Handle wallet connection with improved error handling
   */
  async function handleConnect() {
    try {
      setLoading(true);
      setError("");
      
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask to continue.");
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        await fetchRole(accounts[0]);
      } else {
        throw new Error("No accounts found. Please connect your wallet.");
      }
    } catch (err) {
      console.error("Connection failed:", err);
      setError(err.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }

  /**
   * @description Fetch user role from smart contract
   * @param {string} address - User's wallet address
   */
  async function fetchRole(address) {
    try {
      setError("");
      const contract = await getContractInstance(false);
      if (!contract) {
        throw new Error("Contract not available");
      }

      // Check if user is admin (contract owner)
      let ownerAddress = null;
      try {
        ownerAddress = (await contract.owner()).toString();
      } catch {
        // Fallback for different contract versions
        try {
          ownerAddress = (await contract.admin()).toString();
        } catch {
          ownerAddress = null;
        }
      }

      const lowerAddr = address?.toLowerCase();
      if (ownerAddress && lowerAddr && ownerAddress.toLowerCase() === lowerAddr) {
        setIsAdmin(true);
        setRoleId(5); // Admin role
        setViewAsCustomer(false);
        return;
      } else {
        setIsAdmin(false);
      }

      // Get user info from contract
      let userInfo = null;
      try {
        userInfo = await contract.getUserInfo(address);
      } catch (err) {
        console.warn("getUserInfo failed:", err?.message || err);
        userInfo = null;
      }

      if (userInfo) {
        setRoleId(Number(userInfo.role || 0));
      } else {
        setRoleId(0); // No role
      }
      setViewAsCustomer(false);
    } catch (err) {
      console.error("Error fetching role:", err);
      setError("Failed to fetch user role: " + (err.message || err));
      setIsAdmin(false);
      setRoleId(0);
    }
  }

  /**
   * @description Render appropriate dashboard based on user role
   * @returns {JSX.Element} Dashboard component
   */
  function renderDashboard() {
    if (!account) {
      return (
        <div className="connection-prompt">
          <p>Please connect MetaMask (Sepolia network) to continue.</p>
          <button onClick={handleConnect} className="connect-button">
            Connect Wallet
          </button>
        </div>
      );
    }

    if (isAdmin) {
      return <AdminDashboard account={account} />;
    }

    if (viewAsCustomer) {
      return <CustomerDashboard account={account} />;
    }

    switch (roleId) {
      case 1:
        return <FarmerDashboard account={account} roleId={roleId} />;
      case 2:
        return <DistributorDashboard account={account} />;
      case 3:
        return <RetailerDashboard account={account} />;
      case 4:
        return <CustomerDashboard account={account} />;
      default:
        return (
          <div className="apply-role-container">
            <p className="address">Your address: {account}</p>
            <p className="note">
              You don't have a role yet. Request Farmer/Distributor or view as Customer:
            </p>
            <ApplyRoleSimple
              account={account}
              onViewAsCustomer={() => setViewAsCustomer(true)}
              refreshRole={() => fetchRole(account)}
            />
          </div>
        );
    }
  }

  // Show landing page if no account connected
  if (!account) {
    return <LandingPage onConnect={handleConnect} />;
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="title">🌱 Agri Supply Chain Management</h1>
        <div className="wallet-info">
          {loading ? (
            <p className="wallet-status">Loading...</p>
          ) : (
            <p className="wallet-status">
              Connected wallet: <b>{account || "Not connected"}</b>
              {isAdmin ? " (Admin)" : ""}
            </p>
          )}
          {error && (
            <div className="error-message">
              <p>⚠️ {error}</p>
              <button onClick={() => setError("")} className="dismiss-error">
                Dismiss
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="dashboard">{renderDashboard()}</main>
    </div>
  );
}

export default App;

/**
 * @description Component for requesting roles or viewing as customer
 * @param {Object} props - Component props
 * @param {Function} props.onViewAsCustomer - Callback for viewing as customer
 * @param {Function} props.refreshRole - Callback to refresh user role
 * @returns {JSX.Element} Role application component
 */
function ApplyRoleSimple({ onViewAsCustomer, refreshRole }) {
  const [role, setRole] = useState("1");
  const [idHash, setIdHash] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /**
   * @description Handle role request submission
   */
  async function handleRequest() {
    try {
      setError("");
      
      if (role === "4") {
        if (onViewAsCustomer) onViewAsCustomer();
        return;
      }
      
      if (role === "3") {
        setError("To become a Retailer: buy a pack from a Distributor and create a buy request with wantsRetailer=true.");
        return;
      }

      setBusy(true);
      const contract = await getContractInstance(true);
      const tx = await contract.requestRole(Number(role), idHash || "", meta || "");
      await tx.wait();
      
      alert("✅ Role requested successfully! Wait for Admin approval.");
      if (refreshRole) await refreshRole();
      
      // Reset form
      setIdHash("");
      setMeta("");
    } catch (err) {
      console.error("requestRole failed:", err);
      setError("Failed to request role: " + (err?.reason || err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="apply-role">
      <h3>Request Role / View as Customer</h3>
      
      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => setError("")} className="dismiss-error">
            Dismiss
          </button>
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="role-select">
          Select Role:
        </label>
        <select 
          id="role-select"
          value={role} 
          onChange={(e) => setRole(e.target.value)}
          className="role-select"
        >
          <option value="1">🌾 Farmer (requires Admin approval)</option>
          <option value="2">📦 Distributor (requires Admin approval)</option>
          <option value="3">🏪 Retailer (via distributor buy request)</option>
          <option value="4">🛒 Customer (no approval)</option>
        </select>
      </div>
      
      <div className="form-group">
        <input
          placeholder="ID Hash (optional)"
          value={idHash}
          onChange={(e) => setIdHash(e.target.value)}
          className="form-input"
        />
      </div>
      
      <div className="form-group">
        <input
          placeholder="Metadata (optional)"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          className="form-input"
        />
      </div>
      
      <button 
        onClick={handleRequest} 
        disabled={busy}
        className={`submit-button ${busy ? 'loading' : ''}`}
      >
        {busy ? "⏳ Processing..." : role === "4" ? "🛒 View as Customer" : "📝 Request Role"}
      </button>
    </div>
  );
}
