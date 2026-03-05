/**
 * Frontend-only expiry/validity date management.
 * Stores expiry per farmer batchId; downstream (distributor pack, retail unit)
 * derive expiry from origin farmer batch. Contract is not modified.
 */

const PREFIX = "expiry_farmer_";

export function saveFarmerBatchExpiry(batchId, expiryTimestampMs) {
  if (batchId == null || expiryTimestampMs == null) return;
  try {
    localStorage.setItem(`${PREFIX}${batchId}`, String(expiryTimestampMs));
  } catch (e) {
    console.warn("expiry: save failed", e);
  }
}

export function getFarmerBatchExpiry(batchId) {
  if (batchId == null) return null;
  try {
    const v = localStorage.getItem(`${PREFIX}${batchId}`);
    return v ? Number(v) : null;
  } catch (e) {
    return null;
  }
}

export function isExpired(expiryTimestampMs) {
  if (expiryTimestampMs == null) return false;
  return Date.now() > expiryTimestampMs;
}

export function daysLeft(expiryTimestampMs) {
  if (expiryTimestampMs == null) return null;
  const diff = expiryTimestampMs - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * @returns {{ expired: boolean, daysLeft: number | null, expiryDate: string | null, label: string }}
 */
export function getExpiryStatus(expiryTimestampMs) {
  if (expiryTimestampMs == null) {
    return { expired: false, daysLeft: null, expiryDate: null, label: null };
  }
  const expired = isExpired(expiryTimestampMs);
  const days = daysLeft(expiryTimestampMs);
  const expiryDate = new Date(expiryTimestampMs).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
  let label = null;
  if (expired) label = "Expired";
  else if (days !== null) {
    if (days <= 0) label = "Expires today";
    else if (days <= 3) label = `Expires in ${days} day${days !== 1 ? "s" : ""}`;
    else label = `Expires ${expiryDate}`;
  }
  return { expired, daysLeft: days, expiryDate, label };
}

/** Compute expiry timestamp from now + shelf life in days */
export function computeExpiryFromShelfLifeDays(shelfLifeDays) {
  const n = Number(shelfLifeDays);
  if (!Number.isFinite(n) || n < 1) return null;
  return Date.now() + n * 24 * 60 * 60 * 1000;
}
