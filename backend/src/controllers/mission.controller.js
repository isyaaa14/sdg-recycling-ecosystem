import {
  createMission,
  listMissions,
  getMissionById,
  updateMission,
  uploadMissionImage,
  archiveMission,
  MissionServiceError
} from "../services/mission.service.js";
import { joinMission, submitMission, listMissionSubmissions } from "../services/submission.service.js";

function handleError(error, response) {
  if (error instanceof MissionServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function createMissionHandler(request, response) {
  try {
    const mission = await createMission(request.body, request.user.id);
    return response.status(201).json({ data: { mission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMissionsHandler(request, response) {
  try {
    const missions = await listMissions(request.query, request.user);
    return response.json({ data: { missions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getMissionHandler(request, response) {
  try {
    const mission = await getMissionById(request.params.id);
    return response.json({ data: { mission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updateMissionHandler(request, response) {
  try {
    const mission = await updateMission(request.params.id, request.body);
    return response.json({ data: { mission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function uploadMissionImageHandler(request, response) {
  try {
    if (!request.file) {
      return response.status(400).json({ error: { message: "No file provided or unsupported file type." } });
    }

    const result = await uploadMissionImage(
      request.params.id,
      request.file.buffer,
      {
        mimeType: request.file.mimetype,
        fileSize: request.file.size,
        originalName: request.file.originalname
      },
      request.user.id
    );
    return response.status(201).json({ data: result });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function deleteMissionHandler(request, response) {
  try {
    const mission = await archiveMission(request.params.id);
    return response.json({ data: { mission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function joinMissionHandler(request, response) {
  try {
    const submission = await joinMission(request.params.id, request.user.id);
    return response.status(201).json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function submitMissionHandler(request, response) {
  try {
    const submission = await submitMission(request.params.id, request.body, request.user.id);
    return response.status(201).json({ data: { submission } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMissionSubmissionsHandler(request, response) {
  try {
    const submissions = await listMissionSubmissions(request.params.id);
    return response.json({ data: { submissions } });
  } catch (error) {
    return handleError(error, response);
  }
}
