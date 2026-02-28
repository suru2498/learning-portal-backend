import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

export const addProblem = async (req: Request, res: Response) => {
  try {
    const { topicId, title, difficulty, leetcode_link } = req.body;

    // ✅ Validation
    if (!topicId || !title || !difficulty) {
      logger.warn("AddProblem: Missing required fields", {
        body: req.body,
      });

      return res.status(400).json({
        message: "topicId, title and difficulty are required",
      });
    }

    const [result]: any = await pool.query(
      "INSERT INTO problems (topic_id, title, difficulty, leetcode_link) VALUES (?, ?, ?, ?)",
      [
        topicId,
        title.trim(),
        difficulty,
        leetcode_link || null,
      ]
    );

    logger.info("Problem added successfully", {
      problemId: result.insertId,
      topicId,
      title,
    });

    return res.status(201).json({
      message: "Problem added successfully",
      problemId: result.insertId,
    });

  } catch (error: any) {

    logger.error("AddProblem Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};