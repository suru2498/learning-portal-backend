import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMyProfile,
  updateMyProfile,
  verifyMobileOtp,
  sendMobileOtp,
  verifyEmailOtp,
  sendEmailOtp
} from "../controllers/userController";
import { verifyToken } from "../middleware/userMiddleware";
import { authLimiter } from "../middleware/rateLimiter";

const router = express.Router();


/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Suraj Singh
 *               email:
 *                 type: string
 *                 example: suraj@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post("/register", authLimiter, register);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: suraj@gmail.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful (returns JWT token)
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authLimiter,login);

/**
 * @swagger
 * /api/user/forgot-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: suraj@gmail.com
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post("/forgot-password", authLimiter,forgotPassword);

/**
 * @swagger
 * /api/user/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: reset_token_here
 *               newPassword:
 *                 type: string
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post("/reset-password", authLimiter,resetPassword);

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: Get logged-in user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 *       401:
 *         description: Unauthorized
 */
router.get("/me", verifyToken, getMyProfile);

/**
 * @swagger
 * /api/user/me:
 *   put:
 *     summary: Update logged-in user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Suraj Singh Kanyal
 *               email:
 *                 type: string
 *                 example: suraj@gmail.com
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put("/me", verifyToken, updateMyProfile);

/**
 * @swagger
 * /api/user/send-email-otp:
 *   post:
 *     summary: Send OTP to user's email
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: suraj@gmail.com
 *     responses:
 *       200:
 *         description: Email OTP sent successfully
 *       400:
 *         description: Invalid email
 */
router.post("/send-email-otp", authLimiter,sendEmailOtp);

/**
 * @swagger
 * /api/user/verify-email-otp:
 *   post:
 *     summary: Verify email OTP
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: suraj@gmail.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post("/verify-email-otp", authLimiter,verifyEmailOtp);

/**
 * @swagger
 * /api/user/send-mobile-otp:
 *   post:
 *     summary: Send OTP to user's mobile number
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: Mobile OTP sent successfully
 *       400:
 *         description: Invalid phone number
 */
router.post("/send-mobile-otp", authLimiter, sendMobileOtp);

/**
 * @swagger
 * /api/user/verify-mobile-otp:
 *   post:
 *     summary: Verify mobile OTP
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Mobile verified successfully
 *       400:
 *         description: Invalid OTP
 */
router.post("/verify-mobile-otp", authLimiter,verifyMobileOtp); 

export default router;