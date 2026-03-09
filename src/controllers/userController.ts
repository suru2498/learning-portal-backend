import { Request, Response } from "express";
import { pool } from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/sendEmail";
import { sendSms } from "../utils/sendSms";
import { randomBytes } from "crypto";
import { logger } from "../utils/logger";
import crypto from "crypto";

interface AuthRequest extends Request {
  user?: any;
}

/* ======================================================
   REGISTER
====================================================== */
export const register = async (req: Request, res: Response) => {
  logger.info("Register API called", {
    body: {
      name: req.body?.name,
      email: req.body?.email,
      phone: req.body?.phone,
    },
  });

  try {
    const { name, email, password, phone } = req.body;

    /* ======================================================
       1️⃣ Validate Input
    ====================================================== */
    if (!name?.trim() || !email?.trim() || !password?.trim() || !phone?.trim()) {
      logger.warn("Register: Missing required fields", {
        name,
        email,
        phone,
      });

      return res.status(400).json({
        message: "Name, email, password and phone are required",
      });
    }

    /* ======================================================
       2️⃣ Check Existing User
    ====================================================== */
    logger.info("Register: Checking if user already exists", { email });

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

    logger.info("Register: Email available, proceeding with registration", {
      email,
    });

    /* ======================================================
       3️⃣ Hash Password
    ====================================================== */
    logger.info("Register: Hashing password");

    const hashedPassword = await bcrypt.hash(password, 10);

    logger.info("Register: Password hashed successfully");

    /* ======================================================
       4️⃣ Insert User
    ====================================================== */
    logger.info("Register: Inserting user into database");

    const [result]: any = await pool.query(
      "INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)",
      [name.trim(), email.trim(), hashedPassword, phone.trim()]
    );

    const userId = result.insertId;

    logger.info("Register: User inserted successfully", {
      userId,
      email,
    });

    /* ======================================================
       5️⃣ Send Welcome Email
    ====================================================== */
    logger.info("Register: Sending welcome email", {
      userId,
      email,
      template: "WELCOME_EMAIL",
    });

    try {
      await sendMail(userId, email.trim(), "WELCOME_EMAIL", {
        name: name.trim(),
      });

      logger.info("Register: Welcome email sent successfully", {
        userId,
        email,
      });

    } catch (err: any) {
      logger.error("Register: Email sending failed but user registered", {
        userId,
        email,
        error: err?.message,
      });
    }

    /* ======================================================
       6️⃣ Success Response
    ====================================================== */
    logger.info("Register: User registered successfully", {
      userId,
      email,
      phone,
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
      { expiresIn: "1h" }
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

    // use env variable instead of localhost
    const frontendUrl =
      process.env.FRONTEND_URL || "https://learnandgrow-inky.vercel.app";

    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

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
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?",
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

/* ======================================================
   SEND EMAIL OTP
====================================================== */
export const sendEmailOtp = async (req: Request, res: Response) => {
  try {
    logger.info("SendEmailOtp: Request received");

    const { email } = req.body;

    if (!email?.trim()) {
      logger.warn("SendEmailOtp: Email missing");
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    logger.info("SendEmailOtp: Fetching user", { email: normalizedEmail });

    const [rows]: any = await pool.query(
      "SELECT id, name, email FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (!rows || rows.length === 0) {
      logger.warn("SendEmailOtp: User not found", { email: normalizedEmail });
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    logger.info("SendEmailOtp: User found", { userId: user.id });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    logger.info("SendEmailOtp: Updating OTP in DB");

    await pool.query(
      "UPDATE users SET email_otp = ?, email_otp_expiry = ? WHERE id = ?",
      [hashedOtp, expiry, user.id]
    );

    logger.info("SendEmailOtp: Sending OTP email");

    try {
      await sendMail(user.id, user.email, "LOGIN_EMAIL_OTP", {
        NAME: user.name,
        OTP: otp,
      });

      logger.info("SendEmailOtp: Email sent successfully", {
        userId: user.id,
      });

    } catch (mailError: any) {

      logger.error("SendEmailOtp: Email sending failed", {
        userId: user.id,
        error: mailError.message,
      });

      return res.status(500).json({
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      message: "OTP sent successfully",
    });

  } catch (error: any) {

    logger.error("SendEmailOtp Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ======================================================
   VERIFY EMAIL OTP
====================================================== */
/* ======================================================
   VERIFY EMAIL OTP (WITH ATTEMPTS LIMIT)
====================================================== */
export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email?.trim() || !otp?.trim()) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    /* ================= BLOCK CHECK ================= */
    if (
      user.email_otp_blocked_until &&
      new Date(user.email_otp_blocked_until) > new Date()
    ) {
      return res.status(403).json({
        message: "Too many attempts. Try again later.",
      });
    }

    if (!user.email_otp || !user.email_otp_expiry) {
      return res.status(400).json({
        message: "No OTP found. Request again.",
      });
    }

    if (new Date(user.email_otp_expiry) < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const hashedIncomingOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    /* ================= INVALID OTP ================= */
    if (hashedIncomingOtp !== user.email_otp) {

      const attempts = user.email_otp_attempts + 1;

      if (attempts >= 5) {
        const blockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await pool.query(
          `UPDATE users 
           SET email_otp_attempts = ?, 
               email_otp_blocked_until = ?
           WHERE id = ?`,
          [attempts, blockUntil, user.id]
        );

        return res.status(403).json({
          message: "Too many failed attempts. Blocked for 15 minutes.",
        });
      }

      await pool.query(
        "UPDATE users SET email_otp_attempts = ? WHERE id = ?",
        [attempts, user.id]
      );

      return res.status(400).json({
        message: `Invalid OTP. Attempts left: ${5 - attempts}`,
      });
    }

    /* ================= SUCCESS ================= */

    await pool.query(
      `UPDATE users 
       SET email_otp = NULL,
           email_otp_expiry = NULL,
           email_otp_attempts = 0,
           email_otp_blocked_until = NULL
       WHERE id = ?`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

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
    logger.error("VerifyEmailOtp Error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   SEND MOBILE OTP
====================================================== */
export const sendMobileOtp = async (req: Request, res: Response) => {
  try {
    logger.info("sendMobileOtp request received", {
      body: req.body,
      ip: req.ip,
    });

    let { phone } = req.body;

    /* ===============================
       VALIDATION
    =============================== */

    if (!phone) {
      logger.warn("Phone number missing in request", {
        body: req.body,
      });

      return res.status(400).json({
        message: "Phone number is required",
      });
    }

    // Remove spaces
    phone = phone.trim();

    logger.info("Phone number after trim", {
      phone,
    });

    // Validate 10 digit number
    const phoneRegex = /^\d{10}$/;

    if (!phoneRegex.test(phone)) {
      logger.warn("Phone validation failed", {
        phone,
      });

      return res.status(400).json({
        message: "Invalid phone number. Enter a valid 10-digit mobile number",
      });
    }

    logger.info("Phone validation passed", {
      phone,
    });

    /* ===============================
       CHECK USER
    =============================== */

    logger.info("Checking user with phone", {
      phone,
    });

    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE phone = ?",
      [phone]
    );

    logger.info("User query result", {
      count: rows.length,
    });

    if (rows.length === 0) {
      logger.warn("User not found for phone", {
        phone,
      });

      return res.status(404).json({
        message: "User not found",
      });
    }

    const user = rows[0];

    logger.info("User found", {
      userId: user.id,
      phone: user.phone,
    });

    /* ===============================
       GENERATE OTP
    =============================== */

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    logger.info("OTP generated", {
      userId: user.id,
    });

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    logger.info("OTP hashed and expiry set", {
      userId: user.id,
      expiry,
    });

    /* ===============================
       SAVE OTP IN DB
    =============================== */

    logger.info("Saving OTP to database", {
      userId: user.id,
    });

    await pool.query(
      `UPDATE users 
       SET mobile_otp = ?, 
           mobile_otp_expiry = ?,
           mobile_otp_attempts = 0,
           mobile_otp_blocked_until = NULL
       WHERE id = ?`,
      [hashedOtp, expiry, user.id]
    );

    logger.info("OTP saved successfully", {
      userId: user.id,
    });

    /* ===============================
       SEND SMS VIA TWILIO
    =============================== */
    const formattedPhone = `+91${phone}`;

    logger.info("Sending SMS via Twilio", {
      phone: formattedPhone,
      userId: user.id,
    });

    await sendSms(
      formattedPhone,
      `Your OTP is ${otp}. It is valid for 5 minutes. Do not share this OTP.`
    );

    logger.info("Mobile OTP sent via Twilio", {
      userId: user.id,
      phone,
    });

    return res.status(200).json({
      message: "OTP sent successfully",
    });

  } catch (error: any) {
    logger.error("SendMobileOtp Error", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });

    return res.status(500).json({
      message: "Failed to send OTP",
    });
  }
};

/* ======================================================
   VERIFY MOBILE OTP
====================================================== */
export const verifyMobileOtp = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone?.trim() || !otp?.trim()) {
      return res.status(400).json({
        message: "Phone and OTP are required",
      });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM users WHERE phone = ?",
      [phone.trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    /* ================= BLOCK CHECK ================= */
    if (
      user.mobile_otp_blocked_until &&
      new Date(user.mobile_otp_blocked_until) > new Date()
    ) {
      return res.status(403).json({
        message: "Too many failed attempts. Try again later.",
      });
    }

    if (!user.mobile_otp || !user.mobile_otp_expiry) {
      return res.status(400).json({
        message: "No OTP found. Request again.",
      });
    }

    if (new Date(user.mobile_otp_expiry) < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    const hashedIncomingOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    /* ================= INVALID OTP ================= */
    if (hashedIncomingOtp !== user.mobile_otp) {

      const attempts = user.mobile_otp_attempts + 1;

      if (attempts >= 5) {
        const blockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await pool.query(
          `UPDATE users 
           SET mobile_otp_attempts = ?, 
               mobile_otp_blocked_until = ?
           WHERE id = ?`,
          [attempts, blockUntil, user.id]
        );

        return res.status(403).json({
          message: "Too many failed attempts. Blocked for 15 minutes.",
        });
      }

      await pool.query(
        "UPDATE users SET mobile_otp_attempts = ? WHERE id = ?",
        [attempts, user.id]
      );

      return res.status(400).json({
        message: `Invalid OTP. Attempts left: ${5 - attempts}`,
      });
    }

    /* ================= SUCCESS ================= */

    await pool.query(
      `UPDATE users 
       SET mobile_otp = NULL,
           mobile_otp_expiry = NULL,
           mobile_otp_attempts = 0,
           mobile_otp_blocked_until = NULL
       WHERE id = ?`,
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    logger.info("User logged in via Mobile OTP", { userId: user.id });

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
    logger.error("VerifyMobileOtp Error", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};