const express = require("express");
const router = express.Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const auditController =
  require("../controllers/auditController");


router.get(
  "/",
  authMiddleware,
  auditController.getAuditLogs
);


module.exports = router;
