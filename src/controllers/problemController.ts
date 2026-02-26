import { Request, Response } from "express";
import { pool } from "../config/db";

export const addProblem = async (req: Request, res: Response) => {
  const { topicId, title, difficulty, leetcode_link } = req.body;

  try {
    await pool.query(
      "INSERT INTO problems (topic_id, title, difficulty, leetcode_link) VALUES (?, ?, ?, ?)",
      [topicId, title, difficulty, leetcode_link]
    );

    res.status(201).json({ message: "Problem added" });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};