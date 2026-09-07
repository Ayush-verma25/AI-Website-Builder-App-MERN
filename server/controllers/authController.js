import { User } from "../models/User.js";
import jwt from "jsonwebtoken";

function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is required in production");
    }
    return secret || "fallback_secret";
}

const setSessionCookie = (res, payload) => {
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
    });
};

export async function register(req, res, next) {
    try {
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

        return res.status(201).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function login(req, res, next) {
    try {
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

        return res.status(200).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(_req, res) {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 0,
        path: "/",
    });
    return res.json({ success: true });
}

export async function me(req, res, next) {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await User.findById(req.user.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.json({ user });
    } catch (error) {
        next(error);
    }
}
