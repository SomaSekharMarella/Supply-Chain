// src/components/CustomerDashboard.jsx
import React, { useEffect, useState } from "react";
import { getContract } from "../contract";
import "../styles/CustomerDashboard.css";

export default function CustomerDashboard({ account }) {
  const [availableUnits, setAvailableUnits] = useState([]);
  const [buyForm, setBuyForm] = useState({ unitId: "", qty: "" });
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [publicPacks, setPublicPacks] = useState([]);
  const [buyRequestForm, setBuyRequestForm] = useState({
    packId: "",
    qty: "",
    wantsRetailer: false,
  });

  useEffect(() => {
    loadAvailableUnits();
    loadPurchaseHistory();
    loadPublicPacks();
  }, []);

  async function loadAvailableUnits() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalRetailUnits());
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const u = await contract.retailUnits(i);
        if (u.unitId !== 0 && u.available) {
          arr.push({
            unitId: Number(u.unitId),
            retailer: u.retailer,
            qty: Number(u.quantityKg),
            pricePerKg: Number(u.pricePerKg),
            ipfs: u.ipfsHash,
          });
        }
      }
      setAvailableUnits(arr);
    } catch (err) {
      console.error(err);
    }
  }

  async function buyUnit() {
    try {
      const contract = await getContract(true);
      const unit = await contract.retailUnits(Number(buyForm.unitId));
      const price = BigInt(unit.pricePerKg);
      const qty = BigInt(buyForm.qty);
      const total = price * qty;
      const tx = await contract.buyRetailUnit(
        Number(buyForm.unitId),
        Number(buyForm.qty),
        { value: total.toString() }
      );
      await tx.wait();
      alert("Unit purchased");
      loadAvailableUnits();
      loadPurchaseHistory();
    } catch (err) {
      console.error(err);
      alert("Buy failed: " + (err?.message || err));
    }
  }

  async function loadPurchaseHistory() {
    try {
      const contract = await getContract(false);
      const arr = await contract.getPurchaseHistory(account);

      const mapped = await Promise.all(
        arr.map(async (p) => {
          const traceRaw = await contract.getUnitTrace(Number(p.unitId));
          const traceFormatted = traceRaw.map((t) => ({
            seller: t.seller,
            buyer: t.buyer,
            pricePerKg: Number(t.pricePerKg),
          }));

          return {
            purchaseId: Number(p.purchaseId),
            unitId: Number(p.unitId),
            buyer: p.buyer,
            seller: p.seller,
            qty: Number(p.qtyKg),
            pricePerKg: Number(p.pricePerKg),
            timestamp: Number(p.timestamp),
            trace: traceFormatted,
          };
        })
      );

      setPurchaseHistory(mapped);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPublicPacks() {
    try {
      const contract = await getContract(false);
      const total = Number(await contract.totalRetailPacks());
      const arr = [];
      for (let i = 1; i <= total; i++) {
        const p = await contract.retailPacks(i);
        if (p.packId !== 0 && Number(p.visibility) === 1 && p.available) {
          arr.push({
            packId: Number(p.packId),
            distributor: p.distributor,
            qty: Number(p.quantityKg),
            pricePerKg: Number(p.pricePerKg),
            ipfs: p.ipfsHash,
          });
        }
      }
      setPublicPacks(arr);
    } catch (err) {
      console.error(err);
    }
  }

  async function createBuyRequest() {
    try {
      const contract = await getContract(true);
      const pack = await contract.retailPacks(Number(buyRequestForm.packId));
      const price = BigInt(pack.pricePerKg);
      const qty = BigInt(buyRequestForm.qty);
      const total = price * qty;
      const tx = await contract.createBuyRequest(
        Number(buyRequestForm.packId),
        Number(buyRequestForm.qty),
        buyRequestForm.wantsRetailer,
        { value: total.toString() }
      );
      await tx.wait();
      alert("Buy request created");
      loadPublicPacks();
    } catch (err) {
      console.error(err);
      alert("Buy request failed: " + (err?.message || err));
    }
  }

  return (
    <div className="customer-dashboard">
      <h2>Customer Dashboard</h2>
      <p>
        Customer: <b>{account}</b>
      </p>

      <section>
        <h3>Public Distributor Packs (to request buy)</h3>
        <button onClick={loadPublicPacks}>Refresh</button>
        {publicPacks.map((p) => (
          <div key={p.packId}>
            PackId: {p.packId} | Distributor: {p.distributor} | Qty: {p.qty} |
            Price/Kg: {p.pricePerKg}
          </div>
        ))}
        <div>
          <input
            placeholder="packId"
            value={buyRequestForm.packId}
            onChange={(e) =>
              setBuyRequestForm({ ...buyRequestForm, packId: e.target.value })
            }
          />
          <input
            placeholder="qty"
            value={buyRequestForm.qty}
            onChange={(e) =>
              setBuyRequestForm({ ...buyRequestForm, qty: e.target.value })
            }
          />
          <label>
            Wants Retailer Role:{" "}
            <input
              type="checkbox"
              checked={buyRequestForm.wantsRetailer}
              onChange={(e) =>
                setBuyRequestForm({
                  ...buyRequestForm,
                  wantsRetailer: e.target.checked,
                })
              }
            />
          </label>
          <button onClick={createBuyRequest}>Create Buy Request</button>
        </div>
      </section>

      <section>
        <h3>Available Retail Units</h3>
        <button onClick={loadAvailableUnits}>Refresh</button>
        {availableUnits.map((u) => (
          <div key={u.unitId}>
            UnitId: {u.unitId} | Retailer: {u.retailer} | Qty: {u.qty} |
            Price/Kg: {u.pricePerKg}
          </div>
        ))}
      </section>

      <section>
        <h3>Buy Unit</h3>
        <input
          placeholder="unitId"
          value={buyForm.unitId}
          onChange={(e) => setBuyForm({ ...buyForm, unitId: e.target.value })}
        />
        <input
          placeholder="qty"
          value={buyForm.qty}
          onChange={(e) => setBuyForm({ ...buyForm, qty: e.target.value })}
        />
        <button onClick={buyUnit}>Buy</button>
      </section>

      <section>
        <h3>Purchase History & Traceability</h3>
        <button onClick={loadPurchaseHistory}>Refresh</button>
        {purchaseHistory.map((p) => (
          <div key={p.purchaseId} className="purchase-card">
            <p>
              <b>PurchaseId:</b> {p.purchaseId} | <b>UnitId:</b> {p.unitId}
            </p>
            <p>
              <b>Qty:</b> {p.qty} | <b>Price/Kg:</b> {p.pricePerKg}
            </p>
            <p>
              <b>Seller:</b> {p.seller} | <b>Buyer:</b> {p.buyer}
            </p>
            <p>
              <b>Trace:</b>
            </p>
            <ul>
              {p.trace.map((t, idx) => (
                <li key={idx}>
                  Seller: {t.seller} → Buyer: {t.buyer} @ {t.pricePerKg} per Kg
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
