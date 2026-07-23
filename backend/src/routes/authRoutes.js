// backend/src/routes/authRoutes.js
import express from "express";
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserProfile 
} from "../controllers/authController.js"; // Verify these match your controller function names

const router = express.Router();

// Primary Registration Endpoint (/api/auth/register)
router.post("/register", registerUser);

// Alias to catch alternate frontend registration payloads (/api/auth/signup)
router.post("/signup", registerUser);

// Authentication & Profile Routes
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/profile", getUserProfile);

export default router;