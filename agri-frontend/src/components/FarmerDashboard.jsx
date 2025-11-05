/**
 * @fileoverview Farmer Dashboard Component (Simplified)
 * @description Allows Farmers to add new products — view feature removed.
 */

import React, { useState } from "react";
import { getContractInstance } from "../Contract";
import "../styles/FarmerDashboard.css";

export default function FarmerDashboard({ account, roleId }) {
  const [error, setError] = useState("");

  /**
   * @description Add a new product to the supply chain
   * @param {Event} e - Form submit event
   */
  async function addProduct(e) {
    e.preventDefault();
    const form = e.target;

    try {
      setError("");

      // Allow only approved Farmers
      if (roleId !== 1) {
        setError("⚠️ Only approved Farmers can add products.");
        return;
      }

      const contract = await getContractInstance(true);

      const tx = await contract.addProduct(
        form.crop.value,
        form.period.value,
        Number(form.days.value),
        Number(form.quantity.value),
        Number(form.price.value),
        form.location.value,
        Number(form.visibility.value),
        form.ipfs.value
      );

      await tx.wait();
      alert("✅ Product added successfully!");
      form.reset();
    } catch (err) {
      console.error("Add product failed:", err);
      setError("Failed to add product: " + (err?.message || err));
    }
  }

  return (
    <div className="farmer-dashboard">
      <header className="dashboard-header">
        <h2>🌾 Farmer Dashboard</h2>
        <p className="farmer-address">
          Farmer: <b>{account}</b>
        </p>
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => setError("")} className="dismiss-error">
              Dismiss
            </button>
          </div>
        )}
      </header>

      {/* Only Add Product section */}
      <section className="content-section">
        <h3>🌱 Add New Product</h3>
        <form className="product-form" onSubmit={addProduct}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="crop">Crop Name</label>
              <input
                id="crop"
                name="crop"
                placeholder="e.g., Organic Tomatoes"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="period">Crop Period</label>
              <input
                id="period"
                name="period"
                placeholder="e.g., Jan-Feb 2024"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="days">Days to Harvest</label>
              <input
                id="days"
                name="days"
                type="number"
                placeholder="30"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="quantity">Quantity (kg)</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                placeholder="1000"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price per Kg (wei)</label>
              <input
                id="price"
                name="price"
                type="number"
                placeholder="1000000000000000000"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                placeholder="Farm Location"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="visibility">Visibility</label>
              <select
                id="visibility"
                name="visibility"
                required
                className="form-select"
              >
                <option value="1">🌍 Public</option>
                <option value="0">🔒 Private</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ipfs">IPFS Hash (optional)</label>
              <input
                id="ipfs"
                name="ipfs"
                placeholder="QmHash..."
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" className="submit-button">
            🌱 Add Product
          </button>
        </form>
      </section>
    </div>
  );
}
