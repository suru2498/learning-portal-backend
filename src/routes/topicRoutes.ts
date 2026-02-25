import express from "express";
import { getTopicBySlug } from "../controllers/topicController";

const router = express.Router();
router.get("/:slug", getTopicBySlug);

export default router;