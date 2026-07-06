import { pool } from "../config/db.js";

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    if (!userId) return res.status(401).json({ error: "Unauthorized session." });

    const result = await pool.query(
      "SELECT product_id FROM wishlist WHERE user_id = $1",
      [userId]
    );

    const flatWishlist = result.rows.map(row => String(row.product_id));
    res.json(flatWishlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const productId = req.body.productId || req.body.product_id;

    if (!userId) return res.status(401).json({ error: "Unauthorized." });
    if (!productId) return res.status(400).json({ error: "Product ID is required." });

    const checkDuplicate = await pool.query(
      "SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2",
      [userId, String(productId)]
    );

    if (checkDuplicate.rows.length > 0) {
      return res.status(200).json({ message: "Item already in wishlist." });
    }

    await pool.query(
      "INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)",
      [userId, String(productId)]
    );

    res.status(201).json({ message: "Added to wishlist!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const { id: productId } = req.params;

    if (!userId) return res.status(401).json({ error: "Unauthorized." });

    await pool.query(
      "DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2",
      [userId, String(productId)]
    );

    res.json({ message: "Removed from wishlist." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};