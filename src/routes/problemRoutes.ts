import express from "express";
import { addProblem } from "../controllers/problemController";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";

const router = express.Router();

router.post("/", verifyToken, verifyAdmin, addProblem);

export default router;