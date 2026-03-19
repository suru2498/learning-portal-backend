import rateLimit from "express-rate-limit";

// 🔐 Auth limiter (login/signup/otp)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5, // max 5 requests
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 🤖 AI limiter (chat endpoint)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 10,
  message: {
    success: false,
    message: "AI limit exceeded. Slow down."
  }
});

// 🌍 Global limiter (optional)
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});