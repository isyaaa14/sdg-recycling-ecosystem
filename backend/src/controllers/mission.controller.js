import { createMission, MissionServiceError } from "../services/mission.service.js";

export async function createMissionHandler(request, response) {
  try {
    const mission = await createMission(request.body);
    return response.status(201).json({ data: { mission } });
  } catch (error) {
    if (error instanceof MissionServiceError) {
      return response.status(error.statusCode).json({ error: { message: error.message } });
    }
    console.error(error);
    return response.status(500).json({ error: { message: "Internal server error" } });
  }
}
