import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  logger.info("verifyToken middleware invoked", {
    path: req.originalUrl,
    method: req.method
  });

  try {

    const authHeader = req.headers.authorization;

    /* ======================================================
       1️⃣ Check Authorization Header
    ====================================================== */
    if (!authHeader) {

      logger.warn("Authorization header missing", {
        path: req.originalUrl,
        method: req.method
      });

      return res.status(401).json({
        message: "Access denied. No token provided."
      });
    }


    /* ======================================================
       2️⃣ Validate Bearer Format
    ====================================================== */
    if (!authHeader.startsWith("Bearer ")) {

      logger.warn("Invalid authorization header format", {
        header: authHeader,
        path: req.originalUrl
      });

      return res.status(401).json({
        message: "Invalid token format."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {

      logger.warn("Token missing after Bearer prefix", {
        path: req.originalUrl
      });

      return res.status(401).json({
        message: "Invalid token format."
      });
    }


    /* ======================================================
       3️⃣ Verify JWT
    ====================================================== */
    const decoded: any = jwt.verify(
  token,
  process.env.JWT_SECRET as string
);

logger.info("Decoded JWT payload", { decoded });

/* Normalize user object */
req.user = {
  id: decoded.id || decoded.userId,
  role: decoded.role,
  email: decoded.email
};

const userId = req.user.id;

logger.info("Token verified successfully", {
  userId,
  path: req.originalUrl
});

    next();

  } catch (error: any) {

    /* ======================================================
       4️⃣ Handle Specific JWT Errors
    ====================================================== */

    if (error.name === "TokenExpiredError") {

      logger.warn("JWT token expired", {
        path: req.originalUrl
      });

      return res.status(401).json({
        message: "Token expired. Please login again."
      });
    }

    if (error.name === "JsonWebTokenError") {

      logger.warn("Invalid JWT token", {
        path: req.originalUrl
      });

      return res.status(401).json({
        message: "Invalid token."
      });
    }


    logger.error("verifyToken middleware error", {
      message: error.message,
      stack: error.stack,
      path: req.originalUrl
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};