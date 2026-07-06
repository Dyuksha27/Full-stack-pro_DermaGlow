// src/components/ProductCard.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Plus, Minus, Star, Scale } from "lucide-react"; 
import { updateCartItemAPI } from "../api/cart.api";
import { fetchWishlistAPI, addToWishlistAPI, removeFromWishlistAPI } from "../api/wishlist.api"; // 🟢 CONNECTED TO API INFRASTRUCTURE
import { useAuth } from "../context/AuthContext";

const ProductCard = ({ product, onToggleCompare, isStaged }) => {
  if (!product) return null;
  const { token: rawToken } = useAuth();
  
  // 🛡️ Handles literal text strings "null" securely from AuthContext
  const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : null;
  const itemData = product?.product ? product.product : product;

  const {
    product_id,
    product_name,
    brand,
    price, 
    image_url,
    rating 
  } = itemData || {};

  const user = JSON.parse(localStorage.getItem("user")) || null;
  const currentEmail = user?.email ? user.email.toLowerCase() : "";
  const CART_CACHE_KEY = currentEmail ? `user_cart_cache_${currentEmail}` : "user_cart_cache";
  const userSuffix = user?.email ? `_${user.email.toLowerCase()}` : "";
  const WISHLIST_KEY = `store_wishlist${userSuffix}`;

  // 🟢 FIXED: Coerces all IDs to String to prevent type mismatch failures
  const [isInWishlist, setIsInWishlist] = useState(() => {
    if (!token || !product_id) return false;
    try {
      const currentWish = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
      return Array.isArray(currentWish) 
        ? currentWish.map(String).includes(String(product_id)) 
        : false;
    } catch {
      return false;
    }
  });

  const [quantity, setQuantity] = useState(() => {
    const currentCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
    const found = currentCart.find(item => String(item.product_id) === String(product_id));
    return found ? found.quantity : 0;
  });

  const cleanPrice = Number(String(price || product?.price || product?.cleanPrice || 0).replace(/[^0-9.-]/g, ""));
  const cleanRating = Number(rating || 0);

  // 🟢 FIXED: Syncs live wishlist status from the server using the new API layer
  useEffect(() => {
    if (!product_id || !token) {
      setIsInWishlist(false);
      return;
    }
    const fetchLiveWishlist = async () => {
      try {
        const serverWishlist = await fetchWishlistAPI(); // 🟢 USING INTEGRATED CONNECTOR
        const isFavorited = serverWishlist.some(item => {
          const idToCheck = item?.product_id || item;
          return String(idToCheck) === String(product_id);
        });
        setIsInWishlist(isFavorited);
        
        const currentWishIds = serverWishlist.map(item => String(item?.product_id || item));
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(currentWishIds));
      } catch (err) {
        console.error("Error fetching live database wishlist state:", err);
      }
    };
    fetchLiveWishlist();
  }, [product_id, token, WISHLIST_KEY]);

  useEffect(() => {
    if (!product_id) return;
    
    const handleGlobalSync = (e) => {
      if (!token) {
        setIsInWishlist(false);
        setQuantity(0);
        return;
      }

      const currentCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
      const found = currentCart.find(item => String(item.product_id) === String(product_id));
      setQuantity(found ? found.quantity : 0);

      if (e.type === "sync-wishlist") {
        const updatedWishlist = e.detail?.wishlistData || e.detail || [];
        setIsInWishlist(Array.isArray(updatedWishlist) ? updatedWishlist.map(String).includes(String(product_id)) : false);
      }
    };

    window.addEventListener("sync-cart", handleGlobalSync);
    window.addEventListener("sync-wishlist", handleGlobalSync);
    return () => {
      window.removeEventListener("sync-cart", handleGlobalSync);
      window.removeEventListener("sync-wishlist", handleGlobalSync);
    };
  }, [product_id, CART_CACHE_KEY, WISHLIST_KEY, token]);

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    if (!product_id) return;

    // 🛡️ STRICT AUTHENTICATION GATE
    if (!token) {
      setIsInWishlist(false);
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    let currentWish = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    if (!Array.isArray(currentWish)) currentWish = [];
    
    const stringifiedWish = currentWish.map(String);
    const isAlreadyFavorited = stringifiedWish.includes(String(product_id));
    
    try {
      if (isAlreadyFavorited) {
        await removeFromWishlistAPI(product_id); // 🟢 CONTEXT SEPARATION SYNC
        const updatedWish = stringifiedWish.filter(id => id !== String(product_id));
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(updatedWish));
        setIsInWishlist(false);
        window.dispatchEvent(new CustomEvent("sync-wishlist", { detail: updatedWish }));
      } else {
        await addToWishlistAPI(product_id); // 🟢 CONTEXT SEPARATION SYNC
        stringifiedWish.push(String(product_id));
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(stringifiedWish));
        setIsInWishlist(true);
        window.dispatchEvent(new CustomEvent("sync-wishlist", { detail: stringifiedWish }));
      }
    } catch (err) {
      console.error("Failed to sync wishlist entry mapping with database infrastructure:", err);
    }
  };

  const handleCartAction = async (change) => {
    if (!product_id) return;
    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }
    let currentCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
    const existingIndex = currentCart.findIndex(item => String(item.product_id) === String(product_id));
    let currentQty = existingIndex > -1 ? currentCart[existingIndex].quantity : 0;
    let nextQty = currentQty + change;

    if (existingIndex > -1) {
      if (nextQty > 0) {
        currentCart[existingIndex].quantity = nextQty;
      } else {
        currentCart.splice(existingIndex, 1);
      }
    } else if (change > 0) {
      currentCart.push({ product_id, product_name, price: cleanPrice, image_url, quantity: 1 });
      nextQty = 1;
    }

    setQuantity(nextQty < 0 ? 0 : nextQty);
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(currentCart));
    window.dispatchEvent(new CustomEvent("sync-cart", { detail: currentCart }));
    try {
      await updateCartItemAPI(product_id, change, true);
    } catch (err) {
      console.error("Cart synchronization connection dropped:", err);
    }
  };

  return (
    <div className="bg-white border border-zinc-200/60 rounded-3xl p-5 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative group overflow-hidden h-full">
      <button 
        onClick={handleWishlistToggle}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-zinc-400 hover:text-red-500 hover:scale-110 active:scale-90 transition-all duration-200 border border-zinc-100"
      >
        <Heart className={`h-4 w-4 transition-colors pointer-events-none ${isInWishlist && token ? "fill-red-500 text-red-500" : "text-zinc-400 stroke-[2]"}`} />
      </button>

      <Link to={`/product/${product_id}`} className="block w-full pt-6 pb-4 overflow-hidden rounded-2xl bg-zinc-50/50 border border-zinc-100 flex items-center justify-center h-44 mb-4">
        <img src={image_url || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400"} alt={product_name} className="h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
      </Link>

      <div className="flex-1 flex flex-col mb-4">
        <span className="text-[10px] uppercase tracking-widest text-emerald-800 font-black mb-0.5">{brand || "Dermatological Clinic"}</span>
        <Link to={`/product/${product_id}`} className="hover:text-emerald-800 transition-colors">
          <h3 className="font-bold text-zinc-800 text-xs sm:text-sm line-clamp-2 leading-tight min-h-[36px]">{product_name}</h3>
        </Link>
      </div>

      <div className="pt-3 border-t border-zinc-100 flex flex-col gap-3.5 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Price</span>
            <span className="text-base font-black text-zinc-950 leading-none mt-1">₹{cleanPrice.toLocaleString('en-IN')}</span>
          </div>
          
          {cleanRating > 0 && (
            <div className="flex items-center gap-0.5" title={`Rated ${cleanRating.toFixed(1)} out of 5`}>
              {[1, 2, 3, 4, 5].map((starIdx) => {
                const fillDelta = cleanRating - (starIdx - 1);
                const percentFill = Math.min(Math.max(fillDelta * 100, 0), 100);
                return (
                  <div key={starIdx} className="relative inline-block h-3 w-3">
                    <div className="absolute inset-0 h-3 w-3 fill-zinc-200 text-zinc-200" />
                    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none" style={{ width: `${percentFill}%` }}>
                      <Star className="h-3 w-3 fill-emerald-600 text-[#A7F3D0]" style={{ maxWidth: 'none' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full pt-1">
          {onToggleCompare && (
            <button
              onClick={(e) => { e.preventDefault(); onToggleCompare(product); }}
              className={`text-[11px] font-black uppercase tracking-wider py-2.5 px-2 rounded-xl border flex-1 transition-all duration-300 text-center flex items-center justify-center gap-1 h-9 shrink-0 ${
                isStaged
                  ? "bg-emerald-800 text-white border-emerald-900 shadow-sm font-black scale-95"
                  : "bg-emerald-50/60 hover:bg-emerald-100 text-emerald-950 border-emerald-200/60 font-bold"
              }`}
            >
              <Scale className={`h-3 w-3 ${isStaged ? "stroke-[2.5]" : "stroke-[2]"}`} />
              <span>{isStaged ? "Staged" : "Compare"}</span>
            </button>
          )}

          {quantity > 0 && token ? (
            <div className="flex items-center justify-between bg-zinc-900 text-white border border-zinc-900 rounded-xl overflow-hidden h-9 shadow-sm shrink-0 min-w-[80px]">
              <button onClick={() => handleCartAction(-1)} className="px-2.5 hover:bg-zinc-800 h-full flex items-center justify-center transition-colors">
                <Minus className="h-2.5 w-2.5" />
              </button>
              <span className="px-1 text-xs font-black min-w-[16px] text-center select-none">{quantity}</span>
              <button onClick={() => handleCartAction(1)} className="px-2.5 hover:bg-zinc-800 h-full flex items-center justify-center transition-colors">
                <Plus className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleCartAction(1)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 h-9 rounded-xl transition-all shadow-sm active:scale-95 border border-zinc-900 shrink-0 min-w-[54px]"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;