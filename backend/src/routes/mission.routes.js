import { Router } from "express";
import {
  createMissionHandler,
  listMissionsHandler,
  getMissionHandler,
  updateMissionHandler,
  uploadMissionImageHandler,
  deleteMissionHandler,
  joinMissionHandler,
  submitMissionHandler,
  listMissionSubmissionsHandler
} from "../controllers/mission.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("ADMIN"), createMissionHandler);
router.get("/", listMissionsHandler);
router.get("/:id", getMissionHandler);
router.patch("/:id", requireRole("ADMIN"), updateMissionHandler);
router.post("/:id/image", requireRole("ADMIN"), uploadSingle, uploadMissionImageHandler);
router.delete("/:id", requireRole("ADMIN"), deleteMissionHandler);
router.post("/:id/join", requireRole("STUDENT"), joinMissionHandler);
router.post("/:id/submit", requireRole("STUDENT"), submitMissionHandler);
router.get("/:id/submissions", requireRole("ADMIN"), listMissionSubmissionsHandler);

export default router;
