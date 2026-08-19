import { Router } from "express";
import { listAuditLogsHandler } from "../controllers/audit.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.get("/", requireRole("ADMIN"), listAuditLogsHandler);

export default router;
