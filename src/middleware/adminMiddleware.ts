import { Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const verifyAdmin = (
  req: any,
  res: Response,
  next: NextFunction
) => {

  const userId = req?.user?.id || "anonymous";
  
  logger.info("verifyAdmin middleware invoked", {
    userId
  });

  try {

    /* ===============================
       1️⃣ Check if user exists
    =============================== */
    if (!req.user) {

      logger.warn("Unauthorized access attempt - no user in request", {
        userId
      });

      return res.status(401).json({
        message: "Unauthorized access"
      });
    }


    /* ===============================
       2️⃣ Check admin role
    =============================== */
    if (req.user.role !== "ADMIN") {

      logger.warn("Forbidden access attempt - non-admin user", {
        userId,
        role: req.user.role
      });

      return res.status(403).json({
        message: "Admin access required"
      });
    }


    /* ===============================
       3️⃣ Access granted
    =============================== */
    logger.info("Admin access granted", {
      userId
    });

    next();

  } catch (error: any) {

    logger.error("verifyAdmin middleware error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};