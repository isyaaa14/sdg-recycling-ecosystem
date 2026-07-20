import { Router } from "express";
import {
  listMyProgressHandler,
  getMyProgressForContentHandler,
  markCompleteHandler,
  listContentProgressHandler
} from "../controllers/progress.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/me", requireRole("STUDENT"), listMyProgressHandler);
router.get("/content/:contentId/me", requireRole("STUDENT"), getMyProgressForContentHandler);
router.patch("/content/:contentId/complete", requireRole("STUDENT"), markCompleteHandler);
router.get("/content/:contentId", requireRole("ADMIN"), listContentProgressHandler);

export default router;
