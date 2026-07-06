// src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import AppleSignin from "react-apple-signin-auth";
import API from "../api/axios";
import { User, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      await API.post("/auth/register", { name: name.trim(), email: email.trim().toLowerCase(), password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Could not set up profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await API.post("/auth/google", { idToken: credentialResponse.credential });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/";
    } catch (err) {
      setError("Google sign-up failed.");
    }
  };

  const handleAppleSuccess = async (response) => {
    try {
      const res = await API.post("/auth/apple", { idToken: response.authorization.id_token });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/";
    } catch (err) {
      setError("Apple sign-up failed.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-12 bg-[#E2ECE6]">
      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2rem] border border-zinc-200/60 shadow-xl space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight">Create Profile</h1>
          <p className="text-xs text-zinc-400">Join DermaGlow to unlock database-saved skincare routines.</p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-bold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Profile registered! Forwarding to login check...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><User className="h-4 w-4" /></span>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice Stewart" className="w-full text-xs pl-10 pr-4 py-3.5 border border-zinc-200 bg-zinc-50 rounded-xl outline-none" disabled={submitting || success} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><Mail className="h-4 w-4" /></span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alice@example.com" className="w-full text-xs pl-10 pr-4 py-3.5 border border-zinc-200 bg-zinc-50 rounded-xl outline-none" disabled={submitting || success} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Secret Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><Lock className="h-4 w-4" /></span>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose strong password" className="w-full text-xs pl-10 pr-4 py-3.5 border border-zinc-200 bg-zinc-50 rounded-xl outline-none" disabled={submitting || success} />
            </div>
          </div>

          <button type="submit" disabled={submitting || success} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-4 rounded-xl tracking-widest uppercase mt-2">
            {submitting ? "Registering..." : "Register Account"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="px-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">or continue with</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        {/* MATCHED BRAND BUTTONS MODULE */}
        <div className="space-y-3 w-full flex flex-col items-center">
          
          <div className="w-full h-11 [&>div]:w-full [&>div>div]:w-full [&>div>div]:justify-center">
            <GoogleLogin 
              onSuccess={handleGoogleSuccess} 
              onError={() => setError("Google Registration Aborted.")} 
              shape="rectangular" 
              theme="outline" 
              size="large"
              text="signup_with"
            />
          </div>

          <AppleSignin
            authOptions={{
              clientId: "com.dermaglow.shop.client",
              redirectURI: "https://localhost:5173/login",
              scope: "email name",
              usePopup: true,
            }}
            onSuccess={handleAppleSuccess}
            onError={() => setError("Apple Registration Aborted.")}
            render={(props) => (
            <button 
            {...props} 
            className="w-full h-11 bg-black hover:bg-zinc-900 text-white font-sans font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2.5 shadow-sm border border-black"
            >
                {/* Simplified, perfectly centered official Apple SVG paths */}
                <svg 
                className="h-4 w-4 fill-white" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94 1.07.08 2.16-.52 2.82-1.33z" />
                    </svg>
                    Sign up with Apple
                    </button>
                    )}
          />
        </div>

        <div className="text-center pt-2 border-t border-zinc-100 text-xs">
          <span className="text-zinc-400 font-medium">Already have a profile? </span>
          <Link to="/login" className="font-bold text-emerald-800 hover:underline">Log In Instead</Link>
        </div>

      </div>
    </div>
  );
};

export default Register;