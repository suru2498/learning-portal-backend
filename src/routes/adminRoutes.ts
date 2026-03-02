import { Router } from "express";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";
import { createTopic, deleteTopic, createProblem, deleteProblem } from "../controllers/adminController";

const router = Router();


/**
 * @swagger
 * /api/admin/topics:
 *   post:
 *     summary: Create a new topic (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               slug:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               description:
 *                 type: string
 *               summary:
 *                 type: string
 *     responses:
 *       201:
 *         description: Topic created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post("/topics", verifyToken, verifyAdmin, createTopic);

/**
 * @swagger
 * /api/admin/problems:
 *   post:
 *     summary: Create a new problem (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 enum: [Easy, Medium, Hard]
 *               topic_id:
 *                 type: integer
 *               leetcode_link:
 *                 type: string
 *     responses:
 *       201:
 *         description: Problem created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post("/problems", verifyToken, verifyAdmin, createProblem);

/**
 * @swagger
 * /api/admin/topics/{id}:
 *   delete:
 *     summary: Delete a topic by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Topic ID
 *     responses:
 *       200:
 *         description: Topic deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.delete("/topics/:id", verifyToken, verifyAdmin, deleteTopic);

/**
 * @swagger
 * /api/admin/problems/{id}:
 *   delete:
 *     summary: Delete a problem by ID (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Problem ID
 *     responses:
 *       200:
 *         description: Problem deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.delete("/problems/:id", verifyToken, verifyAdmin, deleteProblem);

export default router;