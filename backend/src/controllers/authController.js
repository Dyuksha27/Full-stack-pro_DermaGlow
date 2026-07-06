// backend/src/controllers/authController.js
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

// 🛡️ HELPER: Dynamically checks email domains and evaluates roles
const determineUserRole = (email) => {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain === "dermg.com" ? "admin" : "user";
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All form fields are required parameters." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Explicit unique verification check
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "An account with this email registry already exists." });
    }

    const passwordHash = await hashPassword(password);
    
    // 🛡️ Dynamic role evaluation based on corporate email criteria
    const assignedRole = determineUserRole(normalizedEmail);

    // 2. Dynamic structural column insertion attempt
    try {
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
        [name.trim(), normalizedEmail, passwordHash, assignedRole]
      );
    } catch (dbErr) {
      // Catch specific legacy or missing column schema situations cleanly
      if (dbErr.message.includes('column "password_hash" does not exist')) {
        await pool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
          [name.trim(), normalizedEmail, passwordHash, assignedRole]
        );
      } else {
        console.error("❌ Postgres Layout Constraint Failure:", dbErr);
        return res.status(400).json({ message: `Database constraint rejected entry: ${dbErr.message}` });
      }
    }

    res.status(201).json({ message: "Account created successfully!" });
  } catch (err) {
    console.error("Registration endpoint crash:", err.message);
    res.status(500).json({ message: "Internal server registry error." });
  }
};

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
    console.error("🔥 Detailed Login Crash Logs:", err);
    res.status(500).json({ message: "Internal server login verification error." });
  }
};

export const googleAuthentication = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID Token missing." });

    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();
    const normalizedEmail = email.toLowerCase();

    let userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    let user = userCheck.rows[0];

    if (!user) {
      const field = "password_hash";
      // 🛡️ Dynamic role evaluation if registering via Google SSO
      const assignedRole = determineUserRole(normalizedEmail);
      
      const newProfile = await pool.query(
        `INSERT INTO users (name, email, ${field}, role) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name || "Google User", normalizedEmail, "OAUTH_GOOGLE_RESTRICTED_SESSION", assignedRole]
      );
      user = newProfile.rows[0];
    }

    const token = generateAppTokens(user, res);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Google SSO Backend Crash:", err.message);
    res.status(401).json({ message: "Google verification signature check failed." });
  }
};

export const appleAuthentication = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "ID Token missing." });

    const decodedJwt = jwt.decode(idToken, { complete: true });
    const kid = decodedJwt.header.kid;
    const signingKey = await appleJwks.getSigningKey(kid);
    const publicKey = signingKey.getPublicKey();

    const payload = jwt.verify(idToken, publicKey, {
      audience: process.env.APPLE_CLIENT_ID,
      issuer: "https://appleid.apple.com"
    });

    const normalizedEmail = payload.email.toLowerCase();
    const name = req.body.name || normalizedEmail.split("@")[0]; 

    let userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    let user = userCheck.rows[0];

    if (!user) {
      const field = "password_hash";
      // 🛡️ Dynamic role evaluation if registering via Apple SSO
      const assignedRole = determineUserRole(normalizedEmail);

      const newProfile = await pool.query(
        `INSERT INTO users (name, email, ${field}, role) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, normalizedEmail, "OAUTH_APPLE_RESTRICTED_SESSION", assignedRole]
      );
      user = newProfile.rows[0];
    }

    const token = generateAppTokens(user, res);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Apple SSO Backend Crash:", err.message);
    res.status(401).json({ message: "Apple verification signature check failed." });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT id, name, email, created_at, role FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const freshRefreshToken = generateRefreshToken(user);
    res.cookie("refreshToken", freshRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json(user);
  } catch (error) {
    console.error(error);
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