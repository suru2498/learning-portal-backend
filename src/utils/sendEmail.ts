import nodemailer from "nodemailer";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

// Create transporter ONCE
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendMail = async (
  userId: number,
  to: string,
  templateName: string,
  variables: Record<string, string>
) => {
  let subject = "";
  let finalHtml = "";

  try {
    /* ======================================================
       1️⃣ Fetch Template
    ====================================================== */
    const [rows]: any = await pool.query(
      "SELECT subject, html_content FROM email_templates WHERE name = ?",
      [templateName]
    );

    if (!rows || rows.length === 0) {
      logger.warn("SendMail: Template not found", { templateName });
      throw new Error("Email template not found");
    }

    subject = rows[0].subject;
    finalHtml = rows[0].html_content;

    /* ======================================================
       2️⃣ Replace Variables
    ====================================================== */
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      finalHtml = finalHtml.replace(regex, variables[key]);
    });

    /* ======================================================
       3️⃣ Send Email
    ====================================================== */
    await transporter.sendMail({
      from: `"DSA Portal 🚀" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: finalHtml,
    });

    logger.info("Email sent successfully", {
      userId,
      to,
      templateName,
    });

    /* ======================================================
       4️⃣ Log Success In DB
    ====================================================== */
    try {
      await pool.query(
        `INSERT INTO email_logs 
         (user_id, email, subject, html_content, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, to, subject, finalHtml, "SUCCESS"]
      );
    } catch (logError: any) {
      logger.error("SendMail: Failed to log SUCCESS email", {
        message: logError.message,
      });
    }

  } catch (error: any) {

    logger.error("SendMail Error", {
      message: error.message,
      stack: error.stack,
      userId,
      to,
      templateName,
    });

    /* ======================================================
       Log Failure In DB (Safe)
    ====================================================== */
    try {
      await pool.query(
        `INSERT INTO email_logs 
         (user_id, email, subject, html_content, status, error_message) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          to,
          subject || templateName,
          finalHtml || "",
          "FAILED",
          error.message,
        ]
      );
    } catch (logError: any) {
      logger.error("SendMail: Failed to log FAILED email", {
        message: logError.message,
      });
    }

    // Re-throw so calling controller can decide what to do
    throw new Error("Email sending failed");
  }
};