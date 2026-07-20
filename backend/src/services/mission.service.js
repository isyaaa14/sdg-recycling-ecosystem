import { createMissionSchema, updateMissionSchema } from "../validators/mission.validator.js";
import {
  createMission as createMissionRecord,
  findOverlappingMission,
  findMissionById,
  findAllMissions,
  updateMission as updateMissionRecord
} from "../repositories/mission.repository.js";
import { slugify } from "../utils/slugify.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";

export class MissionServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createMission(payload, createdById) {
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

  return createWithGeneratedId("mission", "MIS", (id) =>
    createMissionRecord({
      id,
      slug: slugify(data.title),
      title: data.title,
      description: data.description,
      type: data.type,
      startAt: data.startAt,
      endAt: data.endAt,
      submissionCap: data.submissionCap,
      points: data.points,
      autoApprove: data.autoApprove,
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      createdById
    })
  );
}

export function listMissions(query = {}) {
  const filters = {};
  if (query.status) filters.status = query.status;
  if (query.isActive !== undefined) filters.isActive = query.isActive === "true";
  if (query.type) filters.type = query.type;

  return findAllMissions(filters);
}

export async function getMissionById(id) {
  const mission = await findMissionById(id);
  if (!mission) {
    throw new MissionServiceError(404, "Mission not found.");
  }
  return mission;
}

export async function updateMission(id, payload) {
  const result = updateMissionSchema.safeParse(payload);
  if (!result.success) {
    throw new MissionServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await findMissionById(id);
  if (!existing) {
    throw new MissionServiceError(404, "Mission not found.");
  }

  const data = result.data;
  const effectiveType = data.type ?? existing.type;
  const effectiveStartAt = data.startAt ?? existing.startAt;
  const effectiveEndAt = data.endAt ?? existing.endAt;

  if (effectiveEndAt <= effectiveStartAt) {
    throw new MissionServiceError(400, "Invalid time window.");
  }

  const overlapping = await findOverlappingMission(effectiveType, effectiveStartAt, effectiveEndAt, id);
  if (overlapping) {
    throw new MissionServiceError(409, "Mission time window overlaps with an existing mission of this type.");
  }

  const updateData = { ...data };
  if (data.title) {
    updateData.slug = slugify(data.title);
  }

  return updateMissionRecord(id, updateData);
}

export async function archiveMission(id) {
  const existing = await findMissionById(id);
  if (!existing) {
    throw new MissionServiceError(404, "Mission not found.");
  }

  return updateMissionRecord(id, { isActive: false, status: "ARCHIVED" });
}
