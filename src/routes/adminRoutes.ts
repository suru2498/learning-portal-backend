import { Router } from "express";
import { verifyToken } from "../middleware/userMiddleware";
import { verifyAdmin } from "../middleware/adminMiddleware";
import { createTopic,deleteTopic,createProblem,deleteProblem } from "../controllers/adminController";

const router = Router();

router.post("/topics", verifyToken, verifyAdmin, createTopic);
router.delete("/topics/:id", verifyToken, verifyAdmin, deleteTopic);
router.post("/problems", verifyToken, verifyAdmin, createProblem);
router.delete("/problems/:id", verifyToken, verifyAdmin, deleteProblem);

export default router;