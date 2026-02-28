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
  try {
    const authHeader = req.headers.authorization;

    /* ======================================================
       1️⃣ Check Authorization Header
    ====================================================== */
    if (!authHeader) {
      logger.warn("verifyToken: No authorization header provided", {
        path: req.originalUrl,
        method: req.method,
      });

      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    /* ======================================================
       2️⃣ Validate Bearer Format
    ====================================================== */
    if (!authHeader.startsWith("Bearer ")) {
      logger.warn("verifyToken: Invalid token format", {
        header: authHeader,
      });

      return res.status(401).json({
        message: "Invalid token format.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      logger.warn("verifyToken: Token missing after Bearer");

      return res.status(401).json({
        message: "Invalid token format.",
      });
    }

    /* ======================================================
       3️⃣ Verify JWT
    ====================================================== */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    req.user = decoded;
    next();

  } catch (error: any) {

    /* ======================================================
       4️⃣ Handle Specific JWT Errors
    ====================================================== */
    if (error.name === "TokenExpiredError") {
      logger.warn("verifyToken: Token expired");

      return res.status(401).json({
        message: "Token expired. Please login again.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn("verifyToken: Invalid token");

      return res.status(401).json({
        message: "Invalid token.",
      });
    }

    logger.error("verifyToken Middleware Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};