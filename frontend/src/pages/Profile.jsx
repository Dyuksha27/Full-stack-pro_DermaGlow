// src/pages/Profile.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; 
import API from "../api/axios";
import { Package, Lock, LogOut, Calendar, ShieldCheck, UserPlus, Users, Check, ShoppingBag, Eye, ShieldAlert, ArrowRight } from "lucide-react";

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, token: authToken, logout, switchAccount, isTransitioning } = useAuth(); 

  const queryParams = new URLSearchParams(location.search);
  
  // 🛡️ CORRECTED INITIAL TAB EVALUATION LOOKUP:
  const getSanitizedTab = (searchString) => {
    const view = new URLSearchParams(searchString).get("view");
    if (view === "security") return "security";
    if (view === "reports") return "reports";
    return "orders";
  };

  const [activeTab, setActiveTab] = useState(() => getSanitizedTab(location.search));

  const [savedAccounts, setSavedAccounts] = useState(() => {
    return JSON.parse(localStorage.getItem("store_user_profiles_pool") || "[]");
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ type: "", msg: "" });

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRegPassword, setNewRegPassword] = useState("");
  const [registerStatus, setRegisterStatus] = useState({ type: "", msg: "" });

  // Sync cart and wishlist cache configurations
  useEffect(() => {
    if (!authUser?.email) return;

    const suffix = `_${authUser.email.toLowerCase()}`;
    const stableCart = JSON.parse(localStorage.getItem(`user_cart_cache${suffix}`) || "[]");
    const stableWishlist = JSON.parse(localStorage.getItem(`store_wishlist${suffix}`) || "[]");
    
    window.dispatchEvent(new CustomEvent("sync-cart", { 
      detail: { cartData: stableCart, email: authUser.email } 
    }));
    window.dispatchEvent(new CustomEvent("sync-wishlist", { 
      detail: { wishlistData: stableWishlist, email: authUser.email } 
    }));
  }, [authUser?.email]);

  // 🛡️ FIXED SYNCHRONIZATION EVENT: Maps matching view strings correctly across components
  useEffect(() => {
    setActiveTab(getSanitizedTab(location.search));
  }, [location.search]);

  // Fetch Order History Records
  useEffect(() => {
    const fetchOrders = async () => {
      if (!authToken || isTransitioning) {
        setLoadingOrders(false);
        return;
      }

      try {
        setLoadingOrders(true);
        const res = await API.get("/orders/my-orders");
        setOrders(res.data || []);
      } catch (err) {
        console.error("Order history trace failure:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    
    fetchOrders();

    if (authUser?.email && authToken && !isTransitioning) {
      let currentPool = JSON.parse(localStorage.getItem("store_user_profiles_pool") || "[]");
      const exists = currentPool.some(acc => acc.email.toLowerCase() === authUser.email.toLowerCase());
      
      if (!exists) {
        const updatedPool = [
          ...currentPool, 
          { 
            id: authUser.id, 
            name: authUser.name, 
            email: authUser.email, 
            role: authUser.role, 
            token: authToken 
          }
        ];
        localStorage.setItem("store_user_profiles_pool", JSON.stringify(updatedPool));
        setSavedAccounts(updatedPool);
      }
    }
  }, [authUser, authToken, isTransitioning]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPasswordStatus({ type: "error", msg: "All form inputs are required." });
      return;
    }
    try {
      setPasswordStatus({ type: "loading", msg: "Updating global credentials..." });
      await API.post("/auth/change-password", { oldPassword, newPassword });
      setPasswordStatus({ type: "success", msg: "Password rotated successfully!" });
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordStatus({ type: "error", msg: err.response?.data?.message || "Failed password switch check." });
    }
  };

  const handleInlineAccountAdd = async (e) => {
    e.preventDefault();
    if (!newName || !newEmail || !newRegPassword) {
      setRegisterStatus({ type: "error", msg: "All form parameters are required variables." });
      return;
    }
    try {
      setRegisterStatus({ type: "loading", msg: "Registering configuration lines..." });
      
      const payload = {
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        password: newRegPassword
      };

      await API.post("/auth/register", payload);
      const loginRes = await API.post("/auth/login", { email: payload.email, password: payload.password });

      const currentPool = JSON.parse(localStorage.getItem("store_user_profiles_pool") || "[]");
      const updatedPool = [
        ...currentPool, 
        { 
          id: loginRes.data.user.id,
          name: loginRes.data.user.name, 
          email: loginRes.data.user.email, 
          role: loginRes.data.user.role,
          token: loginRes.data.token 
        }
      ];
      
      localStorage.setItem("store_user_profiles_pool", JSON.stringify(updatedPool));

      setRegisterStatus({ type: "success", msg: "New account registered! Swapping context..." });
      setNewName("");
      setNewEmail("");
      setNewRegPassword("");

      switchAccount(loginRes.data.token, loginRes.data.user);
    } catch (err) {
      console.error("Registration endpoint switch tracking failure:", err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || "Registration failure mapping lines.";
      setRegisterStatus({ type: "error", msg: serverMsg });
    }
  };

  const handleSwitchProfileInstant = (targetAccount) => {
    if (targetAccount.email.toLowerCase() === authUser?.email?.toLowerCase()) return;
    
    switchAccount(targetAccount.token, { 
      id: targetAccount.id,
      name: targetAccount.name, 
      email: targetAccount.email,
      role: targetAccount.role
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F7F5] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT PROFILE CARD CONTROLS */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm h-fit space-y-5">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 bg-emerald-800 text-white font-serif font-black flex items-center justify-center text-lg rounded-full shadow-sm">
              {authUser?.name ? authUser.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight truncate max-w-[180px]">{authUser?.name || "User Profile"}</h2>
              <span className="text-[10px] text-zinc-400 font-bold block mt-0.5 uppercase tracking-wider truncate max-w-[180px]">
                {authUser?.email}
              </span>
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* TAB SELECTION SELECTORS */}
          <div className="flex flex-col space-y-1">
            <button 
              onClick={() => navigate("/profile?view=orders")}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "orders" ? "bg-emerald-800 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Package className="h-4 w-4" /> Order History
            </button>
            
            <button 
              onClick={() => navigate("/profile?view=reports")}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "reports" ? "bg-emerald-800 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> Medical Skin Report
            </button>

            <button 
              onClick={() => navigate("/profile?view=security")}
              className={`w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === "security" ? "bg-emerald-800 text-white shadow-md" : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <Lock className="h-4 w-4" /> Security & Profiles
            </button>

            {/* 🛡️ INJECTED ADMIN WORKSPACE SELECTION GATEWAY */}
            {authToken && authUser && authUser.role === "admin" && (
              <button 
                onClick={() => navigate("/admin/dashboard")}
                className="w-full text-left px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest bg-amber-50/60 border border-amber-200/40 text-amber-900 hover:bg-amber-50 transition-all flex items-center justify-between mt-2 shadow-sm"
              >
                <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-800" /> Admin Workspace</span>
                <ArrowRight className="h-3 w-3 text-amber-700" />
              </button>
            )}
          </div>

          <button 
            onClick={() => { localStorage.removeItem("store_user_profiles_pool"); logout(); navigate("/"); }}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] py-3 rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 border border-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </div>

        {/* RIGHT METRIC PANEL CANVAS */}
        <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-3xl border border-zinc-200/60 shadow-sm min-h-[480px]">
          
          {/* VIEW TAB A: ORDER LEDGER */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="pb-3 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2"><Package className="text-emerald-800 h-5 w-5" /> My Orders</h3>
                <span className="bg-zinc-100 text-zinc-600 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{orders.length} Orders</span>
              </div>

              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-zinc-400 uppercase animate-pulse">Querying tracking log lines...</div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="mx-auto h-12 w-12 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300"><ShoppingBag className="h-5 w-5" /></div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No orders yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs hover:border-zinc-300 transition-all">
                      <div>
                        <p className="font-mono font-bold text-zinc-800">#DG-{order.id.toString().padStart(6, "0")}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-5 ml-auto sm:ml-0">
                        <span className="capitalize font-bold text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">{order.status || "Processing"}</span>
                        <span className="font-black text-zinc-950">₹{parseFloat(order.total_amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW TAB B: MEDICAL ANALYSIS REPORTS TRACKER */}
          {activeTab === "reports" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="pb-3 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-800 h-5 w-5" /> Derm Analysis & Prescriptions
                </h3>
                <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Active Analysis Record</span>
              </div>

              <div className="bg-zinc-50/60 border border-zinc-200/60 rounded-2xl p-5 md:p-6 space-y-5 text-xs">
                {/* DOCTOR NOTES */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Clinical Assessment Summary</p>
                  <div className="bg-white p-4 rounded-xl border border-zinc-100 text-zinc-700 leading-relaxed font-medium">
                    "Patient demonstrates symptoms consistent with moderate epidermal lipid barrier depletion caused by aggressive ambient moisture shifts. The current skin pH is resting slightly alkaline. Strongly recommend pivoting away from physical surfactants. Restructure hydration lines around barrier-locking humectants."
                    <p className="text-[10px] text-zinc-400 font-bold mt-2 text-right">— Dr. Ananya Iyer, MD (AIIMS)</p>
                  </div>
                </div>

                {/* TARGET INGREDIENTS */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Mandatory Active Ingredients</p>
                  <div className="flex flex-wrap gap-2">
                    {["Ceramides NP/AP", "Hyaluronic Acid (Multi-Weight)", "Centella Asiatica (Cica)", "Niacinamide 2%"].map((ing) => (
                      <span key={ing} className="bg-zinc-100 border border-zinc-200 text-zinc-800 font-mono font-bold px-2.5 py-1 rounded-lg text-[10px]">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {/* PRESCRIBED PRODUCTS DISPATCH LINK BUTTONS */}
                <div className="space-y-2.5 pt-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Prescribed Routine Additions</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-zinc-200 bg-white p-3.5 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900 truncate max-w-[160px]">Ceramide Barrier Serum</p>
                        <p className="text-[10px] text-zinc-400 font-medium">Overnight Lipophilic Lock</p>
                      </div>
                      <button 
                        onClick={() => navigate("/products?search=ceramide")} 
                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
                      >
                        Order Item
                      </button>
                    </div>

                    <div className="border border-zinc-200 bg-white p-3.5 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-zinc-900 truncate max-w-[160px]">Cica Gel Surfactant</p>
                        <p className="text-[10px] text-zinc-400 font-medium">pH 5.5 Balanced Wash</p>
                      </div>
                      <button 
                        onClick={() => navigate("/products?search=cica")} 
                        className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg shrink-0"
                      >
                        Order Item
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW TAB C: SECURITY, PASSWORDS & ACCOUNT SWITCH POOL */}
          {activeTab === "security" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-zinc-100">
              
              {/* BLOCK ONE: PASSWORD ROTATION */}
              <div className="space-y-5 pb-6 md:pb-0">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Lock className="text-emerald-800 h-4 w-4" /> Update Profile Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Old Secure Pass</label>
                    <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" className="w-full border border-zinc-200 bg-zinc-50/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">New Secure Pass</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full border border-zinc-200 bg-zinc-50/40 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-800" />
                  </div>

                  {passwordStatus.msg && (
                    <p className={`text-[10px] font-medium p-2.5 rounded-xl border text-center ${passwordStatus.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-600"}`}>{passwordStatus.msg}</p>
                  )}

                  <button type="submit" className="bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] uppercase font-bold tracking-widest px-4 py-2.5 rounded-xl shadow-sm transition-all">Save Changes</button>
                </form>
              </div>

              {/* BLOCK TWO: PROFILES POOL LIST */}
              <div className="space-y-6 pt-6 md:pt-0 md:pl-8">
                
                {/* ACCOUNT PROFILE SWITCHER LIST GRID */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2"><Users className="text-emerald-800 h-4 w-4" /> Switch Accounts</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {savedAccounts.map((acc) => {
                      const isActive = acc.email && authUser?.email && (acc.email.toLowerCase() === authUser.email.toLowerCase());
                      return (
                        <div 
                          key={acc.email}
                          onClick={() => handleSwitchProfileInstant(acc)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                            isActive ? "border-emerald-700 bg-emerald-50/40 font-bold" : "border-zinc-200 bg-white hover:bg-zinc-50"
                          }`}
                        >
                          <div className="truncate pr-4">
                            <p className="text-zinc-800 text-xs truncate">{acc.name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium truncate mt-0.5">{acc.email}</p>
                          </div>
                          {isActive ? (
                            <span className="h-5 w-5 rounded-full bg-emerald-800 flex items-center justify-center text-white text-[10px] shrink-0"><Check className="h-3 w-3" /></span>
                          ) : (
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 bg-zinc-100 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-zinc-200">Switch <Eye className="h-3 w-3" /></span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* INLINE EXTRA ACCOUNT REGISTRY */}
                <div className="space-y-4 pt-4 border-t border-zinc-100">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5"><UserPlus className="h-4 w-4 text-emerald-800" /> Link New Account</h4>
                  <form onSubmit={handleInlineAccountAdd} className="space-y-3">
                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full Name" className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-800" />
                    <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email Address" className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-800" />
                    <input type="password" value={newRegPassword} onChange={(e) => setNewRegPassword(e.target.value)} placeholder="Account Password" className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-800" />
                    
                    {registerStatus.msg && (
                      <p className={`text-[9px] font-medium p-2 rounded-xl border text-center ${registerStatus.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-600"}`}>{registerStatus.msg}</p>
                    )}

                    <button type="submit" className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[10px] uppercase tracking-widest py-2.5 rounded-xl transition-all shadow-sm">Initialize & Log In</button>
                  </form>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Profile;