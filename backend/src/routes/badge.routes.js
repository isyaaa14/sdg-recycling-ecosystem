import { Router } from "express";
import {
  createBadgeHandler,
  listBadgesHandler,
  getBadgeHandler,
  updateBadgeHandler,
  deactivateBadgeHandler,
  listBadgeAwardsHandler,
  getBadgeProgressHandler
} from "../controllers/badge.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("ADMIN"), createBadgeHandler);
router.get("/", requireRole("ADMIN"), listBadgesHandler);
router.get("/progress", getBadgeProgressHandler);
router.get("/:id", requireRole("ADMIN"), getBadgeHandler);
router.patch("/:id", requireRole("ADMIN"), updateBadgeHandler);
router.delete("/:id", requireRole("ADMIN"), deactivateBadgeHandler);
router.get("/:id/awards", requireRole("ADMIN"), listBadgeAwardsHandler);

export default router;
