const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "7d"; // 7 days

if (!JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET is not defined in environment variables.");
}

// Generate a JWT token for a user
// Takes the user data (payload) and signs it
function generateToken(payload) {
    return jwt.sign(
        {
            ...payload,
            authenticatedAt: Date.now(),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );
}

// Verify if a token is valid
// Returns the decoded data if valid, otherwise throws an error
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

// Middleware to check if the user is logged in
// This checks the "Authorization" header in the request
function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Save user data to the request so we can use it later
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
}

module.exports = {
    generateToken,
    verifyToken,
    authenticateToken,
};
