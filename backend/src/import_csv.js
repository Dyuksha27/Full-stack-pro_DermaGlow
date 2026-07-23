import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csv from "csv-parser";
import { pool } from "./config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Starting fast import...");

const safeNumber = (val) => {
  if (!val) return 0;
  const num = Number(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const safeBoolean = (val) =>
  String(val).toLowerCase().trim() === "true";

const rows = [];
const CSV_FILE_PATH = path.join(__dirname, "dermaglow_skinsafe_master.csv");

fs.createReadStream(CSV_FILE_PATH)
  .pipe(
    csv({
      strict: true,
      mapHeaders: ({ header }) => header.trim(),
    })
  )
  .on("headers", (headers) => {
    console.log("CSV HEADERS:", headers);
  })
  .on("data", (row) => rows.push(row))
  .on("end", async () => {
    console.log(`📦 CSV Loaded: ${rows.length} rows`);

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(255) UNIQUE,
            product_name TEXT,
            brand TEXT,
            usage_type TEXT,
            category TEXT,
            ingredients TEXT,
            ingredient_count INT,
            image_url TEXT,
            risk_score INT,
            safety_score INT,
            safety_label TEXT,
            fragrance_free BOOLEAN,
            alcohol_free BOOLEAN,
            paraben_free BOOLEAN,
            sulfate_free BOOLEAN,
            rating NUMERIC,
            tags TEXT,
            skin_type TEXT,
            concern TEXT,
            price_inr NUMERIC,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ PostgreSQL "products" table checked/created successfully.');

      // ⚡ FAST BATCH INSERTION (Chunks of 1,000)
      const BATCH_SIZE = 1000;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const valueStrings = [];
        const values = [];
        let paramIdx = 1;

        for (const row of batch) {
          valueStrings.push(
            `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9}, $${paramIdx + 10}, $${paramIdx + 11}, $${paramIdx + 12}, $${paramIdx + 13}, $${paramIdx + 14}, $${paramIdx + 15}, $${paramIdx + 16}, $${paramIdx + 17}, $${paramIdx + 18}, $${paramIdx + 19})`
          );
          values.push(
            row.product_id,
            row.product_name,
            row.brand,
            row.usage_type,
            row.category,
            row.ingredients,
            safeNumber(row.ingredient_count),
            row.image_url,
            safeNumber(row.risk_score),
            safeNumber(row.safety_score),
            row.safety_label,
            safeBoolean(row.fragrance_free),
            safeBoolean(row.alcohol_free),
            safeBoolean(row.paraben_free),
            safeBoolean(row.sulfate_free),
            safeNumber(row.rating),
            row.tags,
            row.skin_type,
            row.concern,
            safeNumber(row.price_inr)
          );
          paramIdx += 20;
        }

        const queryText = `
          INSERT INTO products (
            product_id, product_name, brand, usage_type, category,
            ingredients, ingredient_count, image_url, risk_score, safety_score,
            safety_label, fragrance_free, alcohol_free, paraben_free, sulfate_free,
            rating, tags, skin_type, concern, price_inr
          )
          VALUES ${valueStrings.join(", ")}
          ON CONFLICT (product_id) DO NOTHING;
        `;

        await pool.query(queryText, values);
        console.log(`⚡ Inserted rows ${i + 1} to ${Math.min(i + BATCH_SIZE, rows.length)}`);
      }

      console.log("🎉 FAST IMPORT COMPLETE");
    } catch (err) {
      console.error("❌ Import error:", err.message);
    } finally {
      await pool.end();
      process.exit(0);
    }
  })
  .on("error", async (err) => {
    console.error("❌ CSV error:", err.message);
    await pool.end();
    process.exit(1);
  });