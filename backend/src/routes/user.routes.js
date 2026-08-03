import { Router } from "express";
import { updateMeHandler } from "../controllers/user.controller.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.patch("/me", updateMeHandler);

export default router;
