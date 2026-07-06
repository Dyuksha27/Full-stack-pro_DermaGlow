import express from "express";
import { protect, authorizeRoles } from "../middlewares/authMiddleware.js";
import { uploadProductImage } from "../middlewares/uploadMiddleware.js";
// Assume you've created these methods in your productController
import { addNewProduct, getAdminSalesMetrics } from "../controllers/productController.js"; 

const router = express.Router();

// Fetch general dashboard metrics (revenue, total sold counters)
router.get("/metrics", protect, authorizeRoles("admin"), getAdminSalesMetrics);

// Post a new item into Postgres complete with its upload asset path
router.post("/add", protect, authorizeRoles("admin"), uploadProductImage.single("productImage"), addNewProduct);

export default router;