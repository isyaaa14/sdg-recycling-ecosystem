const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get("/me", authMiddleware, authController.me);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refresh);
module.exports = router;

