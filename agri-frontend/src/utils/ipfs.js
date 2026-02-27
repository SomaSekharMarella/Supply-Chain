const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || "https://ipfs.filebase.io/ipfs/";
const IPFS_RPC_URL = import.meta.env.VITE_IPFS_RPC_URL || "https://rpc.filebase.io";
const IPFS_RPC_AUTH = import.meta.env.VITE_IPFS_RPC_AUTH || "";

function normalizeAuthHeaders(rawAuth) {
  const value = (rawAuth || "").trim();
  if (!value) return [];
  if (value.startsWith("Basic ") || value.startsWith("Bearer ")) return [value];
  // Try bearer first (recommended by Filebase RPC), then basic as fallback.
  return [`Bearer ${value}`, `Basic ${value}`];
}

function normalizeCid(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("ipfs://")) return trimmed.slice("ipfs://".length);
  return trimmed;
}

export function parseStoredImageCids(stored) {
  if (!stored) return [];
  const raw = String(stored).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeCid).filter(Boolean);
    }
  } catch {
    // Fallback to CSV or single CID.
  }

  if (raw.includes(",")) {
    return raw
      .split(",")
      .map(normalizeCid)
      .filter(Boolean);
  }

  return [normalizeCid(raw)].filter(Boolean);
}

export function getProductImageUrls(stored) {
  return parseStoredImageCids(stored).map((cid) => `${IPFS_GATEWAY}${cid}`);
}

export function encodeImageCids(cids) {
  return JSON.stringify((cids || []).map(normalizeCid).filter(Boolean));
}

export async function uploadImagesToFilebase(files) {
  const picked = Array.from(files || []);
  if (picked.length < 1 || picked.length > 3) {
    throw new Error("Please upload between 1 and 3 images.");
  }

  const authHeaders = normalizeAuthHeaders(IPFS_RPC_AUTH);
  if (authHeaders.length === 0) {
    throw new Error("Missing IPFS RPC auth. Set VITE_IPFS_RPC_AUTH in .env.");
  }

  const cids = [];
  for (const file of picked) {
    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.");
    }

    const formData = new FormData();
    formData.append("file", file, file.name);

    let lastError = "";
    let uploadSucceeded = false;
    for (const authHeader of authHeaders) {
      const response = await fetch(`${IPFS_RPC_URL}/api/v0/add?cid-version=1`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
        },
        body: formData,
      });

      const text = await response.text();
      if (!response.ok) {
        lastError = `${response.status} ${text}`;
        continue;
      }

      // RPC response may contain one or more JSON lines.
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const last = lines[lines.length - 1];
      const parsed = JSON.parse(last);
      const cid = normalizeCid(parsed?.Hash);
      if (!cid) {
        throw new Error("IPFS upload failed: missing CID in response.");
      }
      cids.push(cid);
      uploadSucceeded = true;
      break;
    }

    if (!uploadSucceeded) {
      throw new Error(
        `IPFS upload failed: ${lastError}. Check VITE_IPFS_RPC_AUTH (use Filebase IPFS RPC API key/token) and restart Vite after updating .env.`
      );
    }
  }

  return cids;
}
