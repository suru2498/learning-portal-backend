import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

/* ======================================================
   CREATE TOPIC
====================================================== */
export const createTopic = async (req: Request, res: Response) => {
  try {
    const { slug, title, content } = req.body;

    if (!slug || !title) {
      logger.warn("CreateTopic: Missing required fields", {
        body: req.body,
      });

      return res.status(400).json({
        message: "Slug and title are required",
      });
    }

    const [result]: any = await pool.query(
      "INSERT INTO topics (slug, title, content) VALUES (?, ?, ?)",
      [slug.trim(), title.trim(), content || null]
    );

    logger.info("Topic created successfully", {
      topicId: result.insertId,
      slug,
    });

    return res.status(201).json({
      message: "Topic created successfully",
      topicId: result.insertId,
    });

  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      logger.warn("CreateTopic: Duplicate slug", {
        slug: req.body.slug,
      });

      return res.status(400).json({
        message: "Topic with this slug already exists",
      });
    }

    logger.error("CreateTopic Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


/* ======================================================
   DELETE TOPIC
====================================================== */
export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      logger.warn("DeleteTopic: Missing topic id");
      return res.status(400).json({
        message: "Topic id is required",
      });
    }

    const [result]: any = await pool.query(
      "DELETE FROM topics WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      logger.warn("DeleteTopic: Topic not found", { id });
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    logger.info("Topic deleted successfully", { id });

    return res.status(200).json({
      message: "Topic deleted successfully",
    });

  } catch (error: any) {
    logger.error("DeleteTopic Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


/* ======================================================
   CREATE PROBLEM
====================================================== */
export const createProblem = async (req: Request, res: Response) => {
  try {
    const {
      title,
      difficulty,
      leetcode_link,
      description,
      tagIds,
    } = req.body;

    if (!title || !difficulty) {
      logger.warn("CreateProblem: Missing required fields", {
        body: req.body,
      });

      return res.status(400).json({
        message: "Title and difficulty are required",
      });
    }

    const [result]: any = await pool.query(
      `INSERT INTO problems 
       (title, difficulty, leetcode_link, description) 
       VALUES (?, ?, ?, ?)`,
      [
        title.trim(),
        difficulty,
        leetcode_link || null,
        description || null,
      ]
    );

    const problemId = result.insertId;

    // Insert tags if provided
    if (Array.isArray(tagIds) && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await pool.query(
          "INSERT INTO problem_tags (problem_id, tag_id) VALUES (?, ?)",
          [problemId, tagId]
        );
      }
    }

    logger.info("Problem created successfully", {
      problemId,
      title,
    });

    return res.status(201).json({
      message: "Problem created successfully",
      problemId,
    });

  } catch (error: any) {
    logger.error("CreateProblem Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


/* ======================================================
   DELETE PROBLEM
====================================================== */
export const deleteProblem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      logger.warn("DeleteProblem: Missing problem id");
      return res.status(400).json({
        message: "Problem id is required",
      });
    }

    const [result]: any = await pool.query(
      "DELETE FROM problems WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      logger.warn("DeleteProblem: Problem not found", { id });
      return res.status(404).json({
        message: "Problem not found",
      });
    }

    logger.info("Problem deleted successfully", { id });

    return res.status(200).json({
      message: "Problem deleted successfully",
    });

  } catch (error: any) {
    logger.error("DeleteProblem Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};