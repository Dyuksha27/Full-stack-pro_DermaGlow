import { pool } from "../config/db.js";

export const createOrder = async (req, res) => {
  const user_id = req.user.id;
  const { total_amount } = req.body;

  const result = await pool.query(
    "INSERT INTO orders (user_id, total_amount, status) VALUES ($1,$2,'Pending') RETURNING *",
    [user_id, total_amount]
  );

  res.json(result.rows[0]);
};

export const getOrders = async (req, res) => {
  const user_id = req.user.id;

  const result = await pool.query(
    "SELECT * FROM orders WHERE user_id=$1",
    [user_id]
  );

  res.json(result.rows);
};

export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch orders"
    });
  }
};