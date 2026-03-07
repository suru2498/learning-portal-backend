import twilio from "twilio";
import { logger } from "./logger";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

console.log(process.env.TWILIO_ACCOUNT_SID);
console.log(process.env.TWILIO_AUTH_TOKEN);

export const sendSms = async (phone: string, message: string) => {
      logger.info("SMS sent via Twilio", { phone });

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER as string,
      to: phone, // must include country code e.g. +919876543210
    });

    logger.info("SMS sent via Twilio", { phone });

  } catch (error: any) {
    logger.error("Twilio SMS failed", {
      message: error.message,
    });
    throw new Error("SMS sending failed");
  }
};