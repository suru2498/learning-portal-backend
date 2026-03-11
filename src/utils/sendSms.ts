import twilio from "twilio";
import { logger } from "./logger";

/* ======================================================
   INITIALIZE TWILIO CLIENT
====================================================== */
logger.info("Initializing Twilio client", {
  accountSid: process.env.TWILIO_ACCOUNT_SID ? "configured" : "missing",
  phoneNumber: process.env.TWILIO_PHONE_NUMBER
});

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);


/* ======================================================
   SEND SMS
====================================================== */
export const sendSms = async (phone: string, message: string) => {

  logger.info("sendSms request received", {
    phone
  });

  try {

    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER as string,
      to: phone
    });

    logger.info("SMS sent successfully via Twilio", {
      phone,
      messageSid: response.sid
    });

  } catch (error: any) {

    logger.error("Twilio SMS sending failed", {
      phone,
      message: error.message,
      stack: error.stack
    });

    throw new Error("SMS sending failed");
  }
};