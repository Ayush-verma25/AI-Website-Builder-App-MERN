import { User } from "../models/User.js";
import jwt from 'jsonwebtoken'

const JWT_SECRET  = process.env.JWT_SECRET || "fallback_secret"

// Helper to set cookie
const setSessionCookie = (res, payload)=>{
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn: "30d"})
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
    })
}

export async function register(req, res){
    const {name, email, password} = req.body

    if(!name || !email || !password){
        res.status(400).json({error: "Name, email, and password are required"})
        return;
    }

    const trimmedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({email: trimmedEmail})
    if(existing){
        res.status(400).json({error: "An account with this email already exists"})
        return;
    }

    const user = await User.create({
        name,
        email: trimmedEmail,
        password
    })

    setSessionCookie(res, {userId: user._id.toString(), email: user.email})

    res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    })
}

export async function login(req, res){
    const {email, password} = req.body

    if(!email || !password){
        res.status(400).json({error: "Email and password are required"})
        return;
    }

    const user = await User.findOne({email: email.toLowerCase().trim()})
    if(!user){
        res.status(401).json({error: "Invalid email or password"})
        return;
    }

    const isValid = await user.comparePassword(password)
    if (!isValid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
    }

    setSessionCookie(res, {userId: user._id.toString(), email: user.email})

    res.status(201).json({
        user: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    })
}

export async function logout(_req, res){
    res.cookie("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    })
    res.json({success: true})
}

export async function me(req, res){
    if (!req.user) {
        res.status(401).json({error: "Not authenticated"})
        return;
    }

    const user = await User.findById(req.user.userId).select("-password");
    if(!user){
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json({user})
}