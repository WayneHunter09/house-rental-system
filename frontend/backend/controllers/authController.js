const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;
const RESET_TOKEN_MS = 30 * 60 * 1000;

function createToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function isStrongPassword(password = "") {
  return PASSWORD_PATTERN.test(password);
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    location: user.location
  };
}

function getLockMessage(user) {
  const seconds = Math.max(1, Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000));
  const minutes = Math.ceil(seconds / 60);
  return `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

exports.register = async (req, res, next) => {
  try {
    const { name, password, phone, location } = req.body;
    const email = normalizeEmail(req.body.email);
    const role = req.body.role === "landlord" ? "landlord" : "tenant";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      location
    });

    res.status(201).json({
      message: "User registered successfully",
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email is already registered" });
    }
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account exists with that email" });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({ message: getLockMessage(user) });
    }

    if (user.lockUntil && user.lockUntil <= Date.now()) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    const passwordMatches = await bcrypt.compare(password || "", user.password);
    if (!passwordMatches) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      }
      await user.save();
      return res.status(401).json({
        message: user.lockUntil && user.lockUntil > Date.now()
          ? getLockMessage(user)
          : "Invalid password"
      });
    }

    if (user.loginAttempts || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    res.json({
      message: "Login successful",
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const user = await User.findOne({ email });
    const response = {
      message: "If that email exists, a password reset link has been prepared."
    };

    if (!user) {
      return res.json(response);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashResetToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_MS);
    await user.save();

    const resetUrl = `${process.env.PUBLIC_APP_URL || ""}/reset-password.html?token=${resetToken}`;
    console.log(`Password reset link for ${email}: ${resetUrl}`);

    if (process.env.NODE_ENV !== "production") {
      response.resetToken = resetToken;
      response.resetUrl = resetUrl;
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol"
      });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset link is invalid or has expired" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully. You can now login." });
  } catch (error) {
    next(error);
  }
};
