import { Router } from "express";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlistController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/", protect, getWishlist);
router.post("/", protect, addToWishlist);
router.delete("/:id", protect, removeFromWishlist);

export default router;