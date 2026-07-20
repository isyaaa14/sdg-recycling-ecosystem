const express = require('express');
const router = express.Router();

const qrController = require("../controllers/qrController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/issue", authMiddleware, qrController.issueQR);
router.get("/:qrId", authMiddleware, qrController.getQRStatus);
router.post("/claim", authMiddleware, qrController.claimQR);
router.post("/:qrId/invalidate", authMiddleware, qrController.invalidateQR);
module.exports = router;
