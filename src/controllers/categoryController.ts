import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";

/* ======================================================
   GET ALL CATEGORIES
====================================================== */
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM categories ORDER BY id ASC"
    );

    logger.info("Categories fetched successfully", {
      count: rows.length,
    });

    return res.status(200).json(rows);

  } catch (error: any) {
    logger.error("GetCategories Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Error fetching categories",
    });
  }
};


/* ======================================================
   ADD CATEGORY (ADMIN ONLY)
====================================================== */
export const addCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      logger.warn("AddCategory: Missing category name", {
        body: req.body,
      });

      return res.status(400).json({
        message: "Category name required",
      });
    }

    const [result]: any = await pool.query(
      "INSERT INTO categories (name) VALUES (?)",
      [name.trim()]
    );

    logger.info("Category added successfully", {
      categoryId: result.insertId,
      name,
    });

    return res.status(201).json({
      message: "Category added successfully",
      id: result.insertId,
    });

  } catch (error: any) {

    if (error.code === "ER_DUP_ENTRY") {
      logger.warn("AddCategory: Duplicate category attempt", {
        name: req.body.name,
      });

      return res.status(400).json({
        message: "Category already exists",
      });
    }

    logger.error("AddCategory Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Error adding category",
    });
  }
};