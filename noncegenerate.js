const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { checkSignature } = require("@meshsdk/core");
const Cardano = require("@emurgo/cardano-serialization-lib-nodejs");

const app = express();
app.use(cors());
app.use(express.json());

// --- In-Memory Stores (For Authentication) ---
const nonceStore = new Map();
const sessions = new Map();
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// --- HELPER FUNCTION ---
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

// --- ENDPOINTS ---

/**
 * 🔗 /auth/nonce
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
 * 2. Session token verification (with Authorization header only)
 */
app.post("/auth/verify", async (req, res) => {
  const { walletAddress: authAddress, nonce, signature, publicKey } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");

  // CASE 1: Session Token Verification (Dashboard checking existing session)
  if (token && !nonce && !signature && !publicKey) {
    const session = sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    // Check if session has expired
    if (Date.now() - session.createdAt > SESSION_EXPIRY_MS) {
      sessions.delete(token);
      return res.status(401).json({ error: "Session expired" });
    }

    console.log(
      `[backend] ✓ Session verified for ${session.walletAddress.substring(
        0,
        8
      )}...`
    );

    return res.json({
      success: true,
      walletAddress: session.walletAddress,
    });
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

  // 3. AUTHENTICATION SUCCESS - Create Session
  const sessionToken = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionToken, {
    walletAddress: authAddress,
    createdAt: Date.now(),
  });
  nonceStore.delete(authAddress);

  console.log(
    `[backend] ✅ User ${authAddress.substring(
      0,
      8
    )}... successfully authenticated!`
  );

  res.json({
    success: true,
    walletAddress: authAddress,
    token: sessionToken,
  });
});

/**
 * 🚪 /auth/logout - Logout and destroy session
 */
app.post("/auth/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token && sessions.has(token)) {
    sessions.delete(token);
    console.log("[backend] Session destroyed");
  }

  res.json({ success: true, message: "Logged out successfully" });
});

app.listen(4000, () => console.log("Backend running on http://localhost:4000"));
