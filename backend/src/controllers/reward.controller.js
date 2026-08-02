import {
  createReward,
  deactivateReward,
  getRedemptionById,
  listMyRedemptions,
  listRedemptions,
  listRewards,
  redeemReward,
  RewardServiceError,
  updateReward,
  uploadRewardImage
} from "../services/reward.service.js";

function handleError(error, response) {
  if (error instanceof RewardServiceError) {
    return response.status(error.statusCode).json({ error: { message: error.message } });
  }
  console.error(error);
  return response.status(500).json({ error: { message: "Internal server error" } });
}

export async function listRewardsHandler(request, response) {
  try {
    const query = { ...request.query };
    if (request.user.role !== "ADMIN") {
      delete query.includeInactive;
    }
    const rewards = await listRewards(query);
    return response.json({ data: { rewards } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function createRewardHandler(request, response) {
  try {
    const reward = await createReward(request.body);
    return response.status(201).json({ data: { reward } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function updateRewardHandler(request, response) {
  try {
    const reward = await updateReward(request.params.id, request.body);
    return response.json({ data: { reward } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function deactivateRewardHandler(request, response) {
  try {
    const reward = await deactivateReward(request.params.id);
    return response.json({ data: { reward } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function uploadRewardImageHandler(request, response) {
  try {
    if (!request.file) {
      return response.status(400).json({ error: { message: "No file provided or unsupported file type." } });
    }

    const result = await uploadRewardImage(
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

export async function redeemRewardHandler(request, response) {
  try {
    const redemption = await redeemReward(request.params.id, request.body, request.user.id);
    return response.status(201).json({ data: { redemption } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listMyRedemptionsHandler(request, response) {
  try {
    const redemptions = await listMyRedemptions(request.user.id);
    return response.json({ data: { redemptions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function listRedemptionsHandler(request, response) {
  try {
    const redemptions = await listRedemptions(request.query);
    return response.json({ data: { redemptions } });
  } catch (error) {
    return handleError(error, response);
  }
}

export async function getRedemptionHandler(request, response) {
  try {
    const redemption = await getRedemptionById(request.params.id, request.user);
    return response.json({ data: { redemption } });
  } catch (error) {
    return handleError(error, response);
  }
}
