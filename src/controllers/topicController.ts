import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

/* ======================================================
   GET TOPICS BY CATEGORY SLUG
====================================================== */
export const getTopicsByCategorySlug = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      logger.warn("GetTopicsByCategory: Missing slug");
      return res.status(400).json({ message: "Category slug required" });
    }

    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [slug]
    );

    if (categoryRows.length === 0) {
      logger.warn("GetTopicsByCategory: Category not found", { slug });
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    const [rows] = await pool.query(
      "SELECT * FROM topics WHERE category_id = ? AND parent_id IS NULL",
      [categoryId]
    );

    logger.info("DSA Topics fetched successfully", {
      categorySlug: slug
    });

    return res.status(200).json(rows);
  } catch (error: any) {
    logger.error("GetTopicsByCategory Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   ADD TOPIC
====================================================== */
export const addTopic = async (req: Request, res: Response) => {
  try {
    const { title, description, categorySlug } = req.body;

    if (!title || !categorySlug) {
      logger.warn("AddTopic: Missing required fields", {
        body: req.body,
      });

      return res.status(400).json({ message: "Missing required fields" });
    }

    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [categorySlug]
    );

    if (categoryRows.length === 0) {
      logger.warn("AddTopic: Category not found", { categorySlug });
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    const [result]: any = await pool.query(
      "INSERT INTO topics (category_id, slug, title, description) VALUES (?, ?, ?, ?)",
      [categoryId, slug, title.trim(), description || null]
    );

    logger.info("Topic added successfully", {
      topicId: result.insertId,
      categorySlug,
    });

    return res.status(201).json({
      message: "Topic added successfully",
      topicId: result.insertId,
    });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      logger.warn("AddTopic: Duplicate topic slug", {
        title: req.body.title,
      });

      return res.status(400).json({ message: "Topic already exists" });
    }

    logger.error("AddTopic Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   DELETE TOPIC
====================================================== */
export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      logger.warn("DeleteTopic: Missing id");
      return res.status(400).json({ message: "Topic id required" });
    }

    const [result]: any = await pool.query(
      "DELETE FROM topics WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      logger.warn("DeleteTopic: Topic not found", { id });
      return res.status(404).json({ message: "Topic not found" });
    }

    logger.info("Topic deleted successfully", { id });

    return res.status(200).json({ message: "Topic deleted successfully" });
  } catch (error: any) {
    logger.error("DeleteTopic Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   GET TOPIC WITH PROBLEMS
====================================================== */
export const getTopicWithProblems = async (
  req: Request,
  res: Response
) => {
  try {
    const { slug } = req.params;
    const userId = (req as any).user?.id || null;

    const [topics]: any = await pool.query(
      "SELECT * FROM topics WHERE slug = ?",
      [slug]
    );

    if (topics.length === 0) {
      logger.warn("GetTopicWithProblems: Topic not found", { slug });
      return res.status(404).json({ message: "Topic not found" });
    }

    const topic = topics[0];

    const [problems]: any = await pool.query(
      `
      SELECT p.*,
      CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END AS isSolved
      FROM problems p
      LEFT JOIN solved_problems sp
        ON p.id = sp.problem_id
        AND sp.user_id = ?
      WHERE p.topic_id = ?
      ORDER BY p.id ASC
      `,
      [userId, topic.id]
    );

    logger.info("Topic with problems fetched", {
      topicSlug: slug,
      problemCount: problems.length,
    });

    return res.status(200).json({
      ...topic,
      problems,
    });
  } catch (error: any) {
    logger.error("GetTopicWithProblems Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   ADD PROBLEM
====================================================== */
export const addProblem = async (req: Request, res: Response) => {
  try {
    const { title, difficulty, leetcode_link, topic_id } = req.body;

    if (!title || !difficulty || !topic_id) {
      logger.warn("AddProblem: Missing required fields", {
        body: req.body,
      });

      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const [result]: any = await pool.query(
      "INSERT INTO problems (title, difficulty, leetcode_link, topic_id) VALUES (?, ?, ?, ?)",
      [title.trim(), difficulty, leetcode_link || null, topic_id]
    );

    logger.info("Problem added successfully", {
      problemId: result.insertId,
      topicId: topic_id,
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

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   MARK PROBLEM SOLVED
====================================================== */
export const markProblemSolved = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user?.id;
    const problemId = req.params.id;

    await pool.query(
      "INSERT IGNORE INTO solved_problems (user_id, problem_id) VALUES (?, ?)",
      [userId, problemId]
    );

    logger.info("Problem marked as solved", {
      userId,
      problemId,
    });

    return res.status(200).json({ message: "Marked as solved" });
  } catch (error: any) {
    logger.error("MarkProblemSolved Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   UNMARK PROBLEM SOLVED
====================================================== */
export const unmarkProblemSolved = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = (req as any).user?.id;
    const problemId = req.params.id;

    await pool.query(
      "DELETE FROM solved_problems WHERE user_id = ? AND problem_id = ?",
      [userId, problemId]
    );

    logger.info("Problem unmarked as solved", {
      userId,
      problemId,
    });

    return res.status(200).json({ message: "Marked as unsolved" });
  } catch (error: any) {
    logger.error("UnmarkProblemSolved Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ======================================================
   UPDATE TOPIC
====================================================== */
export const updateTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, summary, pseudo_code } = req.body;

    const [result]: any = await pool.query(
      `UPDATE topics 
   SET title = ?, description = ?, summary = ?, pseudo_code = ?
   WHERE id = ?`,
      [title, description, summary, pseudo_code, id]
    );

    if (result.affectedRows === 0) {
      logger.warn("UpdateTopic: Topic not found", { id });
      return res.status(404).json({ message: "Topic not found" });
    }

    logger.info("Topic updated successfully", { id });

    return res.status(200).json({
      message: "Topic updated successfully",
    });
  } catch (error: any) {
    logger.error("UpdateTopic Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getChildTopics = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // 1️⃣ Find parent topic
    const [parentRows]: any = await pool.query(
      "SELECT id FROM topics WHERE slug = ?",
      [slug]
    );

    if (parentRows.length === 0) {
      return res.status(404).json({ message: "Parent topic not found" });
    }

    const parentId = parentRows[0].id;

    // 2️⃣ Fetch children using parent_id
    const [children]: any = await pool.query(
      "SELECT id, title, slug FROM topics WHERE parent_id = ?",
      [parentId]
    );

    res.json(children);
  } catch (error) {
    console.error("Error fetching children:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createTopic = async (req: Request, res: Response) => {
  try {
    const { title, slug, categorySlug, parentSlug, description, summary, pseudo_code } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ message: "Title and slug are required" });
    }

    let categoryId: number | null = null;
    let parentId: number | null = null;

    // If nested topic
    if (parentSlug) {
      const [parent]: any = await pool.query(
        "SELECT id, category_id FROM topics WHERE slug = ?",
        [parentSlug]
      );

      if (!parent.length) {
        return res.status(400).json({ message: "Parent topic not found" });
      }

      parentId = parent[0].id;
      categoryId = parent[0].category_id;
    }

    // If top-level topic
    if (categorySlug) {
      const [category]: any = await pool.query(
        "SELECT id FROM categories WHERE slug = ?",
        [categorySlug]
      );

      if (!category.length) {
        return res.status(400).json({ message: "Category not found" });
      }

      categoryId = category[0].id;
    }

    await pool.query(
      `INSERT INTO topics 
   (title, slug, category_id, parent_id, description, summary, pseudo_code) 
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        slug.trim(),
        categoryId,
        parentId,
        description || null,
        summary || null,
        pseudo_code || null
      ]
    );

    res.status(201).json({ message: "Topic created successfully" });

  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Slug already exists" });
    }

    res.status(500).json({ message: "Server error" });
  }
};