import { createClient } from "redis";
import { logger } from "../utils/logger";

export const redisClient = createClient({
  url: process.env.REDIS_URL
});

export async function connectRedis() {

  logger.info("Initializing Redis connection", {
    redisUrl: process.env.REDIS_URL
  });

  try {

    await redisClient.connect();

    logger.info("Redis connected successfully");

  } catch (err: any) {

    logger.error("Redis connection failed", {
      message: err.message,
      stack: err.stack
    });
  }
}