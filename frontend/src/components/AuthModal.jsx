// src/components/AuthModal.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Lock } from "lucide-react";

const AuthModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => {
      setIsOpen(true);
    };
    window.addEventListener("open-auth-modal", handleOpenModal);
    return () => {
      window.removeEventListener("open-auth-modal", handleOpenModal);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-300"
      style={{ 
        zIndex: 99999,
        backgroundColor: "rgba(9, 9, 11, 0.75)"
      }}
    >
      <div className="absolute inset-0 w-full h-full" onClick={() => setIsOpen(false)} />
      
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 text-center border border-zinc-100 shadow-2xl z-10 scale-100 opacity-100 transition-all duration-350">
        <button 
          onClick={() => setIsOpen(false)} 
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 p-1.5 hover:bg-zinc-100 rounded-xl transition-all"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>

        <div className="h-12 w-12 bg-emerald-50 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
          <Lock className="h-5 w-5 stroke-[2.5]" />
        </div>

        <h3 className="text-base font-serif font-bold text-zinc-900 mb-2">Authentication Required</h3>
        <p className="text-xs text-zinc-500 leading-relaxed mb-6">
          You need an active profile to build your personalized dermal routine and save items securely to our database.
        </p>

        <div className="space-y-3">
          <Link 
            to="/login" 
            onClick={() => setIsOpen(false)}
            className="block w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest transition-colors text-center shadow-md shadow-emerald-900/10"
          >
            Log In
          </Link>
          <Link 
            to="/register" 
            onClick={() => setIsOpen(false)}
            className="block w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs py-3.5 rounded-xl uppercase tracking-widest transition-colors text-center"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;