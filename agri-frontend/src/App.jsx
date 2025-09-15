// src/App.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract } from "./contract"; // make sure path is correct

import "./App.css"; 

import LandingPage from "./components/LandingPage";
import AdminDashboard from "./components/AdminDashboard";
import FarmerDashboard from "./components/FarmerDashboard";
import DistributorDashboard from "./components/DistributorDashboard";
import RetailerDashboard from "./components/RetailerDashboard";
import CustomerDashboard from "./components/CustomerDashboard";

function GoogleTranslate() {
  useEffect(() => {
    const addScript = document.createElement("script");
    addScript.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(addScript);

    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: "hi,bn,te,mr,ta,ur,gu,kn,or,pa,ml", // Indian languages only
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        },
        "google_translate_element"
      );
    };
  }, []);

  return (
    <div
      id="google_translate_element"
      style={{ position: "fixed", top: 10, right: 10, zIndex: 1000 }}
    />
  );
}

function App() {
  const [account, setAccount] = useState("");
  const [roleId, setRoleId] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewAsCustomer, setViewAsCustomer] = useState(false);

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

  async function getContractInstance(withSigner = false) {
    const res = await getContract(withSigner);
    return res && res.contract ? res.contract : res;
  }

  async function handleConnect() {
    try {
      setLoading(true);
      if (!window.ethereum) {
        alert("MetaMask not found. Please install it.");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accs = await provider.send("eth_requestAccounts", []);
      if (accs && accs.length > 0) {
        setAccount(accs[0]);
        await fetchRole(accs[0]);
      }
    } catch (err) {
      console.error("connect failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRole(address) {
    try {
      const contract = await getContractInstance(false);
      if (!contract) throw new Error("Contract not available");

      let ownerAddress = null;
      try {
        ownerAddress = (await contract.owner()).toString();
      } catch {
        try {
          ownerAddress = (await contract.admin()).toString();
        } catch {
          ownerAddress = null;
        }
      }

      const lowerAddr = address?.toLowerCase();
      if (ownerAddress && lowerAddr && ownerAddress.toLowerCase() === lowerAddr) {
        setIsAdmin(true);
        setRoleId(5);
        setViewAsCustomer(false);
        return;
      } else {
        setIsAdmin(false);
      }

      let info = null;
      try {
        info = await contract.getUserInfo(address);
      } catch (err) {
        console.warn("getUserInfo failed:", err?.message || err);
        info = null;
      }

      if (info) {
        setRoleId(Number(info.role || 0));
      } else {
        setRoleId(0);
      }
      setViewAsCustomer(false);
    } catch (err) {
      console.error("Error fetching role", err);
      setIsAdmin(false);
      setRoleId(0);
    }
  }

  function renderDashboard() {
    if (!account) return <p>Please connect MetaMask (Sepolia) to continue.</p>;

    if (isAdmin) {
      return <AdminDashboard account={account} />;
    }

    if (viewAsCustomer) {
      return <CustomerDashboard account={account} />;
    }

    switch (roleId) {
      case 1:
        return <FarmerDashboard account={account} />;
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
              You don’t have a role yet. Request Farmer/Distributor or view as Customer:
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

  if (!account) {
    return <LandingPage onConnect={handleConnect} />;
  }

  return (
    <div className="app-container">
      <GoogleTranslate />
      <header className="header">
        <h1 className="title"> Agri Supply Chain 🌱</h1>
        {loading ? (
          <p className="wallet-status">Loading...</p>
        ) : (
          <p className="wallet-status">
            Connected wallet: <b>{account || "Not connected"}</b>
            {isAdmin ? " (Admin)" : ""}
          </p>
        )}
      </header>
      <main className="dashboard">{renderDashboard()}</main>
    </div>
  );
}

export default App;

/* ---------------------------
   ApplyRoleSimple component
   ---------------------------- */
function ApplyRoleSimple({ onViewAsCustomer, refreshRole }) {
  const [role, setRole] = useState("1");
  const [idHash, setIdHash] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRequest() {
    try {
      if (role === "4") {
        if (onViewAsCustomer) onViewAsCustomer();
        return;
      }
      if (role === "3") {
        alert(
          "To become a Retailer: buy a pack from a Distributor and create a buy request with wantsRetailer=true."
        );
        return;
      }

      setBusy(true);
      const contract = await getContract(true);
      const contractInstance = contract && contract.contract ? contract.contract : contract;
      const tx = await contractInstance.requestRole(Number(role), idHash || "", meta || "");
      await tx.wait();
      alert("Role requested on-chain. Wait for Admin approval.");
      if (refreshRole) await refreshRole();
    } catch (err) {
      console.error("requestRole failed:", err);
      alert("Failed to request role: " + (err?.reason || err?.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="apply-role">
      <h3>Request Role / View as Customer</h3>
      <label>
        Role:
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="1">Farmer (requires Admin approval)</option>
          <option value="2">Distributor (requires Admin approval)</option>
          <option value="3">Retailer (via distributor buy request)</option>
          <option value="4">Customer (no approval)</option>
        </select>
      </label>
      <input
        placeholder="idHash (optional)"
        value={idHash}
        onChange={(e) => setIdHash(e.target.value)}
      />
      <input
        placeholder="meta (optional)"
        value={meta}
        onChange={(e) => setMeta(e.target.value)}
      />
      <button onClick={handleRequest} disabled={busy}>
        {busy ? "Processing..." : role === "4" ? "View as Customer" : "Request Role"}
      </button>
    </div>
  );
}
