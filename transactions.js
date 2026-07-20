const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const transactionController = require("../controllers/transactionController");

router.get("/my", authMiddleware, transactionController.getMyTransactions);
router.get(
  "/admin",
  authMiddleware,
  transactionController.getAdminTransactions
);
router.post(
  "/:id/approve",
  authMiddleware,
  transactionController.approveTransaction
);
router.post(
  "/:id/reject",
  authMiddleware,
  transactionController.rejectTransaction
);

module.exports = router;

