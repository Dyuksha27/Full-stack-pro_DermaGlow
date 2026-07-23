// backend/src/index.js
import dotenv from "dotenv";
dotenv.config();

// Verify environmental secrets load properly into execution contexts
console.log("JWT_ACCESS_SECRET =", process.env.JWT_ACCESS_SECRET);
console.log("JWT_REFRESH_SECRET =", process.env.JWT_REFRESH_SECRET);

import express from "express";
import cors from "cors";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";

const app = express();

// Allowed Origins for production Vercel frontend and local development
const allowedOrigins = [
  "http://localhost:5173",
  "https://full-stack-pro-derma-glow-aqs4j9x0f-dyuksha27s-projects.vercel.app"
];

// OPTIMIZED DYNAMIC CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      // Match exact origins or any vercel.app preview URL for your project
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      
      return callback(new Error("Not allowed by CORS policy"));
    },
    credentials: true,
  })
);

app.use(express.json());

// Router Gateways
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin/products", adminRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({ message: "DermaGlow API Running 🚀" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});