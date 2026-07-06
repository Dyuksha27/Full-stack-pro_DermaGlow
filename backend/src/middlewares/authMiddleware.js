// backend/src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
      return res.status(401).json({ message: "Unauthorized: Missing authentication credentials." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 🛡️ KEY PAYLOAD MAP PLUG: Normalizes varying payload schemas (id vs user_id) completely.
    req.user = {
      id: decoded.id || decoded.user_id || decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.warn("🛡️ Auth Middleware intercepted an out-of-sync session signature:", error.message);
    res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
    return res.status(401).json({ message: "Invalid or expired session token." });
  }
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: "Access forbidden" });
    next();
  };
};