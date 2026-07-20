import { Router } from "express";
import {
  uploadMissionProofHandler,
  getUploadHandler,
  listMyUploadsHandler
} from "../controllers/upload.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.post("/mission-proof", requireRole("STUDENT"), uploadSingle, uploadMissionProofHandler);
router.get("/mine", requireRole("STUDENT"), listMyUploadsHandler);
router.get("/:id", getUploadHandler);

export default router;
