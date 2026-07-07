import { Router } from "express";
import { listSubmissionsHandler, reviewSubmissionHandler } from "../controllers/submission.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", listSubmissionsHandler);
router.patch("/:id/review", reviewSubmissionHandler);

export default router;
