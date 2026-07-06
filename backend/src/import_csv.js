import fs from "fs";
import csv from "csv-parser";
import { pool } from "./config/db.js";

console.log("🚀 Starting import...");

const safeNumber = (val) => {
  if (!val) return 0;
  const num = Number(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

const safeBoolean = (val) =>
  String(val).toLowerCase().trim() === "true";

const rows = [];

fs.createReadStream("./src/dermaglow_skinsafe_master.csv")
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
      // batch processing (prevents DB crash)
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        await pool.query(
          `INSERT INTO products (
            product_id,
            product_name,
            brand,
            usage_type,
            category,
            ingredients,
            ingredient_count,
            image_url,
            risk_score,
            safety_score,
            safety_label,
            fragrance_free,
            alcohol_free,
            paraben_free,
            sulfate_free,
            rating,
            tags,
            skin_type,
            concern,
            price
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,$16,$17,$18,$19,$20
          )
          ON CONFLICT (product_id) DO NOTHING`,
          [
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
            safeNumber(row.price_inr),
          ]
        );
      }

      console.log("🎉 IMPORT COMPLETE");
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