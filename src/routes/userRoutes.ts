import express from "express";
import { register, login, forgotPassword, resetPassword, getMyProfile } from "../controllers/userController";''
import { verifyToken } from "../middleware/userMiddleware";

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", verifyToken, getMyProfile);

export default router;