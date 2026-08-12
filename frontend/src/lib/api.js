import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 60000,
});

/**
 * Turn an axios/network error into a message that is safe to show a user,
 * while logging the full error for debugging.
 */
export const apiError = (err, fallback = "Something went wrong. Please try again.") => {
  console.error("[api]", err?.config?.method?.toUpperCase(), err?.config?.url, err);
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (err?.code === "ECONNABORTED") return "The request timed out. Please try again.";
  if (!err?.response) return "Cannot reach the Auto-AI server. Check your connection and try again.";
  return fallback;
};

export const formatINR = (n) => {
  if (n == null) return "-";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
