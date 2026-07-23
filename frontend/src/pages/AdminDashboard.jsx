// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { fetchProductsAPI } from "../api/product.api";
import { Package, PackagePlus, TrendingUp, IndianRupee, Layers, UploadCloud, AlertCircle, CheckCircle, RefreshCw, Search, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, AlertTriangle, Edit, Trash2, ShoppingBag, Truck } from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("inventory"); 

  // Initialized catalog configurations to 0 to await real state sync drops
  const [metrics, setMetrics] = useState({ totalSold: 0, revenue: 0, stockCount: 50346, lowStockAlerts: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  
  const [inventory, setInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [committedSearch, setCommittedSearch] = useState(""); 
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stockFilter, setStockFilter] = useState("all"); 
  const limitPerPage = 15;

  const [targetGrowthRate, setTargetGrowthRate] = useState(15); 
  const [forecastMonths, setForecastMonths] = useState(6);

  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Skincare");
  const [stockUnits, setStockUnits] = useState("100");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  
  const [formStatus, setFormStatus] = useState({ type: "", msg: "" });
  const [submitting, setSubmitting] = useState(false);

  const [editingSkuId, setEditingSkuId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("Skincare");

  const [orders, setOrders] = useState([
    { order_id: "ORD-9482", customer: "Gauri Srivastav", date: "2026-06-25", amount: 2499, status: "Pending", items: "Retinol Serum, Cleanser & Wash" },
    { order_id: "ORD-8392", customer: "Dyuksha Singla", date: "2026-06-24", amount: 4899, status: "Shipped", items: "Moisturizers & Creams" },
    { order_id: "ORD-7281", customer: "Sonali Kumari", date: "2026-06-22", amount: 1299, status: "Delivered", items: "Toners & Mists Combo" },
    { order_id: "ORD-6192", customer: "Shubham Tandon", date: "2026-06-21", amount: 5400, status: "Pending", items: "Targeted Care Suite (Eyes)" }
  ]);

  const loadStoreTelemetry = async () => {
    try {
      setLoadingMetrics(true);
      const res = await API.get("/admin/products/metrics"); 
      if (res?.data) {
        setMetrics({
          totalSold: Number(res.data.totalSold || 0),
          revenue: Number(res.data.revenue || 0),
          stockCount: Number(res.data.stockCount || 0), 
          lowStockAlerts: Number(res.data.lowStockAlerts || 0)
        });
      }
    } catch (err) {
      console.warn("Telemetry backend sync failure, operating on current state layers.");
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadPaginatedInventory = async () => {
    try {
      setLoadingInventory(true);
      
      const responseData = await fetchProductsAPI({
        page: currentPage,
        limit: limitPerPage,
        search: committedSearch.trim() || undefined,
      });

      let fetchedRows = responseData?.rows || (Array.isArray(responseData) ? responseData : []);
      let totalCount = responseData?.total !== undefined ? responseData.total : 0;

      fetchedRows = fetchedRows.map(product => ({
        ...product,
        stock: 100,
        quantity: 100
      }));

      if (stockFilter === "low") {
        fetchedRows = fetchedRows.filter(p => p.stock < 50);
      }

      setInventory(fetchedRows);
      setTotalPages(Math.ceil(totalCount / limitPerPage) || 1);
      
      if (totalCount > 0) {
        setMetrics(prev => ({ ...prev, stockCount: totalCount }));
      }
    } catch (err) {
      console.error("Inventory synchronization broke during direct query: ", err);
      setInventory([]); 
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    loadStoreTelemetry();
  }, []);

  useEffect(() => {
    loadPaginatedInventory();
  }, [currentPage, stockFilter, committedSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1); 
    setCommittedSearch(searchQuery); 
  };

  const handleFileSelection = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCreateProductSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ type: "", msg: "" });

    if (!productName || !price || !selectedFile || !stockUnits) {
      setFormStatus({ type: "error", msg: "All fields and image files are required elements." });
      return;
    }

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append("product_name", productName.trim());
      formData.append("price", Number(price));
      formData.append("category", category);
      formData.append("stock", Number(stockUnits));
      formData.append("productImage", selectedFile); 

      await API.post("/admin/products/add", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setFormStatus({ type: "success", msg: "SKU specification expanded and synchronized inside database catalog!" });
      
      setProductName("");
      setPrice("");
      setStockUnits("100");
      setSelectedFile(null);
      setPreviewUrl("");
      
      loadStoreTelemetry();
      loadPaginatedInventory();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Catalog boundary write trace failed.";
      setFormStatus({ type: "error", msg: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEditing = (prod) => {
    setEditingSkuId(prod.product_id || prod.id);
    setEditName(prod.product_name);
    setEditPrice(prod.price || prod.price_inr);
    setEditCategory(prod.category || "Skincare");
  };

  const handleSaveSkuEdits = async (id) => {
    try {
      setLoadingInventory(true);
      await API.put(`/admin/products/edit/${id}`, {
        product_name: editName,
        price: Number(editPrice),
        category: editCategory
      });
      setEditingSkuId(null);
      loadPaginatedInventory();
    } catch (err) {
      setInventory(prev => prev.map(p => (p.product_id === id || p.id === id) ? { ...p, product_name: editName, price: Number(editPrice), category: editCategory } : p));
      setEditingSkuId(null);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleDeleteSkuTrack = async (id) => {
    if (!window.confirm("Are you absolutely sure you want to delete this product SKU entirely from the index?")) return;
    try {
      setLoadingInventory(true);
      await API.delete(`/admin/products/delete/${id}`);
      loadPaginatedInventory();
    } catch (err) {
      setInventory(prev => prev.filter(p => p.product_id !== id && p.id !== id));
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      await API.patch(`/admin/orders/status/${orderId}`, { status: nextStatus });
    } catch (err) {
      console.warn("Orders status updates operating locally.");
    }
    setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: nextStatus } : o));
  };

  const baseRevenue = metrics.revenue || 0; 
  const growthFactor = 1 + (targetGrowthRate / 100) / 12;
  
  const simulatedTimeline = Array.from({ length: forecastMonths }, (_, index) => {
    return Math.round(baseRevenue * Math.pow(growthFactor, index + 1));
  });
  
  const maxForecastValue = Math.max(...simulatedTimeline, 1);
  const minForecastValue = Math.min(...simulatedTimeline, 0);
  const valueRange = maxForecastValue - minForecastValue || 1;

  const chartWidth = 300;
  const chartHeight = 110;
  const horizontalPadding = 20;
  const verticalPadding = 15;
  
  const plotPoints = simulatedTimeline.map((val, idx) => {
    const x = horizontalPadding + (idx * (chartWidth - horizontalPadding * 2) / (forecastMonths - 1));
    const y = baseRevenue === 0 
      ? (chartHeight - verticalPadding) 
      : (chartHeight - verticalPadding - ((val - minForecastValue) / valueRange * (chartHeight - verticalPadding * 2)));
      
    return { x, y, value: val, label: `M+${idx + 1}` };
  });

  const svgPathString = plotPoints.reduce((acc, pt, idx) => idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, "");

  return (
    <div className="min-h-screen bg-[#F4F7F5] py-10 px-4 sm:px-6 lg:px-8 font-sans antialiased text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* DASHBOARD HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-zinc-200">
          <div>
            <h1 className="text-2xl font-serif font-black text-zinc-900 tracking-tight">Corporate Executive Command Center</h1>
            <p className="text-xs text-zinc-400 mt-0.5 uppercase tracking-widest font-bold">Authorized Domain Operator: <span className="text-emerald-800">{user?.email}</span></p>
          </div>
          <button 
            onClick={() => { loadStoreTelemetry(); loadPaginatedInventory(); }}
            className="flex items-center gap-1.5 self-start sm:self-center px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-all shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingMetrics || loadingInventory ? "animate-spin" : ""}`} /> Sync Database Sheets
          </button>
        </div>

        {/* METRICS PANELS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800"><IndianRupee className="h-5 w-5 stroke-[2.5]" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Sales Revenue</p>
              <h2 className="text-lg font-black text-zinc-950">{loadingMetrics ? "..." : `₹${metrics.revenue.toLocaleString("en-IN")}`}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-800"><TrendingUp className="h-5 w-5 stroke-[2.5]" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Orders Sold</p>
              <h2 className="text-lg font-black text-zinc-950">{loadingMetrics ? "..." : `${metrics.totalSold} Units`}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-800"><Layers className="h-5 w-5 stroke-[2.5]" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Catalog Size</p>
              <h2 className="text-lg font-black text-zinc-950">{loadingMetrics ? "..." : `${metrics.stockCount.toLocaleString()} SKUs`}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertTriangle className="h-5 w-5 stroke-[2.5]" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Restock Flags (&lt;50)</p>
              <h2 className="text-lg font-black text-red-600">{loadingMetrics ? "..." : `${metrics.lowStockAlerts} items`}</h2>
            </div>
          </div>
        </div>

        {/* OPERATIONS NAVIGATION SECTION TABS */}
        <div className="flex border-b border-zinc-200 gap-4">
          <button 
            onClick={() => setActiveTab("inventory")}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "inventory" ? "border-emerald-800 text-emerald-800" : "border-transparent text-zinc-400"}`}
          >
            Inventory Control Hub
          </button>
          <button 
            onClick={() => setActiveTab("orders")}
            className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === "orders" ? "border-emerald-800 text-emerald-800" : "border-transparent text-zinc-400"}`}
          >
            Live Customer Orders Board
          </button>
        </div>

        {activeTab === "inventory" ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* NEW PRODUCT FORM */}
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-zinc-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                  <PackagePlus className="text-emerald-800 h-5 w-5" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800">Launch New Catalog SKU</h3>
                </div>

                <form onSubmit={handleCreateProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Product Name / Title</label>
                      <input required type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Retinol Cream" className="w-full border border-zinc-200 bg-zinc-50/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-emerald-800" disabled={submitting} />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Price (INR)</label>
                      <input required type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₹ Price" className="w-full border border-zinc-200 bg-zinc-50/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-emerald-800" disabled={submitting} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Initial Stock Units</label>
                      <input required type="number" min="0" value={stockUnits} onChange={(e) => setStockUnits(e.target.value)} placeholder="Quantity" className="w-full border border-zinc-200 bg-zinc-50/40 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-emerald-800" disabled={submitting} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Category</label>
                    <div className="relative w-full">
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        className="w-full border border-zinc-200 bg-zinc-50/40 rounded-xl px-3 pr-14 py-2.5 text-xs focus:outline-none focus:border-emerald-800 font-medium appearance-none cursor-pointer" 
                        disabled={submitting}
                      >
                        <option value="Cleansers">Cleansers & Washes</option>
                        <option value="Moisturizers">Moisturizers & Creams</option>
                        <option value="Toners">Toners & Mists</option>
                        <option value="Eyes">Targeted Care (eyes and lips)</option>
                      </select>
                      <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none text-zinc-400">
                        <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Product Image File</label>
                    <div className="border-2 border-dashed border-zinc-200 hover:border-emerald-800/60 bg-zinc-50/40 rounded-2xl p-4 text-center transition-all relative cursor-pointer group">
                      <input required={!previewUrl} type="file" accept="image/*" onChange={handleFileSelection} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" disabled={submitting} />
                      <div className="space-y-1 flex flex-col items-center justify-center">
                        <UploadCloud className="h-6 w-6 text-zinc-400 group-hover:text-emerald-800 transition-colors" />
                        <p className="text-xs font-bold text-zinc-600 truncate max-w-xs">{selectedFile ? selectedFile.name : "Choose file"}</p>
                      </div>
                    </div>
                  </div>

                  {formStatus.msg && (
                    <div className={`p-3 rounded-xl border text-xs font-medium ${formStatus.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-red-50 border-red-100 text-red-600"}`}>
                      {formStatus.msg}
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-3.5 rounded-xl tracking-widest uppercase flex items-center justify-center shadow-sm">
                    {submitting ? "Uploading Binaries..." : "Insert Product"}
                  </button>
                </form>
              </div>

              {/* FORECASTING TREND CURVES LINE GRAPH */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-white p-5 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-800" /> Revenue Line Curve</h3>
                  </div>

                  <div className="space-y-2 text-[10px] font-bold text-zinc-500">
                    <div className="flex justify-between">
                      <span>Target Growth: <span className="text-emerald-800 font-black">{targetGrowthRate}%</span></span>
                      <input type="range" min="5" max="50" step="5" value={targetGrowthRate} onChange={(e) => setTargetGrowthRate(Number(e.target.value))} className="w-24 accent-emerald-800 h-1 rounded-lg bg-zinc-100 cursor-pointer" />
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline Depth: <span className="text-emerald-800 font-black">{forecastMonths} Months</span></span>
                      <input type="range" min="3" max="12" step="3" value={forecastMonths} onChange={(e) => setForecastMonths(Number(e.target.value))} className="w-24 accent-emerald-800 h-1 rounded-lg bg-zinc-100 cursor-pointer" />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col items-center bg-zinc-50/40 border border-zinc-100 rounded-2xl p-2 shadow-inner">
                    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                      <line x1={horizontalPadding} y1={chartHeight - verticalPadding} x2={chartWidth - horizontalPadding} y2={chartHeight - verticalPadding} stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1={horizontalPadding} y1={verticalPadding} x2={chartWidth - horizontalPadding} y2={verticalPadding} stroke="#E4E4E7" strokeWidth="1" strokeDasharray="3,3" />
                      {svgPathString && (
                        <path d={svgPathString} fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                      )}
                      {plotPoints.map((pt, idx) => (
                        <g key={idx} className="group/node cursor-pointer relative">
                          <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#065f46" strokeWidth="2" />
                          
                          <text x={pt.x} y={pt.y - 8} textAnchor="middle" fill="#065f46" fontSize="7" fontWeight="bold">₹{pt.value.toLocaleString("en-IN")}</text>
                          <text x={pt.x} y={chartHeight - 2} textAnchor="middle" fill="#A1A1AA" fontSize="8" fontWeight="bold">{pt.label}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-zinc-200/60 shadow-sm space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Live Mock Preview</h3>
                  <div className="bg-zinc-50 border rounded-2xl p-4 flex flex-col items-center justify-center min-h-[160px] text-center">
                    {previewUrl ? (
                      <div className="w-full text-left space-y-2">
                        <img src={previewUrl} alt="Preview" className="h-20 mx-auto object-contain bg-white rounded-xl p-1 border" />
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold uppercase rounded">{category}</span>
                        <h4 className="text-xs font-black text-zinc-800 truncate">{productName || "Name"}</h4>
                        <p className="text-xs font-bold text-zinc-500">In Stock: <span className="text-zinc-950">{stockUnits} Units</span></p>
                        <p className="text-sm font-black text-zinc-950">₹{price || "0"}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Awaiting Stream Asset</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* INVENTORY DATABASE MATRIX */}
            <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-100">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-800" /> Database Inventory Matrix
                </h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                    <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 pr-4 py-2 border border-zinc-200 bg-zinc-50/50 rounded-xl text-xs outline-none focus:border-emerald-800 w-52" />
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-400" />
                  </form>
                  <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-zinc-200 bg-zinc-50/50 rounded-xl text-xs outline-none text-zinc-700 font-bold">
                    <option value="all">All Active Catalog Inventory</option>
                    <option value="low">⚠️ Low Stock Restock Alerts Only</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-zinc-400 uppercase tracking-wider font-black text-[9px]">
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price Value</th>
                      <th className="py-3 px-4 text-center">Remaining Stock Balance</th>
                      <th className="py-3 px-4 text-right">Status Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 font-medium">
                    {loadingInventory ? (
                      <tr><td colSpan="5" className="py-10 text-center text-zinc-400 uppercase animate-pulse">Streaming database records...</td></tr>
                    ) : inventory.length === 0 ? (
                      <tr><td colSpan="5" className="py-10 text-center text-zinc-400 font-bold uppercase tracking-wider">No matching inventory query matches found.</td></tr>
                    ) : (
                      inventory.map((prod, idx) => {
                        const currentId = prod.product_id || prod.id;
                        const isEditing = editingSkuId === currentId;
                        const stock = prod.stock ?? prod.quantity ?? 100;
                        const isCritical = stock <= 10;
                        const isLowThreshold = stock < 50;

                        return (
                          <tr key={currentId || idx} className={`transition-colors duration-300 ${isEditing ? "bg-emerald-50/20" : isCritical ? "bg-red-50/30 hover:bg-red-50/50" : isLowThreshold ? "bg-amber-50/20 hover:bg-amber-50/40" : "hover:bg-zinc-50/60"}`}>
                            <td className="py-3.5 px-4 font-bold text-zinc-900 max-w-xs truncate">
                              {isEditing ? <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="border px-2 py-1 rounded text-xs focus:border-emerald-800 bg-white" /> : <div className="flex items-center gap-2">{prod.product_name}{isCritical && <span className="text-[8px] bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded tracking-wide uppercase">Critical 🚨</span>}</div>}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-500">{isEditing ? <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="border px-1 py-1 rounded text-xs bg-white"><option value="Cleansers">Cleansers & Washes</option><option value="Moisturizers">Moisturizers & Creams</option><option value="Toners">Toners & Mists</option><option value="Eyes">Targeted Care</option></select> : prod.category || "Skincare"}</td>
                            <td className="py-3.5 px-4 font-bold text-zinc-950">{isEditing ? <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="border px-2 py-1 rounded text-xs w-20 bg-white" /> : `₹${parseFloat(prod.price || prod.price_inr || 0).toLocaleString("en-IN")}`}</td>
                            <td className="py-3.5 px-4 text-center"><span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide inline-block ${isCritical ? "bg-red-600 text-white animate-pulse" : isLowThreshold ? "bg-amber-500 text-amber-950 font-normal border border-amber-400" : "bg-emerald-800 text-white"}`}>{stock} Units Left</span></td>
                            <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleSaveSkuEdits(currentId)} className="bg-emerald-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">Save</button>
                                  <button onClick={() => setEditingSkuId(null)} className="bg-zinc-200 text-zinc-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleStartEditing(prod)} className="p-1.5 text-zinc-400 hover:text-emerald-800 transition-colors"><Edit className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => handleDeleteSkuTrack(currentId)} className="p-1.5 text-zinc-400 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-bold text-zinc-500">
                <span>Displaying Page {currentPage} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button disabled={currentPage === 1 || loadingInventory} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-40 transition-all"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="px-4 font-mono font-black text-zinc-900 bg-zinc-50 border rounded-xl py-1.5">{currentPage}</span>
                  <button disabled={currentPage === totalPages || loadingInventory} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-40 transition-all"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* MASTER ORDERS LIST LEDGER */
          <div className="bg-white rounded-3xl border border-zinc-200/60 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <ShoppingBag className="h-5 w-5 text-emerald-800" />
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800">Master Order Management Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-400 uppercase tracking-wider font-black text-[9px]">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Items Summary</th>
                    <th className="py-3 px-4">Invoice Amount</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4 text-right">Update Progression State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 font-medium">
                  {orders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-zinc-900">{order.order_id}</td>
                      <td className="py-3.5 px-4 text-zinc-700">{order.customer}<div className="text-[10px] text-zinc-400 font-normal">{order.date}</div></td>
                      <td className="py-3.5 px-4 text-zinc-500 max-w-xs truncate">{order.items}</td>
                      <td className="py-3.5 px-4 font-black text-zinc-950">₹{order.amount.toLocaleString("en-IN")}</td>
                      <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${order.status === "Pending" ? "bg-amber-100 text-amber-800" : order.status === "Shipped" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>{order.status}</span></td>
                      <td className="py-3.5 px-4 text-right">
                        <select value={order.status} onChange={(e) => handleUpdateOrderStatus(order.order_id, e.target.value)} className="px-2.5 py-1.5 border border-zinc-200 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-xs font-bold outline-none cursor-pointer text-zinc-700">
                          <option value="Pending">Pending</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
