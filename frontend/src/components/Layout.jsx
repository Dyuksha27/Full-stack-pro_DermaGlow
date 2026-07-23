import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Search, X, Heart, Trash2, Plus, ArrowRight, ShoppingCart, User, LogOut, ClipboardList, ShieldCheck, Mail, Settings, ShieldAlert, Bot } from "lucide-react"; 
import Footer from "./Footer";
import AuthModal from "./AuthModal"; 
import { fetchProductsAPI } from "../api/product.api";
import { fetchCartAPI, updateCartItemAPI } from "../api/cart.api";
import { useAuth } from "../context/AuthContext";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, logout, loading: authLoading } = useAuth(); 
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false); 
  const [isProfileOpen, setIsProfileOpen] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");

  const [compareCount, setCompareCount] = useState(0);

  const user = JSON.parse(localStorage.getItem("user")) || null;
  const currentEmail = user?.email ? user.email.toLowerCase() : "";
  const userSuffix = currentEmail ? `_${currentEmail}` : "";

  const WISHLIST_KEY = `store_wishlist${userSuffix}`;
  const CART_CACHE_KEY = currentEmail ? `user_cart_cache_${currentEmail}` : "user_cart_cache";
  
  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
  });
  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loadingWishlist, setLoadingWishlist] = useState(false);

  const isProductPage = location.pathname === "/products";

  const loadDatabaseCart = async () => {
    if (!token || localStorage.getItem("lock_switch_transition") === "true") return;

    try {
      const dbCart = await fetchCartAPI();
      if (localStorage.getItem("lock_switch_transition") === "true") return;

      const cleanCart = dbCart || [];
      setCart(cleanCart);
      localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cleanCart));
    } catch (err) {
      console.error("Could not sync database cart to layout:", err);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("lock_switch_transition") === "true") return;

    const targetCartKey = currentEmail ? `user_cart_cache_${currentEmail}` : "user_cart_cache";
    const targetWishlistKey = `store_wishlist${userSuffix}`;
    
    setCart(JSON.parse(localStorage.getItem(targetCartKey) || "[]"));
    setWishlistIds(JSON.parse(localStorage.getItem(targetWishlistKey) || "[]"));
    
    if (token && !authLoading) {
      loadDatabaseCart();
    }
  }, [currentEmail, token, authLoading, userSuffix]);

  useEffect(() => {
    if (localStorage.getItem("lock_switch_transition") === "true") return;

    if (!authLoading && token) {
      loadDatabaseCart();
    } else if (!token) {
      setCart([]);
    }
    setWishlistIds(JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]"));

    const handleCartSync = (e) => {
      if (localStorage.getItem("lock_switch_transition") === "true") return;
      const eventEmail = e.detail?.email ? e.detail.email.toLowerCase() : "";
      if (currentEmail && eventEmail && eventEmail !== currentEmail) return;
      const updatedCart = e.detail?.cartData || e.detail || [];
      setCart(updatedCart);
    };
    
    const handleWishlistSync = (e) => {
      if (localStorage.getItem("lock_switch_transition") === "true") return;
      const eventEmail = e.detail?.email ? e.detail.email.toLowerCase() : "";
      if (currentEmail && eventEmail && eventEmail !== currentEmail) return;
      const updatedWishlist = e.detail?.wishlistData || e.detail || [];
      setWishlistIds(updatedWishlist);
    };

    const handleAiStackSync = (e) => {
      setCompareCount(e.detail || 0);
    };

    window.addEventListener("sync-cart", handleCartSync);
    window.addEventListener("sync-wishlist", handleWishlistSync);
    window.addEventListener("sync-ai-stack", handleAiStackSync);
    
    return () => {
      window.removeEventListener("sync-cart", handleCartSync);
      window.removeEventListener("sync-wishlist", handleWishlistSync);
      window.removeEventListener("sync-ai-stack", handleAiStackSync);
    };
  }, [token, authLoading, currentEmail, WISHLIST_KEY, CART_CACHE_KEY]);

  useEffect(() => {
    const hydrateWishlist = async () => {
      if (wishlistIds.length === 0) {
        setWishlistProducts([]);
        return;
      }
      setLoadingWishlist(true);
      try {
        const batchData = await Promise.all(
          wishlistIds.map(async (id) => {
            try {
              const response = await fetchProductsAPI({ search: id, limit: 1 });
              // Safely extract rows from response structure
              return response?.rows?.[0] || response?.[0] || null;
            } catch { return null; }
          })
        );
        setWishlistProducts(batchData.filter(Boolean));
      } catch (err) {
        console.error("Wishlist drawer hydration breakdown:", err);
      } finally {
        setLoadingWishlist(false);
      }
    };

    if (isWishlistOpen && localStorage.getItem("lock_switch_transition") !== "true") {
      hydrateWishlist();
    }
  }, [wishlistIds, isWishlistOpen]);

  const handleCartIconClick = (e) => {
    if (!token) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
    }
  };

  const handleInlineAddToCart = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      setIsWishlistOpen(false); 
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    const currentCartKey = currentEmail ? `user_cart_cache_${currentEmail}` : "user_cart_cache";
    let currentCart = JSON.parse(localStorage.getItem(currentCartKey) || "[]");
    const existingIndex = currentCart.findIndex(item => item.product_id === productId);
    const wishlistProductMatch = wishlistProducts.find(p => (p.product_id || p.id) === productId);

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += 1;
    } else if (wishlistProductMatch) {
      const cleanPrice = Number(String(wishlistProductMatch.price || 0).replace(/[^0-9.-]/g, ""));
      currentCart.push({
        product_id: productId,
        product_name: wishlistProductMatch.product_name,
        price: cleanPrice,
        image_url: wishlistProductMatch.image_url,
        quantity: 1
      });
    }

    setCart([...currentCart]);
    localStorage.setItem(currentCartKey, JSON.stringify(currentCart));
    window.dispatchEvent(new CustomEvent("sync-cart", { 
      detail: { cartData: currentCart, email: currentEmail } 
    }));

    try {
      await updateCartItemAPI(productId, 1, true);
    } catch (err) {
      console.error("Wishlist drawer background API addition connection rejected:", err);
    }
  };

  const handleProceedToCartClick = () => {
    setIsWishlistOpen(false);
    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
    } else {
      navigate("/cart");
    }
  };

  const handleSignOutAction = () => {
    setIsProfileOpen(false); 
    logout();
    navigate("/");
  };

  const removeWishlistItem = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = wishlistIds.filter(id => id !== productId);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updated));
    setWishlistIds(updated);
    window.dispatchEvent(new CustomEvent("sync-wishlist", { 
      detail: { wishlistData: updated, email: currentEmail } 
    }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}&page=1`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const totalCartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (localStorage.getItem("lock_switch_transition") === "true") {
    return <div className="min-h-screen bg-[#E2ECE6] font-sans text-gray-900">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#E2ECE6] font-sans antialiased text-gray-900 relative">
      <nav className="bg-white/90 backdrop-blur-md border-b border-zinc-200/50 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-baseline select-none group">
            <span className="text-4xl font-serif font-black text-emerald-800 tracking-tighter mr-0.5 leading-none">D</span>
            <span className="text-lg font-sans font-black uppercase tracking-[0.15em] text-zinc-950 leading-none">ermaGlow</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8 text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-500">
            <Link to="/" className="hover:text-emerald-800 transition-colors">Home</Link>
            <Link to="/products" className="hover:text-emerald-800 transition-colors">Products</Link>
            <Link to="/consultation" className="hover:text-emerald-800 transition-colors">Consultation</Link>
          </div>

          <div className="flex items-center space-x-5 text-zinc-800">
            <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="hover:text-emerald-800 transition-colors p-1">
              <Search className="h-4 w-4 stroke-[2]" />
            </button>

            <button onClick={() => setIsWishlistOpen(true)} className="hover:text-emerald-800 transition-colors p-1 relative">
              <Heart className={`h-4 w-4 ${wishlistIds.length > 0 ? "fill-red-500 text-red-500" : "stroke-[2]"}`} />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {isProductPage && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent("toggle-ai-drawer"))}
                className="hover:text-emerald-800 transition-colors p-1 relative"
                title="Toggle AI Consultant Sidebar"
              >
                <Bot className="h-4 w-4 stroke-[2]" />
                {compareCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                    {compareCount}
                  </span>
                )}
              </button>
            )}

            <Link to="/cart" onClick={handleCartIconClick} className="hover:text-emerald-800 transition-colors p-1 relative">
              <ShoppingBag className="h-4 w-4 stroke-[2]" />
              {totalCartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-800 text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                  {totalCartItemsCount}
                </span>
              )}
            </Link>

            <div className="flex items-center border-l border-zinc-200 pl-4">
              {token ? (
                <div className="flex items-center">
                  <button 
                    onClick={() => { setIsProfileOpen(true); }}
                    className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center hover:bg-emerald-100 transition-all group"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-800 transition-colors" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-[10px] font-black tracking-widest uppercase text-zinc-400">
                  <Link to="/login" className="hover:text-emerald-800 transition-colors text-zinc-600">Login</Link>
                  <span>/</span>
                  <Link to="/register" className="hover:text-emerald-800 transition-colors text-zinc-600">Sign Up</Link>
                </div>
              )}
            </div>

          </div>
        </div>

        {isSearchOpen && (
          <div className="absolute top-full left-0 w-full bg-white border-b border-zinc-200 px-6 py-4 shadow-md">
            <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex items-center gap-3">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input 
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm bg-transparent border-none outline-none text-zinc-800 placeholder-zinc-400"
                autoFocus
              />
              <button type="button" onClick={() => setIsSearchOpen(false)} className="text-zinc-400 p-1"><X className="h-4 w-4" /></button>
            </form>
          </div>
        )}
      </nav>

      <main className="flex-grow">{children}</main>
      <Footer />

      <AuthModal />

      {isWishlistOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setIsWishlistOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10">
            
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Heart className="h-4 w-4 fill-red-500 text-red-500" /> Saved Wishlist ({wishlistIds.length})
              </h2>
              <button onClick={() => setIsWishlistOpen(false)} className="text-zinc-400 p-1"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingWishlist ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-400 uppercase animate-pulse">Loading favorites...</div>
              ) : wishlistProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center">
                  <span className="text-2xl mb-1">✨</span>
                  <p className="text-xs font-bold">Your wishlist is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {wishlistProducts.map((item) => {
                    const cleanPrice = Number(String(item.price || item.price_inr || 0).replace(/[^0-9.-]/g, ""));
                    const targetId = item.product_id || item.id;
                    const isInCart = cart.some(c => c.product_id === targetId);

                    return (
                      <div key={targetId} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100/80 group relative shadow-sm">
                        <img src={item.image_url} alt={item.product_name} className="w-14 h-14 rounded-xl object-contain bg-white border p-1" />
                        <div className="flex-1 min-w-0 pr-24">
                          <Link to={`/product/${targetId}`} onClick={() => setIsWishlistOpen(false)} className="text-xs font-bold text-zinc-800 hover:text-emerald-800 block truncate">
                            {item.product_name}
                          </Link>
                          <p className="text-[9px] text-zinc-400 uppercase font-black tracking-wider mt-0.5">{item.brand}</p>
                          <p className="text-xs font-black text-zinc-950 mt-1">₹{cleanPrice.toLocaleString('en-IN')}</p>
                        </div>

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-white border rounded-xl p-1 shadow-sm">
                          {isInCart && token ? (
                            <button 
                              onClick={handleProceedToCartClick}
                              className="px-2 py-1.5 bg-emerald-800 text-white font-sans font-bold text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-sm transition-all hover:bg-emerald-900"
                            >
                              In Cart <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => handleInlineAddToCart(e, targetId)}
                              className="p-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-800 hover:text-white rounded-lg transition-all"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => removeWishlistItem(e, targetId)} 
                            className="p-1.5 text-zinc-300 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {wishlistIds.length > 0 && (
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/80 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.02)] space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-medium text-zinc-500">Active Saved Counter:</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {wishlistIds.length} {wishlistIds.length === 1 ? 'Item' : 'Items'} Listed
                  </span>
                </div>
                <button 
                  onClick={handleProceedToCartClick}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-4 rounded-xl transition-all shadow-md tracking-widest uppercase flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" /> Proceed to Cart View
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wider uppercase text-zinc-900 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-800" /> Account Dashboard
              </h2>
              <button onClick={() => setIsProfileOpen(false)} className="text-zinc-400 hover:text-zinc-600 p-1"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-zinc-50 border border-zinc-100 p-5 rounded-2xl flex flex-col items-center text-center space-y-3">
                <div className="h-14 w-14 bg-emerald-800 text-white rounded-full font-serif font-black flex items-center justify-center text-xl shadow-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 truncate max-w-[180px]">{user?.name || "Valued Member"}</h3>
                  <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest flex items-center justify-center gap-1 mt-0.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-700" /> Active Profile
                  </p>
                </div>
                <div className="w-full pt-2 border-t border-zinc-200/60 text-left">
                  <div className="flex items-center gap-2 text-xs text-zinc-600 bg-white border border-zinc-100 px-3 py-2 rounded-xl">
                    <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{user?.email || "No email synchronized"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block px-1">Control Centers</span>
                <button onClick={() => { setIsProfileOpen(false); navigate("/profile?view=orders"); }} className="w-full flex items-center justify-between p-4 bg-white hover:bg-zinc-50 border border-zinc-100 rounded-2xl transition-all font-bold text-xs text-zinc-700 shadow-sm">
                  <span className="flex items-center gap-2.5"><ClipboardList className="h-4 w-4 text-emerald-800" /> Order History</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                <button onClick={() => { setIsProfileOpen(false); navigate("/profile?view=reports"); }} className="w-full flex items-center justify-between p-4 bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100/60 rounded-2xl transition-all font-bold text-xs text-emerald-900 shadow-sm">
                  <span className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-emerald-800" /> Medical Skin Report</span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-700" />
                </button>
                <button onClick={() => { setIsProfileOpen(false); navigate("/profile?view=security"); }} className="w-full flex items-center justify-between p-4 bg-white hover:bg-zinc-50 border border-zinc-100 rounded-2xl transition-all font-bold text-xs text-zinc-700 shadow-sm">
                  <span className="flex items-center gap-2.5"><Settings className="h-4 w-4 text-emerald-800" /> Security & Profiles</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                {token && user && user.role === "admin" && (
                  <button onClick={() => { setIsProfileOpen(false); navigate("/admin/dashboard"); }} className="w-full flex items-center justify-between p-4 bg-amber-50/40 hover:bg-amber-50 border border-amber-200/60 rounded-2xl transition-all font-bold text-xs text-amber-900 shadow-sm">
                    <span className="flex items-center gap-2.5"><ShieldAlert className="h-4 w-4 text-amber-800" /> Admin Workspace</span>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-700" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50">
              <button onClick={handleSignOutAction} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-3.5 rounded-xl tracking-wider uppercase flex items-center justify-center gap-2 transition-colors border border-red-100/60">
                <LogOut className="h-4 w-4" /> Sign Out 
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;