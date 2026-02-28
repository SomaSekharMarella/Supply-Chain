export function getPublicBaseUrl() {
  const envUrl = import.meta.env.VITE_PUBLIC_WEB_URL;

  if (envUrl && typeof envUrl === "string") {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}

