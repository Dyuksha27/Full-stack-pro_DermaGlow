import axios from "axios";

// 🚀 DYNAMIC BASE URL:
// Reads VITE_API_URL or VITE_API_BASE_URL if defined,
// otherwise defaults directly to your Render production URL.
const RAW_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://full-stack-pro-dermaglow-1.onrender.com";
const API_BASE_URL = `${RAW_URL.replace(/\/$/, "")}/api`;

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
    
    // 🛡️ NETWORK ROOT SANITIZER: Prevents sending "Bearer null" or "Bearer undefined"
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