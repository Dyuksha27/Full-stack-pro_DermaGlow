import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { pool } from "./config/db.js";

// 1. IMPORT YOUR PRODUCT ROUTES
import productRoutes from "./routes/productRoutes.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🛡️ DYNAMIC CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://full-stack-pro-derma-glow.vercel.app",
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow server-to-server requests or tools like Postman/cURL (no origin header)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    } else {
      // Return false instead of throwing an Error object to prevent 500 response without CORS headers
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));

// Explicitly handle HTTP OPTIONS preflight checks for all routes
app.options("*", cors(corsOptions));

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

// 2. MOUNT YOUR ROUTES HERE
app.use("/api/products", productRoutes);

// 🛡️ GLOBAL ERROR HANDLER
// Ensures server errors respond with valid JSON so CORS headers remain intact
app.use((err, req, res, next) => {
  console.error("🔥 Global Server Error:", err.stack || err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});