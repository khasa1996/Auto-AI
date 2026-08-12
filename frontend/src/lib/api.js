import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  timeout: 60000,
});

const proxyUrl = (kind) => (url) => (url ? `${API}/${kind}-proxy?url=${encodeURIComponent(url)}` : null);

export const imageProxyUrl = proxyUrl("image");
export const videoProxyUrl = proxyUrl("video");

export const formatINR = (n) => {
  if (n == null) return "-";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
