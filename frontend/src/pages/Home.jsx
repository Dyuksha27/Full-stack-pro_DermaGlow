// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, Droplet, Sun, Eye, ArrowRight, Heart } from "lucide-react";
import { fetchProductsAPI } from "../api/product.api";
import { useAuth } from "../context/AuthContext";

const HIGHLIGHTED_COLLECTIONS = [
  { id: "Cleansers", name: "Cleansers & Washes", count: "Active Clean Care", icon: Sparkles },
  { id: "Moisturizers", name: "Moisturizers & Creams", count: "Deep Hydration", icon: Droplet },
  { id: "Toners", name: "Toners & Mists", count: "Skin Balancing", icon: Sun },
  { id: "Eyes", name: "Targeted Care", count: "Eyes & Lips", icon: Eye },
];

const Home = () => {
  const navigate = useNavigate();
  const { token: rawToken } = useAuth();
  const token = (rawToken && rawToken !== "null" && rawToken !== "undefined") ? rawToken : null;

  const [lovedProducts, setLovedProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatPrice = (item) => {
    if (!item || !item.price) return "Out of Stock";
    const cleanNumber = Number(String(item.price).replace(/[^0-9.-]/g, ""));
    return isNaN(cleanNumber) ? "Out of Stock" : cleanNumber.toLocaleString('en-IN');
  };

  useEffect(() => {
    if (!token) {
      setWishlist([]);
    } else {
      const user = JSON.parse(localStorage.getItem("user")) || null;
      const userSuffix = user?.email ? `_${user.email.toLowerCase()}` : "";
      setWishlist(JSON.parse(localStorage.getItem(`store_wishlist${userSuffix}`) || "[]"));
    }

    const loadMostLoved = async () => {
      try {
        const data = await fetchProductsAPI({ page: 1, limit: 3 });
        setLovedProducts(data?.rows || data || []);
      } catch (err) {
        console.error("Error retrieving trending product metrics:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMostLoved();

    const handleWishlistChange = (e) => {
      if (!token) {
        setWishlist([]);
        return;
      }
      const updatedWishlist = e.detail?.wishlistData || e.detail || [];
      setWishlist(updatedWishlist);
    };
    
    window.addEventListener("sync-wishlist", handleWishlistChange);
    return () => window.removeEventListener("sync-wishlist", handleWishlistChange);
  }, [token]);

  const handleWishlistToggle = (e, productId) => {
    e.preventDefault();
    e.stopPropagation(); 

    // 🛡️ SECURE GATE
    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    const user = JSON.parse(localStorage.getItem("user")) || null;
    const userSuffix = user?.email ? `_${user.email.toLowerCase()}` : "";
    const WISHLIST_KEY = `store_wishlist${userSuffix}`;

    let currentWish = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    if (currentWish.includes(productId)) {
      currentWish = currentWish.filter(id => id !== productId);
    } else {
      currentWish.push(productId);
    }
    
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(currentWish));
    setWishlist(currentWish);
    window.dispatchEvent(new CustomEvent("sync-wishlist", { detail: currentWish }));
  };

  return (
    <div className="bg-[#E2ECE6] font-sans antialiased text-gray-900 pb-20">
      <section className="w-full px-6 pt-6">
        <div className="max-w-7xl mx-auto rounded-[2.5rem] overflow-hidden shadow-sm relative h-[32rem] border border-white/30">
          <img src="/Images/pic1.png" alt="DermaGlow Luxury Skin Architecture" className="w-full h-full object-cover object-center transform scale-100 hover:scale-[1.01] transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-zinc-950/20 to-transparent flex items-end p-12 lg:p-16">
            <div className="max-w-xl space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white bg-emerald-800/80 backdrop-blur-sm px-3 py-1 rounded-full border border-emerald-700">Skin-Safe Skincare</span>
              <h1 className="text-4xl lg:text-5xl font-bold font-serif text-emerald-900 leading-tight">Skin concerns shouldn't stop you from feeling beautiful.</h1>
              <p className="text-sm text-zinc-200/90 font-medium leading-relaxed">Whether you are managing acne, irritation, or an uneven skin tone, finding the right routine shouldn't feel like guesswork. Our database screens every ingredient to bring you safe, clinical options that protect your skin.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 rounded-3xl overflow-hidden bg-white/40 border border-white/50 p-2.5 shadow-sm"><img src="/Images/pic2.png" alt="Fine Flowers Moisturizing Treatment Sets" className="w-full h-96 object-cover rounded-2xl" /></div>
          <div className="lg:col-span-6 space-y-5 lg:pl-6">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">01 / Pure Ingredients Only</span>
            <h2 className="text-3xl font-bold font-serif text-zinc-900 leading-tight">Don't pause your skincare routine. Upgrade it.</h2>
            <p className="text-sm text-zinc-600 leading-relaxed">When a sudden breakout or sensitivity flare-up hits, many people think they need to drop their entire routine. We believe you just need cleaner alternatives.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1 space-y-5 lg:pr-6">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">02 / Verified Safety Scores</span>
            <h3 className="text-3xl font-bold font-serif text-zinc-900 leading-tight">Honest data behind every single product bottle.</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">Every bottle listed inside our store includes clear risk assessments, label checking, and transparent active tracking. No confusing fine print—just clean, reliable skin intelligence.</p>
            <Link to="/products" className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider hover:text-emerald-950 transition-colors pt-2 group">Browse All Products <ArrowRight className="h-3 w-3 transform group-hover:translate-x-1 transition-transform" /></Link>
          </div>
          <div className="lg:col-span-6 order-1 lg:order-2 rounded-3xl overflow-hidden bg-white/40 border border-white/50 p-2.5 shadow-sm"><img src="/Images/pic3.png" alt="Verveine Citrus Soothing Solutions" className="w-full h-96 object-cover rounded-2xl" /></div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-baseline justify-between border-b border-zinc-300 pb-3 mb-8">
          <h2 className="text-xs uppercase font-black tracking-widest text-zinc-400">Most Loved Products By Customers</h2>
          <Link to="/products" className="text-xs font-bold text-emerald-800 hover:underline">View All →</Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-zinc-400 tracking-widest uppercase animate-pulse">Loading top items...</div>
        ) : lovedProducts.length === 0 ? (
          <div className="text-center py-12 text-xs text-zinc-400 tracking-widest uppercase">No products indexed.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {lovedProducts.map((item) => {
              const isLiked = wishlist.includes(item.product_id);
              return (
                <div key={item.product_id} className="bg-white border border-zinc-200/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 relative group">
                  <button onClick={(e) => handleWishlistToggle(e, item.product_id)} className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/80 backdrop-blur-sm text-zinc-400 hover:text-red-500 transition-colors shadow-sm">
                    <Heart className={`h-4 w-4 pointer-events-none ${isLiked && token ? "fill-red-500 text-red-500" : "text-zinc-400"}`} />
                  </button>
                  <Link to={`/product/${item.product_id}`} className="block">
                    <div className="w-full bg-zinc-50 rounded-xl overflow-hidden mb-3 p-4 flex items-center justify-center h-48">
                      <img src={item.image_url || "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400"} alt={item.product_name} className="h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400"; }} />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800">{item.brand || "Skincare Store"}</span>
                      <h3 className="font-bold text-zinc-800 text-xs line-clamp-1 mt-0.5 hover:text-emerald-800 transition-colors">{item.product_name}</h3>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between mt-4 pt-2 border-t border-zinc-100"><span className="text-sm font-black text-zinc-950">{formatPrice(item) !== "Out of Stock" ? `₹${formatPrice(item)}` : "Out of Stock"}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-white/40 backdrop-blur-md border-t border-b border-zinc-200/60 py-16">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1"><h2 className="text-xs uppercase font-black tracking-widest text-emerald-800">Target Core Categories</h2><p className="text-xl font-bold text-zinc-900 font-serif">Browse Our Curated Collections</p></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HIGHLIGHTED_COLLECTIONS.map((collection) => {
              const CustomIcon = collection.icon;
              return (
                <button key={collection.id} onClick={() => navigate(`/products?category=${encodeURIComponent(collection.id)}&page=1`)} className="bg-white border border-zinc-200/50 p-5 rounded-2xl text-left hover:border-emerald-800 hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-32">
                  <div className="h-9 w-9 bg-[#E2ECE6] text-emerald-800 rounded-xl flex items-center justify-center group-hover:bg-emerald-800 group-hover:text-white transition-all duration-300"><CustomIcon className="h-4 w-4 stroke-[2]" /></div>
                  <div><h4 className="font-bold text-xs text-zinc-800 tracking-tight group-hover:text-emerald-800 transition-colors">{collection.name}</h4><p className="text-[10px] text-zinc-400 mt-0.5">{collection.count}</p></div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;