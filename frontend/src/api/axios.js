import axios from "axios";

// 1. Fetch raw env variable or fallback
const rawEnv = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://full-stack-pro-dermaglow-1.onrender.com";

// 2. Clean quotes, brackets, or trailing slashes/api
const cleanEnv = rawEnv
  .trim()
  .replace(/^["']|["']$/g, "") // Remove wrapping quotes
  .replace(/\/api\/?$/i, "")   // Remove trailing /api if present
  .replace(/\/$/, "");         // Remove trailing slash

// 3. Ensure full URL protocol
const BASE_DOMAIN = cleanEnv.startsWith("http") ? cleanEnv : `https://${cleanEnv}`;
const API_BASE_URL = `${BASE_DOMAIN}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const activeRequestControllers = new Map();

export const cancelAllInFlightRequests = () => {
  activeRequestControllers.forEach((controller) => {
    try {
      controller.abort();
    } catch (e) {
      console.warn("Error aborting flight track:", e);
    }
  });
  activeRequestControllers.clear();
};

API.interceptors.request.use(
  (config) => {
    const controller = new AbortController();
    config.signal = config.signal || controller.signal;
    activeRequestControllers.set(config, controller);

    const rawToken = localStorage.getItem("token");
    const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => {
    if (response.config) {
      activeRequestControllers.delete(response.config);
    }
    return response;
  },
  (error) => {
    if (error.config) {
      activeRequestControllers.delete(error.config);
    }

    if (axios.isCancel(error)) {
      return Promise.reject({
        ...error,
        __isTransitionAborted: true,
        message: "Request suppressed cleanly."
      });
    }

    if (error.response?.status === 401) {
      console.warn("🛡️ Axios interceptor caught a 401. Yielding control to AuthContext state routers.");

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("sync-cart", { detail: [] }));
      window.dispatchEvent(new CustomEvent("sync-wishlist", { detail: [] }));
      
      if (window.location.pathname !== "/" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;