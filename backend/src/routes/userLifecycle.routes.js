import { Router } from "express";
import {
  getAdminNotificationsHandler,
  markNotificationsReadHandler,
  reactivateStudentHandler,
  runInactivitySweepHandler
} from "../controllers/userLifecycle.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/notifications", requireRole("ADMIN"), getAdminNotificationsHandler);
router.patch("/notifications/read", requireRole("ADMIN"), markNotificationsReadHandler);
router.patch("/users/:userId/reactivate", requireRole("ADMIN"), reactivateStudentHandler);
router.post("/run-inactivity-sweep", requireRole("ADMIN"), runInactivitySweepHandler);

export default router;
