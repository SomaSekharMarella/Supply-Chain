/**
 * @fileoverview Farmer Dashboard Component
 * @description Allows Farmers to add and view their products
 */

import React, { useState, useEffect } from "react";
import { getContractInstance } from "../Contract";
import { encodeImageCids, getProductImageUrls, uploadImagesToFilebase } from "../utils/ipfs";
import "../styles/FarmerDashboard.css";

export default function FarmerDashboard({ account, roleId }) {
  const [error, setError] = useState("");
  const [myProducts, setMyProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("add"); // "add" or "view"
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (activeTab === "view") {
      loadMyProducts();
    }
  }, [activeTab]);

  /**
   * @description Load farmer's products using getMyProducts()
   */
  async function loadMyProducts() {
    try {
      setLoading(true);
      setError("");
      // Must use signer so msg.sender is the farmer address,
      // otherwise the role check in getMyProducts() will revert.
      const contract = await getContractInstance(true);
      const products = await contract.getMyProducts();
      
      const mapped = products.map((p) => ({
        batchId: Number(p.batchId),
        cropName: p.cropName,
        cropPeriod: p.cropPeriod,
        daysToHarvest: Number(p.daysToHarvest),
        quantityKg: Number(p.quantityKg),
        pricePerKg: Number(p.pricePerKg),
        location: p.location,
        visibility: Number(p.visibility) === 1 ? "Public" : "Private",
        ipfsHash: p.ipfsHash,
        imageUrls: getProductImageUrls(p.ipfsHash),
        createdAt: Number(p.createdAt),
        active: p.active,
      }));
      
      setMyProducts(mapped);
    } catch (err) {
      console.error("Error loading products:", err);
      setError("Failed to load products: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  /**
   * @description Add a new product to the supply chain
   */
  async function addProduct(e) {
    e.preventDefault();
    const form = e.target;

    try {
      setError("");

      if (roleId !== 1) {
        setError("⚠️ Only approved Farmers can add products.");
        return;
      }

      const imageFiles = Array.from(form.images.files || []);
      if (imageFiles.length < 1 || imageFiles.length > 3) {
        setError("Please upload minimum 1 and maximum 3 product images.");
        return;
      }

      const contract = await getContractInstance(true);
      setUploadingImages(true);
      const imageCids = await uploadImagesToFilebase(imageFiles);
      const storedImageValue = encodeImageCids(imageCids);

      const tx = await contract.addProduct(
        form.crop.value,
        form.period.value,
        Number(form.days.value),
        Number(form.quantity.value),
        Number(form.price.value),
        form.location.value,
        Number(form.visibility.value),
        storedImageValue
      );

      await tx.wait();
      alert("✅ Product added successfully!");
      form.reset();
      
      // Refresh product list if on view tab
      if (activeTab === "view") {
        loadMyProducts();
      }
    } catch (err) {
      console.error("Add product failed:", err);
      setError("Failed to add product: " + (err?.message || err));
    } finally {
      setUploadingImages(false);
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

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "add" ? "active" : ""}`}
          onClick={() => setActiveTab("add")}
        >
          ➕ Add Product
        </button>
        <button
          className={`tab-btn ${activeTab === "view" ? "active" : ""}`}
          onClick={() => setActiveTab("view")}
        >
          📋 My Products
        </button>
      </div>

      {/* Add Product Section */}
      {activeTab === "add" && (
        <section className="content-section">
          <h3>🌱 Add New Product</h3>
          <form className="product-form" onSubmit={addProduct}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="crop">Crop Name *</label>
                <input
                  id="crop"
                  name="crop"
                  placeholder="e.g., Organic Tomatoes"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="period">Crop Period *</label>
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
                <label htmlFor="days">Days to Harvest *</label>
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
                <label htmlFor="quantity">Quantity (kg) *</label>
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
                <label htmlFor="price">Price per Kg (wei) *</label>
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
                <label htmlFor="location">Location *</label>
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
                <label htmlFor="visibility">Visibility *</label>
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
                <label htmlFor="images">Product Images (1 to 3) *</label>
                <input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  required
                  className="form-input"
                />
              </div>
            </div>

            <button type="submit" className="submit-button" disabled={uploadingImages}>
              {uploadingImages ? "⏳ Uploading images..." : "🌱 Add Product"}
            </button>
          </form>
        </section>
      )}

      {/* View Products Section */}
      {activeTab === "view" && (
        <section className="content-section">
          <div className="section-header">
            <h3>📋 My Products</h3>
            <button onClick={loadMyProducts} className="refresh-button">
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-indicator">
              <p>Loading products...</p>
            </div>
          ) : myProducts.length === 0 ? (
            <div className="empty-state">
              <p>No products added yet. Add your first product!</p>
            </div>
          ) : (
            <div className="products-grid">
              {myProducts.map((product) => (
                <div key={product.batchId} className="product-card">
                  <div className="product-header">
                    <h4>{product.cropName}</h4>
                    <span className={`status-badge ${product.active ? "active" : "inactive"}`}>
                      {product.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="product-details">
                    <div className="detail-row">
                      <span className="label">Batch ID:</span>
                      <span className="value">#{product.batchId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Crop Period:</span>
                      <span className="value">{product.cropPeriod}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Quantity:</span>
                      <span className="value">{product.quantityKg} kg</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Price per Kg:</span>
                      <span className="value">{product.pricePerKg} wei</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Location:</span>
                      <span className="value">{product.location}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Days to Harvest:</span>
                      <span className="value">{product.daysToHarvest} days</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Visibility:</span>
                      <span className={`value visibility ${product.visibility.toLowerCase()}`}>
                        {product.visibility === "Public" ? "🌍 Public" : "🔒 Private"}
                      </span>
                    </div>
                    {product.ipfsHash && (
                      <div className="ipfs-info">
                        <span className="label">IPFS Hash:</span>
                        <span className="ipfs-hash">{product.ipfsHash}</span>
                      </div>
                    )}
                    {product.imageUrls.length > 0 && (
                      <div className="detail-row">
                        <span className="label">Images:</span>
                        <div className="value">
                          {product.imageUrls.map((url) => (
                            <img
                              key={url}
                              src={url}
                              alt={product.cropName}
                              style={{ width: 90, height: 90, objectFit: "cover", marginRight: 8, borderRadius: 6 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Created:</span>
                      <span className="value">
                        {new Date(product.createdAt * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
