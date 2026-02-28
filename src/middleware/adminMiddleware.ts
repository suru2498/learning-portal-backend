import { Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const verifyAdmin = (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      logger.warn("verifyAdmin: Unauthorized access attempt - no user in request");

      return res.status(401).json({
        message: "Unauthorized access",
      });
    }

    if (req.user.role !== "ADMIN") {
      logger.warn("verifyAdmin: Forbidden access - non-admin user", {
        userId: req.user.id,
        role: req.user.role,
      });

      return res.status(403).json({
        message: "Admin access required",
      });
    }

    logger.info("verifyAdmin: Admin access granted", {
      userId: req.user.id,
    });

    next();

  } catch (error: any) {
    logger.error("verifyAdmin Middleware Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};