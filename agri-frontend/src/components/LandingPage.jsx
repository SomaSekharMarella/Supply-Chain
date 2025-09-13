// src/components/LandingPage.jsx
import React from "react";
import "../styles/LandingPage.css";


export default function LandingPage({ onConnect }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <h1>🌱 Agri Supply Chain 🌱</h1>
      </header>

      <main className="landing-main">
        <h2>Empowering Agriculture <br /> with Blockchain</h2>
        <p>Connect your wallet to revolutionise farming and distribution.</p>

        <button onClick={onConnect} className="connect-btn">
          CONNECT METAMASK WALLET
        </button>
      </main>
    </div>
  );
}