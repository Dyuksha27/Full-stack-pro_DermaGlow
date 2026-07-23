import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { pool } from "./config/db.js";

// 1. IMPORT YOUR PRODUCT ROUTES (Check path matches your folder structure!)
import productRoutes from "./routes/productRoutes.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🛡️ DYNAMIC CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy violation: Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

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

app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});