import { Router } from "express";
import { getLeaderboardHandler } from "../controllers/leaderboard.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", getLeaderboardHandler);

export default router;
