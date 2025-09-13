// src/components/FarmerDashboard.jsx
import React, { useState, useEffect } from "react";
import { getContract } from "../contract";
import "../styles/FarmerDashboard.css";

export default function FarmerDashboard({ account }) {
  const [activeTab, setActiveTab] = useState(""); // "" means nothing selected yet
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  async function getContractInstance(withSigner = false) {
    const res = await getContract(withSigner);
    return res && res.contract ? res.contract : res;
  }

  async function loadProducts() {
    try {
      const contract = await getContractInstance(false);
      const farmerProducts = await contract.getProductsByFarmer(account);
      setProducts(farmerProducts);
    } catch (err) {
      console.error("Error loading products", err);
    }
  }

  async function addProduct(e) {
    e.preventDefault();
    const form = e.target;
    const crop = form.crop.value;
    const period = form.period.value;
    const quantity = form.quantity.value;
    const price = form.price.value;
    const location = form.location.value;

    try {
      const contract = await getContractInstance(true);
      const tx = await contract.addProduct(crop, period, quantity, price, location);
      await tx.wait();
      alert("Product added successfully!");
      form.reset();
      loadProducts();
    } catch (err) {
      console.error(err);
      alert("Add product failed: " + (err?.message || err));
    }
  }

  return (
    <div className="farmer-dashboard">
      <h2>Farmer Dashboard 🌾</h2>
      <p>
        Farmer: <b>{account}</b>
      </p>

      {/* Buttons */}
      <div className="dashboard-buttons">
        <button
          className={`dashboard-btn ${activeTab === "add" ? "active" : ""}`}
          onClick={() => setActiveTab("add")}
        >
          🌱 Add Product
        </button>

        <button
          className={`dashboard-btn ${activeTab === "view" ? "active" : ""}`}
          onClick={() => setActiveTab("view")}
        >
          📦 View My Products
        </button>
      </div>

      {/* Conditional Content */}
      <div className="dashboard-content">
        {activeTab === "add" && (
          <form className="product-form" onSubmit={addProduct}>
            <h3>Add Product / Batch</h3>
            <input name="crop" placeholder="Crop name" required />
            <input name="period" placeholder="Crop period (e.g., Jan-Feb)" required />
            <input name="quantity" type="number" placeholder="Quantity (kg)" required />
            <input name="price" type="number" placeholder="Price per unit" required />
            <input name="location" placeholder="Location" required />
            <button type="submit">Add Product</button>
          </form>
        )}

        {activeTab === "view" && (
          <section className="product-list">
            <h3>My Products</h3>
            {products.length === 0 ? (
              <p>No products added yet.</p>
            ) : (
              <ul>
                {products.map((p, i) => (
                  <li key={i}>
                    <b>{p.crop}</b> ({p.period}) - {p.quantity}kg @ {p.price} wei <br />
                    Location: {p.location}
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