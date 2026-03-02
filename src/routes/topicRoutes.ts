import express from "express";
import {
  getTopicsByCategorySlug,
  createTopic,
  getTopicWithProblems,
  addProblem,
  markProblemSolved,
  unmarkProblemSolved,
  deleteTopic,
  updateTopic,
  getChildTopics
} from "../controllers/topicController";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";

const router = express.Router();


/**
 * @swagger
 * /api/topics/{slug}:
 *   get:
 *     summary: Get topics by category slug
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: dsa
 *     responses:
 *       200:
 *         description: List of topics
 */
router.get("/:slug", getTopicsByCategorySlug);

/**
 * @swagger
 * /api/topics/topic/{slug}:
 *   get:
 *     summary: Get single topic with problems (requires login)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         example: arrays
 *     responses:
 *       200:
 *         description: Topic details with problems
 *       401:
 *         description: Unauthorized
 */
router.get("/topic/:slug", verifyToken, getTopicWithProblems);

/**
 * @swagger
 * /api/topics/children/{topicSlug}:
 *   get:
 *     summary: Get child topics by parent slug
 *     tags: [Topics]
 *     parameters:
 *       - in: path
 *         name: topicSlug
 *         required: true
 *         schema:
 *           type: string
 *         example: hld
 *     responses:
 *       200:
 *         description: List of child topics
 */
router.get("/children/:topicSlug", getChildTopics);

/**
 * @swagger
 * /api/topics:
 *   post:
 *     summary: Create a new topic (Admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category_id
 *             properties:
 *               title:
 *                 type: string
 *                 example: Arrays
 *               description:
 *                 type: string
 *                 example: Array concepts
 *               summary:
 *                 type: string
 *                 example: Detailed theory explanation
 *               category_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Topic created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", verifyToken, verifyAdmin, createTopic);

/**
 * @swagger
 * /api/topics/problem:
 *   post:
 *     summary: Add problem to a topic (Admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - difficulty
 *               - topic_id
 *             properties:
 *               title:
 *                 type: string
 *                 example: Two Sum
 *               difficulty:
 *                 type: string
 *                 enum: [Easy, Medium, Hard]
 *                 example: Easy
 *               leetcode_link:
 *                 type: string
 *                 example: https://leetcode.com/problems/two-sum
 *               topic_id:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Problem added successfully
 */
router.post("/problem", verifyToken, verifyAdmin, addProblem);

/**
 * @swagger
 * /api/topics/problem/{id}/solve:
 *   post:
 *     summary: Mark problem as solved
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Problem marked as solved
 */
router.post("/problem/:id/solve", verifyToken, markProblemSolved);

/**
 * @swagger
 * /api/topics/problem/{id}/solve:
 *   delete:
 *     summary: Unmark problem as solved
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Problem marked as unsolved
 */
router.delete("/problem/:id/solve", verifyToken, unmarkProblemSolved);

/**
 * @swagger
 * /api/topics/{id}:
 *   put:
 *     summary: Update topic (Admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               summary:
 *                 type: string
 *     responses:
 *       200:
 *         description: Topic updated successfully
 */
router.put("/:id", verifyToken, verifyAdmin, updateTopic);

/**
 * @swagger
 * /api/topics/{id}:
 *   delete:
 *     summary: Delete topic (Admin only)
 *     tags: [Topics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2
 *     responses:
 *       200:
 *         description: Topic deleted successfully
 */
router.delete("/:id", verifyToken, verifyAdmin, deleteTopic);

export default router;