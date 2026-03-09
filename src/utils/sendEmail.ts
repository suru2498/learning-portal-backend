import { Resend } from "resend";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async (
  userId: number,
  to: string,
  templateName: string,
  variables: Record<string, string>
) => {
  let subject = "";
  let finalHtml = "";

  logger.info("SendMail: Function triggered", {
    userId,
    to,
    templateName,
    variables,
  });

  console.log("SendMail called:", { userId, to, templateName });

  try {
    /* ======================================================
       1️⃣ Fetch Template
    ====================================================== */
    logger.info("SendMail: Fetching email template", { templateName });

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

    logger.info("SendMail: Template fetched successfully", {
      subject,
    });

    /* ======================================================
       2️⃣ Replace Variables
    ====================================================== */
    logger.info("SendMail: Replacing template variables");

    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      finalHtml = finalHtml.replace(regex, variables[key]);
    });

    logger.info("SendMail: Variables replaced");

    /* ======================================================
       3️⃣ Send Email (Resend)
    ====================================================== */
    logger.info("SendMail: Sending email via Resend", {
      to,
      subject,
    });

    const response = await resend.emails.send({
  from: `DSA Portal 🚀 <${process.env.EMAIL_FROM}>`,
  to,
  subject,
  html: finalHtml,
});

console.log("Resend response:", response);

    logger.info("SendMail: Resend API response", {
      response,
    });

    logger.info("SendMail: Email sent successfully", {
      userId,
      to,
      templateName,
    });

    /* ======================================================
       4️⃣ Log Success In DB
    ====================================================== */
    try {
      logger.info("SendMail: Logging SUCCESS email to DB");

      await pool.query(
        `INSERT INTO email_logs 
         (user_id, email, subject, html_content, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, to, subject, finalHtml, "SUCCESS"]
      );

      logger.info("SendMail: SUCCESS email logged in DB");
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
       Log Failure In DB
    ====================================================== */
    try {
      logger.info("SendMail: Logging FAILED email to DB");

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

      logger.info("SendMail: FAILED email logged in DB");
    } catch (logError: any) {
      logger.error("SendMail: Failed to log FAILED email", {
        message: logError.message,
      });
    }

    throw new Error("Email sending failed");
  }
};