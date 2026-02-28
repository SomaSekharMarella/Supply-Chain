import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import { QRCodeCanvas } from "qrcode.react";
import {
  CONTRACT_ADDRESS,
  getUnitTraceReadOnly,
} from "../Contract";
import { getProductImageUrls } from "../utils/ipfs";
import "../styles/TraceUnitPage.css";

function shorten(addr) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") {
    return "Unknown";
  }
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function toBigIntSafe(value) {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    if (value && typeof value.toString === "function") {
      return BigInt(value.toString());
    }
  } catch {
    return 0n;
  }
  return 0n;
}

export default function TraceUnitPage() {
  const { unitId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trace, setTrace] = useState(null);

  useEffect(() => {
    async function fetchTrace() {
      try {
        setLoading(true);
        setError("");

        const raw = await getUnitTraceReadOnly(unitId);
        if (!raw || raw.length < 4) {
          throw new Error("Trace data not available for this unit.");
        }

        const [farmerProduct, distributorBatch, retailPack, retailUnit] = raw;

        // Use raw on-chain prices (wei per kg) for clear display
        // Farmer price = what distributor actually paid per kg
        const farmerPricePerKgWei = toBigIntSafe(
          distributorBatch?.purchasePricePerKg ?? 0,
        );
        const retailPricePerKgWei = toBigIntSafe(retailUnit?.pricePerKg ?? 0);
        const marginWei =
          retailPricePerKgWei > farmerPricePerKgWei
            ? retailPricePerKgWei - farmerPricePerKgWei
            : 0n;

        const farmerPrice = Number(farmerPricePerKgWei);
        const retailPrice = Number(retailPricePerKgWei);
        const margin = Number(marginWei);

        const farmerImages = farmerProduct?.ipfsHash
          ? getProductImageUrls(farmerProduct.ipfsHash)
          : [];

        const stages = [];

        if (farmerProduct?.batchId !== 0n && distributorBatch?.batchId !== 0n) {
          stages.push({
            label: "Farm to Distribution",
            sellerRole: "Farmer",
            buyerRole: "Distributor",
            seller: shorten(farmerProduct.farmer),
            buyer: shorten(distributorBatch.distributor),
            price: farmerPrice,
            timestamp: Number(distributorBatch.createdAt || 0),
          });
        }

        if (distributorBatch?.batchId !== 0n && retailPack?.packId !== 0n) {
          const packPriceWei = toBigIntSafe(retailPack.pricePerKg ?? 0);
          const packPrice = Number(packPriceWei);
          stages.push({
            label: "Distribution to Retail",
            sellerRole: "Distributor",
            buyerRole: "Retailer",
            seller: shorten(distributorBatch.distributor),
            buyer: shorten(retailUnit.retailer),
            price: packPrice,
            timestamp: Number(retailPack.createdAt || 0),
          });
        }

        if (retailUnit?.unitId !== 0n) {
          stages.push({
            label: "Retail Price",
            sellerRole: "Retailer",
            buyerRole: "Customer",
            seller: shorten(retailUnit.retailer),
            buyer: "Any customer",
            price: retailPrice,
            timestamp: 0,
          });
        }

        setTrace({
          unitId: Number(unitId),
          cropName: farmerProduct?.cropName || "Unknown Product",
          location: farmerProduct?.location || "Unknown",
          farmer: shorten(farmerProduct?.farmer),
          farmerPrice,
          retailPrice,
          margin,
          images: farmerImages,
          stages,
        });
      } catch (err) {
        console.error("Failed to load trace:", err);
        setError(err?.message || "Failed to load trace");
      } finally {
        setLoading(false);
      }
    }

    if (unitId) {
      fetchTrace();
    }
  }, [unitId]);

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  const networkParam = searchParams.get("network") || "sepolia";
  const shareUrl = `${origin}/trace/unit/${unitId}?network=${networkParam}&contract=${CONTRACT_ADDRESS}`;

  if (loading) {
    return (
      <div className="trace-page">
        <div className="trace-card">
          <p className="trace-status">Loading traceability...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trace-page">
        <div className="trace-card">
          <p className="trace-error">{error}</p>
          <button
            type="button"
            className="trace-back-button"
            onClick={() => navigate("/")}
          >
            ⬅ Back to app
          </button>
        </div>
      </div>
    );
  }

  if (!trace) {
    return null;
  }

  return (
    <div className="trace-page">
      <div className="trace-card">
        <div className="trace-header">
          <button
            type="button"
            className="trace-back-button"
            onClick={() => navigate(-1)}
          >
            ⬅ Back
          </button>
          <h1>🌾 Product Traceability</h1>
          <p className="trace-subtitle">
            Verified on Sepolia • Unit #{trace.unitId}
          </p>
        </div>

        <div className="trace-layout">
          <div className="trace-left">
            <div className="trace-qr-box">
              <QRCodeCanvas value={shareUrl} size={220} level="H" />
              <p className="trace-qr-caption">Scan to verify origin</p>
              <p className="trace-qr-url">{shareUrl}</p>
            </div>

            <div className="trace-product-summary">
              {trace.images?.[0] && (
                <div className="trace-image-wrapper">
                  <img
                    src={trace.images[0]}
                    alt={trace.cropName}
                    className="trace-product-image"
                  />
                </div>
              )}
              <h2>{trace.cropName}</h2>
              <p className="trace-location">📍 {trace.location}</p>
              <p className="trace-farmer">
                Original farmer: <span>{trace.farmer}</span>
              </p>
            </div>

            <div className="trace-price-box">
              <h3>💰 Price Breakdown (per kg)</h3>
              <div className="trace-price-row">
                <span>Farmer received</span>
                <span>{trace.farmerPrice} wei</span>
              </div>
              <div className="trace-price-row">
                <span>Retail price</span>
                <span>{trace.retailPrice} wei</span>
              </div>
              <div className="trace-price-row trace-price-margin">
                <span>Total margin (distribution + retail)</span>
                <span>{trace.margin} wei</span>
              </div>
            </div>
          </div>

          <div className="trace-right">
            <h3>🔍 Supply Chain Timeline</h3>
            {trace.stages.length === 0 ? (
              <p className="trace-status">
                No detailed trace information is available for this unit.
              </p>
            ) : (
              <div className="trace-timeline">
                {trace.stages.map((stage, index) => (
                  <div key={index} className="trace-step">
                    <div className="trace-stage-label">{stage.label}</div>
                    <div className="trace-step-main">
                      <div className="trace-participant">
                        <span className="trace-role seller">
                          {stage.sellerRole}
                        </span>
                        <span className="trace-address">
                          {stage.seller}
                        </span>
                      </div>
                      <span className="trace-arrow">→</span>
                      <div className="trace-participant">
                        <span className="trace-role buyer">
                          {stage.buyerRole}
                        </span>
                        <span className="trace-address">
                          {stage.buyer}
                        </span>
                      </div>
                      <span className="trace-price-badge">
                        @{stage.price} wei/kg
                      </span>
                    </div>
                    {stage.timestamp > 0 && (
                      <div className="trace-step-timestamp">
                        {new Date(stage.timestamp * 1000).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

