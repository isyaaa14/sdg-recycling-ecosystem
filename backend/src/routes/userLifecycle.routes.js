import { Router } from "express";
import {
  deactivateStudentHandler,
  getAdminNotificationsHandler,
  markNotificationsReadHandler,
  reactivateStudentHandler
} from "../controllers/userLifecycle.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/notifications", requireRole("ADMIN"), getAdminNotificationsHandler);
router.patch("/notifications/read", requireRole("ADMIN"), markNotificationsReadHandler);
router.patch("/users/:userId/deactivate", requireRole("ADMIN"), deactivateStudentHandler);
router.patch("/users/:userId/reactivate", requireRole("ADMIN"), reactivateStudentHandler);

export default router;
