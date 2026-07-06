// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import AppleSignin from "react-apple-signin-auth";
import API from "../api/axios";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  // 🛡️ CHANGED: Swapped the non-existent saveSession with your working switchAccount controller
  const { login, switchAccount } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await API.post("/auth/google", { idToken: credentialResponse.credential });
      // 🛡️ FIXED: Utilizes switchAccount to cleanly bind the new token/profile and reload the workspace
      await switchAccount(res.data.token, res.data.user);
    } catch (err) {
      setError("Google authentication failed.");
    }
  };

  const handleAppleSuccess = async (response) => {
    try {
      const res = await API.post("/auth/apple", { idToken: response.authorization.id_token });
      // 🛡️ FIXED: Utilizes switchAccount to cleanly bind the new token/profile and reload the workspace
      await switchAccount(res.data.token, res.data.user);
    } catch (err) {
      setError("Apple authentication failed.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 py-12 bg-[#E2ECE6]">
      <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2rem] border border-zinc-200/60 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-zinc-400">Log in to sync your dermal product baskets and tracking records.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><Mail className="h-4 w-4" /></span>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full text-xs pl-10 pr-4 py-3.5 border border-zinc-200 bg-zinc-50 rounded-xl outline-none" disabled={submitting} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Secret Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"><Lock className="h-4 w-4" /></span>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" className="w-full text-xs pl-10 pr-4 py-3.5 border border-zinc-200 bg-zinc-50 rounded-xl outline-none" disabled={submitting} />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs py-4 rounded-xl tracking-widest uppercase flex items-center justify-center gap-2 mt-2">
            {submitting ? "Verifying..." : "Login"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="flex items-center my-4">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="px-3 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">or continue with</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        <div className="space-y-3 w-full flex flex-col items-center">
          <div className="w-full h-11 [&>div]:w-full [&>div>div]:w-full [&>div>div]:justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google Sign-In Aborted.")} shape="rectangular" theme="outline" size="large" />
          </div>

          <AppleSignin
            authOptions={{ clientId: "com.dermaglow.shop.client", redirectURI: "https://localhost:5173/login", scope: "email name", usePopup: true }}
            onSuccess={handleAppleSuccess}
            onError={() => setError("Apple Sign-In Aborted.")}
            render={(props) => (
              <button {...props} className="w-full h-11 bg-black text-white font-sans font-medium text-sm rounded-md flex items-center justify-center gap-2.5 border border-black">
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94 1.07.08 2.16-.52 2.82-1.33z" />
                </svg>
                Sign in with Apple
              </button>
            )}
          />
        </div>

        <div className="text-center pt-2 border-t border-zinc-100 text-xs">
          <span className="text-zinc-400 font-medium">New to DermaGlow? </span>
          <Link to="/register" className="font-bold text-emerald-800 hover:underline">Create an Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;