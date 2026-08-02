import { Router } from "express";
import {
  createRewardHandler,
  deactivateRewardHandler,
  getRedemptionHandler,
  listMyRedemptionsHandler,
  listRedemptionsHandler,
  listRewardsHandler,
  redeemRewardHandler,
  updateRewardHandler,
  uploadRewardImageHandler
} from "../controllers/reward.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";

const router = Router();

router.use(authenticate);

router.get("/", listRewardsHandler);
router.post("/", requireRole("ADMIN"), createRewardHandler);
router.get("/redemptions/me", requireRole("STUDENT"), listMyRedemptionsHandler);
router.get("/redemptions", requireRole("ADMIN"), listRedemptionsHandler);
router.get("/redemptions/:id", getRedemptionHandler);
router.post("/:id/redeem", requireRole("STUDENT"), redeemRewardHandler);
router.post("/:id/image", requireRole("ADMIN"), uploadSingle, uploadRewardImageHandler);
router.patch("/:id", requireRole("ADMIN"), updateRewardHandler);
router.delete("/:id", requireRole("ADMIN"), deactivateRewardHandler);

export default router;
