import axios from "axios";

const configuredBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();

if (!configuredBackendUrl) {
  throw new Error(
    "REACT_APP_BACKEND_URL is required to run Auto-AI."
  );
}

export const BACKEND_URL = configuredBackendUrl.replace(/\/$/, "");
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 60000,
});

export const USER_TOKEN_KEY = "autoai_token";
export const ADMIN_TOKEN_KEY = "autoai_admin_token";

// Admin routes carry the admin session token; everything else uses the user token.
api.interceptors.request.use((config) => {
  const isAdminCall = (config.url || "").startsWith("/admin") || (config.url || "").startsWith("admin");
  const key = isAdminCall ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY;
  const token = localStorage.getItem(key);
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});

export const adminApi = axios.create({
  baseURL: API,
  timeout: 60000,
});

// Dealer dashboards read lead data that is admin-gated on the server.
adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});

export const formatINR = (n) => {
  if (n == null) return "-";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};


export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2);
  return `${Date.now()}-${random}-${Date.now()}`;
}
