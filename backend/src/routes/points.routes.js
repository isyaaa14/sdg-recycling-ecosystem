import { Router } from "express";
import { getMyPointsHandler, listPointsHandler } from "../controllers/points.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/me", requireRole("STUDENT"), getMyPointsHandler);
router.get("/", requireRole("ADMIN"), listPointsHandler);

export default router;
