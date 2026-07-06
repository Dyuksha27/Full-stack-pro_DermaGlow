// backend/src/routes/paymentRoutes.js
import express from "express";
// 🛡️ FIXED: Added missing '.js' extension to prevent internal ESM module resolution errors
import { createPaymentIntent } from "../controllers/paymentController.js"; 
import { protect } from "../middlewares/authMiddleware.js"; 

const router = express.Router();

// Bind the secure intent route pass
router.post("/create-intent", protect, createPaymentIntent);

export default router;