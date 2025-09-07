// src/App.jsx
import React from "react";

import { useEffect, useRef, useState } from "react";
import AdminDashboard from "./components/AdminDashboard";
import FarmerDashboard from "./components/FarmerDashboard";
import DistributorDashboard from "./components/DistributorDashboard";
import { getProviderAndReadContract } from "./Contract.js";

function App() {
  const [account, setAccount] = useState(null);
  const [roleInfo, setRoleInfo] = useState(null); // UserInfo struct from contract
  const [isAdmin, setIsAdmin] = useState(false);
  const refreshRef = useRef(null); // allow child to set refresh function

  const connect = async () => {
    try {
      if (!window.ethereum) return alert("Install MetaMask");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
    } catch (err) {
      console.error("connect error:", err);
    }
  };

  const loadUserRole = async (acct) => {
    try {
      const { contract } = await getProviderAndReadContract();
      const adminAddr = await contract.admin();
      setIsAdmin(adminAddr.toLowerCase() === acct.toLowerCase());

      const userInfo = await contract.getUserInfo(acct);
      // userInfo is a tuple: (role, requested, id, ip, appliedAt, exists) - depends on ABI order
      setRoleInfo({
        role: Number(userInfo.role),
        requested: userInfo.requested,
        id: userInfo.id,
        ip: userInfo.ip,
        appliedAt: Number(userInfo.appliedAt),
        exists: userInfo.exists
      });
    } catch (err) {
      console.error("loadUserRole error:", err);
      setRoleInfo(null);
    }
  };

  useEffect(() => {
    // auto connect if account already available
    async function init() {
      if (!window.ethereum) return;
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length) {
        setAccount(accounts[0]);
      }
    }
    init();

    // listen for account changes
    window.ethereum?.on("accountsChanged", (accounts) => {
      setAccount(accounts[0] || null);
    });

    window.ethereum?.on("chainChanged", () => {
      window.location.reload();
    });
  }, []);

  useEffect(() => {
    if (account) loadUserRole(account);
  }, [account]);

  const refreshAll = async () => {
    if (account) await loadUserRole(account);
    if (refreshRef.current) await refreshRef.current();
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agri Supply Chain</h1>
        <div>
          {account ? (
            <div>
              <span className="mr-2">Connected: {account.slice(0,6)}...{account.slice(-4)}</span>
              <button onClick={refreshAll} className="px-2 py-1 bg-gray-200 rounded">Refresh</button>
            </div>
          ) : (
            <button onClick={connect} className="px-3 py-1 bg-blue-600 text-white rounded">Connect Wallet</button>
          )}
        </div>
      </header>

      {account ? (
        <>
          {isAdmin ? (
            <AdminDashboard onRefreshRequested={refreshRef} />
          ) : (
            <>
              {/* Non-admin: show only apply options; if approved, show corresponding dashboard */}
              {roleInfo && roleInfo.role === 1 ? (
                <FarmerDashboard isApproved={true} />
              ) : roleInfo && roleInfo.role === 2 ? (
                <DistributorDashboard isApproved={true} />
              ) : (
                <div className="grid gap-4">
                  <FarmerDashboard isApproved={false} />
                  <DistributorDashboard isApproved={false} />
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div>Please connect your wallet to continue.</div>
      )}
    </div>
  );
}

export default App;
