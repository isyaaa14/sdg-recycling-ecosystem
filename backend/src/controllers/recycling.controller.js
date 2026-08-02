import {
  claimRecyclingQr,
  createRecyclingSubmission,
  getRecyclingSubmission,
  getRecyclingQr,
  invalidateRecyclingQr,
  issueRecyclingQr,
  listMyRecyclingSubmissions,
  listPointRates,
  listRecyclingQrCodes,
  listRecyclingSubmissions,
  RecyclingServiceError,
  reviewRecyclingSubmission,
  updatePointRates
} from "../services/recycling.service.js";

function handleError(error, response) {
  if (error instanceof RecyclingServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function createRecyclingSubmissionHandler(request, response) {
  try {
    const submission = await createRecyclingSubmission(request.body, request.user.id);
    return response.status(201).json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMyRecyclingSubmissionsHandler(request, response) {
  try {
    const submissions = await listMyRecyclingSubmissions(request.user.id, request.query);
    return response.json({ data: { submissions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listRecyclingSubmissionsHandler(request, response) {
  try {
    const submissions = await listRecyclingSubmissions(request.query);
    return response.json({ data: { submissions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getRecyclingSubmissionHandler(request, response) {
  try {
    const submission = await getRecyclingSubmission(request.params.id, request.user);
    return response.json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function reviewRecyclingSubmissionHandler(request, response) {
  try {
    const submission = await reviewRecyclingSubmission(request.params.id, request.body, request.user.id);
    return response.json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function issueRecyclingQrHandler(request, response) {
  try {
    const qr = await issueRecyclingQr(request.body, request.user.id);
    return response.status(201).json({ data: { qr } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listRecyclingQrCodesHandler(request, response) {
  try {
    const qrCodes = await listRecyclingQrCodes(request.query);
    return response.json({ data: { qrCodes } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getRecyclingQrHandler(request, response) {
  try {
    const qr = await getRecyclingQr(request.params.id);
    return response.json({ data: { qr } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function claimRecyclingQrHandler(request, response) {
  try {
    const submission = await claimRecyclingQr(request.body, request.user.id);
    return response.status(201).json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function invalidateRecyclingQrHandler(request, response) {
  try {
    const qr = await invalidateRecyclingQr(request.params.id, request.user.id);
    return response.json({ data: { qr } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listPointRatesHandler(_request, response) {
  try {
    const rates = await listPointRates();
    return response.json({ data: { rates } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updatePointRatesHandler(request, response) {
  try {
    const rates = await updatePointRates(request.body);
    return response.json({ data: { rates } });
  } catch (error) {
    return handleError(error, response);
  }
}
