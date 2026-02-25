import nodemailer from "nodemailer";
import { pool } from "../config/db";

// Create transporter ONCE (not inside function)
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
    // 1️⃣ Fetch template
    const [rows]: any = await pool.query(
      "SELECT subject, html_content FROM email_templates WHERE name = ?",
      [templateName]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Email template not found");
    }

    subject = rows[0].subject;
    finalHtml = rows[0].html_content;

    // 2️⃣ Replace variables dynamically
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      finalHtml = finalHtml.replace(regex, variables[key]);
    });

    // 3️⃣ Send email
    await transporter.sendMail({
      from: `"DSA Portal 🚀" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: finalHtml,
    });

    // 4️⃣ Log success
    await pool.query(
      `INSERT INTO email_logs 
       (user_id, email, subject, html_content, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, to, subject, finalHtml, "SUCCESS"]
    );

  } catch (error: any) {

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
        error.message
      ]
    );

    console.error("Email Error:", error.message);
    throw error;
  }
};