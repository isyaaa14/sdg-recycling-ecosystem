import { createBadgeSchema, updateBadgeSchema } from "../validators/badge.validator.js";
import {
  createBadge as createBadgeRecord,
  findBadgeById,
  findBadgeBySlug,
  findActiveBadges,
  findAllBadges,
  updateBadge as updateBadgeRecord,
  findBadgeAward,
  createBadgeAward,
  findAwardsByBadge,
  countApprovedMissionSubmissions,
  countCompletedMissions,
  countPassedQuizAttempts,
  countCompletedLearningProgress
} from "../repositories/badge.repository.js";
import { slugify } from "../utils/slugify.js";
import { createWithGeneratedId } from "../utils/idGenerator.js";

export class BadgeServiceError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createBadge(payload) {
  const result = createBadgeSchema.safeParse(payload);
  if (!result.success) {
    throw new BadgeServiceError(400, "Missing or invalid parameters.");
  }

  const data = result.data;
  const slug = slugify(data.name);

  const existing = await findBadgeBySlug(slug);
  if (existing) {
    throw new BadgeServiceError(409, "Badge with this name already exists.");
  }

  return createWithGeneratedId("badge", "BDG", (id) =>
    createBadgeRecord({
      id,
      slug,
      name: data.name,
      description: data.description,
      tier: data.tier,
      criteriaType: data.criteriaType,
      criteriaValue: data.criteriaValue
    })
  );
}

export async function getBadgeById(id) {
  const badge = await findBadgeById(id);
  if (!badge) {
    throw new BadgeServiceError(404, "Badge not found.");
  }
  return badge;
}

export function listBadges() {
  return findAllBadges();
}

export async function updateBadge(id, payload) {
  const result = updateBadgeSchema.safeParse(payload);
  if (!result.success) {
    throw new BadgeServiceError(400, "Missing or invalid parameters.");
  }

  const existing = await findBadgeById(id);
  if (!existing) {
    throw new BadgeServiceError(404, "Badge not found.");
  }

  const data = result.data;
  const updateData = { ...data };
  if (data.name) {
    const slug = slugify(data.name);
    const conflicting = await findBadgeBySlug(slug);
    if (conflicting && conflicting.id !== id) {
      throw new BadgeServiceError(409, "Badge with this name already exists.");
    }
    updateData.slug = slug;
  }

  return updateBadgeRecord(id, updateData);
}

export async function deactivateBadge(id) {
  const existing = await findBadgeById(id);
  if (!existing) {
    throw new BadgeServiceError(404, "Badge not found.");
  }

  return updateBadgeRecord(id, { isActive: false });
}

export async function listBadgeAwards(badgeId) {
  const badge = await findBadgeById(badgeId);
  if (!badge) {
    throw new BadgeServiceError(404, "Badge not found.");
  }

  return findAwardsByBadge(badgeId);
}

async function getCurrentProgress(userId, criteriaType) {
  switch (criteriaType) {
    case "MISSIONS_COMPLETED":
      return countCompletedMissions(userId);
    case "QUIZZES_PASSED":
      return countPassedQuizAttempts(userId);
    case "CONTENT_COMPLETED":
      return countCompletedLearningProgress(userId);
    case "APPROVED_SUBMISSIONS":
      return countApprovedMissionSubmissions(userId);
    default:
      return 0;
  }
}

export async function computeBadgeProgress(userId) {
  const badges = await findActiveBadges();

  const evaluated = await Promise.all(
    badges.map(async (badge) => {
      const [currentProgress, award] = await Promise.all([
        getCurrentProgress(userId, badge.criteriaType),
        findBadgeAward(userId, badge.id)
      ]);

      const progressPercentage = Math.min(100, Math.round((currentProgress / badge.criteriaValue) * 100));

      return {
        badgeId: badge.id,
        slug: badge.slug,
        name: badge.name,
        description: badge.description,
        tier: badge.tier,
        criteriaType: badge.criteriaType,
        criteriaValue: badge.criteriaValue,
        currentProgress,
        progressPercentage,
        status: award ? "EARNED" : "LOCKED",
        awardedAt: award ? award.awardedAt : null
      };
    })
  );

  return {
    earned: evaluated.filter((badge) => badge.status === "EARNED"),
    locked: evaluated.filter((badge) => badge.status === "LOCKED")
  };
}

export async function evaluateAndIssueBadges(userId) {
  const badges = await findActiveBadges();
  const issued = [];

  for (const badge of badges) {
    const currentProgress = await getCurrentProgress(userId, badge.criteriaType);
    if (currentProgress < badge.criteriaValue) {
      continue;
    }

    const existingAward = await findBadgeAward(userId, badge.id);
    if (existingAward) {
      continue;
    }

    const award = await createBadgeAward(userId, badge.id);
    issued.push(award);
  }

  return issued;
}
