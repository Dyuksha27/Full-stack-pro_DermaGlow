// src/pages/NotFound.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center px-4 font-sans">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-3xl border border-zinc-200/60 shadow-sm">
        <div className="mx-auto h-16 w-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-serif font-black text-zinc-900">404</h1>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">Page Not Found</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            The target layout resource route you requested does not exist or has been shifted across environment branches.
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;