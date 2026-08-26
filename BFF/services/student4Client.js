import axios from 'axios';

const client = axios.create({
  baseURL: process.env.STUDENT4_API_URL,
  timeout: 10000,
});

let adminToken = null;
let studentToken = null;
let adminLoginPromise = null;
let studentLoginPromise = null;
let hasLoggedAuthShape = false;

async function loginWith(email, password) {
  const response = await client.post('/auth/login', { email, password });

  if (!hasLoggedAuthShape) {
    console.log('[student4Client] auth/login raw response:', JSON.stringify(response.data));
    hasLoggedAuthShape = true;
  }

  const payload = response.data?.data ?? response.data;
  const token = payload?.token;

  if (!token) {
    throw new Error('Student 4 login did not return a token');
  }

  return token;
}

async function getAdminToken() {
  if (adminToken) return adminToken;

  if (!adminLoginPromise) {
    adminLoginPromise = loginWith(
      process.env.STUDENT4_SERVICE_EMAIL,
      process.env.STUDENT4_SERVICE_PASSWORD
    )
      .then((token) => {
        adminToken = token;
        return token;
      })
      .finally(() => {
        adminLoginPromise = null;
      });
  }

  return adminLoginPromise;
}

async function getStudentToken() {
  if (studentToken) return studentToken;

  if (!studentLoginPromise) {
    studentLoginPromise = loginWith(
      process.env.STUDENT4_STUDENT_EMAIL,
      process.env.STUDENT4_STUDENT_PASSWORD
    )
      .then((token) => {
        studentToken = token;
        return token;
      })
      .finally(() => {
        studentLoginPromise = null;
      });
  }

  return studentLoginPromise;
}

async function authenticatedRequest(
  method,
  path,
  { params, data, useStudent = false, userToken = null } = {}
) {
  if (userToken) {
    const response = await client.request({
      method,
      url: path,
      params,
      data,
      headers: { Authorization: `Bearer ${userToken}` },
    });
    return response.data;
  }

  const getToken = useStudent ? getStudentToken : getAdminToken;
  const clearToken = () => {
    if (useStudent) studentToken = null;
    else adminToken = null;
  };

  const token = await getToken();

  try {
    const response = await client.request({
      method,
      url: path,
      params,
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      clearToken();
      const freshToken = await getToken();
      const retryResponse = await client.request({
        method,
        url: path,
        params,
        data,
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      return retryResponse.data;
    }
    throw error;
  }
}

function extractAuthPayload(responseData) {
  const payload = responseData?.data ?? responseData;
  const token = payload?.token;
  const user = payload?.user;

  if (!token || !user) {
    throw new Error('Student 4 auth response missing token or user');
  }

  return { token, user };
}

export async function registerStudent4User({ name, email, password }) {
  const response = await client.post('/auth/register', { name, email, password });
  return extractAuthPayload(response.data);
}

export async function loginStudent4User({ email, password }) {
  const response = await client.post('/auth/login', { email, password });
  return extractAuthPayload(response.data);
}

function mapContentItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return {
    id: item.id,
    title: item.title || '',
    description: item.summary || '',
    summary: item.summary || '',
    body: item.body || '',
    imageUrl: item.imageUrl || '',
    tags,
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
    category: tags.length ? tags[0] : 'General',
  };
}

function mapQuizListItem(item) {
  return {
    id: item.id,
    contentId: item.contentId,
    title: item.title,
    passingScore: item.passingScore,
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
  };
}

function mapQuizDetail(quiz) {
  return {
    id: quiz.id,
    contentId: quiz.contentId,
    title: quiz.title,
    passingScore: quiz.passingScore,
    date: quiz.createdAt ? String(quiz.createdAt).slice(0, 10) : '',
    questions: (quiz.questions || []).map((q) => ({
      id: q.id,
      code: q.code,
      questionText: q.questionText,
      options: q.options,
      points: q.points,
    })),
  };
}

function mapMissionToEvent(item) {
  return {
    id: item.id,
    name: item.title,
    date: item.startAt ? String(item.startAt).slice(0, 10) : '',
    endDate: item.endAt ? String(item.endAt).slice(0, 10) : '',
    location: 'UOW Malaysia Campus',
    description: item.description || '',
    points: item.points ?? null,
    type: item.type || '',
    targetQuantity:
      item.targetQuantity != null && item.targetQuantity !== ''
        ? Number(item.targetQuantity)
        : null,
    targetDays:
      item.targetDays != null && item.targetDays !== ''
        ? Number(item.targetDays)
        : null,
    status: item.status || '',
    autoApprove: Boolean(item.autoApprove),
  };
}

function student4Origin() {
  const apiUrl = process.env.STUDENT4_API_URL || 'http://localhost:5000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/i, '');
}

function absoluteProofImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = student4Origin().replace(/\/$/, '');
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function mapMissionSubmission(item) {
  if (!item) return null;
  const statusLabelMap = {
    ONGOING: 'Joined',
    PENDING_REVIEW: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  const rawStatus = item.status || '';
  const attachedProofUrl =
    item.uploads?.find?.(
      (upload) => upload?.purpose === 'MISSION_PROOF' || upload?.fileUrl
    )?.fileUrl || '';
  return {
    id: item.id,
    missionId: item.missionId,
    missionTitle: item.mission?.title || '',
    missionPoints: item.mission?.points ?? null,
    userName: item.user?.name || '',
    userEmail: item.user?.email || '',
    status: rawStatus,
    statusLabel: statusLabelMap[rawStatus] || rawStatus,
    proofText: item.proofText || '',
    proofImageUrl: absoluteProofImageUrl(item.proofImageUrl || attachedProofUrl || ''),
    quantity: item.quantity ?? null,
    reviewNote: item.reviewNote || '',
    submittedAt: item.submittedAt || item.updatedAt || item.createdAt || null,
    date: item.submittedAt
      ? String(item.submittedAt).slice(0, 10)
      : item.createdAt
        ? String(item.createdAt).slice(0, 10)
        : '',
  };
}

export async function getStudent4Content() {
  const data = await authenticatedRequest('get', '/content', {
    params: { status: 'PUBLISHED' },
  });
  const items = data?.data?.content ?? data?.content ?? [];
  return items.map(mapContentItem);
}

export async function getStudent4ContentById(id) {
  const data = await authenticatedRequest('get', `/content/${id}`);
  const content = data?.data?.content ?? data?.content ?? data?.data ?? data;
  if (!content?.id) {
    throw Object.assign(new Error('Content not found'), { status: 404 });
  }
  return mapContentItem(content);
}

export async function getStudent4PointRates() {
  const data = await authenticatedRequest('get', '/recycling/point-rates');
  const rates = data?.data?.rates ?? data?.rates ?? [];
  return (Array.isArray(rates) ? rates : []).map((rate) => ({
    material: rate.material || rate.materialType || '',
    ratePerKg: Number(rate.ratePerKg) || 0,
  }));
}

export async function getStudent4Missions() {
  const data = await authenticatedRequest('get', '/missions', {
    params: { status: 'ACTIVE' },
  });
  const items = data?.data?.missions ?? data?.missions ?? [];
  return items.map(mapMissionToEvent);
}

export async function getStudent4MyMissionSubmissions(userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }
  const data = await authenticatedRequest('get', '/submissions/me', { userToken });
  const items = data?.data?.submissions ?? data?.submissions ?? [];
  return items.map(mapMissionSubmission).filter(Boolean);
}

export async function joinStudent4Mission(missionId, userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }
  const data = await authenticatedRequest('post', `/missions/${missionId}/join`, {
    userToken,
  });
  const submission = data?.data?.submission ?? data?.submission ?? data;
  return mapMissionSubmission(submission);
}

export async function submitStudent4Mission(missionId, body, userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }
  const payload = {};
  if (body?.proofText != null && String(body.proofText).trim()) {
    payload.proofText = String(body.proofText).trim();
  }
  if (body?.proofImageUrl) {
    payload.proofImageUrl = String(body.proofImageUrl).trim();
  }
  if (body?.quantity != null && body.quantity !== '') {
    const qty = Number(body.quantity);
    if (Number.isFinite(qty) && qty > 0) payload.quantity = Math.floor(qty);
  }
  if (body?.uploadId) {
    payload.uploadId = String(body.uploadId);
  }

  const data = await authenticatedRequest('post', `/missions/${missionId}/submit`, {
    data: payload,
    userToken,
  });
  const submission = data?.data?.submission ?? data?.submission ?? data;
  return mapMissionSubmission(submission);
}

export async function uploadStudent4MissionProof(file, userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }
  if (!file?.buffer) {
    throw Object.assign(new Error('No image file provided'), { status: 400 });
  }

  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || 'image/jpeg' });
  form.append('file', blob, file.originalname || 'mission-proof.jpg');

  const response = await client.post('/uploads/mission-proof', form, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  const upload =
    response.data?.data?.upload ?? response.data?.upload ?? response.data?.data ?? response.data;

  if (!upload?.id) {
    throw Object.assign(new Error('Upload did not return an id'), { status: 502 });
  }

  return {
    id: upload.id,
    fileUrl: upload.fileUrl || '',
    mimeType: upload.mimeType || file.mimetype || '',
    purpose: upload.purpose || 'MISSION_PROOF',
  };
}

export async function getStudent4MissionSubmissions(status) {
  const data = await authenticatedRequest('get', '/submissions', {
    params: status ? { status } : undefined,
  });
  const items = data?.data?.submissions ?? data?.submissions ?? [];
  return items.map(mapMissionSubmission).filter(Boolean);
}

export async function reviewStudent4MissionSubmission(id, status, reviewNote) {
  const data = await authenticatedRequest('patch', `/submissions/${id}/review`, {
    data: {
      status,
      reviewNote: reviewNote || undefined,
    },
  });
  const submission = data?.data?.submission ?? data?.submission ?? data?.data ?? data;
  return mapMissionSubmission(submission);
}

export async function getStudent4Quizzes() {
  const data = await authenticatedRequest('get', '/quizzes');
  const items = data?.data?.quizzes ?? data?.quizzes ?? [];
  return items.map(mapQuizListItem);
}

export async function getStudent4Quiz(id) {
  const data = await authenticatedRequest('get', `/quizzes/${id}`);
  const quiz = data?.data?.quiz ?? data?.quiz;
  if (!quiz) {
    throw Object.assign(new Error('Quiz not found'), { status: 404 });
  }
  return mapQuizDetail(quiz);
}

export async function submitStudent4QuizAttempt(id, answers, timeSpentSeconds, userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }

  const data = await authenticatedRequest('post', `/quizzes/${id}/attempts`, {
    userToken,
    data: {
      answers,
      timeSpentSeconds: timeSpentSeconds ?? 0,
    },
  });
  return data?.data ?? data;
}

function badgeTierIcon(tier) {
  switch (tier) {
    case 'GOLD':
      return 'trophy';
    case 'SILVER':
      return 'star';
    case 'BRONZE':
      return 'leaf';
    default:
      return 'badge';
  }
}

function mapBadgeItem(badge, earned) {
  return {
    id: badge.badgeId || badge.id || badge.slug,
    name: badge.name,
    description: badge.description,
    earned,
    icon: badgeTierIcon(badge.tier),
    tier: badge.tier || '',
    criteriaType: badge.criteriaType || '',
    criteriaValue: badge.criteriaValue ?? null,
    rewardPoints: badge.rewardPoints ?? 0,
    currentProgress: badge.currentProgress ?? 0,
  };
}

function mapAdminBadge(badge) {
  if (!badge) return null;
  return {
    id: badge.id,
    slug: badge.slug || '',
    name: badge.name,
    description: badge.description,
    tier: badge.tier || 'BRONZE',
    criteriaType: badge.criteriaType || '',
    criteriaValue: badge.criteriaValue ?? 1,
    rewardPoints: badge.rewardPoints ?? 0,
    isActive: badge.isActive !== false,
  };
}

export async function getStudent4BadgeProgress(userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }

  const data = await authenticatedRequest('get', '/badges/progress', {
    userToken,
  });
  const progress = data?.data ?? data ?? {};
  const earned = (progress.earned || []).map((badge) => mapBadgeItem(badge, true));
  const locked = (progress.locked || []).map((badge) => mapBadgeItem(badge, false));
  return [...earned, ...locked];
}

export async function listStudent4BadgesAdmin() {
  const data = await authenticatedRequest('get', '/badges');
  const items = data?.data?.badges ?? data?.badges ?? [];
  return items.map(mapAdminBadge).filter(Boolean);
}

export async function createStudent4Badge(body) {
  const data = await authenticatedRequest('post', '/badges', {
    data: {
      name: body.name,
      description: body.description,
      tier: body.tier || 'BRONZE',
      criteriaType: body.criteriaType,
      criteriaValue: Number(body.criteriaValue),
      rewardPoints: Number(body.rewardPoints) || 0,
    },
  });
  return mapAdminBadge(data?.data?.badge ?? data?.badge ?? data);
}

export async function updateStudent4Badge(id, body) {
  const payload = {};
  if (body.name != null) payload.name = body.name;
  if (body.description != null) payload.description = body.description;
  if (body.tier != null) payload.tier = body.tier;
  if (body.criteriaType != null) payload.criteriaType = body.criteriaType;
  if (body.criteriaValue != null) payload.criteriaValue = Number(body.criteriaValue);
  if (body.rewardPoints != null) payload.rewardPoints = Number(body.rewardPoints);
  if (body.isActive != null) payload.isActive = Boolean(body.isActive);

  const data = await authenticatedRequest('patch', `/badges/${id}`, { data: payload });
  return mapAdminBadge(data?.data?.badge ?? data?.badge ?? data);
}

export async function deactivateStudent4Badge(id) {
  const data = await authenticatedRequest('delete', `/badges/${id}`);
  return mapAdminBadge(data?.data?.badge ?? data?.badge ?? data);
}

export async function getStudent4Dashboard(userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }

  const [pointsData, recyclingData] = await Promise.all([
    authenticatedRequest('get', '/points/me', { userToken }),
    authenticatedRequest('get', '/recycling/submissions/me', { userToken }).catch(() => ({
      data: { submissions: [] },
    })),
  ]);

  const points = pointsData?.data ?? pointsData ?? {};
  const submissions =
    recyclingData?.data?.submissions ?? recyclingData?.submissions ?? [];

  const approved = submissions.filter((item) => item.status === 'APPROVED');
  const totalKg = approved.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const history = approved.map((item) => ({
    id: item.id,
    date: item.submittedAt
      ? String(item.submittedAt).slice(0, 10)
      : item.reviewedAt
        ? String(item.reviewedAt).slice(0, 10)
        : '',
    category: item.materialType || item.source || 'Recycling',
    kg: Number(item.quantity) || 0,
    points: Number(item.pointsAwarded) || 0,
  }));

  return {
    stats: {
      totalPoints: points.total ?? 0,
      lifetimePoints: points.lifetimeTotal ?? points.total ?? 0,
      totalKg,
      totalDeposits: approved.length,
    },
    history,
  };
}

function mapLeaderboardEntry(entry) {
  return {
    rank: entry.rank,
    name: entry.full_name || entry.name || 'Unknown',
    points: entry.lifetime_points ?? entry.total_points ?? 0,
    kg: Number(entry.approved_recycling_submissions) || 0,
    userId: entry.user_id || null,
  };
}

export async function getStudent4Leaderboard() {
  const data = await authenticatedRequest('get', '/leaderboard');
  const payload = data?.data ?? data ?? {};
  const entries = payload.entries ?? [];
  return entries.map(mapLeaderboardEntry);
}

function mapRewardItem(item) {
  return {
    id: item.id,
    name: item.name,
    pointsRequired: item.pointsRequired ?? item.points ?? 0,
    image:
      item.imageUrl ||
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=480&q=80&auto=format&fit=crop',
    stock: item.stock ?? 0,
    category: item.category || '',
    tier: item.tier || 'small',
    isActive: item.isActive !== false,
    description: item.category || '',
  };
}

export async function getStudent4Rewards(includeInactive = false) {
  const data = await authenticatedRequest('get', '/rewards', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  });
  const items = data?.data?.rewards ?? data?.rewards ?? [];
  return items.map(mapRewardItem);
}

export async function createStudent4Reward(payload) {
  const data = await authenticatedRequest('post', '/rewards', {
    data: {
      name: payload.name,
      pointsRequired: Number(payload.pointsRequired),
      stock: Number(payload.stock ?? 0),
      imageUrl: payload.imageUrl || undefined,
      category: payload.category || undefined,
      tier: payload.tier || 'small',
    },
  });
  const reward = data?.data?.reward ?? data?.reward ?? data?.data ?? data;
  return mapRewardItem(reward);
}

export async function updateStudent4Reward(id, payload) {
  const body = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.pointsRequired !== undefined) body.pointsRequired = Number(payload.pointsRequired);
  if (payload.stock !== undefined) body.stock = Number(payload.stock);
  if (payload.imageUrl !== undefined) body.imageUrl = payload.imageUrl || '';
  if (payload.category !== undefined) body.category = payload.category;
  if (payload.tier !== undefined) body.tier = payload.tier;
  if (payload.isActive !== undefined) body.isActive = Boolean(payload.isActive);

  const data = await authenticatedRequest('patch', `/rewards/${id}`, { data: body });
  const reward = data?.data?.reward ?? data?.reward ?? data?.data ?? data;
  return mapRewardItem(reward);
}

/** Soft-delete (deactivate) on Student 4 backend. */
export async function deleteStudent4Reward(id) {
  const data = await authenticatedRequest('delete', `/rewards/${id}`);
  const reward = data?.data?.reward ?? data?.reward ?? data?.data ?? data;
  return mapRewardItem(reward);
}

/** Upload reward image to Student4 → Azure Blob (persistent). */
export async function uploadStudent4RewardImage(rewardId, file) {
  if (!file?.buffer) {
    throw Object.assign(new Error('No image file provided'), { status: 400 });
  }

  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || 'image/jpeg' });
  form.append('file', blob, file.originalname || 'reward-image.jpg');

  const response = await client.post(`/rewards/${rewardId}/image`, form, {
    headers: {
      Authorization: `Bearer ${await getAdminToken()}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 60000,
  });

  const payload = response.data?.data ?? response.data;
  const rewardRaw = payload?.reward ?? payload;
  const upload = payload?.upload;
  const reward = mapRewardItem(rewardRaw);
  const fileUrl =
    upload?.readUrl ||
    reward?.image ||
    upload?.fileUrl ||
    rewardRaw?.imageUrl ||
    '';

  if (!fileUrl) {
    throw Object.assign(new Error('Reward image upload did not return a file URL'), {
      status: 502,
    });
  }

  return {
    reward,
    fileUrl,
    uploadId: upload?.id || '',
  };
}

/** Fresh SAS / read URL for a stored Student4 upload (gallery refresh). */
export async function getStudent4UploadReadUrl(uploadId) {
  if (!uploadId) return null;
  const data = await authenticatedRequest('get', `/uploads/${uploadId}`);
  const upload = data?.data?.upload ?? data?.upload ?? data?.data ?? data;
  return upload?.readUrl || upload?.fileUrl || null;
}

export async function redeemStudent4Reward(id, userToken, quantity = 1) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }
  const data = await authenticatedRequest('post', `/rewards/${id}/redeem`, {
    userToken,
    data: { quantity },
  });
  return data?.data ?? data;
}

function mapRedemptionItem(item) {
  const statusMap = {
    RESERVED: 'Reserved',
    COMPLETED: 'Fulfilled',
    CANCELLED: 'Cancelled',
  };

  return {
    id: item.id,
    userName: item.user?.name || 'Unknown',
    userEmail: item.user?.email || item.userEmail || '',
    rewardId: item.rewardId || item.reward?.id || null,
    reward: item.reward?.name || item.itemName || 'Reward',
    points: item.pointsSpent ?? item.reward?.pointsRequired ?? 0,
    quantity: item.quantity ?? 1,
    date: item.createdAt ? String(item.createdAt).slice(0, 10) : '',
    createdAt: item.createdAt || null,
    completedAt: item.completedAt || null,
    status: statusMap[item.status] || item.status || 'Reserved',
    rawStatus: item.status,
  };
}

export async function getStudent4MyRedemptions(userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }
  const data = await authenticatedRequest('get', '/rewards/redemptions/me', {
    userToken,
  });
  const items = data?.data?.redemptions ?? data?.redemptions ?? [];
  return items.map(mapRedemptionItem);
}

export async function getStudent4Redemptions() {
  const data = await authenticatedRequest('get', '/rewards/redemptions');
  const items = data?.data?.redemptions ?? data?.redemptions ?? [];
  return items.map(mapRedemptionItem);
}

export async function completeStudent4Redemption(id) {
  const data = await authenticatedRequest('post', `/rewards/redemptions/${id}/complete`);
  const redemption = data?.data?.redemption ?? data?.redemption ?? data?.data ?? data;
  return mapRedemptionItem(redemption);
}

export async function cancelStudent4Redemption(id, reason) {
  const data = await authenticatedRequest('post', `/rewards/redemptions/${id}/cancel`, {
    data: reason ? { reason } : {},
  });
  const redemption = data?.data?.redemption ?? data?.redemption ?? data?.data ?? data;
  return mapRedemptionItem(redemption);
}

function mapRecyclingDeposit(item) {
  const statusMap = {
    PENDING_REVIEW: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    ONGOING: 'Pending',
  };

  return {
    id: item.id,
    userName: item.user?.name || 'Unknown',
    userEmail: item.user?.email || '',
    date: item.submittedAt
      ? String(item.submittedAt).slice(0, 10)
      : item.createdAt
        ? String(item.createdAt).slice(0, 10)
        : '',
    category: item.materialType || item.mission?.title || 'Recycling',
    kg: Number(item.quantity) || 0,
    status: statusMap[item.status] || item.status || 'Pending',
    rejectionReason: item.reviewNote || '',
    source: item.source || 'MANUAL',
    pointsAwarded: item.pointsAwarded ?? null,
  };
}

export async function getStudent4RecyclingDeposits() {
  const data = await authenticatedRequest('get', '/recycling/submissions');
  const items = data?.data?.submissions ?? data?.submissions ?? [];
  return items.map(mapRecyclingDeposit);
}

export async function reviewStudent4RecyclingDeposit(id, status, reviewNote) {
  const data = await authenticatedRequest('patch', `/recycling/submissions/${id}/review`, {
    data: {
      status,
      reviewNote: reviewNote || undefined,
    },
  });
  const submission = data?.data?.submission ?? data?.submission ?? data?.data ?? data;
  return mapRecyclingDeposit(submission);
}

function mapRecyclingQr(qr) {
  if (!qr) return qr;
  return {
    id: qr.id,
    status: qr.status,
    materialType: qr.materialType,
    estimatedWeightKg: Number(qr.estimatedWeightKg) || 0,
    expiresAt: qr.expiresAt,
    claimedAt: qr.claimedAt || null,
    issuedBy: qr.issuedBy?.name || '',
    claimedBy: qr.claimedBy?.name || '',
    claimPayload: qr.claimPayload || JSON.stringify(qr.signedPayload || {}),
    signedPayload: qr.signedPayload || null,
  };
}

export async function issueStudent4RecyclingQr(payload) {
  const data = await authenticatedRequest('post', '/recycling/qr/issue', {
    data: {
      materialType: payload.materialType,
      estimatedWeightKg: Number(payload.estimatedWeightKg),
      expiresInMinutes: payload.expiresInMinutes
        ? Number(payload.expiresInMinutes)
        : undefined,
    },
  });
  const qr = data?.data?.qr ?? data?.qr ?? data?.data ?? data;
  return mapRecyclingQr(qr);
}

export async function listStudent4RecyclingQrCodes(status) {
  const data = await authenticatedRequest('get', '/recycling/qr', {
    params: status ? { status } : undefined,
  });
  const items = data?.data?.qrCodes ?? data?.qrCodes ?? [];
  return items.map(mapRecyclingQr);
}

export async function claimStudent4RecyclingQr(claimBody, userToken) {
  if (!userToken) {
    throw Object.assign(new Error('Student session required'), { status: 401 });
  }

  let body = claimBody;
  if (typeof claimBody === 'string') {
    body = JSON.parse(claimBody);
  }

  const data = await authenticatedRequest('post', '/recycling/qr/claim', {
    data: body,
    userToken,
  });
  const submission = data?.data?.submission ?? data?.submission ?? data?.data ?? data;
  return mapRecyclingDeposit(submission);
}

export async function getStudent4AuditLogs(params = {}) {
  const data = await authenticatedRequest('get', '/audit-logs', { params });
  return data?.data ?? data;
}

function mapContentAdminItem(item) {
  return {
    id: item.id,
    kind: 'Content',
    title: item.title,
    body: item.body || '',
    summary: item.summary || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    status: item.status || 'DRAFT',
    date: item.updatedAt
      ? String(item.updatedAt).slice(0, 10)
      : item.createdAt
        ? String(item.createdAt).slice(0, 10)
        : '',
  };
}

function mapMissionAdminItem(item) {
  return {
    id: item.id,
    kind: 'Mission',
    title: item.title,
    body: item.description || '',
    description: item.description || '',
    longDescription: item.longDescription || '',
    missionType: item.type || 'QUANTITY_BASED',
    tags: [],
    status: item.status || 'DRAFT',
    startAt: item.startAt ? String(item.startAt).slice(0, 16) : '',
    endAt: item.endAt ? String(item.endAt).slice(0, 16) : '',
    points: item.points ?? 0,
    submissionCap: item.submissionCap ?? 1,
    targetQuantity: item.targetQuantity ?? '',
    autoApprove: Boolean(item.autoApprove),
    date: item.updatedAt
      ? String(item.updatedAt).slice(0, 10)
      : item.createdAt
        ? String(item.createdAt).slice(0, 10)
        : '',
  };
}

export async function listStudent4ContentAdmin() {
  const data = await authenticatedRequest('get', '/content');
  const items = data?.data?.content ?? data?.content ?? [];
  return items.map(mapContentAdminItem);
}

export async function createStudent4Content(body) {
  const data = await authenticatedRequest('post', '/content', { data: body });
  const content = data?.data?.content ?? data?.content ?? data?.data ?? data;
  return mapContentAdminItem(content);
}

export async function updateStudent4Content(id, body) {
  const data = await authenticatedRequest('put', `/content/${id}`, { data: body });
  const content = data?.data?.content ?? data?.content ?? data?.data ?? data;
  return mapContentAdminItem(content);
}

export async function archiveStudent4Content(id) {
  const data = await authenticatedRequest('delete', `/content/${id}`);
  const content = data?.data?.content ?? data?.content ?? data?.data ?? data;
  return mapContentAdminItem(content);
}

export async function listStudent4MissionsAdmin() {
  const data = await authenticatedRequest('get', '/missions');
  const items = data?.data?.missions ?? data?.missions ?? [];
  return items.map(mapMissionAdminItem);
}

export async function createStudent4Mission(body) {
  const data = await authenticatedRequest('post', '/missions', { data: body });
  const mission = data?.data?.mission ?? data?.mission ?? data?.data ?? data;
  return mapMissionAdminItem(mission);
}

export async function updateStudent4Mission(id, body) {
  const data = await authenticatedRequest('patch', `/missions/${id}`, { data: body });
  const mission = data?.data?.mission ?? data?.mission ?? data?.data ?? data;
  return mapMissionAdminItem(mission);
}

export async function archiveStudent4Mission(id) {
  const data = await authenticatedRequest('delete', `/missions/${id}`);
  const mission = data?.data?.mission ?? data?.mission ?? data?.data ?? data;
  return mapMissionAdminItem(mission);
}
