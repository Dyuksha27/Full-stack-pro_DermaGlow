import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, CreditCard, Heart, Plus, Minus, ShieldCheck, Truck, RefreshCw } from "lucide-react";
import { fetchProductByIdAPI } from "../api/product.api";
import { updateCartItemAPI } from "../api/cart.api";
import { useAuth } from "../context/AuthContext";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token: rawToken } = useAuth();
  const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : null;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || null;
  const userSuffix = user?.email ? `_${user.email.toLowerCase()}` : "";
  
  const WISHLIST_KEY = `store_wishlist${userSuffix}`;
  const CART_CACHE_KEY = user?.email ? `user_cart_cache_${user.email.toLowerCase()}` : "user_cart_cache";

  useEffect(() => {
    const loadProductData = async () => {
      setLoading(true);
      try {
        // Direct clean call via Axios Instance endpoint /api/products/:id
        const foundProduct = await fetchProductByIdAPI(id);
        setProduct(foundProduct);

        if (foundProduct) {
          const targetId = foundProduct.product_id || foundProduct.id;
          const currentCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
          const cartMatch = currentCart.find(item => item.product_id === targetId);
          setQuantity(cartMatch ? cartMatch.quantity : 0);

          if (!token) {
            setIsInWishlist(false);
          } else {
            const currentWish = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
            setIsInWishlist(currentWish.includes(targetId));
          }
        }
      } catch (err) {
        console.error("Error retrieving individual product record:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadProductData();
  }, [id, CART_CACHE_KEY, WISHLIST_KEY, token]);

  const handleWishlistToggle = () => {
    if (!product) return;

    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    const targetId = product.product_id || product.id;
    let currentWish = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    let nextState = false;

    if (currentWish.includes(targetId)) {
      currentWish = currentWish.filter(item => item !== targetId);
      nextState = false;
    } else {
      currentWish.push(targetId);
      nextState = true;
    }

    localStorage.setItem(WISHLIST_KEY, JSON.stringify(currentWish));
    setIsInWishlist(nextState);
    window.dispatchEvent(new CustomEvent("sync-wishlist", { detail: currentWish }));
  };

  const handleCartMutation = async (change) => {
    if (!product) return;
    const targetId = product.product_id || product.id;

    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    setActionLoading(true);
    let currentCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
    const existingIndex = currentCart.findIndex(item => item.product_id === targetId);
    let nextQty = (existingIndex > -1 ? currentCart[existingIndex].quantity : 0) + change;

    if (existingIndex > -1) {
      if (nextQty > 0) {
        currentCart[existingIndex].quantity = nextQty;
      } else {
        currentCart.splice(existingIndex, 1);
        nextQty = 0;
      }
    } else if (change > 0) {
      currentCart.push({
        product_id: targetId,
        product_name: product.product_name,
        price: Number(String(product.price || 0).replace(/[^0-9.-]/g, "")),
        image_url: product.image_url,
        quantity: 1
      });
      nextQty = 1;
    }

    setQuantity(nextQty);
    localStorage.setItem(CART_CACHE_KEY, JSON.stringify(currentCart));
    window.dispatchEvent(new CustomEvent("sync-cart", { detail: currentCart }));

    try {
      await updateCartItemAPI(targetId, change, true);
    } catch (err) {
      console.error("Backend checkout registry sync failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInstantBuyNow = async () => {
    if (!product) return;
    const targetId = product.product_id || product.id;

    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    setActionLoading(true);
    let currentCart = JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
    const existingIndex = currentCart.findIndex(item => item.product_id === targetId);

    if (existingIndex === -1) {
      currentCart.push({
        product_id: targetId,
        product_name: product.product_name,
        price: Number(String(product.price || 0).replace(/[^0-9.-]/g, "")),
        image_url: product.image_url,
        quantity: 1
      });
      localStorage.setItem(CART_CACHE_KEY, JSON.stringify(currentCart));
      window.dispatchEvent(new CustomEvent("sync-cart", { detail: currentCart }));

      try {
        await updateCartItemAPI(targetId, 1, true);
      } catch (err) {
        console.error("Failed executing upstream instant addition commands:", err);
      }
    }
    setActionLoading(false);
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="text-center py-32 text-xs uppercase font-black tracking-widest text-emerald-800 animate-pulse">
        Streaming Routine Specifications...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Product Not Found</h2>
        <p className="text-sm text-gray-500">We couldn't locate the item you were looking for.</p>
        <button onClick={() => navigate("/products")} className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs uppercase font-bold">
          Back to Catalog
        </button>
      </div>
    );
  }

  const cleanPrice = Number(String(product.price || 0).replace(/[^0-9.-]/g, ""));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans text-gray-900 bg-[#E2ECE6] min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Product Index
      </button>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 bg-white p-6 sm:p-10 rounded-3xl border border-zinc-200/60 shadow-sm">
        <div className="md:col-span-5 bg-zinc-50 rounded-2xl p-6 flex items-center justify-center relative aspect-square border border-zinc-100">
          <button onClick={handleWishlistToggle} className="absolute top-4 right-4 p-3 bg-white shadow-sm border rounded-full text-zinc-400 hover:text-red-500 transition-all active:scale-90">
            <Heart className={`h-5 w-5 transition-colors pointer-events-none ${isInWishlist && token ? "fill-red-500 text-red-500" : "stroke-[2]"}`} />
          </button>
          <img src={product.image_url} alt={product.product_name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
        </div>

        <div className="md:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs uppercase font-black tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100/60">
                {product.brand || "Dermatological Routine"}
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-zinc-900 mt-3 leading-tight">{product.product_name}</h1>
            </div>
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-2xl font-black text-zinc-950">₹{cleanPrice.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Inclusive of all taxes</span>
            </div>
            <hr className="border-zinc-100" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-zinc-50 border rounded-xl flex items-center gap-2 text-xs font-bold text-zinc-700">
                <ShieldCheck className="h-4 w-4 text-emerald-800 shrink-0" />
                <span>Safety Rating: {product.safety_score || "9.6"} ({product.safety_label || "Excellent"})</span>
              </div>
              <div className="p-3 bg-zinc-50 border rounded-xl flex items-center gap-2 text-xs font-bold text-zinc-700">
                <Truck className="h-4 w-4 text-emerald-800 shrink-0" />
                <span>Free Next-Day Delivery Eligible</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50/50 border border-zinc-200/60 p-5 rounded-2xl space-y-3.5 max-w-md">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block px-0.5">Purchase Management Center</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quantity > 0 && token ? (
                <div className="flex items-center justify-between bg-emerald-800 text-white border border-emerald-800 rounded-xl shadow-sm overflow-hidden h-12 w-full">
                  <button onClick={() => handleCartMutation(-1)} disabled={actionLoading} className="px-4 hover:bg-emerald-900 h-full transition-colors flex items-center justify-center flex-1">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-4 font-black text-sm min-w-[24px] text-center">{quantity}</span>
                  <button onClick={() => handleCartMutation(1)} disabled={actionLoading} className="px-4 hover:bg-emerald-900 h-full transition-colors flex items-center justify-center flex-1">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => handleCartMutation(1)} disabled={actionLoading} className="w-full bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 font-bold text-xs py-3.5 rounded-xl transition-all shadow-sm tracking-wider uppercase flex items-center justify-center gap-2 h-12">
                  <ShoppingBag className="h-4 w-4" /> Add to Cart Bag
                </button>
              )}
              <button onClick={handleInstantBuyNow} disabled={actionLoading} className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-zinc-200 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md tracking-wider uppercase flex items-center justify-center gap-2 h-12 border border-emerald-800">
                <CreditCard className="h-4 w-4" /> Instant Buy Now
              </button>
            </div>
            <div className="pt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center border-t border-dashed border-zinc-200">
              <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3" /> 10-Day Returns</span>
              <span>•</span>
              <span>Secure Transaction Architecture</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;