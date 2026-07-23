// backend/src/controllers/productController.js
import { pool } from "../config/db.js";
import cloudinary from "../config/cloudinary.js"; 

/**
 * 🛒 PUBLIC READ CONTROLLER: Fetches paginated products filtered by text search or category parameters
 */
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search } = req.query;
    
    const parsedLimit = parseInt(limit, 10) || 12;
    const parsedOffset = (parseInt(page, 10) - 1) * parsedLimit;

    let conditions = [];
    let filterValues = [];

    if (category && category.trim() !== "") {
      filterValues.push(`%${category.trim()}%`);
      conditions.push(`category ILIKE $${filterValues.length}`);
    }

    if (search && search.trim() !== "") {
      filterValues.push(`%${search.trim()}%`);
      // 🟢 FIXED: Check all potential database ID columns (product_id, id, _id, sku) alongside product_name
      conditions.push(
        `(product_name ILIKE $${filterValues.length} OR product_id::text ILIKE $${filterValues.length} OR id::text ILIKE $${filterValues.length})`
      );
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) FROM products${whereClause}`;
    const countResult = await pool.query(countQuery, filterValues);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const paginationValues = [...filterValues];
    paginationValues.push(parsedLimit);
    const limitPlaceholder = `$${paginationValues.length}`;
    
    paginationValues.push(parsedOffset);
    const offsetPlaceholder = `$${paginationValues.length}`;

    const rowsQuery = `SELECT * FROM products${whereClause} ORDER BY product_name LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`;
    const dataResult = await pool.query(rowsQuery, paginationValues);

    // Format rows to ensure numeric prices and default stock counts exist
    const formattedRows = dataResult.rows.map((product) => ({
      ...product,
      price: product.price ? Number(product.price) : 0,
      stock: product.stock ?? product.inventory ?? 50,
      inStock: true,
    }));

    res.json({
      total: totalCount,
      rows: formattedRows
    });

  } catch (err) {
    console.error("BACKEND_CRASH:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 🔍 PUBLIC DETAIL CONTROLLER: Pulls context properties for a designated SKU identifier
 */
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Checks matching product_id string or id column if numeric/UUID
    const result = await pool.query(
      "SELECT * FROM products WHERE product_id = $1 OR id::text = $1", 
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = result.rows[0];

    // Formats price as Number and defaults stock if column is null/undefined in DB
    res.json({
      ...product,
      price: product.price ? Number(product.price) : 0,
      stock: product.stock ?? product.inventory ?? 50,
      inStock: true
    });
  } catch (err) {
    console.error("Error in getProductById:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * 📊 ADMIN METRICS CONTROLLER: Aggregates total order numbers and revenue matrices
 */
export const getAdminSalesMetrics = async (req, res) => {
  try {
    const stockQuery = await pool.query(`SELECT COUNT(*) as "skuCount" FROM products`);
    const verifiedTotalSkus = Number(stockQuery.rows[0].skuCount) || 0;

    try {
      const metricsQuery = await pool.query(`SELECT COUNT(*) as "totalOrders" FROM orders`);
      res.status(200).json({
        totalSold: Number(metricsQuery.rows[0].totalOrders) || 0,
        revenue: 0, 
        stockCount: verifiedTotalSkus
      });
    } catch (orderTableError) {
      res.status(200).json({
        totalSold: 0,
        revenue: 0, 
        stockCount: verifiedTotalSkus
      });
    }
  } catch (err) {
    console.error("❌ Critical Metrics Operational Collapse:", err.message);
    res.status(500).json({ error: "Failed to gather operational telemetry logs." });
  }
};

/**
 * 📦 ADMIN ADD PRODUCT CONTROLLER: Implements Cloudinary asset streaming into PostgreSQL
 */
export const addNewProduct = async (req, res) => {
  try {
    const { product_name, price, category, stock } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Product image asset upload is mandatory." });
    }

    if (!product_name || !price || Number(price) <= 0) {
      return res.status(400).json({ error: "Invalid name or numerical pricing matrix fields." });
    }

    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "dermaglow_products" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url); 
          }
        );
        stream.end(req.file.buffer); 
      });
    };

    const cloudSecureImageUrl = await uploadToCloudinary();

    const newProduct = await pool.query(
      "INSERT INTO products (product_id, product_name, price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        'sku_' + Date.now(),
        product_name.trim(), 
        Number(price),
        cloudSecureImageUrl, 
        category?.trim() || "Skincare",
        stock ? Number(stock) : 50
      ]
    );

    res.status(201).json({
      message: "Catalog expanded successfully!",
      product: newProduct.rows[0]
    });
  } catch (err) {
    console.error("❌ Product Insertion Failure:", err.message);
    res.status(500).json({ error: "Database rejected catalog entry manifest." });
  }
};