import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminGuard = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-800 animate-pulse">Verifying Security Clearances...</p>
      </div>
    );
  }

  // Double check that the profile exists and explicitly holds an admin flag
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminGuard;