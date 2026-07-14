import { Router } from "express";
import {
  createContentHandler,
  getContentHandler,
  updateContentHandler,
  searchContentHandler
} from "../controllers/content.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("ADMIN"), createContentHandler);
router.get("/", searchContentHandler);
router.get("/:id", getContentHandler);
router.put("/:id", requireRole("ADMIN"), updateContentHandler);

export default router;
