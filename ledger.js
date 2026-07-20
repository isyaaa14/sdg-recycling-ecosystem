const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const ledgerController = require("../controllers/ledgerController");

router.get("/my", authMiddleware, ledgerController.getMyLedger);

module.exports = router;
