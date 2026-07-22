import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

// Use connectionString if available, otherwise fall back to discrete parameters
export const pool = process.env.DB_URL
  ? new Pool({
      connectionString: process.env.DB_URL,
      ssl: process.env.DB_URL.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : false,
    })
  : new Pool({
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD),
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
    });

// safer connection test (no persistent client leak)
pool
  .query("SELECT 1")
  .then(() => console.log("🟢 PostgreSQL Connected"))
  .catch((err) => console.error("🔴 DB Connection Error:", err.message));