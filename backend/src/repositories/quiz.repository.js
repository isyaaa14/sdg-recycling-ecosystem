import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export function createQuiz(data) {
  return prisma.quiz.create({ data });
}

export function findQuizById(id) {
  return prisma.quiz.findUnique({
    where: { id },
    include: { questions: true }
  });
}

export function findQuizBySlug(slug) {
  return prisma.quiz.findUnique({ where: { slug } });
}

export function findAllQuizzes(filters) {
  return prisma.quiz.findMany({
    where: filters,
    orderBy: { createdAt: "asc" }
  });
}

export function updateQuiz(id, data) {
  return prisma.quiz.update({ where: { id }, data });
}

export function createQuizQuestion(data) {
  return prisma.quizQuestion.create({ data });
}

export function findQuestionsByQuizId(quizId) {
  return prisma.quizQuestion.findMany({
    where: { quizId },
    orderBy: { code: "asc" }
  });
}

export function findQuestionById(id) {
  return prisma.quizQuestion.findUnique({ where: { id } });
}

export function updateQuizQuestion(id, data) {
  return prisma.quizQuestion.update({ where: { id }, data });
}

export function deleteQuizQuestion(id) {
  return prisma.quizQuestion.delete({ where: { id } });
}

export function createQuizAttempt(data) {
  return prisma.quizAttempt.create({ data });
}

export function findAttemptsByQuizAndUser(quizId, userId) {
  return prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { attemptedAt: "desc" }
  });
}

export function findAttemptsByQuiz(quizId) {
  return prisma.quizAttempt.findMany({
    where: { quizId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { attemptedAt: "desc" }
  });
}
