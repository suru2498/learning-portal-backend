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

  logger.info("SendMail request received", {
    userId,
    to,
    templateName
  });

  try {

    /* ======================================================
       1️⃣ Fetch Email Template
    ====================================================== */
    logger.info("Fetching email template from DB", {
      templateName
    });

    const [rows]: any = await pool.query(
      "SELECT subject, html_content FROM email_templates WHERE name = ?",
      [templateName]
    );

    if (!rows || rows.length === 0) {

      logger.warn("Email template not found", {
        templateName,
        userId
      });

      throw new Error("Email template not found");
    }

    subject = rows[0].subject;
    finalHtml = rows[0].html_content;

    logger.info("Email template fetched successfully", {
      templateName,
      subject
    });


    /* ======================================================
       2️⃣ Replace Template Variables
    ====================================================== */
    logger.info("Replacing template variables", {
      variableCount: Object.keys(variables).length
    });

    Object.keys(variables).forEach((key) => {

      const regex = new RegExp(`{{${key}}}`, "g");
      finalHtml = finalHtml.replace(regex, variables[key]);

    });

    logger.info("Template variables replaced successfully");


    /* ======================================================
       3️⃣ Send Email via Resend
    ====================================================== */
    logger.info("Sending email via Resend", {
      to,
      subject
    });

    const response = await resend.emails.send({
      from: `DSA Portal 🚀 <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html: finalHtml
    });

    logger.info("Email sent via Resend successfully", {
      userId,
      to,
      templateName,
      resendId: response?.data?.id
    });


    /* ======================================================
       4️⃣ Log SUCCESS Email in DB
    ====================================================== */
    try {

      logger.info("Logging SUCCESS email in DB", {
        userId,
        templateName
      });

      await pool.query(
        `INSERT INTO email_logs 
         (user_id, email, subject, html_content, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, to, subject, finalHtml, "SUCCESS"]
      );

      logger.info("SUCCESS email log inserted", {
        userId,
        templateName
      });

    } catch (logError: any) {

      logger.error("Failed to log SUCCESS email", {
        userId,
        message: logError.message
      });

    }

  } catch (error: any) {

    logger.error("SendMail error occurred", {
      userId,
      to,
      templateName,
      message: error.message,
      stack: error.stack
    });


    /* ======================================================
       Log FAILED Email in DB
    ====================================================== */
    try {

      logger.info("Logging FAILED email in DB", {
        userId,
        templateName
      });

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

      logger.info("FAILED email log inserted", {
        userId,
        templateName
      });

    } catch (logError: any) {

      logger.error("Failed to log FAILED email", {
        userId,
        message: logError.message
      });

    }

    throw new Error("Email sending failed");
  }
};