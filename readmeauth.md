# Authentication System Documentation

This document explains how the authentication system works in the Cardano Live Explorer. It uses a secure "Nonce-based Challenge" flow standard in Web3.

## 🔄 The Authentication Flow

1.  **Request Nonce**: The frontend asks the server for a random number (nonce) for a specific wallet address.
2.  **Sign Nonce**: The frontend uses the user's Cardano wallet (like Nami or Eternal) to "sign" this nonce. This proves they own the wallet.
3.  **Verify Signature**: The frontend sends the `nonce`, `signature`, and `publicKey` back to the server.
4.  **Issue Token**: If the signature is valid, the server creates a **JWT (JSON Web Token)** and sends it to the frontend.
5.  **Authorized Requests**: The frontend saves this token and sends it with every future request (in the headers) to prove who they are.

## 📂 File Roles & Functions

### 1. `noncegenerate.js`
**Role**: Generates and temporarily stores the random challenge numbers.

*   **`POST /auth/nonce`**:
    *   Receives a `walletAddress`.
    *   Creates a random hex string (the nonce).
    *   Saves it in memory (`nonceStore`) with the address and a timestamp.
    *   Returns the nonce to the frontend.

*   **`verifyAndInvalidateNonce(address, receivedNonce)`**:
    *   Checks if the nonce sent by the user matches the one we stored.
    *   Checks if it has expired (LIMIT: 5 minutes).
    *   **Crucial**: Deletes the nonce after checking so it can't be used again (preventing "replay attacks").

---

### 2. `verifySignature.js`
**Role**: The gatekeeper. Verifies the wallet's cryptographic signature and logs the user in.

*   **`POST /auth/verify`**:
    *   This is the main login endpoint.
    *   **Step 1 (Nonce Check)**: Calls `verifyAndInvalidateNonce` to ensure the challenge is valid.
    *   **Step 2 (Signature Check)**: Uses `@meshsdk/core` to mathematically verify that the `signature` was created by the `walletAddress` using the `nonce`.
    *   **Step 3 (Token Issue)**: If valid, calls `generateToken` to create a session token.

*   **`POST /auth/logout`**:
    *   Simple endpoint to acknowledge logout (frontend just deletes the token).

---

### 3. `jwtUtils.js`
**Role**: Manages the secure tokens (JWTs) used for the session.

*   **`generateToken(payload)`**:
    *   Creates a secure string containing user info (address).
    *   Signs it with a secret key (`JWT_SECRET`) from the environment variables.
    *   Sets an expiration (e.g., 7 days).

*   **`verifyToken(token)`**:
    *   Checks if a token is real and hasn't expired.

*   **`authenticateToken(req, res, next)`**:
    *   **Middleware**: This is used to protect other routes.
    *   It checks the `Authorization` header for a token.
    *   If the token is good, it lets the request pass. If not, it blocks it.

## 🚀 Integration (`server.js`)

All these files are brought together in `server.js`. The server runs on port **5000** and mounts the routes:

```javascript
// In server.js
app.use(nonceRouter);  // Adds /auth/nonce
app.use(verifyRouter); // Adds /auth/verify
```
