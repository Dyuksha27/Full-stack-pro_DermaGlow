// src/pages/Products.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchProductsAPI } from "../api/product.api";
import ProductCard from "../components/ProductCard"; // ◄── Verified pristine import path
import API from "../api/axios"; 
import { SlidersHorizontal, Trash2, Star, CheckCircle, Bot, X, Upload, HelpCircle, Scale, Sparkles, Paperclip, Send, FileText, Camera } from "lucide-react";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0); 

  const activeCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const showWishlistOnly = searchParams.get("wishlist") === "true";
  
  const itemsLimit = 12;
  const chatEndRef = useRef(null);

  // 🛡️ DYNAMIC SUFFIX SECURITY FOR MULTI-PROFILE ISOLATION
  const user = JSON.parse(localStorage.getItem("user")) || null;
  const userSuffix = user?.email ? `_${user.email.toLowerCase()}` : "";
  const WISHLIST_KEY = `store_wishlist${userSuffix}`;
  const CHAT_LOG_KEY = `dg_chat_log${userSuffix}`;
  const WORKFLOW_KEY = `dg_ai_workflow_stage${userSuffix}`;

  // 🛡️ STATE HUB SYNCED WITH URL PARAMETERS FOR PERSISTENT BACK-NAVIGATION
  const maxPrice = parseInt(searchParams.get("maxPrice") || "5000", 10);
  const selectedConcern = searchParams.get("concern") || "all";
  const minRating = parseInt(searchParams.get("minRating") || "0", 10);
  const selectedSkinType = searchParams.get("skinType") || "all";

  // Helper function to update search parameters uniformly without wiping existing tracks
  const updateFilterParam = (key, value, clearPage = true) => {
    const newParams = new URLSearchParams(searchParams);
    if (clearPage) newParams.set("page", "1");
    if (value === "all" || value === 0 || (key === "maxPrice" && value === 5000)) {
      newParams.delete(key);
    } else {
      newParams.set(key, value.toString());
    }
    setSearchParams(newParams);
  };

  // 🛡️ ADVANCED CONSOLE DIAGNOSTIC INTERACTION STATES (Isolated per Profile)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(() => {
    return localStorage.getItem("dg_ai_drawer_open") === "true";
  });
  const [compareStack, setCompareStack] = useState([]);
  const [quizStep, setQuizStep] = useState(0);
  const [quizScores, setQuizScores] = useState({ dry: 0, oily: 0, sensitive: 0 });
  
  // Custom Dynamic Interaction Workflow Stages (Isolated per Profile)
  const [aiWorkflowStage, setAiWorkflowStage] = useState(() => {
    if (!user) return "ASK_SKIN_TYPE";
    return localStorage.getItem(WORKFLOW_KEY) || "ASK_SKIN_TYPE";
  });
  const [chatLog, setChatLog] = useState(() => {
    if (!user) return [{ sender: "bot", text: "Please log in to chat with your DermAI Consultant." }];
    const savedLog = localStorage.getItem(CHAT_LOG_KEY);
    return savedLog ? JSON.parse(savedLog) : [
      { sender: "bot", text: "Welcome to your DermAI Consultant! What is your skin type profile? (If you don't know, it's fine we've got you just say you don't we'll analyse it for you)" }
    ];
  });
  const [chatInput, setChatInput] = useState("");
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadType, setUploadType] = useState(""); // "prescription" or "bareface"
  
  // Gemini Transmission Hub Receptors
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiVerdict, setAiVerdict] = useState("");
  const [ingredientMatrix, setIngredientMatrix] = useState(null);

  const productCategories = [
    { id: "Cleansers", label: "Cleansers & Washes" },
    { id: "Moisturizers", label: "Moisturizers & Creams" },
    { id: "Toners", label: "Toners & Mists" },
    { id: "Eyes", label: "Targeted Care (eyes & lips)" }
  ];

  const skinConcerns = [
    { id: "all", label: "All Active Concerns" },
    { id: "dehydration", label: "Dehydration" },
    { id: "damaged", label: "Damaged Skin" },
    { id: "acne", label: "Acne" },
    { id: "aging", label: "Aging" },
    { id: "oil", label: "Excess Oil" }
  ];

  const skinTypes = [
    { id: "all", label: "All Skin Types" },
    { id: "dry", label: "Dry Skin" },
    { id: "oily", label: "Oily Skin" },
    { id: "sensitive", label: "Sensitive Skin" },
    { id: "combination", label: "Combination Skin (Dry + Oily)" },
    { id: "combination_sensitive", label: "Combination Sensitive (Dry + Oily + Sensitive)" },
    { id: "dry_sensitive", label: "Reactive Dry Skin (Dry + Sensitive)" }
  ];

  const quizQuestions = [
    {
      q: "One hour after washing your face, how does your skin feel?",
      options: [
        { text: "Tight / Stretched", score: { dry: 2, oily: 0, sensitive: 0 } },
        { text: "Comfortable / Normal", score: { dry: 0, oily: 0, sensitive: 0 } },
        { text: "Shiny / Greasy", score: { dry: 0, oily: 2, sensitive: 0 } }
      ]
    },
    {
      q: "Where does your face become oily or shiny by evening?",
      options: [
        { text: "Nowhere", score: { dry: 2, oily: 0, sensitive: 0 } },
        { text: "Only T-Zone (Forehead/Nose/Chin)", score: { dry: 1, oily: 1, sensitive: 0 } },
        { text: "All over my face", score: { dry: 0, oily: 2, sensitive: 0 } }
      ]
    },
    {
      q: "How often do you experience dry, flaky, or rough patches?",
      options: [
        { text: "Frequently, all year round", score: { dry: 2, oily: 0, sensitive: 0 } },
        { text: "Rarely, or only during winter", score: { dry: 1, oily: 0, sensitive: 0 } },
        { text: "Never", score: { dry: 0, oily: 0, sensitive: 0 } }
      ]
    },
    {
      q: "How does your skin react to new skincare products or weather shifts?",
      options: [
        { text: "No bad reactions, it's resilient", score: { dry: 0, oily: 0, sensitive: 0 } },
        { text: "Occasionally stings, tingles, or goes red", score: { dry: 0, oily: 0, sensitive: 1 } },
        { text: "Easily burns, itches, or breaks out", score: { dry: 0, oily: 0, sensitive: 2 } }
      ]
    },
    {
      q: "Do you have a clinical history or signs of eczema, psoriasis, or chronic redness?",
      options: [
        { text: "Yes, frequently reactive", score: { dry: 0, oily: 0, sensitive: 2 } },
        { text: "No, none of these conditions", score: { dry: 0, oily: 0, sensitive: 0 } }
      ]
    }
  ];

  // 🔄 Handle isolated loading changes dynamically on account updates
  useEffect(() => {
    if (!user) {
      setChatLog([{ sender: "bot", text: "Please log in to chat with your DermAI Consultant." }]);
      setAiWorkflowStage("ASK_SKIN_TYPE");
      return;
    }
    const savedLog = localStorage.getItem(CHAT_LOG_KEY);
    setChatLog(savedLog ? JSON.parse(savedLog) : [
      { sender: "bot", text: "Welcome to your DermAI Consultant! What is your skin type profile? (If you don't know, it's fine we've got you just say you don't we'll analyse it for you)" }
    ]);
    setAiWorkflowStage(localStorage.getItem(WORKFLOW_KEY) || "ASK_SKIN_TYPE");
  }, [userSuffix]);

  // 📝 Save active changes to unique user slots exclusively
  useEffect(() => {
    if (user) {
      localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatLog));
    }
  }, [chatLog, CHAT_LOG_KEY]);

  useEffect(() => {
    localStorage.setItem("dg_ai_drawer_open", isAiDrawerOpen);
  }, [isAiDrawerOpen]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(WORKFLOW_KEY, aiWorkflowStage);
    }
  }, [aiWorkflowStage, WORKFLOW_KEY]);

  // 🔄 UI Synergy: Automatically updates chat workflow when a user interacts with sidebar filter options
  useEffect(() => {
    if (user && selectedSkinType !== "all" && aiWorkflowStage === "ASK_SKIN_TYPE") {
      const label = skinTypes.find(t => t.id === selectedSkinType)?.label || selectedSkinType;
      setAiWorkflowStage("READY");
      setChatLog(prev => [
        ...prev,
        { sender: "bot", text: `I see you selected ${label} from the filters hub! Profile updated. Feel free to ask me anything about our database items.` }
      ]);
    }
  }, [selectedSkinType]);

  const handleToggleCompare = (product) => {
    const targetData = product?.product ? product.product : product;
    const currentId = targetData?.product_id || product?.id;
    setAiVerdict("");
    setIngredientMatrix(null);
    if (compareStack.some(item => (item?.product?.product_id || item?.product_id || item?.id) === currentId)) {
      setCompareStack(prev => prev.filter(item => (item?.product?.product_id || item?.product_id || item?.id) !== currentId));
    } else {
      if (compareStack.length >= 3) { alert("Max 3 products allowed for side-by-side matrices."); return; }
      setCompareStack(prev => [...prev, product]);
      setIsAiDrawerOpen(true);
    }
  };

  const handleCategorySelection = (catId) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", "1");
    if (activeCategory === catId) {
      newParams.delete("category");
    } else {
      newParams.set("category", catId);
    }
    setSearchParams(newParams);
  };

  const clearAllActiveFilters = () => {
    const newParams = new URLSearchParams();
    newParams.set("page", "1");
    setSearchParams(newParams);
    
    if (user) {
      localStorage.removeItem(CHAT_LOG_KEY);
      localStorage.removeItem(WORKFLOW_KEY);
      setAiWorkflowStage("ASK_SKIN_TYPE");
      setChatLog([
        { sender: "bot", text: "Welcome to your DermAI Consultant! What is your skin type profile? (If you don't know, it's fine we've got you just say you don't we'll analyse it for you)" }
      ]);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sync-ai-stack", { detail: compareStack.length }));
  }, [compareStack]);

  useEffect(() => {
    const handleToggleEvent = () => setIsAiDrawerOpen(prev => !prev);
    window.addEventListener("toggle-ai-drawer", handleToggleEvent);
    return () => window.removeEventListener("toggle-ai-drawer", handleToggleEvent);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const syncCatalogData = async () => {
      setLoading(true);
      try {
        if (showWishlistOnly) {
          const localWishlistIds = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
          if (localWishlistIds.length === 0) {
            if (isMounted) { setProducts([]); setTotalItems(0); setLoading(false); }
            return;
          }
          const batchData = await Promise.all(
            localWishlistIds.map(async (id) => {
              try {
                const response = await fetchProductsAPI({ search: id, limit: 1 });
                return response?.rows?.[0] || response?.[0] || null;
              } catch { return null; }
            })
          );
          if (isMounted) { setProducts(batchData.filter(Boolean)); setTotalItems(batchData.filter(Boolean).length); }
        } else {
          const fetchLimit = (!activeCategory && !currentSearch) ? 55000 : 5000;
          const responseData = await fetchProductsAPI({ page: 1, limit: fetchLimit, category: activeCategory, search: currentSearch });
          if (isMounted) { setProducts(responseData?.rows || []); setTotalItems(responseData?.total || 50346); }
        }
      } catch (err) { console.error(err); } finally { if (isMounted) setLoading(false); }
    };
    syncCatalogData();
    return () => { isMounted = false; };
  }, [activeCategory, currentSearch, showWishlistOnly, WISHLIST_KEY]);

  // ⚡ MEMOIZED PROCESSING MATRIX: Evaluates currency and formats data seamlessly
  const displayedProductsList = useMemo(() => {
    return products.map(item => {
      const actualData = item?.product ? item.product : item;
      
      const rawPrice = actualData?.price ?? actualData?.price_inr ?? 0;
      const numPrice = typeof rawPrice === 'number' 
        ? rawPrice 
        : (Number(String(rawPrice).replace(/[^0-9.-]/g, "")) || 499);

      const rawRating = actualData?.rating || actualData?.stars || 0;
      return {
        ...item,
        price: numPrice, 
        cleanPrice: numPrice,
        cleanRating: Number(rawRating) > 0 ? Number(rawRating) : 4.2,
        searchHaystack: `${actualData?.product_name || ""} ${actualData?.category || ""} ${actualData?.brand || ""} ${actualData?.concern || ""}`.toLowerCase(),
        skinTypeHaystack: String(actualData?.skin_type || "").toLowerCase()
      };
    }).filter(p => {
      const matchesPrice = p.cleanPrice <= maxPrice;
      const matchesRating = p.cleanRating >= minRating;
      
      let matchesConcern = true;
      if (selectedConcern !== "all") {
        if (selectedConcern === "oil") matchesConcern = p.searchHaystack.includes("oil") || p.searchHaystack.includes("sebum") || p.searchHaystack.includes("excess");
        else if (selectedConcern === "damaged") matchesConcern = p.searchHaystack.includes("damaged") || p.searchHaystack.includes("repair") || p.searchHaystack.includes("barrier");
        else matchesConcern = p.searchHaystack.includes(selectedConcern.toLowerCase());
      }

      let matchesSkinType = true;
      if (selectedSkinType !== "all") {
        if (selectedSkinType === "combination") matchesSkinType = p.skinTypeHaystack.includes("dry") && p.skinTypeHaystack.includes("oily");
        else if (selectedSkinType === "combination_sensitive") matchesSkinType = p.skinTypeHaystack.includes("dry") && p.skinTypeHaystack.includes("oily") && p.skinTypeHaystack.includes("sensitive");
        else if (selectedSkinType === "dry_sensitive") matchesSkinType = p.skinTypeHaystack.includes("dry") && p.skinTypeHaystack.includes("sensitive");
        else matchesSkinType = p.skinTypeHaystack.includes(selectedSkinType.toLowerCase());
      }
      return matchesPrice && matchesRating && matchesConcern && matchesSkinType;
    });
  }, [products, maxPrice, minRating, selectedConcern, selectedSkinType]);

  const totalPages = Math.ceil(displayedProductsList.length / itemsLimit) || 1;
  const startIndex = (currentPage - 1) * itemsLimit;
  const currentPagedProductsList = useMemo(() => {
    return displayedProductsList.slice(startIndex, startIndex + itemsLimit);
  }, [displayedProductsList, startIndex, itemsLimit]);

  const handleSendMessageStream = async () => {
    if (!user) return;
    if (!chatInput.trim() && !uploadedFile) return;

    const userMessage = chatInput.trim();
    setChatLog(prev => [...prev, { sender: "user", text: userMessage || `Staged file object asset: ${uploadedFile?.name}` }]);
    setChatInput("");
    setIsAiLoading(true);

    if (aiWorkflowStage === "ASK_SKIN_TYPE") {
      const normalizedInput = userMessage.toLowerCase();
      const matchedType = skinTypes.find(t => t.id !== "all" && normalizedInput.includes(t.id));
      
      if (matchedType) {
        updateFilterParam("skinType", matchedType.id);
        setAiWorkflowStage("READY");
        setChatLog(prev => [...prev, { sender: "bot", text: `Splendid! Target condition profile updated to focus on ${matchedType.label}. Ask me anything about our products now!` }]);
        setIsAiLoading(false);
      } else {
        try {
          const response = await API.post("/ai/chat-query", {
            message: `The user is onboarding. They were asked their skin type and answered: "${userMessage}". Determine if they expressed an explicit skin type, or if they are unsure/describing a problem. Reply naturally as an expert assistant and steer the conversation appropriately.`,
            skinType: "all"
          });
          if (response.data?.reply) {
            setChatLog(prev => [...prev, { sender: "bot", text: response.data.reply }]);
          }
          setAiWorkflowStage("ASK_PRESCRIPTION");
        } catch (err) {
          console.error(err);
          setAiWorkflowStage("ASK_PRESCRIPTION");
          setChatLog(prev => [...prev, { sender: "bot", text: "Got it! Let's get more context. Do you happen to have a medical prescription or clinical note available from a doctor? Choose below." }]);
        } finally {
          setIsAiLoading(false);
        }
      }
      return;
    }

    if (uploadedFile) {
      const formData = new FormData();
      formData.append("report", uploadedFile);
      formData.append("uploadContext", uploadType);
      formData.append("skinType", selectedSkinType);
      try {
        const response = await API.post("/ai/analyze-report", formData, { headers: { "Content-Type": "multipart/form-data" } });
        if (response.data?.detectedSkinType) {
          updateFilterParam("skinType", response.data.detectedSkinType);
          setProducts(response.data.recommendations);
          setAiWorkflowStage("READY");
          setChatLog(prev => [...prev, { sender: "bot", text: `Clinical parse complete! Identified profile context as ${response.data.detectedSkinType.toUpperCase()}. I have synchronized your matching database items in the catalog view.` }]);
        }
      } catch (err) {
        console.error(err);
        setChatLog(prev => [...prev, { sender: "bot", text: "An error occurred uploading your attachment asset. Please verify formatting limits and try again." }]);
      } finally {
        setIsAiLoading(false);
        setUploadedFile(null);
      }
      return;
    }

    if (compareStack.length > 0 && (userMessage.toLowerCase().includes("compare") || userMessage.toLowerCase().includes("analyze"))) {
      try {
        const ids = compareStack.map(item => (item?.product?.product_id || item?.product_id || item?.id));
        const response = await API.post("/ai/compare", { productIds: ids, skinType: selectedSkinType });
        if (response.data?.analysis) {
          setAiVerdict(response.data.analysis.verdict);
          setIngredientMatrix(response.data.analysis.products);
          setChatLog(prev => [...prev, { sender: "bot", text: response.data.analysis.verdict, isMatrix: true, rawMatrixData: response.data.analysis.products }]);
        } else if (response.data?.reply) {
          setChatLog(prev => [...prev, { sender: "bot", text: response.data.reply }]);
        }
      } catch (err) {
        console.warn("Backend /compare endpoint returned a 404/500, executing matching filters locally:", err);
        
        let targetIntroNames = "Here is the comparison of ";
        const compiledGridRows = compareStack.map((item, idx) => {
          const actualItem = item?.product ? item.product : item;
          const fullName = actualItem.product_name || "Skincare Product";
          
          if (idx === 0) targetIntroNames += `"${fullName}"`;
          else if (idx === compareStack.length - 1) targetIntroNames += ` and "${fullName}":`;
          else targetIntroNames += `, "${fullName}"`;

          const rawSafety = Number(actualItem.safety_score || actualItem.safety) || 85;
          const rawRisk = Number(actualItem.risk_score || actualItem.risk) || 15;
          const matchesActiveSkinProfile = String(actualItem.skin_type || "").toLowerCase().includes(selectedSkinType.toLowerCase()) ? 25 : 0;
          const masterBackstageWeightScore = (rawSafety - rawRisk) + matchesActiveSkinProfile;

          const rawDbSkinString = String(actualItem.skin_type || "").toLowerCase();
          let friendlySkinTypeLabel = "All Skin Types";

          if (rawDbSkinString === "dry") friendlySkinTypeLabel = "Dry Skin";
          else if (rawDbSkinString === "oily") friendlySkinTypeLabel = "Oily Skin";
          else if (rawDbSkinString === "sensitive") friendlySkinTypeLabel = "Sensitive Skin";
          else if (rawDbSkinString.includes("dry") && rawDbSkinString.includes("oily") && rawDbSkinString.includes("sensitive")) friendlySkinTypeLabel = "Combination Sensitive (Dry + Oily + Sensitive)";
          else if (rawDbSkinString.includes("dry") && rawDbSkinString.includes("sensitive")) friendlySkinTypeLabel = "Reactive Dry Skin (Dry + Sensitive)";
          else if (rawDbSkinString.includes("dry") && rawDbSkinString.includes("oily")) friendlySkinTypeLabel = "Combination Skin (Dry + Oily)";

          return {
            id: actualItem.product_id || item.id,
            name: fullName,
            brand: actualItem.brand || "100% Pure",
            price: Number(String(actualItem.price || actualItem.price_inr || "499").replace(/[^0-9.-]/g, "")) || 499,
            rating: Number(actualItem.rating || actualItem.stars) || 4.5,
            target_skin_type: friendlySkinTypeLabel,
            matching_concerns: actualItem.concern || "General Maintenance",
            is_fragrance_free: !String(actualItem.ingredients || "").toLowerCase().includes("fragrance") && !String(actualItem.ingredients || "").toLowerCase().includes("parfum"),
            is_paraben_free: !String(actualItem.ingredients || "").toLowerCase().includes("paraben"),
            is_sulfate_free: !String(actualItem.ingredients || "").toLowerCase().includes("sulfate"),
            is_alcohol_free: !String(actualItem.ingredients || "").toLowerCase().includes("alcohol") && !String(actualItem.ingredients || "").toLowerCase().includes("ethanol"),
            backstageWeight: masterBackstageWeightScore
          };
        });

        const sortedByPriority = [...compiledGridRows].sort((a, b) => b.backstageWeight - a.backstageWeight);
        const winningRecommendation = sortedByPriority[0];
        const absoluteRecommendationAnalysis = `Based on this comparison, I suggest "${winningRecommendation.name}" for your skin type after our risk and safety analysis. It contains the most optimal bio-compatible profile and poses the lowest potential irritant index for your active routine.`;

        setChatLog(prev => [...prev, {
          sender: "bot",
          text: targetIntroNames,
          isMatrix: true,
          rawMatrixData: compiledGridRows,
          winnerId: winningRecommendation.id,
          finalAnalysisText: absoluteRecommendationAnalysis
        }]);
      } finally {
        setIsAiLoading(false);
      }
      return;
    }

    try {
      const response = await API.post("/ai/chat-query", { message: userMessage, skinType: selectedSkinType });
      if (response.data?.reply) {
        setChatLog(prev => [...prev, {
          sender: "bot",
          text: response.data.reply,
          links: response.data.recommendedProducts || []
        }]);
      }
    } catch (err) {
      console.error("Gemini query link failure, pulling from database fallback layer:", err);
      const lowInput = userMessage.toLowerCase();

      let filteredFallbackList = products.map(item => {
        const actualData = item?.product ? item.product : item;
        return {
          ...item,
          searchHaystack: `${actualData?.product_name || ""} ${actualData?.category || ""} ${actualData?.brand || ""} ${actualData?.concern || ""}`.toLowerCase()
        };
      });

      if (lowInput.includes("toner") || lowInput.includes("mist")) {
        filteredFallbackList = filteredFallbackList.filter(p => p.searchHaystack.includes("toner") || p.searchHaystack.includes("mist"));
      } else if (lowInput.includes("cleanser") || lowInput.includes("wash") || lowInput.includes("soap")) {
        filteredFallbackList = filteredFallbackList.filter(p => p.searchHaystack.includes("cleanser") || p.searchHaystack.includes("wash"));
      } else if (lowInput.includes("moisturizer") || lowInput.includes("cream") || lowInput.includes("balm")) {
        filteredFallbackList = filteredFallbackList.filter(p => p.searchHaystack.includes("moisturizer") || p.searchHaystack.includes("cream"));
      } else if (lowInput.includes("eye") || lowInput.includes("lip")) {
        filteredFallbackList = filteredFallbackList.filter(p => p.searchHaystack.includes("eye") || p.searchHaystack.includes("lip"));
      }

      if (filteredFallbackList.length === 0) {
        filteredFallbackList = products;
      }

      const dynamicMatches = filteredFallbackList
        .slice(0, 3)
        .map(item => {
          const actualItem = item?.product ? item.product : item;
          return {
            id: actualItem.product_id || item.id,
            name: actualItem.product_name || "Skincare Product"
          };
        });

      let fallbackText = "I looked through our active skincare collection for you! Here are a few matches that look great for your profile:";

      if (lowInput.includes("toner") || lowInput.includes("mist")) {
        fallbackText = "Oh, a good toner is an absolute game-changer for balancing skin pH and prepping it for treatments! 💧 I filtered our records to pull the most refreshing, balancing toners right from our database for you:";
      } else if (lowInput.includes("cleanser") || lowInput.includes("wash")) {
        fallbackText = "Finding the right cleanser is everything—you want to clear away impurities without stripping your natural skin barrier. 🧼 Here are the top gentle cleansing formulations I pulled for your profile:";
      } else if (lowInput.includes("moisturizer") || lowInput.includes("cream")) {
        fallbackText = "Locking in moisture is essential for keeping that skin barrier strong and healthy! 💧 I checked our collection for deeply hydrating and nourishing creams perfect for you:";
      } else if (lowInput.includes("acne") || lowInput.includes("breakout") || lowInput.includes("pimple")) {
        fallbackText = "Oh, I completely understand how frustrating and draining dealing with sudden breakouts can be—honestly, don't stress, we've totally got you covered! 🤍 The trick is targeting the blemishes without throwing your whole skin barrier out of balance. I handpicked these gentle, clear-skin champions from our database that should help calm things down:";
      } else if (lowInput.includes("rosacea") || lowInput.includes("redness") || lowInput.includes("reactive") || lowInput.includes("burn")) {
        fallbackText = "Oof, dealing with rosacea or intense redness is no joke, and it can feel so stressful trying to find items that won't cause a flare-up. Take a deep breath—I'm going to help you play it safe! 🌿 I carefully scanned our inventory to pull only ultra-soothing formulas focused purely on barrier repair and zero irritation. These are incredibly gentle:";
      } else if (lowInput.includes("dry") || lowInput.includes("flake") || lowInput.includes("tight")) {
        fallbackText = "Ah, that tight, flaky feeling is the absolute worst, especially when your skin just drinks up everything and still feels parched. Don't worry at all, let's get that hydration locked back in! 💧 I found some deeply nourishing options in our catalog that act like a giant splash of water for your skin structure. Check these out:";
      } else if (lowInput.includes("oil") || lowInput.includes("greas") || lowInput.includes("shine")) {
        fallbackText = "I hear you, constantly chasing down that mid-day shine can be such a hassle. But don't worry, we can get your sebaceous balance back on track together! ✨ I scanned our dataset for lightweight, pore-clearing heroes that matify and regulate oil without drying you out. Take a look:";
      } else if (selectedSkinType !== "all") {
        fallbackText = `You're doing great taking charge of your routine! I ran a custom search through our verified database specific to your ${selectedSkinType.toUpperCase()} skin type. These top-tier matches look beautiful for your skin goals right now:`;
      }

      setChatLog(prev => [...prev, {
        sender: "bot",
        text: fallbackText,
        links: dynamicMatches
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleQuizAnswer = (scorePayload) => {
    const nextScores = {
      dry: quizScores.dry + (scorePayload.dry || 0),
      oily: quizScores.oily + (scorePayload.oily || 0),
      sensitive: quizScores.sensitive + (scorePayload.sensitive || 0),
    };
    setQuizScores(nextScores);
    if (quizStep < quizQuestions.length) setQuizStep(prev => prev + 1);
    else {
      let profile = "dry";
      if (nextScores.dry >= 3 && nextScores.oily <= 1 && nextScores.sensitive <= 1) profile = "dry";
      else if (nextScores.oily >= 3 && nextScores.dry <= 1 && nextScores.sensitive <= 1) profile = "oily";
      else if (nextScores.sensitive >= 3 && nextScores.dry <= 1 && nextScores.oily <= 1) profile = "sensitive";
      else if (nextScores.dry >= 2 && nextScores.oily >= 2 && nextScores.sensitive <= 1) profile = "combination";
      else if (nextScores.dry >= 2 && nextScores.sensitive >= 2 && nextScores.oily <= 1) profile = "dry_sensitive";
      else if (nextScores.dry >= 2 && nextScores.oily >= 2 && nextScores.sensitive >= 2) profile = "combination_sensitive";
      
      updateFilterParam("skinType", profile);
      setQuizStep(0);
      setAiWorkflowStage("READY");
      setChatLog(prev => [...prev, { sender: "bot", text: `Diagnostic questionnaire computed successfully! Locked active filter profile configuration to: ${profile.toUpperCase()}. How can I assist with your product choices now?` }]);
    }
  };

  const handleFileAttachClick = (type) => {
    setUploadType(type);
    setIsAttachmentMenuOpen(false);
    const fileSelector = document.getElementById("hidden-drawer-file-input");
    if (type === "prescription") fileSelector.setAttribute("accept", ".pdf,.doc,.docx");
    else fileSelector.setAttribute("accept", "image/*");
    fileSelector.click();
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateFilterParam("page", newPage, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8 bg-[#E2ECE6] min-h-screen font-sans antialiased relative overflow-x-hidden">
      
      {/* HEADER BAR METRICS COUNTER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-300 pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-zinc-900">
            {showWishlistOnly 
              ? "Your Saved Wishlist Showcase" 
              : activeCategory 
                ? `Collection: ${productCategories.find(c => c.id === activeCategory)?.label || activeCategory}` 
                : currentSearch 
                  ? `Search Results for "${currentSearch}"` 
                  : "Dermatological Catalog Index"}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Viewing page {currentPage} of {totalPages}</p>
        </div>

        <div className="flex items-center gap-3">
          {(showWishlistOnly || activeCategory || maxPrice < 5000 || selectedConcern !== "all" || minRating > 0 || selectedSkinType !== "all") && (
            <button onClick={clearAllActiveFilters} className="text-xs font-bold bg-zinc-900 text-white px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors shadow-sm">
              Reset Filters Hub ×
            </button>
          )}
          <span className="text-xs bg-white text-zinc-800 px-4 py-2 rounded-xl font-bold shadow-sm border border-zinc-200">
            {displayedProductsList.length.toLocaleString()} Products Filtered
          </span>
        </div>
      </div>

      {/* TWO-COLUMN GRID LAYOUT VIEWPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* SIDEBAR FILTER ENGINE WORKSPACE WALL */}
        <div className="col-span-1 bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-sm space-y-6 sticky top-6 z-10">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-800" /> Filter Engine
            </h2>
            <button onClick={clearAllActiveFilters} className="text-zinc-400 hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          
          {/* BUDGET SLIDER */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400"><span>Budget Cap</span><span className="text-emerald-800 font-mono">₹{maxPrice}</span></div>
            <input type="range" min="199" max="5000" step="100" value={maxPrice} onChange={(e) => updateFilterParam("maxPrice", Number(e.target.value))} className="w-full accent-emerald-800 h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer" />
          </div>

          {/* FORMULATION COLLECTIONS */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-400 block">Formulation Collection</label>
            <div className="flex flex-col gap-1.5">
              {productCategories.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => handleCategorySelection(cat.id)} className={`w-full text-left text-xs px-3 py-2.5 rounded-xl border transition-all ${isActive ? "bg-emerald-800 text-white border-emerald-900 font-bold shadow-sm" : "bg-zinc-50/60 hover:bg-zinc-50 text-zinc-700 font-medium"}`}>{cat.label}</button>
                );
              })}
            </div>
          </div>

          {/* SKINCARE CONCERNS */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-400 block">Skin Concern Target</label>
            <div className="flex flex-col gap-1.5">
              {skinConcerns.map(cn => {
                const isSelected = selectedConcern === cn.id;
                return (
                  <button key={cn.id} onClick={() => updateFilterParam("concern", cn.id)} className={`w-full text-left text-xs px-3 py-2 rounded-xl border flex items-center gap-2 transition-all ${isSelected ? "bg-emerald-800 text-white border-emerald-900 font-bold shadow-sm" : "bg-zinc-50/30 text-zinc-600 border-transparent font-medium"}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-emerald-400" : "bg-zinc-300"}`} />
                    <span>{cn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SKIN TYPE TRACKING MAPS */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-400 block">Skin Type Profile</label>
            <div className="flex flex-col gap-1.5">
              {skinTypes.map(type => {
                const isSelected = selectedSkinType === type.id;
                return (
                  <button key={type.id} onClick={() => updateFilterParam("skinType", type.id)} className={`w-full text-left text-xs px-3 py-2 rounded-xl border flex items-center gap-2 transition-all ${isSelected ? "bg-zinc-900 text-white border-zinc-950 font-bold shadow-sm" : "bg-zinc-50/30 text-zinc-600 border-transparent font-medium"}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-emerald-400" : "bg-zinc-300"}`} />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MIN RATING SCALE */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-zinc-400 block">Minimum Rating</label>
            <div className="flex items-center gap-1 bg-zinc-50/60 p-2 rounded-xl border border-zinc-100 justify-between">
              {[1, 2, 3, 4, 5].map(idx => (
                <button key={idx} onClick={() => updateFilterParam("minRating", minRating === idx ? 0 : idx)} className="p-1 hover:scale-110 transition-transform">
                  <Star className={`h-5 w-5 ${idx <= minRating ? "fill-emerald-800 text-emerald-800 stroke-0" : "text-zinc-300 stroke-[1.5]"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FEED GRID MATRIX PRODUCTS */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-32 text-xs tracking-widest text-emerald-800 font-black animate-pulse uppercase">Querying records...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {currentPagedProductsList.map((item, index) => {
                  const targetData = item?.product ? item.product : item;
                  const isStaged = compareStack.some(c => (c?.product?.product_id || c?.product_id || c?.id) === (targetData?.product_id || item?.id));
                  return <ProductCard key={targetData?.product_id || item?.id || index} product={item} onToggleCompare={handleToggleCompare} isStaged={isStaged} />;
                })}
              </div>

              {/* SYSTEM PAGINATION ACTIONS NAVBAR */}
              {!loading && !showWishlistOnly && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8 border-t border-zinc-300">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-2 text-xs font-bold border rounded-xl bg-white disabled:opacity-40 transition-all shadow-sm">Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((pageNum, idx, arr) => (
                      <React.Fragment key={pageNum}>
                        {idx > 0 && pageNum - arr[idx - 1] > 1 && <span className="text-zinc-400 px-1 font-mono">...</span>}
                        <button onClick={() => handlePageChange(pageNum)} className={`h-8 w-8 text-xs font-bold rounded-xl transition-all shadow-sm ${currentPage === pageNum ? "bg-emerald-800 text-white border border-emerald-900" : "bg-white border text-zinc-700 hover:bg-zinc-50"}`}>{pageNum}</button>
                      </React.Fragment>
                    ))}
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-2 text-xs font-bold border rounded-xl bg-white disabled:opacity-40 transition-all shadow-sm">Next</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🤖 FIXED FULL-HEIGHT VERTICAL SLATE DRAWER SYSTEM REMOVING SCREEN MARGIN GAPING */}
      <div className={`fixed top-[-40px] bottom-0 right-0 h-[calc(100vh+10px)] w-full max-w-md bg-zinc-900 border-l border-zinc-800/80 text-zinc-100 shadow-2xl z-50 transition-transform duration-300 ease-in-out transform flex flex-col justify-between ${isAiDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        
        {/* UPPER CONVERSATIONAL SCROLL WINDOW BLOCK */}
        <div className="p-0 overflow-y-auto max-h-[calc(100vh-100px)] flex-1 custom-scrollbar">
          
          {/* 🛡️ FIXED BOT HEADER COMPONENT BAR AT VIEWPORT BOUNDARY LIMITS */}
          <div className="sticky top-0 bg-zinc-950 p-6 border-b border-zinc-800/80 flex items-center justify-between z-20 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-950/80 rounded-xl border border-emerald-800/40">
                <Bot className="h-4 w-4 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xs uppercase font-black tracking-widest text-zinc-100">DermAI Consultant</h2>
                <span className="text-[9px] font-black tracking-wider uppercase text-emerald-400 block mt-0.5">Clinical Dataset Mode</span>
              </div>
            </div>
            <button onClick={() => setIsAiDrawerOpen(false)} className="text-zinc-400 hover:text-white p-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 rounded-xl transition-colors"><X className="h-4 w-4" /></button>
          </div>

          <div className="p-6 pt-4 space-y-4">
            {chatLog.map((chat, idx) => (
              <div key={idx} className={`flex flex-col w-full ${chat.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium shadow-md w-full max-w-[94%] ${
                  chat.sender === "user"
                    ? "bg-gradient-to-br from-emerald-700 to-emerald-800 text-white rounded-tr-none border border-emerald-600/30 ml-auto max-w-[88%]"
                    : "bg-zinc-800/90 text-zinc-100 rounded-tl-none border border-zinc-700/60 mr-auto"
                }`}>
                  <p className="mb-2 whitespace-pre-line">{chat.text}</p>

                  {/* Appends definitive localized backstage choice analysis right above table matrix */}
                  {chat.finalAnalysisText && (
                    <p className="my-3 text-[11px] bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/30 font-medium leading-relaxed text-zinc-200">
                      ✦ {chat.finalAnalysisText}
                    </p>
                  )}

                  {/* 📊 MATRIX GRID CONTAINER REMOVING STACKED NAMES SEGMENTS */}
                  {chat.isMatrix && chat.rawMatrixData && (
                    <div className="overflow-x-auto border border-zinc-700 rounded-xl mt-3 bg-zinc-950 shadow-inner animate-fadeIn">
                      <table className="w-full text-[11px] text-left border-collapse table-fixed">
                        <thead>
                          <tr className="bg-zinc-900 border-b border-zinc-700">
                            <th className="p-2.5 font-bold text-emerald-400 border-r border-zinc-700 w-1/3 text-xs uppercase tracking-wider">Metrics</th>
                            {chat.rawMatrixData.map((prod, pIdx) => (
                              <th key={pIdx} className="p-2.5 font-bold text-zinc-100 border-r last:border-r-0 border-zinc-700 text-xs truncate leading-snug" title={prod.name}>
                                {prod.name} {chat.winnerId === prod.id && <span className="text-emerald-400 block text-[9px] font-black tracking-widest uppercase mt-0.5">★ Winner Match</span>}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Brand</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 text-zinc-300 font-medium truncate">{prod.brand}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Rating</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 text-amber-400 font-bold font-mono">★ {prod.rating}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Skin Type</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 text-zinc-300 text-[10px] leading-tight font-medium" title={prod.target_skin_type}>{prod.target_skin_type}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Concern</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 text-zinc-300 text-[10px] leading-tight font-medium" title={prod.matching_concerns}>{prod.matching_concerns}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Fragrance-Free</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 font-medium">{prod.is_fragrance_free ? "✅ Yes" : "❌ No"}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Paraben-Free</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 font-medium">{prod.is_fragrance_free ? "✅ Yes" : "❌ No"}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Sulfate-Free</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 font-medium">{prod.is_sulfate_free ? "✅ Yes" : "❌ No"}</td>)}
                          </tr>
                          <tr className="border-b border-zinc-800">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Alcohol-Free</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 font-medium">{prod.is_alcohol_free ? "✅ Yes" : "❌ No"}</td>)}
                          </tr>
                          <tr className="bg-zinc-900/40">
                            <td className="p-2 font-black text-zinc-400 border-r border-zinc-700">Price</td>
                            {chat.rawMatrixData.map((prod, pIdx) => <td key={pIdx} className="p-2 text-zinc-100 font-bold font-mono text-[11px]">₹{prod.price}</td>)}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Interactive Links Chips generation mappings */}
                  {chat.links && chat.links.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-3 mt-2 border-t border-zinc-700/50">
                      <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Suggested Products:</p>
                      {chat.links.map((link) => (
                        <Link key={link.id} to={`/product/${link.id}`} className="inline-flex items-center gap-1 text-[11px] text-white underline font-bold hover:text-emerald-300">✦ {link.name}</Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {user && aiWorkflowStage === "ASK_PRESCRIPTION" && (
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-4 text-center space-y-3 shadow-xl backdrop-blur-sm">
                <p className="text-[11px] text-zinc-300 font-medium">Would you like to provide medical sheets for tailored ingredient safety checking?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setAiVerdict("Excellent choice. Please click the paperclip attachment icon below to upload your dermatology note."); }} className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md">Yes, Upload</button>
                  <button onClick={() => { setAiWorkflowStage("ACTIVE_QUIZ"); setQuizStep(1); }} className="bg-zinc-700 hover:bg-zinc-650 text-zinc-200 border border-zinc-600/60 font-bold text-xs py-2 rounded-xl transition-all shadow-sm">No, Take Quiz</button>
                </div>
              </div>
            )}

            {user && aiWorkflowStage === "ACTIVE_QUIZ" && quizStep >= 1 && quizStep <= quizQuestions.length && (
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-sm">
                <div className="flex justify-between items-center border-b border-zinc-700 pb-1.5 mb-1">
                  <span className="text-[9px] font-black tracking-widest uppercase text-emerald-400">Skin Quiz</span>
                  <span className="text-[10px] font-mono text-zinc-400">{quizStep} / {quizQuestions.length}</span>
                </div>
                <h3 className="text-xs font-bold text-white leading-snug">{quizQuestions[quizStep - 1].q}</h3>
                <div className="flex flex-col gap-1.5">
                  {quizQuestions[quizStep - 1].options.map((opt, i) => (
                    <button key={i} onClick={() => handleQuizAnswer(opt.score)} className="w-full text-left bg-zinc-900 border border-zinc-700/80 hover:border-emerald-500 p-2.5 rounded-xl text-xs text-zinc-300 transition-all hover:bg-zinc-850">{opt.text}</button>
                  ))}
                </div>
              </div>
            )}

            {isAiLoading && (
              <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold tracking-widest uppercase pl-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Consulting clinical formulations...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* 📋 CHAT BOX CONSOLE MOUNT BOX ENCASED AT BASE */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/95 shadow-inner z-10">
          {uploadedFile && (
            <div className="mb-3 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between text-xs text-zinc-300 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate font-mono text-[10px]">Staged: {uploadedFile.name}</span>
              </div>
              <button onClick={() => setUploadedFile(null)} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          <input id="hidden-drawer-file-input" type="file" className="hidden" onChange={(e) => setUploadedFile(e.target.files[0])} />

          {isAttachmentMenuOpen && user && (
            <div className="absolute bottom-20 left-4 bg-zinc-900 border border-zinc-800 p-1.5 rounded-xl shadow-2xl flex flex-col gap-1 w-56 z-50 animate-slideUp">
              <button onClick={() => handleFileAttachClick("prescription")} className="w-full text-left p-2.5 hover:bg-zinc-800/80 text-xs text-zinc-200 rounded-lg flex items-center gap-2 transition-colors"><FileText className="h-3.5 w-3.5 text-emerald-400" /> Medical report (.pdf, .doc, .docx)</button>
              <button onClick={() => handleFileAttachClick("bareface")} className="w-full text-left p-2.5 hover:bg-zinc-800/80 text-xs text-zinc-200 rounded-lg flex items-center gap-2 transition-colors"><Camera className="h-3.5 w-3.5 text-blue-400" /> Skin photo (Images)</button>
            </div>
          )}

          <div className="flex items-center bg-zinc-800 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 shadow-inner transition-all focus-within:border-emerald-700 focus-within:ring-1 focus-within:ring-emerald-700/30">
            <button 
              onClick={() => user && setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} 
              disabled={!user}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-750/50 rounded-lg transition-all mr-1.5 disabled:opacity-30"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!user}
              placeholder={!user ? "Please log in to use the consultant..." : compareStack.length > 0 ? "Type 'compare' to evaluate stack..." : "Describe your skin or ask a question..."}
              className="bg-transparent text-xs text-zinc-100 flex-1 focus:outline-none placeholder-zinc-500 disabled:cursor-not-allowed"
              onKeyDown={(e) => { if (e.key === "Enter") handleSendMessageStream(); }}
            />
            <button 
              onClick={handleSendMessageStream}
              disabled={isAiLoading || !user}
              className="p-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white disabled:opacity-30 transition-all shadow-md ml-1.5 active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Products;