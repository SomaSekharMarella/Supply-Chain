/**
 * @fileoverview Contract interaction utilities for Supply Chain Management
 * @description Provides functions to interact with the deployed SupplyChain smart contract
 * @author Supply Chain Management Team
 */

import { ethers } from "ethers";
import SupplyChainAbi from "./apis/SupplyChain.json";

// Contract configuration
export const CONTRACT_ADDRESS = "0x7d02bB85f6a9A6463f240B701B73e223344153a5";
export const CONTRACT_ABI = SupplyChainAbi.abi;

/**
 * @description Get contract instance with optional signer
 * @param {boolean} withSigner - Whether to include signer for transactions
 * @returns {Promise<ethers.Contract>} Contract instance
 * @throws {Error} If MetaMask is not detected
 */
export async function getContract(withSigner = false) {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected. Please install MetaMask to continue.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * @description Get contract instance with proper error handling
 * @param {boolean} withSigner - Whether to include signer for transactions
 * @returns {Promise<ethers.Contract>} Contract instance
 */
export async function getContractInstance(withSigner = false) {
  try {
    const contract = await getContract(withSigner);
    return contract;
  } catch (error) {
    console.error("Failed to get contract instance:", error);
    throw error;
  }
}

 