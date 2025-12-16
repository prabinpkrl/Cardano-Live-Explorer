const express = require("express");
const crypto = require("crypto");
require("dotenv").config();

const router = express.Router();

// --- Configuration ---
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// --- In-Memory Store ---
const nonceStore = new Map();

// Route: /auth/nonce
// Generates a random "nonce" (number used once) for the wallet to sign
router.post("/auth/nonce", (req, res) => {
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

// Helper function to check if the nonce is correct
// It also deletes the nonce so it can't be used again
function verifyAndInvalidateNonce(address, receivedNonce) {
  const stored = nonceStore.get(address);

  // Check if nonce exists, matches, and hasn't expired
  if (
    !stored ||
    stored.nonce !== receivedNonce ||
    Date.now() - stored.createdAt > NONCE_EXPIRY_MS
  ) {
    nonceStore.delete(address);
    return false;
  }

  // If it's valid, delete it now so it's only used once
  nonceStore.delete(address);
  return true;
}

module.exports = {
  nonceRouter: router,
  verifyAndInvalidateNonce,
  nonceStore,
};
