import { Request, Response } from "express";
import { pool } from "../config/db";

// ✅ Get All Categories
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM categories ORDER BY created_at DESC"
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
};

// ✅ Add Category (Admin Only)
export const addCategory = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Category name required" });
  }

  try {
    const [result]: any = await pool.query(
      "INSERT INTO categories (name) VALUES (?)",
      [name]
    );

    res.status(201).json({
      message: "Category added successfully",
      id: result.insertId,
    });
  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Category already exists" });
    }

    res.status(500).json({ message: "Error adding category" });
  }
};