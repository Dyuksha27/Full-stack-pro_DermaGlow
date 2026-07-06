import { pool } from "./config/db.js";

try {
    const result = await pool.query("SELECT NOW()");
    console.log(result.rows[0]);
    process.exit();
} catch (err) {
    console.error(err);
}