// src/components/Navbar.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Heart, ShoppingCart, Search } from "lucide-react";

const Navbar = ({ user, onLogout }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="w-full bg-white border-b border-sage-100 px-8 py-4 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Identity */}
        <Link to="/" className="flex items-center gap-2 tracking-tight group">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-700 to-teal-900 bg-clip-text text-transparent">
            DermaGlow
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
            AI-Intel
          </span>
        </Link>

        {/* Central Core Navlinks */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600">
          <Link to="/" className="hover:text-emerald-700 transition-colors">Home</Link>
          <Link to="/products" className="hover:text-emerald-700 transition-colors">Products</Link>
          <Link to="/consultation" className="hover:text-emerald-700 transition-colors">Consultations</Link>
          <Link to="/dashboard" className="hover:text-emerald-700 transition-colors">Dashboard</Link>
        </div>

        {/* Dynamic Multi-Feature Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative mx-4 hidden sm:block">
          <input
            type="text"
            placeholder="Search skin ingredients, brands, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-sage-50/60 border border-sage-100 rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-emerald-700">
            <Search className="h-4 w-4" />
          </button>
        </form>

        {/* Action Controls & Dynamic Auth Block */}
        <div className="flex items-center gap-5">
          
          {/* Wishlist Action Component */}
          <Link to="/wishlist" className="p-2 hover:bg-sage-50 rounded-full transition group relative">
            <Heart className="h-5 w-5 text-gray-600 group-hover:text-emerald-700 transition-colors" />
          </Link>

          {/* Cart Action Component */}
          <Link to="/cart" className="relative p-2 hover:bg-sage-50 rounded-full transition group">
            <ShoppingCart className="h-5 w-5 text-gray-600 group-hover:text-emerald-700 transition-colors" />
            <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
              0
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-4">
              {/* Profile Icon Node - Replaces the wordy text link layout */}
              <Link to="/profile" className="p-2 hover:bg-sage-50 rounded-full transition group flex items-center justify-center border border-sage-100 bg-sage-50/40" title="View Profile">
                <User className="h-5 w-5 text-emerald-800 group-hover:text-emerald-600 transition-colors" />
              </Link>
              
              <button 
                onClick={onLogout}
                className="text-xs border border-red-200 text-red-600 hover:bg-red-50 font-medium px-3 py-1.5 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm px-5 py-2 rounded-full shadow-sm hover:shadow transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;