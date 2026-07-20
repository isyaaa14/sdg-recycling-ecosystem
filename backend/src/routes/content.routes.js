import { Router } from "express";
import {
  createContentHandler,
  getContentHandler,
  updateContentHandler,
  listContentHandler,
  getContentRevisionsHandler,
  archiveContentHandler
} from "../controllers/content.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("ADMIN"), createContentHandler);
router.get("/", listContentHandler);
router.get("/:id", getContentHandler);
router.put("/:id", requireRole("ADMIN"), updateContentHandler);
router.delete("/:id", requireRole("ADMIN"), archiveContentHandler);
router.get("/:id/revisions", requireRole("ADMIN"), getContentRevisionsHandler);

export default router;
