import { Request, Response } from "express";
import { pool } from "../config/db";

// GET topics by category
export const getTopicsByCategorySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    // Find category by slug
    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [slug]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    const [topics]: any = await pool.query(
      "SELECT * FROM topics WHERE category_id = ?",
      [categoryId]
    );

    res.json(topics);

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ADD topic (Admin only)
export const addTopic = async (req: Request, res: Response) => {
  try {
    const { title, description, categorySlug } = req.body;

    if (!title || !categorySlug) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 🔥 Convert slug → category id
    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [categorySlug]
    );

    if (categoryRows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    const slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    await pool.query(
      "INSERT INTO topics (category_id, slug, title, description) VALUES (?, ?, ?, ?)",
      [categoryId, slug, title, description || null]
    );

    res.status(201).json({ message: "Topic added successfully" });

  } catch (error: any) {
    console.error("Add Topic Error:", error);
    res.status(500).json({ message: error.message });
  }
};
// DELETE topic
export const deleteTopic = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM topics WHERE id = ?", [id]);
    res.json({ message: "Topic deleted" });
  } catch {
    res.status(500).json({ message: "Error deleting topic" });
  }
};

export const getTopicWithProblems = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = (req as any).user?.id;

  try {
    const [topics]: any = await pool.query(
      "SELECT * FROM topics WHERE slug = ?",
      [slug]
    );

    if (topics.length === 0) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const topic = topics[0];

    const [problems]: any = await pool.query(`
      SELECT p.*,
      CASE WHEN sp.id IS NOT NULL THEN 1 ELSE 0 END AS isSolved
      FROM problems p
      LEFT JOIN solved_problems sp
        ON p.id = sp.problem_id
        AND sp.user_id = ?
      WHERE p.topic_id = ?
    `, [userId, topic.id]);

    res.json({
      ...topic,
      problems
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addProblem = async (req: Request, res: Response) => {
  try {
    const { title, difficulty, leetcode_link, topic_id } = req.body;

    if (!title || !difficulty || !topic_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await pool.query(
      "INSERT INTO problems (title, difficulty, leetcode_link, topic_id) VALUES (?, ?, ?, ?)",
      [title, difficulty, leetcode_link, topic_id]
    );

    res.json({ message: "Problem added successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markProblemSolved = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const problemId = req.params.id;

  try {
    await pool.query(
      "INSERT IGNORE INTO solved_problems (user_id, problem_id) VALUES (?, ?)",
      [userId, problemId]
    );

    res.json({ message: "Marked as solved" });

  } catch (err) {
    res.status(500).json({ message: "Error marking solved" });
  }
};

export const unmarkProblemSolved = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const problemId = req.params.id;

  try {
    await pool.query(
      "DELETE FROM solved_problems WHERE user_id = ? AND problem_id = ?",
      [userId, problemId]
    );

    res.json({ message: "Marked as unsolved" });

  } catch (err) {
    res.status(500).json({ message: "Error marking unsolved" });
  }
};

export const updateTopic = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, summary } = req.body;

  try {
    await pool.query(
      "UPDATE topics SET title = ?, description = ?, summary = ? WHERE id = ?",
      [title, description, summary, id]
    );

    res.json({ message: "Topic updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error updating topic" });
  }
};