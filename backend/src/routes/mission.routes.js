import { Router } from "express";
import { createMissionHandler } from "../controllers/mission.controller.js";

const router = Router();

router.post("/", createMissionHandler);

export default router;
