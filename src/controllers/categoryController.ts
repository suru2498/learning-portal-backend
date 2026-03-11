import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { redisClient } from "../config/redis";

/* ======================================================
   GET ALL CATEGORIES
====================================================== */
export const getCategories = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || "anonymous";
  const cacheKey = "categories";

  logger.info("GetCategories request received", {
    userId,
  });

  try {

    /* 1️⃣ Check Cache */
    const cachedCategories = await redisClient.get(cacheKey);

    if (cachedCategories) {
      logger.info("Categories fetched from cache", {
        userId,
        cacheKey,
      });

      return res.status(200).json(JSON.parse(cachedCategories));
    }

    logger.info("Cache miss for categories", {
      userId,
      cacheKey,
    });

    /* 2️⃣ Fetch From DB */
    const [rows]: any = await pool.query(
      "SELECT * FROM categories ORDER BY id ASC"
    );

    logger.info("Categories fetched from DB", {
      userId,
      count: rows.length,
    });

    /* 3️⃣ Save to Redis */
    await redisClient.set(cacheKey, JSON.stringify(rows), {
      EX: 600,
    });

    logger.info("Categories stored in cache", {
      userId,
      cacheKey,
      ttlSeconds: 600,
    });

    return res.status(200).json(rows);

  } catch (error: any) {

    logger.error("GetCategories error occurred", {
      userId,
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
  const userId = (req as any).user?.id || "anonymous";

  logger.info("AddCategory request received", {
    userId,
    body: req.body,
  });

  try {
    const { name } = req.body;

    /* Validation */
    if (!name || !name.trim()) {
      logger.warn("AddCategory validation failed - name missing", {
        userId,
        body: req.body,
      });

      return res.status(400).json({
        message: "Category name required",
      });
    }

    /* Insert Category */
    const [result]: any = await pool.query(
      "INSERT INTO categories (name) VALUES (?)",
      [name.trim()]
    );

    const categoryId = result.insertId;

    logger.info("Category inserted into DB", {
      userId,
      categoryId,
      name,
    });

    /* Invalidate cache */
    await redisClient.del("categories");

    logger.info("Categories cache invalidated", {
      userId,
      cacheKey: "categories",
    });

    logger.info("Category added successfully", {
      userId,
      categoryId,
      name,
    });

    return res.status(201).json({
      message: "Category added successfully",
      id: categoryId,
    });

  } catch (error: any) {

    if (error.code === "ER_DUP_ENTRY") {
      logger.warn("AddCategory duplicate category attempt", {
        userId,
        name: req.body.name,
      });

      return res.status(400).json({
        message: "Category already exists",
      });
    }

    logger.error("AddCategory error occurred", {
      userId,
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      message: "Error adding category",
    });
  }
};