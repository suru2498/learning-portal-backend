import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { redisClient } from "../config/redis";

export const getTopicsByCategorySlug = async (
  req: Request,
  res: Response
) => {
  const { slug } = req.params;
  const cacheKey = `topics_category:${slug}`;

  try {

    if (!slug) {
      logger.warn("GetTopicsByCategory: Missing slug");
      return res.status(400).json({ message: "Category slug required" });
    }

    // 1️⃣ Check Redis Cache
    const cachedTopics = await redisClient.get(cacheKey);

    if (cachedTopics) {
      logger.info("Topics fetched from cache", { categorySlug: slug });
      return res.status(200).json(JSON.parse(cachedTopics));
    }

    // 2️⃣ Fetch category id
    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [slug]
    );

    if (categoryRows.length === 0) {
      logger.warn("GetTopicsByCategory: Category not found", { slug });
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    // 3️⃣ Fetch topics from DB
    const [rows]: any = await pool.query(
      "SELECT * FROM topics WHERE category_id = ? AND parent_id IS NULL",
      [categoryId]
    );

    logger.info("Topics fetched from DB", {
      categorySlug: slug,
      count: rows.length
    });

    // 4️⃣ Save to Redis (5 min TTL)
    await redisClient.set(cacheKey, JSON.stringify(rows), {
      EX: 300
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

export const getTopicWithProblems = async (
  req: Request,
  res: Response
) => {
  const { slug } = req.params;
  const userId = (req as any).user?.id || null;

  const cacheKey = `topic_problems:${slug}:${userId}`;

  try {

    // 1️⃣ Check Redis cache
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      logger.info("Topic with problems fetched from cache", {
        topicSlug: slug,
        userId
      });

      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2️⃣ Fetch topic
    const [topics]: any = await pool.query(
      "SELECT * FROM topics WHERE slug = ?",
      [slug]
    );

    if (topics.length === 0) {
      logger.warn("GetTopicWithProblems: Topic not found", { slug });
      return res.status(404).json({ message: "Topic not found" });
    }

    const topic = topics[0];

    // 3️⃣ Fetch problems
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

    const responseData = {
      ...topic,
      problems,
    };

    logger.info("Topic with problems fetched from DB", {
      topicSlug: slug,
      problemCount: problems.length,
      userId
    });

    // 4️⃣ Save to Redis (5 min)
    await redisClient.set(cacheKey, JSON.stringify(responseData), {
      EX: 300
    });

    return res.status(200).json(responseData);

  } catch (error: any) {
    logger.error("GetTopicWithProblems Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

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

export const updateDSATopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, pseudo_code } = req.body;

    // 1️⃣ Update topic
    const [result]: any = await pool.query(
      `UPDATE topics 
       SET title = ?, description = ?, pseudo_code = ?
       WHERE id = ?`,
      [title, description, pseudo_code, id]
    );

    if (result.affectedRows === 0) {
      logger.warn("UpdateTopic: Topic not found", { id });
      return res.status(404).json({ message: "Topic not found" });
    }

    // 2️⃣ Get topic slug (needed for cache invalidation)
    const [rows]: any = await pool.query(
      "SELECT slug FROM topics WHERE id = ?",
      [id]
    );

    const slug = rows?.[0]?.slug;

    if (slug) {
      // remove topic cache for all users
      const keys = await redisClient.keys(`topic_problems:${slug}:*`);

      if (keys.length > 0) {
        await redisClient.del(keys);
      }
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
  const { slug } = req.params;
  const cacheKey = `child_topics:${slug}`;

  try {

    // 1️⃣ Check Redis Cache
    const cachedChildren = await redisClient.get(cacheKey);

    if (cachedChildren) {
      logger.info("Child topics fetched from cache", { slug });

      return res.status(200).json(JSON.parse(cachedChildren));
    }

    // 2️⃣ Find parent topic
    const [parentRows]: any = await pool.query(
      "SELECT id FROM topics WHERE slug = ?",
      [slug]
    );

    if (parentRows.length === 0) {
      logger.warn("GetChildTopics: Parent topic not found", { slug });

      return res.status(404).json({ message: "Parent topic not found" });
    }

    const parentId = parentRows[0].id;

    // 3️⃣ Fetch children topics
    const [children]: any = await pool.query(
      "SELECT id, title, slug FROM topics WHERE parent_id = ?",
      [parentId]
    );

    logger.info("Child topics fetched from DB", {
      parentSlug: slug,
      count: children.length
    });

    // 4️⃣ Save in Redis (10 min)
    await redisClient.set(cacheKey, JSON.stringify(children), {
      EX: 600
    });

    return res.status(200).json(children);

  } catch (error: any) {
    logger.error("GetChildTopics Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Server error" });
  }
};

export const createTopic = async (req: Request, res: Response) => {
  try {
    const { title, slug, categorySlug, parentSlug, description, pseudo_code } = req.body;

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
   (title, slug, category_id, parent_id, description, pseudo_code) 
   VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        slug.trim(),
        categoryId,
        parentId,
        description || null,
        pseudo_code || null
      ]
    );

    res.status(201).json({ message: "Topic created successfully" });

  } catch (error: any) {
    logger.error("Create topic error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Slug already exists" });
    }

    res.status(500).json({ message: "Server error" });
  }
};

export const getTopicBySlug = async (req: Request, res: Response) => {
  const { slug } = req.params;
  const cacheKey = `topic:${slug}`;

  try {

    // 1️⃣ Check Redis cache
    const cachedTopic = await redisClient.get(cacheKey);

    if (cachedTopic) {
      logger.info("Topic fetched from cache", { slug });
      return res.status(200).json(JSON.parse(cachedTopic));
    }

    // 2️⃣ Cache miss → fetch from DB
    const [rows]: any = await pool.query(
      "SELECT id, title, description, pseudo_code FROM topics WHERE slug = ?",
      [slug]
    );

    if (!rows.length) {
      logger.warn("GetTopicBySlug: Topic not found", { slug });
      return res.status(404).json({ message: "Topic not found" });
    }

    const topic = rows[0];

    logger.info("Topic fetched from DB", { slug });

    // 3️⃣ Save to Redis (10 min TTL)
    await redisClient.set(cacheKey, JSON.stringify(topic), {
      EX: 600,
    });

    return res.status(200).json(topic);

  } catch (error: any) {
    logger.error("GetTopicBySlug Error", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Server error" });
  }
};

export const updateSystemDesignTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, pseudo_code } = req.body;

    // 1️⃣ Update DB
    await pool.query(
      `UPDATE topics 
       SET title = ?, description = ?, pseudo_code = ?
       WHERE id = ?`,
      [title, description, pseudo_code, id]
    );

    // 2️⃣ Get slug + parent_id for cache invalidation
    const [rows]: any = await pool.query(
      "SELECT slug, parent_id FROM topics WHERE id = ?",
      [id]
    );

    if (rows.length > 0) {
      const { slug, parent_id } = rows[0];

      // 3️⃣ Clear topic detail cache
      await redisClient.del(`topic:${slug}`);

      // 4️⃣ Clear topic problems cache (for all users)
      const problemKeys = await redisClient.keys(`topic_problems:${slug}:*`);
      if (problemKeys.length > 0) {
        await redisClient.del(problemKeys);
      }

      // 5️⃣ Clear child topics cache if needed
      if (parent_id) {
        const [parent]: any = await pool.query(
          "SELECT slug FROM topics WHERE id = ?",
          [parent_id]
        );

        if (parent.length > 0) {
          await redisClient.del(`child_topics:${parent[0].slug}`);
        }
      }
    }

    logger.info("System design topic updated successfully", { id });

    return res.json({
      message: "Topic updated successfully",
    });

  } catch (err: any) {
    logger.error("UpdateSystemDesignTopic Error", {
      message: err.message,
      stack: err.stack,
    });

    return res.status(500).json({
      error: err.message,
    });
  }
};

export const deleteSystemDesignTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM topics WHERE id = ?",
      [id]
    );

    res.json({
      message: "Topic deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
};