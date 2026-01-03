import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL,
  timeout: 20000,
});

// İstersen debug için:
// api.interceptors.request.use((config) => {
//   console.log("API Request:", config.method?.toUpperCase(), config.url);
//   return config;
// });
