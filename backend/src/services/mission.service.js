import { randomUUID } from "node:crypto";
import { createMissionSchema } from "../validators/mission.validator.js";
import { createMission as createMissionRecord, findOverlappingMission } from "../repositories/mission.repository.js";
import { slugify } from "../utils/slugify.js";

export class MissionServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createMission(payload) {
  const result = createMissionSchema.safeParse(payload);
  if (!result.success) {
    throw new MissionServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;

  if (data.endAt <= data.startAt) {
    throw new MissionServiceError(400, "Invalid time window.");
  }

  const overlapping = await findOverlappingMission(data.type, data.startAt, data.endAt);
  if (overlapping) {
    throw new MissionServiceError(409, "Mission time window overlaps with an existing mission of this type.");
  }

  return createMissionRecord({
    id: randomUUID(),
    slug: slugify(data.title),
    title: data.title,
    description: data.description,
    type: data.type,
    startAt: data.startAt,
    endAt: data.endAt,
    submissionCap: data.submissionCap,
    points: data.points,
    autoApprove: data.autoApprove,
    createdById: data.createdById
  });
}
