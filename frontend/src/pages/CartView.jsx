// src/pages/CartView.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShoppingBag, ArrowLeft, Trash2, Plus, Minus } from "lucide-react";
import { fetchCartAPI, updateCartItemAPI, removeCartItemAPI } from "../api/cart.api";
import { useAuth } from "../context/AuthContext"; 

const CartView = () => {
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth(); 
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🛡️ MATCHING COMPLIANT SUFFIX STRINGS WITH LAYOUT EXACTLY
  const user = JSON.parse(localStorage.getItem("user")) || null;
  const currentEmail = user?.email ? user.email.toLowerCase() : "";
  const CART_CACHE_KEY = currentEmail ? `user_cart_cache_${currentEmail}` : "user_cart_cache";

  const loadDatabaseCart = async () => {
    if (localStorage.getItem("lock_switch_transition") === "true") {
      setLoading(false);
      return;
    }

    try {
      const dbData = await fetchCartAPI();
      if (localStorage.getItem("lock_switch_transition") === "true") return;

      const cleanCart = dbData || [];
      setCart(cleanCart);
      localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cleanCart));
    } catch (err) {
      console.error("Error streaming persistent cart profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (token) {
        const cachedCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
        setCart(cachedCart);
        loadDatabaseCart();
      } else {
        // Safe Drop: Block wiping current items out if a profile shift is actively routing
        if (localStorage.getItem("lock_switch_transition") !== "true") {
          setCart([]);
          setLoading(false);
        }
      }
    }
  }, [token, authLoading, CART_CACHE_KEY]);

  useEffect(() => {
    const handleGlobalCartChange = (e) => {
      if (localStorage.getItem("lock_switch_transition") === "true") return;

      const eventEmail = e.detail?.email ? e.detail.email.toLowerCase() : "";
      if (currentEmail && eventEmail && eventEmail !== currentEmail) return;

      const updatedCart = e.detail?.cartData || e.detail || [];
      setCart(updatedCart);
    };

    window.addEventListener("sync-cart", handleGlobalCartChange);
    return () => window.removeEventListener("sync-cart", handleGlobalCartChange);
  }, [currentEmail]);

  const handleQtyChange = async (productId, currentQty, adjustment) => {
    let currentCart = [...cart];
    const existingIndex = currentCart.findIndex(item => item.product_id === productId);
    if (existingIndex === -1) return;

    const targetQty = currentQty + adjustment;

    if (targetQty <= 0) {
      currentCart.splice(existingIndex, 1);
    } else {
      currentCart[existingIndex].quantity = targetQty;
    }

    setCart(currentCart);
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(currentCart));
    window.dispatchEvent(new CustomEvent("sync-cart", { 
      detail: { cartData: currentCart, email: currentEmail } 
    }));

    try {
      if (targetQty <= 0) {
        await removeCartItemAPI(productId);
      } else {
        await updateCartItemAPI(productId, adjustment, true);
      }
    } catch (err) {
      console.error("Error synchronizing item adjustments:", err);
    }
  };

  const handlePurgeItem = async (productId) => {
    let currentCart = [...cart];
    currentCart = currentCart.filter(item => item.product_id !== productId);

    setCart(currentCart);
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(currentCart));
    window.dispatchEvent(new CustomEvent("sync-cart", { 
      detail: { cartData: currentCart, email: currentEmail } 
    }));

    try {
      await removeCartItemAPI(productId);
    } catch (err) {
      console.error("Could not update relational database lines:", err);
    }
  };

  const totalCartPrice = cart.reduce((acc, item) => {
    const cleanNum = Number(String(item.price || 0).replace(/[^0-9.-]/g, ""));
    return acc + (cleanNum * item.quantity);
  }, 0);

  if (authLoading || loading) {
    return <div className="text-center py-32 text-xs uppercase font-bold tracking-widest text-emerald-800 animate-pulse">Syncing Cart Data...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-sans text-gray-900 bg-[#E2ECE6] min-h-screen">
      <div className="flex items-center gap-2 mb-8">
        <Link to="/products" className="text-zinc-500 hover:text-zinc-900 p-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
          <ArrowLeft className="h-4 w-4" /> Continue Browsing Catalog
        </Link>
      </div>

      <h1 className="text-2xl font-serif font-bold text-zinc-900 mb-6 flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-emerald-800" /> Your Shopping Cart Inventory
      </h1>

      {cart.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-200/60 text-center space-y-4 shadow-sm max-w-md mx-auto">
          <span className="text-4xl block">🧴</span>
          <h2 className="text-sm font-bold text-zinc-800">Your basket is empty</h2>
          <p className="text-xs text-zinc-400">Choose custom products from our catalog registry to build a routine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4 h-fit">
            {cart.map((item) => {
              const itemPrice = Number(String(item.price || 0).replace(/[^0-9.-]/g, ""));
              return (
                <div key={item.product_id} className="flex items-center gap-4 border-b border-zinc-100 pb-4 last:border-none last:pb-0">
                  <img src={item.image_url} alt={item.product_name} className="w-16 h-16 rounded-xl object-contain bg-white border p-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-zinc-800 truncate">{item.product_name}</h3>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold">{item.brand}</p>
                    <p className="text-xs font-black text-zinc-950 mt-1">₹{itemPrice.toLocaleString('en-IN')}</p>
                  </div>
                  
                  <div className="flex items-center bg-zinc-50 border rounded-xl overflow-hidden shadow-sm h-8">
                    <button onClick={() => handleQtyChange(item.product_id, item.quantity, -1)} className="px-2 text-zinc-500 hover:text-zinc-900"><Minus className="h-3 w-3" /></button>
                    <span className="px-2 text-xs font-bold text-zinc-800 min-w-[16px] text-center">{item.quantity}</span>
                    <button onClick={() => handleQtyChange(item.product_id, item.quantity, 1)} className="px-2 text-zinc-500 hover:text-zinc-900"><Plus className="h-3 w-3" /></button>
                  </div>

                  <button onClick={() => handlePurgeItem(item.product_id)} className="text-zinc-300 hover:text-red-500 p-2">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white/40 shadow-sm space-y-4 h-fit">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Order Totals</h2>
            <div className="flex justify-between items-baseline py-2 border-b border-dashed border-zinc-200 text-sm">
              <span className="text-zinc-500 font-medium">Subtotal</span>
              <span className="font-black text-zinc-950 text-base">₹{totalCartPrice.toLocaleString('en-IN')}</span>
            </div>
            <button onClick={() => navigate("/checkout")} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-4 rounded-xl tracking-widest uppercase shadow-md text-center block">
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;