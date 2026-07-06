// backend/src/controllers/cartController.js
import { pool } from "../config/db.js";

export const addToCart = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { product_id, quantity, isIncrement } = req.body;

    if (!product_id) return res.status(400).json({ error: "product_id is required." });

    if (Number(quantity) === 0) {
      await pool.query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [user_id, product_id]);
      return res.json({ message: "Removed from cart successfully" });
    }

    const existingItem = await pool.query(
      "SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [user_id, product_id]
    );

    if (existingItem.rows.length > 0) {
      const currentQty = existingItem.rows[0].quantity;
      const targetQty = isIncrement ? currentQty + Number(quantity) : Number(quantity);

      if (targetQty <= 0) {
        await pool.query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [user_id, product_id]);
        return res.json({ message: "Item cleared from cart arrays successfully." });
      }

      await pool.query("UPDATE cart_items SET quantity = $1 WHERE user_id = $2 AND product_id = $3", [targetQty, user_id, product_id]);
    } else {
      await pool.query("INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)", [user_id, product_id, Number(quantity)]);
    }

    res.json({ message: "Cart synchronized successfully" });
  } catch (err) {
    console.error("❌ Postgres Execution Failure inside addToCart:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const user_id = req.user.id;

    // 🛡️ COLUMN RESOLUTION FIX: Evaluates direct p.price instead of non-existent columns
    const result = await pool.query(
      `SELECT c.product_id, c.quantity, p.product_name, p.brand, p.image_url, p.price 
       FROM cart_items c 
       JOIN products p ON c.product_id = p.product_id 
       WHERE c.user_id = $1`,
      [user_id]
    );

    res.json(result.rows || []);
  } catch (err) {
    console.error("❌ Postgres Execution Failure inside getCart:", err.message);
    res.status(500).json({ error: err.message });
  }
};