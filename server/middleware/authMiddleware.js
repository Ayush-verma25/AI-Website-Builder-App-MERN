import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next){
    const token = req.cookies.token;

    if(!token){
        return res.status(401).json({ error: "Access denied. No session token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next()
    } catch (err) {
        res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
    }
}