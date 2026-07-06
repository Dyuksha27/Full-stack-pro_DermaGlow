// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import API, { cancelAllInFlightRequests } from "../api/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  
  const [loading, setLoading] = useState(() => {
    return localStorage.getItem("lock_switch_transition") === "true" ? true : !localStorage.getItem("token");
  });
  
  const [isTransitioning, setIsTransitioning] = useState(() => {
    return localStorage.getItem("lock_switch_transition") === "true";
  });

  useEffect(() => {
    const verifyUserSession = async () => {
      // 🛡️ HARD CONSTRAINT LOCK WALL: Intercepts account switching before ANY remote API pass fires
      const transitLockActive = localStorage.getItem("lock_switch_transition") === "true";

      if (transitLockActive) {
        const structuralToken = localStorage.getItem("token");
        const structuralUser = localStorage.getItem("user");

        if (structuralToken && structuralUser) {
          setToken(structuralToken);
          setUser(JSON.parse(structuralUser));
        }
        
        // Wipe local storage flags but cleanly return execution frames out immediately
        localStorage.removeItem("lock_switch_transition");
        setIsTransitioning(false);
        setLoading(false);
        return; 
      }

      // If we don't hold a lock AND don't hold a token session, turn off loader and exit
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await API.get("/auth/profile");
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch (err) {
        if (err?.__isTransitionAborted) {
          return;
        }

        console.error("Profile session verification failure:", err.message);
        
        // Clear broken or expired credentials out from context immediately 
        if (err.response?.status === 401 || err.message?.includes("expired")) {
          const badEmail = user?.email;
          if (badEmail) {
            let pool = JSON.parse(localStorage.getItem("store_user_profiles_pool") || "[]");
            pool = pool.filter(acc => acc.email.toLowerCase() !== badEmail.toLowerCase());
            localStorage.setItem("store_user_profiles_pool", JSON.stringify(pool));
          }
          logout();
          window.location.href = "/login";
          return;
        }

        if (!window.location.search.includes("view=security")) {
          logout();
        }
      } finally {
        setLoading(false);
        setIsTransitioning(false);
      }
    };

    verifyUserSession();
  }, [token]);

  const switchAccount = async (targetToken, targetUser) => {
    try {
      localStorage.setItem("lock_switch_transition", "true");
      setIsTransitioning(true);
      setLoading(true);

      cancelAllInFlightRequests();

      try {
        await API.post("/auth/clear-session");
      } catch (e) {
        console.warn("Cleared trailing backend cookie tracks dynamically.");
      }

      localStorage.setItem("token", targetToken);
      localStorage.setItem("user", JSON.stringify(targetUser));

      window.location.replace("/profile?view=security");
    } catch (err) {
      console.error("Account switcher error:", err);
      localStorage.removeItem("lock_switch_transition");
      setIsTransitioning(false);
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lock_switch_transition");
    setToken(null);
    setUser(null);
    setLoading(false);
    setIsTransitioning(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isTransitioning, login, logout, switchAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be wrapped within an AuthProvider.");
  return context;
};