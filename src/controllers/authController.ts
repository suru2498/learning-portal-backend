import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendEmail";
import { randomBytes } from "crypto";

/* =========================
   REGISTER
========================= */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    // Check duplicate
    const [existing]: any = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result]: any = await pool.query(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
      [name.trim(), email.trim(), hashedPassword]
    );

    const userId = result.insertId; // ✅ THIS IS YOUR USER ID

    // Send email
    await sendMail(userId, email, "WELCOME_EMAIL", {
  name: name.trim(),
});

    return res.status(201).json({
      message: "User registered successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


/* =========================
   LOGIN
========================= */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // ✅ Required validation
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // ✅ Fetch user
    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email.trim()]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const user = rows[0];

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    return res.json({ token });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

/* =========================
   FORGOT PASSWORD
========================= */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const [users]: any = await pool.query(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  if (users.length === 0) {
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

  // 🔥 Fetch Template
  const [templates]: any = await pool.query(
    "SELECT * FROM email_templates WHERE name = ?",
    ["FORGOT_PASSWORD"]
  );

  const template = templates[0];

  // Replace placeholders
  let emailBody = template.html_content
    .replace("{{NAME}}", user.name)
    .replace(/{{RESET_LINK}}/g, resetLink);

  await sendMail(user.id, user.email, "FORGOT_PASSWORD", {
  NAME: user.name,
  RESET_LINK: resetLink,
});

  return res.json({ message: "Reset email sent successfully" });
};

/* =========================
   RESET PASSWORD
========================= */
export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const [rows]: any = await pool.query(
    "SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()",
    [token]
  );

  if (rows.length === 0) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `UPDATE users 
     SET password = ?, reset_token = NULL, reset_token_expiry = NULL
     WHERE reset_token = ?`,
    [hashedPassword, token]
  );

  res.json({ message: "Password reset successful" });
};