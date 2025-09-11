// src/App.jsx
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContract } from "./contract"; // make sure path is correct

import AdminDashboard from "./components/AdminDashboard";
import FarmerDashboard from "./components/FarmerDashboard";
import DistributorDashboard from "./components/DistributorDashboard";
import RetailerDashboard from "./components/RetailerDashboard";
import CustomerDashboard from "./components/CustomerDashboard";

/*
  App behavior:
  - Detect owner() from contract => admin dashboard for deployer (no fake role id)
  - Use getUserInfo(...).role for Farmer(1)/Distributor(2)/Retailer(3)/Customer(4)
  - If user chooses "Customer view", show CustomerDashboard without needing a role
  - ApplyRoleSimple will only call requestRole for Farmer or Distributor (per contract)
*/

function App() {
  const [account, setAccount] = useState("");
  const [roleId, setRoleId] = useState(0); // 0 = None, 1 = Farmer, 2 = Distributor, 3 = Retailer, 4 = Customer, 5 = Admin (but admin handled separately)
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewAsCustomer, setViewAsCustomer] = useState(false);

  useEffect(() => {
    init();

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

    // cleanup listeners on unmount
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", () => {});
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
    // eslint-disable-next-line
  }, []);

  // helper that tolerates getContract returning either contract or { contract }
  async function getContractInstance(withSigner = false) {
    const res = await getContract(withSigner);
    return res && res.contract ? res.contract : res;
  }

  async function init() {
    try {
      if (!window.ethereum) {
        console.warn("MetaMask not found");
        setLoading(false);
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accs = await provider.send("eth_requestAccounts", []);
      if (accs && accs.length > 0) {
        setAccount(accs[0]);
        await fetchRole(accs[0]);
      }
    } catch (err) {
      console.warn("init:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRole(address) {
    try {
      const contract = await getContractInstance(false);
      if (!contract) throw new Error("Contract not available");

      // 1) Check owner() (Ownable) — if matches, mark isAdmin true
      let ownerAddress = null;
      try {
        // owner() exists because contract inherits Ownable
        ownerAddress = (await contract.owner()).toString();
      } catch {
        // fallback: if contract exposes admin() instead, try that
        try {
          ownerAddress = (await contract.admin()).toString();
        } catch {
          ownerAddress = null;
        }
      }

      const lowerAddr = address?.toLowerCase();
      if (ownerAddress && lowerAddr && ownerAddress.toLowerCase() === lowerAddr) {
        setIsAdmin(true);
        setRoleId(5); // Set to Admin role for consistency
        setViewAsCustomer(false);
        return;
      } else {
        setIsAdmin(false);
      }

      // 2) getUserInfo for other roles (Farmer/Distributor/Retailer/Customer)
      let info = null;
      try {
        info = await contract.getUserInfo(address);
      } catch (err) {
        console.warn("getUserInfo failed:", err?.message || err);
        info = null;
      }

      if (info) {
        // enum Role { None=0, Farmer=1, Distributor=2, Retailer=3, Customer=4, Admin=5 }
        const r = Number(info.role || 0);
        setRoleId(r);
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

    // Admin takes precedence (single deployer/admin)
    if (isAdmin) {
      return <AdminDashboard account={account} />;
    }

    // If user intentionally selected "view as customer"
    if (viewAsCustomer) {
      return <CustomerDashboard account={account} />;
    }

    // Normal role-based pages (Farmer/Distributor/Retailer/Customer)
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
        // No on-chain role -> show role request form and "view as customer" option
        return (
          <div>
            <p>Your address: {account}</p>
            <p>You don't have a role yet. Request Farmer/Distributor or view as Customer:</p>
            <ApplyRoleSimple
              account={account}
              onViewAsCustomer={() => setViewAsCustomer(true)}
              refreshRole={() => fetchRole(account)}
            />
          </div>
        );
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Agri Supply Chain — DApp (Simple)</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <p>
          Connected wallet: <b>{account || "Not connected"}</b>
          {isAdmin ? " (Admin)" : ""}
        </p>
      )}
      <hr />
      {renderDashboard()}
    </div>
  );
}

export default App;


/* ---------------------------
   ApplyRoleSimple component
   - Only sends on-chain requests for Farmer (1) or Distributor (2).
   - For Retailer, instruct user to make a buy request with wantsRetailer=true (handled in Distributor/Retailer UI).
   - For Customer, we simply switch the UI to customer view (no contract call).
   ---------------------------- */
function ApplyRoleSimple({  onViewAsCustomer, refreshRole }) {
  const [role, setRole] = useState("1"); // "1" Farmer, "2" Distributor, "3" Retailer, "4" Customer
  const [idHash, setIdHash] = useState("");
  const [meta, setMeta] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleRequest() {
    try {
      if (role === "4") {
        // Customer view — no on-chain action
        if (onViewAsCustomer) onViewAsCustomer();
        return;
      }

      if (role === "3") {
        // Retailer: cannot call requestRole in your contract. Explain how to become retailer.
        alert(
          "To become a Retailer: buy a pack from a Distributor and create a buy request with wantsRetailer=true. The Distributor will approve and assign you the Retailer role."
        );
        return;
      }

      // Role is Farmer or Distributor -> on-chain request
      setBusy(true);
      const contract = await getContract(true); // with signer
      const contractInstance = contract && contract.contract ? contract.contract : contract;
      const roleNum = Number(role);
      const tx = await contractInstance.requestRole(roleNum, idHash || "", meta || "");
      await tx.wait();
      alert("Role requested on-chain. Wait for Admin approval.");
      if (refreshRole) await refreshRole();
    } catch (err) {
      console.error("requestRole failed:", err);
      // show revert reason if available
      const reason = err?.reason || (err?.error && err.error?.message) || err?.message || String(err);
      alert("Failed to request role: " + reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Request Role / View as Customer</h3>
      <label>
        Role:
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="1">Farmer (requires Admin approval)</option>
          <option value="2">Distributor (requires Admin approval)</option>
          <option value="3">Retailer (request via buyRequest to distributor)</option>
          <option value="4">Customer (no approval — view retailer listings)</option>
        </select>
      </label>
      <div style={{ marginTop: 8 }}>
        <input
          placeholder="idHash (optional)"
          value={idHash}
          onChange={(e) => setIdHash(e.target.value)}
          style={{ width: 420 }}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <input
          placeholder="meta (optional)"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
          style={{ width: 420 }}
        />
      </div>
      <div style={{ marginTop: 10 }}>
        <button onClick={handleRequest} disabled={busy}>
          {busy ? "Processing..." : role === "4" ? "View as Customer" : "Request Role"}
        </button>
      </div>
    </div>
  );
}