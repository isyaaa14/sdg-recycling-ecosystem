import { Router } from "express";
import {
  getMyAntiGamingStatusHandler,
  listSuspiciousActivitiesHandler,
  updateSuspiciousFlagHandler
} from "../controllers/antiGaming.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/me/status", requireRole("STUDENT"), getMyAntiGamingStatusHandler);
router.get("/suspicious-activities", requireRole("ADMIN"), listSuspiciousActivitiesHandler);
router.patch("/users/:userId/flag", requireRole("ADMIN"), updateSuspiciousFlagHandler);

export default router;
