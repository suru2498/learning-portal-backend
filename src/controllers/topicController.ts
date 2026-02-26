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

export const getTopicByTopicName = async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const [topicRows]: any = await pool.query(
      "SELECT * FROM topics WHERE slug = ?",
      [slug]
    );

    if (topicRows.length === 0) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const topic = topicRows[0];

    const [problemRows]: any = await pool.query(
      "SELECT * FROM problems WHERE topic_id = ? ORDER BY created_at DESC",
      [topic.id]
    );

    res.json({
      topic,
      problems: problemRows,
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};