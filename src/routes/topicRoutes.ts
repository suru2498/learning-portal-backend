import express from "express";
import { getTopicsByCategorySlug, createTopic, getTopicWithProblems, addProblem, markProblemSolved, unmarkProblemSolved, deleteTopic, updateTopic, getChildTopics } from "../controllers/topicController";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";

const router = express.Router();

router.get("/topic/:slug", verifyToken, getTopicWithProblems);
router.get("/:slug", getTopicsByCategorySlug);
router.get("/children/:topicSlug", getChildTopics);
router.post("/", verifyToken, verifyAdmin, createTopic);
router.post("/problem", verifyToken, verifyAdmin, addProblem);
router.post("/problem/:id/solve", verifyToken, markProblemSolved);
router.put("/:id", verifyToken, verifyAdmin, updateTopic);
router.delete("/problem/:id/solve", verifyToken, unmarkProblemSolved);
router.delete("/:id", verifyToken, verifyAdmin, deleteTopic);

export default router;