import { useState } from "react";
import { ethers } from "ethers";
import { QRCodeSVG } from 'qrcode.react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./Contract";

function App() {
  const [lotId, setLotId] = useState(null);
  const [lotData, setLotData] = useState(null);

  // connect to MetaMask
  async function getContract() {
    if (!window.ethereum) {
      alert("MetaMask not detected");
      return null;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  // create a new lot
  async function createLot(crop, qty, price) {
    const contract = await getContract();
    const tx = await contract.createLot(crop, qty, price);
    const receipt = await tx.wait();
    const newLotId = receipt.logs[0].args[0].toString(); // assuming your event returns lotId
    setLotId(newLotId);
  }

  // get lot details
  async function fetchLot(id) {
    const contract = await getContract();
    const data = await contract.getLot(id);
    setLotData(data);
  }

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold">Agri Supply Chain</h1>

      {/* Farmer Form */}
      <h2>Create Lot</h2>
      <button onClick={() => createLot("Tomato", 100, 20)}>Create Tomato Lot</button>

      {lotId && (
        <div>
          <p>New Lot ID: {lotId}</p>
<QRCodeSVG value={lotId.toString()} />        </div>
      )}

      {/* Consumer Section */}
      <h2>Check Lot</h2>
      <input type="text" onChange={(e) => setLotId(e.target.value)} placeholder="Enter Lot ID" />
      <button onClick={() => fetchLot(lotId)}>Fetch Lot</button>

      {lotData && (
        <div>
          <p>Crop: {lotData[0]}</p>
          <p>Quantity: {lotData[1].toString()}</p>
          <p>Base Price: {lotData[2].toString()} ETH</p>
          <p>Farmer: {lotData[3]}</p>
        </div>
      )}
    </div>
  );
}

export default App;
