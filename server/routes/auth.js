import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      isVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    });

    await sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({ 
      requiresVerification: true, 
      message: "Please check your email to verify your account." 
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password +isVerified");
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: "Please verify your email address before logging in." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({ user: user.toSafeObject(), token });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Verification token is required." });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token." });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    res.json({ success: true, message: "Email verified successfully. You can now log in." });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeObject() });
});

export default router;
