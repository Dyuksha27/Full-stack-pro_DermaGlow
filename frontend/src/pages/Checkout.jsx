// src/pages/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";

const Checkout = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { token } = useAuth();

  const user = JSON.parse(localStorage.getItem("user")) || null;
  const currentEmail = user?.email ? user.email.toLowerCase() : "";
  const CART_CACHE_KEY = currentEmail ? `user_cart_cache_${currentEmail}` : "user_cart_cache";

  const [cart, setCart] = useState(() => {
    return JSON.parse(localStorage.getItem(CART_CACHE_KEY) || "[]");
  });
  
  // Custom Address Forms State Hooks for Indian Validation
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("New Delhi");
  const [pinCode, setPinCode] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    localStorage.removeItem("lock_switch_transition");

    if (!token) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
    }
  }, [token]);

  const subtotalPrice = cart.reduce((acc, item) => {
    const cleanItemPrice = item.price || item.price_inr || 0;
    const rawPrice = Number(String(cleanItemPrice).replace(/[^0-9.-]/g, ""));
    return acc + (rawPrice * item.quantity);
  }, 0);

  const deliveryFee = subtotalPrice >= 500 || subtotalPrice === 0 ? 0 : 99;
  const grandTotalPayable = subtotalPrice + deliveryFee;

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    // Validate 6-digit Indian PIN Code format before triggering payment networks
    if (!/^\d{6}$/.test(pinCode)) {
      setStatus({ type: "error", msg: "Please enter a valid 6-digit Indian Postal Pin Code." });
      return;
    }

    setIsProcessing(true);
    setStatus({ type: "loading", msg: "Initiating secure transaction channel..." });

    try {
      // 1. Generate secure transaction channel intents with the backend
      const intentResponse = await API.post("/payments/create-intent", { amount: grandTotalPayable });
      const { clientSecret } = intentResponse.data;

      // 2. Transmit details to Stripe. 
      // Stripe will automatically handle the mandatory RBI 3D-Secure OTP authentication redirect popup.
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${firstName} ${lastName}`.trim() || user?.name || "Customer Profile",
            email: currentEmail,
            address: {
              line1: address,
              city: city,
              postal_code: pinCode,
              country: "IN", // Locked to India regional parameters
            }
          },
        },
      });

      if (result.error) {
        setStatus({ type: "error", msg: result.error.message });
        setIsProcessing(false);
      } else if (result.paymentIntent.status === "succeeded") {
        // 3. Clear shopping cache parameters and submit a formal order model
        await API.post("/orders/create", {
          transactionId: result.paymentIntent.id,
          amount: grandTotalPayable,
          items: cart,
          shippingAddress: { firstName, lastName, address, city, pinCode }
        });

        setStatus({ type: "success", msg: "Payment verified successfully!" });
        localStorage.setItem(CART_CACHE_KEY, JSON.stringify([]));
        window.dispatchEvent(new CustomEvent("sync-cart", { detail: [] }));
        
        setTimeout(() => {
          navigate("/profile?view=orders");
        }, 1500);
      }
    } catch (err) {
      console.error("Order processing error:", err);
      setStatus({ 
        type: "error", 
        msg: err.response?.data?.error || "Transaction signature verification failed." 
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#E2ECE6] py-12 px-4 sm:px-6 lg:px-8 font-sans antialiased selection:bg-emerald-100">
      <div className="max-w-6xl mx-auto flex flex-col space-y-6">
        
        {/* NAV ROUTING TARGET BAR */}
        <div className="w-full flex items-center justify-start">
          <Link 
            to="/cart" 
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors group p-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> 
            Return to Cart Overview
          </Link>
        </div>

        {/* 2-COLUMN PREMIUM WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
          
          {/* BOX 1: SHIPPING DETAILS & CARD INPUT FORM (7 Columns) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-[2.5rem] border border-zinc-200/50 shadow-sm space-y-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Checkout Terminal</h2>
            
            <form onSubmit={handlePlaceOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">First Name</label>
                  <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium text-zinc-800 focus:outline-none focus:border-emerald-800 bg-zinc-50/10 placeholder-zinc-300 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Last Name</label>
                  <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium text-zinc-800 focus:outline-none focus:border-emerald-800 bg-zinc-50/10 placeholder-zinc-300 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Street Address</label>
                <input required type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Apartment, suite, block name..." className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium text-zinc-800 focus:outline-none focus:border-emerald-800 bg-zinc-50/10 placeholder-zinc-300 transition-colors" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">City</label>
                  <input required type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New Delhi" className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium text-zinc-800 focus:outline-none focus:border-emerald-800 bg-zinc-50/10 placeholder-zinc-300 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Postal PIN Code (India)</label>
                  <input required type="text" maxLength={6} value={pinCode} onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))} placeholder="110078" className="w-full border border-zinc-200 rounded-xl px-4 py-3 text-xs font-medium text-zinc-800 focus:outline-none focus:border-emerald-800 bg-zinc-50/10 placeholder-zinc-300 transition-colors" />
                </div>
              </div>

              {/* STRIPE ELEMENT FIELD MATRICES */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block px-0.5">Secure Credit / Debit Card Input</label>
                <div className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/10 min-h-[46px] shadow-sm">
                  {/* 🛡️ FIXED: hidePostalCode true shifts responsibility to your HTML inputs cleanly */}
                  <CardElement options={{
                    hidePostalCode: true,
                    style: {
                      base: {
                        fontSize: "14px",
                        color: "#18181b",
                        fontFamily: "Inter, system-ui, sans-serif",
                        "::placeholder": { color: "#a1a1aa" },
                      },
                    },
                  }} />
                </div>
              </div>

              {status.msg && (
                <p className={`text-[10px] font-medium p-2.5 rounded-xl border text-center ${
                  status.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                  status.type === "loading" ? "bg-zinc-50 border-zinc-100 text-zinc-500 animate-pulse" :
                  "bg-red-50 border-red-100 text-red-600"
                }`}>{status.msg}</p>
              )}

              <button 
                type="submit" 
                disabled={isProcessing || !stripe}
                className="w-full bg-[#055F43] hover:bg-[#034430] disabled:bg-zinc-300 text-white font-bold text-xs py-4 rounded-xl transition-all shadow-md tracking-widest uppercase flex items-center justify-center gap-2 h-12 text-center"
              >
                <CreditCard className="h-4 w-4" /> {isProcessing ? "Awaiting 2FA Verification..." : `Pay ₹${grandTotalPayable.toLocaleString('en-IN')}`}
              </button>
            </form>
          </div>

          {/* BOX 2: INVOICE SUMMARY PANEL (5 Columns) */}
          <div className="lg:col-span-5 bg-white border border-zinc-200/50 p-6 sm:p-8 rounded-[2rem] shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Checkout Item Summary</h3>
            
            <div className="max-h-52 overflow-y-auto divide-y divide-zinc-100 pr-1">
              {cart.length === 0 ? (
                <p className="text-xs font-bold text-zinc-400 py-4 uppercase tracking-wider animate-pulse">Your cart workspace is currently blank.</p>
              ) : (
                cart.map((item) => {
                  const cleanItemPrice = item.price || item.price_inr || 0;
                  const rawPrice = Number(String(cleanItemPrice).replace(/[^0-9.-]/g, ""));
                  return (
                    <div key={item.product_id} className="py-2.5 flex items-center justify-between text-xs gap-4">
                      <div className="truncate flex-1">
                        <p className="font-bold text-zinc-800 truncate">{item.product_name}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">Quantity: {item.quantity}</p>
                      </div>
                      <span className="font-black text-zinc-950 shrink-0">₹{(rawPrice * item.quantity).toLocaleString("en-IN")}</span>
                    </div>
                  );
                })
              )}
            </div>

            <hr className="border-zinc-100" />

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500 font-medium px-0.5">
                <span>Subtotal:</span>
                <span>₹{subtotalPrice.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="font-medium text-zinc-500">Delivery Fee:</span>
                <span className="font-mono text-zinc-600 font-bold">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}.00`}</span>
              </div>
            </div>

            <hr className="border-dashed border-zinc-200" />

            <div className="flex justify-between items-center text-sm bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
              <span className="font-bold text-zinc-800">Grand Total Cost:</span>
              <span className="text-lg font-black text-[#055F43]">₹{grandTotalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="pt-1 flex items-center justify-center gap-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">
              <ShieldCheck className="h-4 w-4 text-[#055F43]" /> RBI 3D-Secure 2FA Protocol Guarded
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;