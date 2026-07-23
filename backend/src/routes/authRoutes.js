// backend/src/routes/authRoutes.js
import express from "express";
import {
  login,
  register,
  googleAuthentication,
  appleAuthentication,
  getProfile,
  logout,
  clearSession 
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.post("/google", googleAuthentication);
router.post("/apple", appleAuthentication);

router.get("/profile", protect, getProfile);
router.post("/logout", protect, logout);

// 🛡️ UNGUARDED TRANSITION CLEARANCE: Purges tracking layers during user flips
router.post("/clear-session", clearSession);

export default router;