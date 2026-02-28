import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendEmail";
import { randomBytes } from "crypto";
import { logger } from "../utils/logger";

interface AuthRequest extends Request {
  user?: any;
}

/* ======================================================
   REGISTER
====================================================== */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      logger.warn("Register: Missing required fields", { body: req.body });
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const [existing]: any = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email.trim()]
    );

    if (existing.length > 0) {
      logger.warn("Register: Duplicate email attempt", { email });
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result]: any = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name.trim(), email.trim(), hashedPassword]
    );

    const userId = result.insertId;

    await sendMail(userId, email, "WELCOME_EMAIL", {
      name: name.trim(),
    });

    logger.info("User registered successfully", {
      userId,
      email,
    });

    return res.status(201).json({
      message: "User registered successfully",
    });

  } catch (error: any) {
    logger.error("Register Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ======================================================
   LOGIN
====================================================== */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      logger.warn("Login: Missing credentials", { email });
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email.trim()]
    );

    if (rows.length === 0) {
      logger.warn("Login: User not found", { email });
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logger.warn("Login: Invalid password attempt", { email });
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    logger.info("User logged in successfully", {
      userId: user.id,
      role: user.role,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error: any) {
    logger.error("Login Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ======================================================
   FORGOT PASSWORD
====================================================== */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      logger.warn("ForgotPassword: Missing email");
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const [users]: any = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email.trim()]
    );

    if (users.length === 0) {
      logger.warn("ForgotPassword: User not found", { email });
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    const resetToken = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [resetToken, expiry, user.id]
    );

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    await sendMail(user.id, user.email, "FORGOT_PASSWORD", {
      NAME: user.name,
      RESET_LINK: resetLink,
    });

    logger.info("Password reset email sent", {
      userId: user.id,
    });

    return res.status(200).json({
      message: "Reset email sent successfully",
    });

  } catch (error: any) {
    logger.error("ForgotPassword Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ======================================================
   RESET PASSWORD
====================================================== */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword?.trim()) {
      logger.warn("ResetPassword: Missing fields");
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()",
      [token]
    );

    if (rows.length === 0) {
      logger.warn("ResetPassword: Invalid or expired token");
      return res.status(400).json({
        message: "Invalid or expired token",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users 
       SET password = ?, reset_token = NULL, reset_token_expiry = NULL
       WHERE reset_token = ?`,
      [hashedPassword, token]
    );

    logger.info("Password reset successfully");

    return res.status(200).json({
      message: "Password reset successful",
    });

  } catch (error: any) {
    logger.error("ResetPassword Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ======================================================
   GET MY PROFILE
====================================================== */
export const getMyProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    const [rows]: any = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      logger.warn("GetMyProfile: User not found", { userId });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info("Profile fetched successfully", { userId });

    return res.status(200).json(rows[0]);

  } catch (error: any) {
    logger.error("GetMyProfile Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   UPDATE MY PROFILE
====================================================== */
export const updateMyProfile = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.id;
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      logger.warn("UpdateMyProfile: Missing fields", { userId });
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    const [existing]: any = await pool.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email.trim(), userId]
    );

    if (existing.length > 0) {
      logger.warn("UpdateMyProfile: Email already in use", {
        userId,
        email,
      });

      return res.status(400).json({
        message: "Email already in use",
      });
    }

    await pool.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name.trim(), email.trim(), userId]
    );

    const [updatedUser]: any = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );

    logger.info("Profile updated successfully", { userId });

    return res.status(200).json(updatedUser[0]);

  } catch (error: any) {
    logger.error("UpdateMyProfile Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};