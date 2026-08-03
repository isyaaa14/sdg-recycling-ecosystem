import { Router } from "express";
import {
  uploadMissionProofHandler,
  uploadContentImageHandler,
  uploadRecyclingProofHandler,
  getUploadHandler,
  listMyUploadsHandler
} from "../controllers/upload.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.post("/mission-proof", requireRole("STUDENT"), uploadSingle, uploadMissionProofHandler);
router.post("/content-image", requireRole("ADMIN"), uploadSingle, uploadContentImageHandler);
router.post("/recycling-proof", requireRole("STUDENT"), uploadSingle, uploadRecyclingProofHandler);
router.get("/mine", requireRole("STUDENT"), listMyUploadsHandler);
router.get("/:id", getUploadHandler);

export default router;
