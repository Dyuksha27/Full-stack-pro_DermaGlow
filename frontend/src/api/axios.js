// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
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
    const isTransitionLocked = localStorage.getItem("lock_switch_transition") === "true";

    if (isTransitionLocked) {
      const controller = new AbortController();
      config.signal = controller.signal;
      controller.abort();
      return config;
    }

    const controller = new AbortController();
    config.signal = config.signal || controller.signal;
    activeRequestControllers.set(config, controller);

    const rawToken = localStorage.getItem("token");
    
    // 🛡️ NETWORK ROOT SANITIZER: Prevents sending "Bearer null" or "Bearer undefined" to your backend
    const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization; // Clear any zombie headers completely
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

    const isTransitionLocked = localStorage.getItem("lock_switch_transition") === "true";

    if (axios.isCancel(error) || isTransitionLocked) {
      return Promise.reject({
        ...error,
        __isTransitionAborted: true,
        message: "Request suppressed cleanly during account identity sandbox transition swapping loop."
      });
    }

    if (error.response?.status === 401) {
      console.warn("🛡️ Axios interceptor caught a 401. Yielding control to AuthContext state routers.");
      
      if (isTransitionLocked || window.location.search.includes("view=security")) {
        return Promise.reject(error);
      }

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