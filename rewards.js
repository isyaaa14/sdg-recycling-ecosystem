const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const rewardController = require("../controllers/rewardController");

/*
|--------------------------------------------------------------------------
| User APIs
|--------------------------------------------------------------------------
*/

// Get all available rewards
router.get(
  "/",
  authMiddleware,
  rewardController.getRewards
);

// Get current user's redemption history
router.get(
  "/my",
  authMiddleware,
  rewardController.getMyRedemptions
);

// Redeem a reward
router.post(
  "/:id/redeem",
  authMiddleware,
  rewardController.redeemReward
);

module.exports = router;
