import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { hashPassword, comparePassword } from "../utils/password.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAppTokens = (user, res) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return accessToken;
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All form fields are required parameters." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if user already exists
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "An account with this email registry already exists." });
    }

    // 2. 🛡️ STRICT ADMINISTRATIVE WHITELIST AUDIT LAYER
    let assignedRole = "user"; // Defaults safely to regular customer
    const isCorporateDomain = normalizedEmail.endsWith("@warmg.com") || normalizedEmail.endsWith("@dermg.com");

    if (isCorporateDomain || role === "admin") {
      // Query the authoritative database sheet to verify employee legitimacy
      const whitelistCheck = await pool.query("SELECT id FROM admin_whitelist WHERE email = $1", [normalizedEmail]);
      
      if (whitelistCheck.rows.length > 0) {
        assignedRole = "admin";
      } else {
        // Anti-spoofing rejection fallback
        return res.status(403).json({ 
          message: "Access Denied: This corporate email signature is not recognized in our database index. Admin profile creation rejected." 
        });
      }
    } else if (role === "seller") {
      // Set to pending state allowed by our updated database check constraint
      assignedRole = "seller_pending";
    }

    const passwordHash = await hashPassword(password);

    try {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        [name.trim(), normalizedEmail, passwordHash, assignedRole]
      );
    } catch (dbErr) {
      if (dbErr.message.includes('column "password_hash" does not exist')) {
        await pool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
          [name.trim(), normalizedEmail, passwordHash, assignedRole]
        );
      } else {
        console.error("❌ Postgres Insertion Failure:", dbErr);
        return res.status(400).json({ message: `Database layout error: ${dbErr.message}` });
      }
    }

    // Response updates matching dynamic registration status notes
    if (assignedRole === "seller_pending") {
      return res.status(201).json({ 
        message: "Seller application staged! Notification sent to admin@dermg.com for identity verification checks.",
        isPendingSeller: true
      });
    }

    res.status(201).json({ message: "Account created successfully!" });
  } catch (err) {
    console.error("Registration crash:", err.message);
    res.status(500).json({ message: "Internal server registry error." });
  }
};

// ... login, googleAuthentication, appleAuthentication methods keep exact pristine shape as prior response
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password inputs are required parameters." });
    }

    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = userCheck.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password credentials." });
    }

    if (user.role === "seller_pending") {
      return res.status(403).json({ message: "Your seller account is awaiting administrative verification approval. Entry restricted until admin grants activation." });
    }

    const passKey = user.password_hash ? user.password_hash : user.password;
    if (passKey && passKey.startsWith("OAUTH_")) {
      return res.status(400).json({ 
        message: "This account uses social sign-on. Please use Google or Apple to access your profile." 
      });
    }

    const isMatch = await comparePassword(password, passKey);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password credentials." });
    }

    const token = generateAppTokens(user, res);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Internal server login verification error." });
  }
};

export const googleAuthentication = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID Token missing." });

    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name } = ticket.getPayload();
    const normalizedEmail = email.toLowerCase();

    let userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    let user = userCheck.rows[0];

    if (!user) {
      const field = "password_hash";
      
      let assignedRole = "user";
      if (normalizedEmail.endsWith("@dermg.com")) {
        const whitelistCheck = await pool.query("SELECT id FROM admin_whitelist WHERE email = $1", [normalizedEmail]);
        if (whitelistCheck.rows.length > 0) assignedRole = "admin";
        else return res.status(403).json({ message: "Corporate signature missing from authorization tables." });
      } else if (role === "seller") {
        assignedRole = "seller_pending";
      }

      const newProfile = await pool.query(
        `INSERT INTO users (name, email, ${field}, role) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name || "Google User", normalizedEmail, "OAUTH_GOOGLE_RESTRICTED_SESSION", assignedRole]
      );
      user = newProfile.rows[0];
    }

    if (user.role === "seller_pending") {
      return res.status(403).json({ message: "Your seller account is awaiting administrative verification approval. Entry restricted until admin grants activation." });
    }

    const token = generateAppTokens(user, res);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(401).json({ message: "Google verification signature check failed." });
  }
};

export const appleAuthentication = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID Token missing." });

    const decodedJwt = jwt.decode(idToken, { complete: true });
    const kid = decodedJwt.header.kid;
    const signingKey = await appleJwks.getSigningKey(kid);
    const publicKey = signingKey.getPublicKey();

    const payload = jwt.verify(idToken, publicKey, { audience: process.env.APPLE_CLIENT_ID, issuer: "https://appleid.apple.com" });
    const normalizedEmail = payload.email.toLowerCase();
    const name = req.body.name || normalizedEmail.split("@")[0]; 

    let userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    let user = userCheck.rows[0];

    if (!user) {
      const field = "password_hash";
      
      let assignedRole = "user";
      if (normalizedEmail.endsWith("@dermg.com")) {
        const whitelistCheck = await pool.query("SELECT id FROM admin_whitelist WHERE email = $1", [normalizedEmail]);
        if (whitelistCheck.rows.length > 0) assignedRole = "admin";
        else return res.status(403).json({ message: "Corporate signature missing from authorization tables." });
      } else if (role === "seller") {
        assignedRole = "seller_pending";
      }

      const newProfile = await pool.query(
        `INSERT INTO users (name, email, ${field}, role) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, normalizedEmail, "OAUTH_APPLE_RESTRICTED_SESSION", assignedRole]
      );
      user = newProfile.rows[0];
    }

    if (user.role === "seller_pending") {
      return res.status(403).json({ message: "Your seller account is awaiting administrative verification approval. Entry restricted until admin grants activation." });
    }

    const token = generateAppTokens(user, res);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(401).json({ message: "Apple verification signature check failed." });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query("SELECT id, name, email, created_at, role FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });
    const user = result.rows[0];
    const freshRefreshToken = generateRefreshToken(user);
    res.cookie("refreshToken", freshRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
  res.json({ message: "Logged out successfully" });
};

export const clearSession = (req, res) => {
  res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
  res.status(200).json({ message: "Transition environment variables prepared." });
};