// src/contract.js
import { ethers } from "ethers";
import supplyChainJson from "../src/apis/SupplyChainRoles.json"; // adjust path if needed

export const CONTRACT_ADDRESS = "0x97e7b81433D045a0CeBb59B7Bb4B0ed0bBEF0e08";

export async function getProviderAndContract() {
  if (!window.ethereum) throw new Error("MetaMask not detected");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, supplyChainJson.abi, signer);
  return { provider, signer, contract };
}

// helper to get a read-only contract (no signer) if needed
export async function getProviderAndReadContract() {
  if (!window.ethereum) throw new Error("MetaMask not detected");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, supplyChainJson.abi, provider);
  return { provider, contract };
}
