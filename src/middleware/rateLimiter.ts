import rateLimit from "express-rate-limit";

/* =============================
   AUTH LIMITER (LOGIN / SIGNUP)
============================= */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5,

  message: {
    success: false,
    message: "Too many requests. Please try again later."
  },

  standardHeaders: true,
  legacyHeaders: false,

  skipSuccessfulRequests: true, // ✅ only failed attempts count

  keyGenerator: (req: any) => {
    return (
      req.body?.email ||
      req.body?.phone ||
      req.ip
    );
  }
});


/* =============================
   OTP LIMITER (STRICT)
============================= */
export const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,

  message: {
    success: false,
    message: "Too many OTP requests. Please wait."
  },

  keyGenerator: (req: any) => {
    return (
      req.body?.email ||
      req.body?.phone ||
      req.ip
    );
  }
});


/* =============================
   AI LIMITER (PER USER)
============================= */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,

  message: {
    success: false,
    message: "AI limit exceeded. Slow down."
  },

  keyGenerator: (req: any) => {
    // 🔥 requires verifyToken before this middleware
    return req.user?.id || req.ip;
  }
});


/* =============================
   GLOBAL LIMITER
============================= */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,

  keyGenerator: (req: any) => req.ip
});