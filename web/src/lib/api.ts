import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is not set; falling back to localhost API URL.");
}

export const api = axios.create({
  baseURL: apiUrl,
});
