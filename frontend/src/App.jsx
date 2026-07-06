// src/App.jsx
import React from "react"; 
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google"; 
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js"; 
import Layout from "./components/Layout";

// Pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import CartView from "./pages/CartView";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ProductDetails from "./pages/ProductDetails";
import Consultation from "./pages/Consultation";
import AdminDashboard from "./pages/AdminDashboard"; // 📊 Imported Admin Dashboard Page Panel
import NotFound from "./pages/NotFound";

// Initialize Stripe outside of the render pass using Stripe's universal sample publishable key
const stripePromise = loadStripe("pk_test_51OGKct2eZvKYlo2CqYf6mHkKpxmBsz29N3L38gH6ZgH8fEc8vLpXqYmNwRtVpX9mQ3kYgHwEc8vLpXqYmN");

// 🛡️ CHECKOUT ACCESS GUARD
const CheckoutGuard = ({ children }) => {
  const { loading } = useAuth();
  const token = localStorage.getItem("token");
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-sans">
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Processing Session context...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// 🛡️ PROFILE ACCESS GUARD
const ProfileGuard = ({ children }) => {
  const { loading } = useAuth();
  const token = localStorage.getItem("token");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-sans">
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Synchronizing Identity Sandbox...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// 🛡️ ADMIN ACCESS GUARD (Role-Based Authorization Router)
const AdminGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const token = localStorage.getItem("token");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-sans">
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-800">Verifying Corporate Clearances...</p>
        </div>
      </div>
    );
  }

  // Deny access if token is missing, user state is blank, or the assigned role isn't admin
  if (!token || !user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes = () => {
  const { loading, isTransitioning } = useAuth();

  if (loading && !isTransitioning) {
    return (
      <div className="min-h-screen bg-[#F4F7F5] flex items-center justify-center font-sans">
        <div className="text-center space-y-2 animate-pulse">
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Loading App Context Layout...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/products" element={<Products />} />
      <Route path="/product/:id" element={<ProductDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/cart" element={<CartView />} />
      
      {/* Protected Customer Routes */}
      <Route 
        path="/checkout" 
        element={ 
          <CheckoutGuard>
            <Elements stripe={stripePromise}>
              <Checkout />
            </Elements>
          </CheckoutGuard> 
        } 
      />
      <Route path="/profile" element={ <ProfileGuard><Profile /></ProfileGuard> } />
      
      {/* 🛡️ Protected Admin Portal Route */}
      <Route 
        path="/admin/dashboard" 
        element={
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        } 
      />
      
      <Route path="/consultation" element={<Consultation />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

function App() {
  const googleClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || "123456789-placeholder.apps.googleusercontent.com";

  return (
    <AuthProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <BrowserRouter>
          <Layout>
            <AppRoutes />
          </Layout>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </AuthProvider>
  );
}

export default App;