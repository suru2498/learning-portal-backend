import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL
});

export async function connectRedis() {
  try {
    await redisClient.connect();
    console.log("Redis connected");
  } catch (err) {
    console.error("Redis connection error:", err);
  }
}