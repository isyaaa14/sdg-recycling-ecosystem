import { Router } from "express";
import {
  createQuizHandler,
  updateQuizHandler,
  addQuestionHandler,
  updateQuestionHandler,
  deleteQuestionHandler,
  getQuizHandler,
  listQuizzesHandler,
  submitAttemptHandler,
  listMyAttemptsHandler,
  listQuizAttemptsHandler
} from "../controllers/quiz.controller.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/", requireRole("ADMIN"), createQuizHandler);
router.get("/", listQuizzesHandler);
router.get("/:id", getQuizHandler);
router.patch("/:id", requireRole("ADMIN"), updateQuizHandler);
router.post("/:id/questions", requireRole("ADMIN"), addQuestionHandler);
router.patch("/:id/questions/:questionId", requireRole("ADMIN"), updateQuestionHandler);
router.delete("/:id/questions/:questionId", requireRole("ADMIN"), deleteQuestionHandler);
router.post("/:id/attempts", requireRole("STUDENT"), submitAttemptHandler);
router.get("/:id/attempts/me", requireRole("STUDENT"), listMyAttemptsHandler);
router.get("/:id/attempts", requireRole("ADMIN"), listQuizAttemptsHandler);

export default router;
