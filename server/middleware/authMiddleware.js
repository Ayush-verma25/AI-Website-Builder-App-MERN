import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: "Access denied. No session token provided." });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        console.error("CRITICAL: JWT_SECRET environment variable is missing in production.");
        return res.status(500).json({ error: "Server configuration error." });
    }

    try {
        const decoded = jwt.verify(token, secret || "fallback_secret");
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    }
}
