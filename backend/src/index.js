import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { pool } from "./config/db.js";

import productRoutes from "./routes/productRoutes.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. BULLETPROOF CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://full-stack-pro-derma-glow.vercel.app",
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow tools/server-to-server (Postman, cURL)
    if (!origin) return callback(null, true);

    // Matches localhost, allowed origins array, or ANY Vercel deployment domain (*.vercel.app)
    const isAllowed =
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      /\.vercel\.app$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    } else {
      console.warn(`⚠️ Blocked origin by CORS: ${origin}`);
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
};

// Apply CORS globally before any parsing or routing
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Database connection health check
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection error:", err.message);
  } else {
    console.log("✅ Connected to PostgreSQL database successfully at", res.rows[0].now);
  }
});

// Basic test route
app.get("/", (req, res) => {
  res.json({ status: "DermaGlow API is running live!" });
});

// 2. MOUNT ROUTES
app.use("/api/products", productRoutes);

// 🛡️ GUARANTEED CORS ON ERRORS
// Ensures that if an internal database or code error occurs, Express still sends CORS headers back
app.use((err, req, res, next) => {
  console.error("🔥 Global Server Error:", err.stack || err.message);
  
  // Explicitly set CORS header on error response to prevent browser "CORS Masking"
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app"))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});