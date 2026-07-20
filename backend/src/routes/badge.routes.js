import { Router } from "express";
import { createBadgeHandler, getBadgeProgressHandler } from "../controllers/badge.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("ADMIN"), createBadgeHandler);
router.get("/progress", getBadgeProgressHandler);

export default router;
