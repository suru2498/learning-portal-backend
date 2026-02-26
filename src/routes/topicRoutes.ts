import express from "express";
import {
  getTopicsByCategorySlug,
  addTopic,
  deleteTopic,
  getTopicByTopicName,
} from "../controllers/topicController";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";

const router = express.Router();

router.get("/topic/:topic", getTopicByTopicName);
router.get("/category/:slug", getTopicsByCategorySlug);
router.post("/", verifyToken, verifyAdmin, addTopic);
router.delete("/:id", verifyToken, verifyAdmin, deleteTopic);

export default router;