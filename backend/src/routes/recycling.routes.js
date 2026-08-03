import { Router } from "express";
import {
  claimRecyclingQrHandler,
  createRecyclingSubmissionHandler,
  getRecyclingSubmissionHandler,
  getRecyclingQrHandler,
  invalidateRecyclingQrHandler,
  issueRecyclingQrHandler,
  listMyRecyclingSubmissionsHandler,
  listPointRatesHandler,
  listRecyclingQrCodesHandler,
  listRecyclingSubmissionsHandler,
  reviewRecyclingSubmissionHandler,
  updatePointRatesHandler
} from "../controllers/recycling.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/point-rates", listPointRatesHandler);
router.put("/point-rates", requireRole("ADMIN"), updatePointRatesHandler);

router.post("/qr/issue", requireRole("ADMIN"), issueRecyclingQrHandler);
router.get("/qr", requireRole("ADMIN"), listRecyclingQrCodesHandler);
router.post("/qr/claim", requireRole("STUDENT"), claimRecyclingQrHandler);
router.get("/qr/:id", requireRole("ADMIN"), getRecyclingQrHandler);
router.post("/qr/:id/invalidate", requireRole("ADMIN"), invalidateRecyclingQrHandler);

router.post("/submissions", requireRole("STUDENT"), createRecyclingSubmissionHandler);
router.get("/submissions/me", requireRole("STUDENT"), listMyRecyclingSubmissionsHandler);
router.get("/submissions", requireRole("ADMIN"), listRecyclingSubmissionsHandler);
router.get("/submissions/:id", getRecyclingSubmissionHandler);
router.patch("/submissions/:id/review", requireRole("ADMIN"), reviewRecyclingSubmissionHandler);

export default router;
