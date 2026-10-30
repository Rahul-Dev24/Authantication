import express from "express";
import { loginUser, registerUser, verifyUser, verifyOtp, getUser, refreshToken, logoutUser, refershCSRF } from '../controllers/user.controller.js';
import { AuthMiddleWare } from "../middleware/aurh.js";
import { verifyCSRFToken } from "../middleware/csrf.middleware.js";

const router = express.Router();

/**
 * /api/v1/register
 */
router.post("/register", registerUser);

/**
 * /api/v1/verify/token
 */
router.post("/verify/:token", verifyUser);

/**
 * /api/v1/login
 */
router.post("/login", loginUser);

/**
 * /api/v1/verifyOtp
 */
router.post("/verifyOtp", verifyOtp)

/**
 * /api/v1/me
 */
router.get("/me", AuthMiddleWare, getUser);

/**
 * /api/v1/refresh
 */
router.post("/refresh", refreshToken)

/**
 * /api/v1/logout
 */
router.post("/logout", AuthMiddleWare, verifyCSRFToken, logoutUser);

/**
 * /api/v1/refresh-csrf
 */
router.post("/refres-csrf", AuthMiddleWare, refershCSRF)

export default router;