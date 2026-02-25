import { Request, Response } from "express";
import { pool } from "../config/db";

export const getTopicBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const [rows]: any = await pool.query(
      "SELECT * FROM topics WHERE slug = ?",
      [typeof slug === 'string' ? slug.toLowerCase() : slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Topic not found"
      });
    }

    return res.json(rows[0]);

  } catch (error) {
    console.error("Topic Error:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};