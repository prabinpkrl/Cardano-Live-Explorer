const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { checkSignature } = require("@meshsdk/core");
const Cardano = require("@emurgo/cardano-serialization-lib-nodejs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Configuration ---
const JWT_SECRET = process.env.JWT_SECRET;
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY = "7d"; // 7 days

// --- In-Memory Stores ---
const nonceStore = new Map();

// --- HELPER FUNCTIONS ---
function hexToBech32(hexAddress) {
  try {
    const addressBytes = Buffer.from(hexAddress, "hex");
    const address = Cardano.Address.from_bytes(addressBytes);
    return address.to_bech32();
  } catch (e) {
    console.error("Error converting hex to bech32:", e);
    return null;
  }
}

// Middleware to verify JWT token
function verifyJWT(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user data to request
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- ENDPOINTS ---

/**
 * 🔗 /auth/nonce
 * Generate a nonce for wallet authentication
 */
app.post("/auth/nonce", (req, res) => {
  const { walletAddress: authAddress } = req.body;
  if (!authAddress) {
    return res.status(400).json({ error: "Auth address required" });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  nonceStore.set(authAddress, { nonce, createdAt: Date.now() });

  console.log(
    `[backend] Nonce generated for ${authAddress.substring(
      0,
      8
    )}...: ${nonce.substring(0, 8)}...`
  );
  res.json({ nonce });
});

/**
 * 🔑 /auth/verify (POST)
 * Handles both:
 * 1. Initial wallet signature verification (with nonce, signature, publicKey)
 * 2. JWT token verification (with Authorization header only)
 */
app.post("/auth/verify", async (req, res) => {
  const { walletAddress: authAddress, nonce, signature, publicKey } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");

  // CASE 1: JWT Token Verification (Dashboard checking existing session)
  if (token && !nonce && !signature && !publicKey) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      console.log(
        `[backend] ✓ JWT verified for ${decoded.walletAddress.substring(
          0,
          8
        )}...`
      );

      return res.json({
        success: true,
        walletAddress: decoded.walletAddress,
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  // CASE 2: Initial Wallet Signature Verification (Login flow)
  if (!authAddress || !nonce || !signature || !publicKey) {
    return res
      .status(400)
      .json({ error: "Missing required fields for verification." });
  }

  // 1. NONCE VALIDATION
  const stored = nonceStore.get(authAddress);
  if (
    !stored ||
    stored.nonce !== nonce ||
    Date.now() - stored.createdAt > NONCE_EXPIRY_MS
  ) {
    nonceStore.delete(authAddress);
    return res
      .status(401)
      .json({ error: "Invalid, expired, or replayed nonce." });
  }

  // 2. SIGNATURE VERIFICATION USING MESHJS
  try {
    const bech32Address = hexToBech32(authAddress);

    if (!bech32Address) {
      return res.status(400).json({ error: "Invalid wallet address format." });
    }

    console.log(
      `[backend] Converted address: ${authAddress.substring(
        0,
        8
      )}... -> ${bech32Address.substring(0, 15)}...`
    );

    const signatureData = {
      signature: signature,
      key: publicKey,
    };

    const verified = checkSignature(nonce, signatureData, bech32Address);

    if (!verified) {
      console.log("[backend] Signature verification failed.");
      return res.status(401).json({ error: "Signature verification failed." });
    }

    console.log("[backend] ✓ Signature verification passed!");
  } catch (e) {
    console.error("=========================================");
    console.error("!!! SIGNATURE VERIFICATION ERROR !!!");
    console.error("Input Public Key:", publicKey);
    console.error("Input Signature:", signature);
    console.error("Error Details:", e);
    console.error("Stack trace:", e.stack);
    console.error("=========================================");

    return res.status(500).json({ error: "Server-side verification error." });
  }

  // 3. AUTHENTICATION SUCCESS - Create JWT Token
  const jwtToken = jwt.sign(
    {
      walletAddress: authAddress,
      bech32Address: hexToBech32(authAddress),
      authenticatedAt: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  nonceStore.delete(authAddress);

  console.log(
    `[backend] ✅ User ${authAddress.substring(
      0,
      8
    )}... successfully authenticated! JWT expires in ${JWT_EXPIRY}`
  );

  res.json({
    success: true,
    walletAddress: authAddress,
    token: jwtToken,
  });
});

/**
 * 🚪 /auth/logout - Logout (client-side only, JWT is stateless)
 */
app.post("/auth/logout", (req, res) => {
  console.log("[backend] User logged out (JWT invalidated client-side)");
  res.json({ success: true, message: "Logged out successfully" });
});

/**
 * 🔐 /auth/me - Get current user info (protected route example)
 */
app.get("/auth/me", verifyJWT, (req, res) => {
  res.json({
    success: true,
    walletAddress: req.user.walletAddress,
    bech32Address: req.user.bech32Address,
    authenticatedAt: req.user.authenticatedAt,
  });
});

app.listen(4000, () => console.log("Backend running on http://localhost:4000"));
