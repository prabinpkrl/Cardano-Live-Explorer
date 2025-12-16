const express = require("express");
const { checkSignature } = require("@meshsdk/core");
const Cardano = require("@emurgo/cardano-serialization-lib-nodejs");
const { generateToken, verifyToken } = require("./jwtUtils");
const { verifyAndInvalidateNonce } = require("./noncegenerate");

const router = express.Router();

// --- HELPER FUNCTIONS ---

// Converts a Hex address to Bech32 format (e.g., addr1...)
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

// Route: /auth/verify (POST)
// This handles two things:
// 1. Verifying the wallet signature when logging in
// 2. Checking if a user is already logged in with a JWT token
router.post("/auth/verify", async (req, res) => {
  const { walletAddress: authAddress, nonce, signature, publicKey } = req.body;
  const token = req.headers.authorization?.replace("Bearer ", "");

  // CASE 1: JWT Token Verification
  // If we have a token but no signature params, verify the token
  if (token && !nonce && !signature && !publicKey) {
    try {
      const decoded = verifyToken(token);

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
  // Check if the nonce they sent is valid and delete it
  const isNonceValid = verifyAndInvalidateNonce(authAddress, nonce);
  if (!isNonceValid) {
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
  const jwtToken = generateToken({
    walletAddress: authAddress,
    bech32Address: hexToBech32(authAddress),
  });

  console.log(
    `[backend] ✅ User ${authAddress.substring(
      0,
      8
    )}... successfully authenticated!`
  );

  res.json({
    success: true,
    walletAddress: authAddress,
    token: jwtToken,
  });
});

// Route: /auth/logout
// Handles logout (client just discards the token)
router.post("/auth/logout", (req, res) => {
  console.log("[backend] User logged out (JWT invalidated client-side)");
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = {
  verifyRouter: router,
};
