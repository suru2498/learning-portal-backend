import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

export const addProblem = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || "anonymous";

  logger.info("AddProblem request received", {
    userId,
    body: req.body,
  });

  try {
    const { topicId, title, difficulty, leetcode_link } = req.body;

    /* ===============================
       Validation
    =============================== */
    if (!topicId || !title || !difficulty) {
      logger.warn("AddProblem validation failed - missing fields", {
        userId,
        body: req.body,
      });

      return res.status(400).json({
        message: "topicId, title and difficulty are required",
      });
    }

    /* ===============================
       Insert Problem
    =============================== */
    const [result]: any = await pool.query(
      "INSERT INTO problems (topic_id, title, difficulty, leetcode_link) VALUES (?, ?, ?, ?)",
      [
        topicId,
        title.trim(),
        difficulty,
        leetcode_link || null,
      ]
    );

    const problemId = result.insertId;

    logger.info("Problem inserted into DB", {
      userId,
      problemId,
      topicId,
    });

    logger.info("Problem added successfully", {
      userId,
      problemId,
      topicId,
      title,
    });

    return res.status(201).json({
      message: "Problem added successfully",
      problemId,
    });

  } catch (error: any) {

    logger.error("AddProblem error occurred", {
      userId,
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};