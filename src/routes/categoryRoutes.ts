import express from "express";
import {
  getCategories,
  addCategory,
} from "../controllers/categoryController";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";

const router = express.Router();

// Public
router.get("/", getCategories);

// Admin Only
router.post("/", verifyToken, verifyAdmin, addCategory);

export default router;