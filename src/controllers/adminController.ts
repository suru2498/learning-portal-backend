import { Request, Response } from "express";
import { pool } from "../config/db";

export const createTopic = async (req: Request, res: Response) => {
  const { slug, title, content } = req.body;

  await pool.query(
    "INSERT INTO topics (slug, title, content) VALUES (?, ?, ?)",
    [slug, title, content]
  );

  res.json({ message: "Topic created" });
};

export const deleteTopic = async (req: Request, res: Response) => {
  const { id } = req.params;

  await pool.query("DELETE FROM topics WHERE id = ?", [id]);

  res.json({ message: "Topic deleted" });
};

export const createProblem = async (req: Request, res: Response) => {
  const { title, difficulty, leetcode_link, description, tagIds } = req.body;

  const [result]: any = await pool.query(
    "INSERT INTO problems (title, difficulty, leetcode_link, description) VALUES (?, ?, ?, ?)",
    [title, difficulty, leetcode_link, description]
  );

  const problemId = result.insertId;

  for (const tagId of tagIds) {
    await pool.query(
      "INSERT INTO problem_tags (problem_id, tag_id) VALUES (?, ?)",
      [problemId, tagId]
    );
  }

  res.json({ message: "Problem created" });
};


export const deleteProblem = async (req: Request, res: Response) => {
  const { id } = req.params;

  await pool.query("DELETE FROM problems WHERE id = ?", [id]);

  res.json({ message: "Problem deleted" });
};

