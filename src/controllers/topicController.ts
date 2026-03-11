import { Request, Response } from "express";
import { pool } from "../config/db";
import { logger } from "../utils/logger";
import { redisClient } from "../config/redis";

export const getTopicsByCategorySlug = async (req: Request, res: Response) => {

  const { slug } = req.params;
  const userId = (req as any).user?.id || "anonymous";
  const cacheKey = `topics_category:${slug}`;

  logger.info("GetTopicsByCategory request received", { slug, userId });

  try {

    if (!slug) {
      logger.warn("Category slug missing", { userId });
      return res.status(400).json({ message: "Category slug required" });
    }

    const cachedTopics = await redisClient.get(cacheKey);

    if (cachedTopics) {
      logger.info("Topics fetched from cache", { slug, userId });
      return res.status(200).json(JSON.parse(cachedTopics));
    }

    logger.info("Cache miss for category topics", { slug, userId });

    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [slug]
    );

    if (!categoryRows.length) {
      logger.warn("Category not found", { slug, userId });
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    const [rows]: any = await pool.query(
      "SELECT * FROM topics WHERE category_id = ? AND parent_id IS NULL",
      [categoryId]
    );

    logger.info("Topics fetched from DB", {
      slug,
      count: rows.length,
      userId
    });

    await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 300 });

    logger.info("Topics cached", { cacheKey, userId });

    return res.status(200).json(rows);

  } catch (error: any) {

    logger.error("GetTopicsByCategory Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addTopic = async (req: Request, res: Response) => {

  const userId = (req as any).user?.id || "anonymous";

  logger.info("AddTopic request received", {
    userId,
    body: req.body
  });

  try {

    const { title, description, categorySlug } = req.body;

    if (!title || !categorySlug) {
      logger.warn("AddTopic validation failed", { userId });
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [categoryRows]: any = await pool.query(
      "SELECT id FROM categories WHERE slug = ?",
      [categorySlug]
    );

    if (!categoryRows.length) {
      logger.warn("Category not found for topic creation", {
        categorySlug,
        userId
      });

      return res.status(404).json({ message: "Category not found" });
    }

    const categoryId = categoryRows[0].id;

    const slug = title.toLowerCase().trim().replace(/\s+/g, "-");

    const [result]: any = await pool.query(
      "INSERT INTO topics (category_id, slug, title, description) VALUES (?, ?, ?, ?)",
      [categoryId, slug, title.trim(), description || null]
    );

    /* 🔥 CLEAR CACHE */
    await redisClient.del(`topics_category:${categorySlug}`);

    logger.info("Topics cache invalidated", {
      cacheKey: `topics_category:${categorySlug}`,
      userId
    });

    logger.info("Topic created successfully", {
      topicId: result.insertId,
      slug,
      userId
    });

    return res.status(201).json({
      message: "Topic added successfully",
      topicId: result.insertId
    });

  } catch (error: any) {

    if (error.code === "ER_DUP_ENTRY") {
      logger.warn("Duplicate topic slug detected", {
        userId,
        title: req.body.title
      });

      return res.status(400).json({
        message: "Topic already exists"
      });
    }

    logger.error("AddTopic Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTopic = async (req: Request, res: Response) => {

  const { id } = req.params;
  const userId = (req as any).user?.id || "anonymous";

  logger.info("DeleteTopic request received", { id, userId });

  try {

    if (!id) {
      logger.warn("Topic id missing", { userId });
      return res.status(400).json({ message: "Topic id required" });
    }

    /* Get categorySlug before delete */
    const [rows]: any = await pool.query(
      `SELECT c.slug as categorySlug
       FROM topics t
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    const categorySlug = rows?.[0]?.categorySlug;

    const [result]: any = await pool.query(
      "DELETE FROM topics WHERE id = ?",
      [id]
    );

    if (!result.affectedRows) {
      logger.warn("Topic not found for deletion", { id, userId });
      return res.status(404).json({ message: "Topic not found" });
    }

    /* 🔥 CLEAR CACHE */
    if (categorySlug) {
      await redisClient.del(`topics_category:${categorySlug}`);

      logger.info("Topics cache invalidated", {
        cacheKey: `topics_category:${categorySlug}`,
        userId
      });
    }

    logger.info("Topic deleted successfully", { id, userId });

    return res.status(200).json({ message: "Topic deleted successfully" });

  } catch (error: any) {

    logger.error("DeleteTopic Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicWithProblems = async (req: Request, res: Response) => {

  const { slug } = req.params;
  const userId = (req as any).user?.id || "anonymous";
  const cacheKey = `topic_problems:${slug}:${userId}`;

  logger.info("GetTopicWithProblems request received", {
    slug,
    userId
  });

  try {

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      logger.info("Topic with problems fetched from cache", {
        slug,
        userId
      });

      return res.status(200).json(JSON.parse(cachedData));
    }

    const [topics]: any = await pool.query(
      "SELECT * FROM topics WHERE slug = ?",
      [slug]
    );

    if (!topics.length) {
      logger.warn("Topic not found", { slug, userId });
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

    const responseData = {
      ...topic,
      problems
    };

    logger.info("Topic with problems fetched from DB", {
      slug,
      problemCount: problems.length,
      userId
    });

    await redisClient.set(cacheKey, JSON.stringify(responseData), { EX: 300 });

    return res.status(200).json(responseData);

  } catch (error: any) {

    logger.error("GetTopicWithProblems Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addProblem = async (req: Request, res: Response) => {

  const userId = (req as any).user?.id || "anonymous";

  logger.info("AddProblem request received", {
    userId,
    body: req.body
  });

  try {

    const { title, difficulty, leetcode_link, topic_id } = req.body;

    /* ===============================
       1️⃣ Validation
    =============================== */
    if (!title || !difficulty || !topic_id) {

      logger.warn("AddProblem validation failed - missing fields", {
        userId,
        body: req.body
      });

      return res.status(400).json({
        message: "Missing required fields"
      });
    }


    /* ===============================
       2️⃣ Insert Problem
    =============================== */
    const [result]: any = await pool.query(
      "INSERT INTO problems (title, difficulty, leetcode_link, topic_id) VALUES (?, ?, ?, ?)",
      [title.trim(), difficulty, leetcode_link || null, topic_id]
    );

    const problemId = result.insertId;

    logger.info("Problem inserted into DB", {
      problemId,
      topicId: topic_id,
      userId
    });


    /* ===============================
       3️⃣ Success Response
    =============================== */
    logger.info("Problem added successfully", {
      problemId,
      topicId: topic_id,
      userId
    });

    return res.status(201).json({
      message: "Problem added successfully",
      problemId
    });

  } catch (error: any) {

    logger.error("AddProblem Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const markProblemSolved = async (req: Request, res: Response) => {

  const userId = (req as any).user?.id || "anonymous";
  const problemId = req.params.id;

  logger.info("MarkProblemSolved request received", {
    userId,
    problemId
  });

  try {

    await pool.query(
      "INSERT IGNORE INTO solved_problems (user_id, problem_id) VALUES (?, ?)",
      [userId, problemId]
    );

    logger.info("Problem marked as solved", {
      userId,
      problemId
    });

    return res.status(200).json({
      message: "Marked as solved"
    });

  } catch (error: any) {

    logger.error("MarkProblemSolved Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const unmarkProblemSolved = async (req: Request, res: Response) => {

  const userId = (req as any).user?.id || "anonymous";
  const problemId = req.params.id;

  logger.info("UnmarkProblemSolved request received", {
    userId,
    problemId
  });

  try {

    await pool.query(
      "DELETE FROM solved_problems WHERE user_id = ? AND problem_id = ?",
      [userId, problemId]
    );

    logger.info("Problem unmarked as solved", {
      userId,
      problemId
    });

    return res.status(200).json({
      message: "Marked as unsolved"
    });

  } catch (error: any) {

    logger.error("UnmarkProblemSolved Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const updateDSATopic = async (req: Request, res: Response) => {

  const { id } = req.params;
  const { title, description, pseudo_code } = req.body;
  const userId = (req as any).user?.id || "anonymous";

  logger.info("UpdateDSATopic request received", {
    id,
    userId
  });

  try {

    /* ===============================
       1️⃣ Update topic
    =============================== */
    const [result]: any = await pool.query(
      `UPDATE topics 
       SET title = ?, description = ?, pseudo_code = ?
       WHERE id = ?`,
      [title, description, pseudo_code, id]
    );

    if (!result.affectedRows) {

      logger.warn("UpdateDSATopic topic not found", {
        id,
        userId
      });

      return res.status(404).json({
        message: "Topic not found"
      });
    }


    /* ===============================
       2️⃣ Get slug + categorySlug
    =============================== */
    const [rows]: any = await pool.query(
      `SELECT t.slug, c.slug as categorySlug
       FROM topics t
       JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    const slug = rows?.[0]?.slug;
    const categorySlug = rows?.[0]?.categorySlug;


    /* ===============================
       3️⃣ Clear topic problem cache
    =============================== */
    if (slug) {

      const keys = await redisClient.keys(`topic_problems:${slug}:*`);

      if (keys.length > 0) {

        await redisClient.del(keys);

        logger.info("Topic problems cache invalidated", {
          slug,
          deletedKeys: keys.length,
          userId
        });
      }
    }


    /* ===============================
       4️⃣ Clear category topics cache
    =============================== */
    if (categorySlug) {

      await redisClient.del(`topics_category:${categorySlug}`);

      logger.info("Category topics cache invalidated", {
        cacheKey: `topics_category:${categorySlug}`,
        userId
      });
    }


    logger.info("DSA topic updated successfully", {
      id,
      userId
    });

    return res.status(200).json({
      message: "Topic updated successfully"
    });

  } catch (error: any) {

    logger.error("UpdateDSATopic Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const getChildTopics = async (req: Request, res: Response) => {

  const { slug } = req.params;
  const userId = (req as any).user?.id || "anonymous";
  const cacheKey = `child_topics:${slug}`;

  logger.info("GetChildTopics request received", {
    slug,
    userId
  });

  try {

    const cachedChildren = await redisClient.get(cacheKey);

    if (cachedChildren) {
      logger.info("Child topics fetched from cache", {
        slug,
        userId
      });

      return res.status(200).json(JSON.parse(cachedChildren));
    }

    const [parentRows]: any = await pool.query(
      "SELECT id FROM topics WHERE slug = ?",
      [slug]
    );

    if (!parentRows.length) {

      logger.warn("Parent topic not found", {
        slug,
        userId
      });

      return res.status(404).json({
        message: "Parent topic not found"
      });
    }

    const parentId = parentRows[0].id;

    const [children]: any = await pool.query(
      "SELECT id, title, slug FROM topics WHERE parent_id = ?",
      [parentId]
    );

    logger.info("Child topics fetched from DB", {
      parentSlug: slug,
      count: children.length,
      userId
    });

    await redisClient.set(cacheKey, JSON.stringify(children), {
      EX: 600
    });

    logger.info("Child topics cached", {
      cacheKey,
      userId
    });

    return res.status(200).json(children);

  } catch (error: any) {

    logger.error("GetChildTopics Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Server error"
    });
  }
};

export const createTopic = async (req: Request, res: Response) => {

  const { title, slug, categorySlug, parentSlug, description, pseudo_code } = req.body;
  const userId = (req as any).user?.id || "anonymous";

  logger.info("CreateTopic request received", {
    userId,
    body: req.body
  });

  try {

    if (!title || !slug) {

      logger.warn("CreateTopic validation failed", {
        userId
      });

      return res.status(400).json({
        message: "Title and slug are required"
      });
    }

    let categoryId: number | null = null;
    let parentId: number | null = null;

    /* ===============================
       1️⃣ Resolve parent topic
    =============================== */
    if (parentSlug) {

      const [parent]: any = await pool.query(
        "SELECT id, category_id FROM topics WHERE slug = ?",
        [parentSlug]
      );

      if (!parent.length) {

        logger.warn("Parent topic not found", {
          parentSlug,
          userId
        });

        return res.status(400).json({
          message: "Parent topic not found"
        });
      }

      parentId = parent[0].id;
      categoryId = parent[0].category_id;
    }

    /* ===============================
       2️⃣ Resolve category
    =============================== */
    if (categorySlug) {

      const [category]: any = await pool.query(
        "SELECT id FROM categories WHERE slug = ?",
        [categorySlug]
      );

      if (!category.length) {

        logger.warn("Category not found", {
          categorySlug,
          userId
        });

        return res.status(400).json({
          message: "Category not found"
        });
      }

      categoryId = category[0].id;
    }

    /* ===============================
       3️⃣ Insert topic
    =============================== */
    const [result]: any = await pool.query(
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

    /* ===============================
       4️⃣ Cache invalidation
    =============================== */

    if (categorySlug) {

      await redisClient.del(`topics_category:${categorySlug}`);

      logger.info("Category topics cache invalidated", {
        cacheKey: `topics_category:${categorySlug}`,
        userId
      });
    }

    if (parentSlug) {

      await redisClient.del(`child_topics:${parentSlug}`);

      logger.info("Child topics cache invalidated", {
        cacheKey: `child_topics:${parentSlug}`,
        userId
      });
    }

    logger.info("Topic created successfully", {
      topicId: result.insertId,
      slug,
      userId
    });

    return res.status(201).json({
      message: "Topic created successfully"
    });

  } catch (error: any) {

    if (error.code === "ER_DUP_ENTRY") {

      logger.warn("Duplicate topic slug", {
        slug,
        userId
      });

      return res.status(400).json({
        message: "Slug already exists"
      });
    }

    logger.error("CreateTopic Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Server error"
    });
  }
};

export const getTopicBySlug = async (req: Request, res: Response) => {

  const { slug } = req.params;
  const userId = (req as any).user?.id || "anonymous";
  const cacheKey = `topic:${slug}`;

  logger.info("GetTopicBySlug request received", {
    slug,
    userId
  });

  try {

    const cachedTopic = await redisClient.get(cacheKey);

    if (cachedTopic) {

      logger.info("Topic fetched from cache", {
        slug,
        userId
      });

      return res.status(200).json(JSON.parse(cachedTopic));
    }

    const [rows]: any = await pool.query(
      "SELECT id, title, description, pseudo_code FROM topics WHERE slug = ?",
      [slug]
    );

    if (!rows.length) {

      logger.warn("Topic not found", {
        slug,
        userId
      });

      return res.status(404).json({
        message: "Topic not found"
      });
    }

    const topic = rows[0];

    logger.info("Topic fetched from DB", {
      slug,
      userId
    });

    await redisClient.set(cacheKey, JSON.stringify(topic), {
      EX: 600
    });

    logger.info("Topic cached", {
      cacheKey,
      userId
    });

    return res.status(200).json(topic);

  } catch (error: any) {

    logger.error("GetTopicBySlug Error", {
      userId,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      message: "Server error"
    });
  }
};

export const updateSystemDesignTopic = async (req: Request, res: Response) => {

  const { id } = req.params;
  const { title, description, pseudo_code } = req.body;
  const userId = (req as any).user?.id || "anonymous";

  logger.info("UpdateSystemDesignTopic request received", {
    topicId: id,
    userId
  });

  try {

    /* ===============================
       1️⃣ Update DB
    =============================== */
    const [result]: any = await pool.query(
      `UPDATE topics 
       SET title = ?, description = ?, pseudo_code = ?
       WHERE id = ?`,
      [title, description, pseudo_code, id]
    );

    logger.info("Topic updated in DB", {
      topicId: id,
      affectedRows: result?.affectedRows,
      userId
    });


    /* ===============================
       2️⃣ Fetch slug + parent_id
    =============================== */
    const [rows]: any = await pool.query(
      "SELECT slug, parent_id FROM topics WHERE id = ?",
      [id]
    );

    if (rows.length > 0) {

      const { slug, parent_id } = rows[0];

      logger.info("Fetched topic slug for cache invalidation", {
        slug,
        parentId: parent_id,
        userId
      });

      /* ===============================
         3️⃣ Clear topic detail cache
      =============================== */
      await redisClient.del(`topic:${slug}`);

      logger.info("Topic cache invalidated", {
        cacheKey: `topic:${slug}`,
        userId
      });


      /* ===============================
         4️⃣ Clear topic problems cache
      =============================== */
      const problemKeys = await redisClient.keys(`topic_problems:${slug}:*`);

      if (problemKeys.length > 0) {

        await redisClient.del(problemKeys);

        logger.info("Topic problems cache cleared", {
          deletedKeys: problemKeys.length,
          topicSlug: slug,
          userId
        });
      }


      /* ===============================
         5️⃣ Clear child topics cache
      =============================== */
      if (parent_id) {

        const [parent]: any = await pool.query(
          "SELECT slug FROM topics WHERE id = ?",
          [parent_id]
        );

        if (parent.length > 0) {

          const parentSlug = parent[0].slug;

          await redisClient.del(`child_topics:${parentSlug}`);

          logger.info("Child topics cache invalidated", {
            cacheKey: `child_topics:${parentSlug}`,
            userId
          });
        }
      }
    }

    logger.info("System design topic updated successfully", {
      topicId: id,
      userId
    });

    return res.json({
      message: "Topic updated successfully"
    });

  } catch (err: any) {

    logger.error("UpdateSystemDesignTopic Error", {
      userId,
      topicId: id,
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      error: err.message
    });
  }
};

export const deleteSystemDesignTopic = async (req: Request, res: Response) => {

  const { id } = req.params;
  const userId = (req as any).user?.id || "anonymous";

  logger.info("DeleteSystemDesignTopic request received", {
    topicId: id,
    userId
  });

  try {

    /* ===============================
       1️⃣ Fetch topic metadata
    =============================== */
    const [rows]: any = await pool.query(
      `SELECT t.slug, t.parent_id, c.slug as categorySlug
       FROM topics t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );

    if (!rows.length) {

      logger.warn("Topic not found for deletion", {
        topicId: id,
        userId
      });

      return res.status(404).json({
        message: "Topic not found"
      });
    }

    const { slug, parent_id, categorySlug } = rows[0];

    logger.info("Fetched topic metadata for cache invalidation", {
      slug,
      parentId: parent_id,
      categorySlug,
      userId
    });


    /* ===============================
       2️⃣ Delete topic from DB
    =============================== */
    const [result]: any = await pool.query(
      "DELETE FROM topics WHERE id = ?",
      [id]
    );

    logger.info("Topic deleted from DB", {
      topicId: id,
      affectedRows: result?.affectedRows,
      userId
    });


    /* ===============================
       3️⃣ Clear topic detail cache
    =============================== */
    await redisClient.del(`topic:${slug}`);

    logger.info("Topic detail cache invalidated", {
      cacheKey: `topic:${slug}`,
      userId
    });


    /* ===============================
       4️⃣ Clear topic problems cache
    =============================== */
    const problemKeys = await redisClient.keys(`topic_problems:${slug}:*`);

    if (problemKeys.length > 0) {

      await redisClient.del(problemKeys);

      logger.info("Topic problems cache cleared", {
        deletedKeys: problemKeys.length,
        topicSlug: slug,
        userId
      });
    }


    /* ===============================
       5️⃣ Clear child topics cache
    =============================== */
    if (parent_id) {

      const [parent]: any = await pool.query(
        "SELECT slug FROM topics WHERE id = ?",
        [parent_id]
      );

      if (parent.length > 0) {

        const parentSlug = parent[0].slug;

        await redisClient.del(`child_topics:${parentSlug}`);

        logger.info("Child topics cache invalidated", {
          cacheKey: `child_topics:${parentSlug}`,
          userId
        });
      }
    }


    /* ===============================
       6️⃣ Clear category topics cache
    =============================== */
    if (categorySlug) {

      await redisClient.del(`topics_category:${categorySlug}`);

      logger.info("Category topics cache invalidated", {
        cacheKey: `topics_category:${categorySlug}`,
        userId
      });
    }


    logger.info("System design topic deleted successfully", {
      topicId: id,
      userId
    });

    return res.json({
      message: "Topic deleted successfully"
    });

  } catch (err: any) {

    logger.error("DeleteSystemDesignTopic Error", {
      topicId: id,
      userId,
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      error: err.message
    });
  }
};