import { Router } from "express";
import {
  listSubmissionsHandler,
  listMySubmissionsHandler,
  getSubmissionHandler,
  reviewSubmissionHandler
} from "../controllers/submission.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", requireRole("ADMIN"), listSubmissionsHandler);
router.get("/me", requireRole("STUDENT"), listMySubmissionsHandler);
router.get("/:id", getSubmissionHandler);
router.patch("/:id/review", requireRole("ADMIN"), reviewSubmissionHandler);

export default router;
