import { User } from "../models/User.js";
import jwt from 'jsonwebtoken';
import { asyncHandler } from "../utils/asyncHandler.js";

// Fail fast in production if the secret is missing
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("FATAL: JWT_SECRET environment variable is missing");

// Helper to set cookie
const setSessionCookie = (res, payload) => {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
    });
};

export const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
        return res.status(400).json({ error: "An account with this email already exists" });
    }

    const user = await User.create({
        name,
        email: trimmedEmail,
        password
    });

    setSessionCookie(res, { userId: user._id.toString(), email: user.email });

    res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    });
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
    }

    setSessionCookie(res, { userId: user._id.toString(), email: user.email });

    res.status(200).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    });
});

export const logout = asyncHandler(async (_req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });
    res.json({ success: true });
});

export const me = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ user });
});
