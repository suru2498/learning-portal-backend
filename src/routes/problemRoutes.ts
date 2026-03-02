import express from "express";
import { addProblem } from "../controllers/problemController";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";

const router = express.Router();

/**
 * @swagger
 * /api/problems:
 *   post:
 *     summary: Create a new problem (Admin only)
 *     tags: [Problems]
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
 *               topic_id:
 *                 type: integer
 *                 example: 1
 *               leetcode_link:
 *                 type: string
 *                 example: https://leetcode.com/problems/two-sum/
 *     responses:
 *       201:
 *         description: Problem created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.post("/", verifyToken, verifyAdmin, addProblem);

export default router;