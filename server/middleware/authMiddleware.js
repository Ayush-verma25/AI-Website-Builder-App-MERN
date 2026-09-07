import jwt from "jsonwebtoken";
import { User } from "../models/User.js"; // Ensure User is imported

export async function authMiddleware(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Access denied." });

    if (!process.env.JWT_SECRET) throw new Error("FATAL: JWT_SECRET missing");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Production check: ensure user still exists
        const user = await User.findById(decoded.userId).select("_id");
        if (!user) throw new Error("User no longer exists");
        
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Session expired or invalid." });
    }
}
