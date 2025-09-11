// src/contract.js
import { ethers } from "ethers";
import SupplyChainAbi from "../src/apis/SupplyChain.json"; // your ABI JSON

export const CONTRACT_ADDRESS = "0xfBD6A9Ff79256C082BdDF16FfBa9c010656f3C90"; // replace with your deployed contract

// Returns contract (with signer if withSigner = true)
export async function getContract(withSigner = false) {
  if (!window.ethereum) throw new Error("MetaMask not detected");

  const provider = new ethers.BrowserProvider(window.ethereum);
  let contract;

  if (withSigner) {
    const signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, SupplyChainAbi.abi, signer);
  } else {
    contract = new ethers.Contract(CONTRACT_ADDRESS, SupplyChainAbi.abi, provider);
  }

  return contract;
}