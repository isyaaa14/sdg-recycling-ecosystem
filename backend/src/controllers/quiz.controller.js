import {
  createQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getQuizById,
  listQuizzes,
  submitQuizAttempt,
  listMyAttempts,
  listQuizAttempts,
  QuizServiceError
} from "../services/quiz.service.js";

function handleError(error, response) {
  if (error instanceof QuizServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function createQuizHandler(request, response) {
  try {
    const quiz = await createQuiz(request.body);
    return response.status(201).json({ data: { quiz } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updateQuizHandler(request, response) {
  try {
    const quiz = await updateQuiz(request.params.id, request.body);
    return response.status(200).json({ data: { quiz } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function addQuestionHandler(request, response) {
  try {
    const question = await addQuestion(request.params.id, request.body);
    return response.status(201).json({ data: { question } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updateQuestionHandler(request, response) {
  try {
    const question = await updateQuestion(request.params.id, request.params.questionId, request.body);
    return response.status(200).json({ data: { question } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function deleteQuestionHandler(request, response) {
  try {
    await deleteQuestion(request.params.id, request.params.questionId);
    return response.status(204).send();
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getQuizHandler(request, response) {
  try {
    const quiz = await getQuizById(request.params.id, request.user);
    return response.status(200).json({ data: { quiz } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listQuizzesHandler(request, response) {
  try {
    const quizzes = await listQuizzes(request.query);
    return response.status(200).json({ data: { quizzes } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function submitAttemptHandler(request, response) {
  try {
    const result = await submitQuizAttempt(request.params.id, request.body, request.user.id);
    return response.status(201).json({ data: result });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMyAttemptsHandler(request, response) {
  try {
    const attempts = await listMyAttempts(request.params.id, request.user.id);
    return response.status(200).json({ data: { attempts } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listQuizAttemptsHandler(request, response) {
  try {
    const result = await listQuizAttempts(request.params.id);
    return response.status(200).json({ data: result });
  } catch (error) {
    return handleError(error, response);
  }
}
