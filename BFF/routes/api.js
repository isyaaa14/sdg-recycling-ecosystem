import { Router } from 'express';
import verifyToken from '../middleware/verifyToken.js';
import {
  publicUploadsBaseUrl,
  saveRewardImageBuffer,
  uploadMissionProofImage,
  uploadRewardImageMemory,
} from '../middleware/upload.js';
import {
  cancelStudent4Redemption,
  completeStudent4Redemption,
  createStudent4Badge,
  createStudent4Reward,
  deactivateStudent4Badge,
  archiveStudent4Content,
  archiveStudent4Mission,
  createStudent4Content,
  createStudent4Mission,
  getStudent4AuditLogs,
  getStudent4BadgeProgress,
  getStudent4Content,
  getStudent4ContentById,
  getStudent4PointRates,
  listStudent4ContentAdmin,
  listStudent4MissionsAdmin,
  updateStudent4Content,
  updateStudent4Mission,
  uploadStudent4MissionProof,
  getStudent4Dashboard,
  getStudent4Leaderboard,
  getStudent4Missions,
  getStudent4MyMissionSubmissions,
  getStudent4MissionSubmissions,
  getStudent4Quiz,
  getStudent4Quizzes,
  getStudent4RecyclingDeposits,
  getStudent4MyRedemptions,
  getStudent4Redemptions,
  getStudent4Rewards,
  issueStudent4RecyclingQr,
  joinStudent4Mission,
  listStudent4BadgesAdmin,
  listStudent4RecyclingQrCodes,
  claimStudent4RecyclingQr,
  redeemStudent4Reward,
  reviewStudent4MissionSubmission,
  reviewStudent4RecyclingDeposit,
  submitStudent4Mission,
  submitStudent4QuizAttempt,
  updateStudent4Badge,
  updateStudent4Reward,
  deleteStudent4Reward,
  uploadStudent4RewardImage,
  getStudent4UploadReadUrl,
} from '../services/student4Client.js';
import {
  addRewardGalleryImage,
  attachGalleryToReward,
  getMainGalleryUrl,
  getRewardGallery,
  removeRewardGalleryImage,
  setRewardGalleryMain,
} from '../services/rewardGallery.js';
import {
  countUnread,
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications.js';

const router = Router();

router.use(verifyToken);

function getStudent4UserToken(req) {
  const header = req.headers['x-student4-token'];
  return typeof header === 'string' && header.trim() ? header.trim() : null;
}

function requireStudent4UserToken(req, res) {
  const token = getStudent4UserToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Student session missing. Please log out and log in again.',
    });
    return null;
  }
  return token;
}

function requireUserEmail(req, res) {
  const email = req.user?.email;
  if (!email) {
    res.status(401).json({ error: 'Unauthorised' });
    return null;
  }
  return email;
}

router.get('/notifications', (req, res) => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const items = listNotifications(email);
  res.json({
    items,
    unreadCount: items.filter((item) => !item.read).length,
  });
});

router.get('/notifications/unread-count', (req, res) => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  res.json({ unreadCount: countUnread(email) });
});

router.post('/notifications', (req, res) => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const { type, title, body, link, dedupeKey } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'title is required.' });
  }
  const notification = createNotification(email, {
    type,
    title,
    body,
    link,
    dedupeKey,
  });
  res.status(201).json(notification);
});

router.patch('/notifications/:id/read', (req, res) => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const item = markNotificationRead(email, req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Notification not found.' });
  }
  res.json(item);
});

router.post('/notifications/read-all', (req, res) => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const items = markAllNotificationsRead(email);
  res.json({ items, unreadCount: 0 });
});

router.get('/leaderboard', async (_req, res) => {
  try {
    const leaderboard = await getStudent4Leaderboard();
    res.json(leaderboard);
  } catch (error) {
    console.error('[GET /leaderboard] backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load leaderboard. The backend may be offline — please try again.',
    });
  }
});

async function withGallery(reward) {
  return attachGalleryToReward(reward, {
    refreshReadUrl: getStudent4UploadReadUrl,
  });
}

router.get('/rewards', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const rewards = await getStudent4Rewards(includeInactive);
    res.json(await Promise.all(rewards.map((reward) => withGallery(reward))));
  } catch (error) {
    console.error('[GET /rewards] backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load rewards. The backend may be offline — please try again.',
    });
  }
});

router.post('/rewards', async (req, res) => {
  try {
    const reward = await createStudent4Reward(req.body || {});
    res.status(201).json(await withGallery(reward));
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to create reward.';
    console.error('[POST /rewards] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.patch('/rewards/:id', async (req, res) => {
  try {
    const reward = await updateStudent4Reward(req.params.id, req.body || {});
    res.json(await withGallery(reward));
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to update reward.';
    console.error('[PATCH /rewards/:id] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.delete('/rewards/:id', async (req, res) => {
  try {
    const reward = await deleteStudent4Reward(req.params.id);
    res.json(await withGallery(reward));
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to delete reward.';
    console.error('[DELETE /rewards/:id] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.post('/rewards/:id/image', (req, res) => {
  uploadRewardImageMemory.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ error: uploadError.message || 'Invalid image upload.' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
      }

      // Durable on Azure: files live under /home (survive zip deploy). Also sync
      // main cover to Student4 when possible (existing backend API only — no redeploy).
      const { filename } = saveRewardImageBuffer(req.file);
      const localUrl = `${publicUploadsBaseUrl(req)}/uploads/rewards/${filename}`;
      const makeMain = req.body?.makeMain === 'true' || req.body?.makeMain === true;
      const existingGallery = getRewardGallery(req.params.id);
      const shouldMakeMain = makeMain || existingGallery.images.length === 0;

      let uploadId = null;
      let reward = null;
      try {
        const uploaded = await uploadStudent4RewardImage(req.params.id, req.file);
        reward = uploaded.reward;
        uploadId = uploaded.uploadId || null;
      } catch (syncError) {
        console.warn(
          '[POST /rewards/:id/image] Student4 sync skipped:',
          syncError.message
        );
      }

      addRewardGalleryImage(req.params.id, localUrl, {
        makeMain: shouldMakeMain,
        uploadId,
      });

      const mainUrl = getMainGalleryUrl(req.params.id) || localUrl;
      const synced =
        reward && mainUrl && mainUrl !== reward.image
          ? await updateStudent4Reward(req.params.id, { imageUrl: mainUrl })
          : reward || { id: req.params.id, image: mainUrl };

      return res.status(201).json(await withGallery(synced));
    } catch (error) {
      const code = error.response?.status || error.status;
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        'Unable to upload reward image.';
      console.error('[POST /rewards/:id/image] failed:', error.message);
      return res.status(code && code < 500 ? code : 503).json({ error: message });
    }
  });
});

router.get('/rewards/:id/images', async (req, res) => {
  try {
    const attached = await withGallery({ id: req.params.id, image: '' });
    res.json({ images: attached.images || [] });
  } catch {
    res.status(500).json({ error: 'Unable to load gallery.' });
  }
});

router.post('/rewards/:id/images/:imageId/main', async (req, res) => {
  try {
    const gallery = setRewardGalleryMain(req.params.id, req.params.imageId);
    const mainUrl = getMainGalleryUrl(req.params.id);
    if (mainUrl) {
      await updateStudent4Reward(req.params.id, { imageUrl: mainUrl });
    }
    res.json(gallery);
  } catch (error) {
    const code = error.status || 500;
    res.status(code).json({ error: error.message || 'Unable to set main image.' });
  }
});

router.delete('/rewards/:id/images/:imageId', async (req, res) => {
  try {
    const gallery = removeRewardGalleryImage(req.params.id, req.params.imageId);
    const mainUrl = getMainGalleryUrl(req.params.id);
    await updateStudent4Reward(req.params.id, { imageUrl: mainUrl || '' });
    res.json(gallery);
  } catch {
    res.status(500).json({ error: 'Unable to remove gallery image.' });
  }
});

router.post('/rewards/:id/redeem', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const quantity = Number(req.body?.quantity) || 1;
    const result = await redeemStudent4Reward(req.params.id, userToken, quantity);
    const rewardName =
      result?.reward?.name ||
      result?.redemption?.reward?.name ||
      result?.itemName ||
      'reward';
    if (req.user?.email) {
      createNotification(req.user.email, {
        type: 'reward',
        title: 'Reward reserved',
        body: `Your redemption for ${rewardName} is reserved. Show your ticket at pickup.`,
        link: '/my-redemptions',
        dedupeKey: `redeem:${result?.id || result?.redemption?.id || Date.now()}`,
      });
    }
    res.json(result);
  } catch (error) {
    const code = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to redeem reward. Check your points and stock.';
    console.error('[POST /rewards/:id/redeem] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.get('/rewards/redemptions/me', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const redemptions = await getStudent4MyRedemptions(userToken);
    res.json(redemptions);
  } catch (error) {
    const code = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to load your redemptions.';
    console.error('[GET /rewards/redemptions/me] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.get('/rewards/redemptions', async (_req, res) => {
  try {
    const redemptions = await getStudent4Redemptions();
    res.json(redemptions);
  } catch (error) {
    console.error('[GET /rewards/redemptions] failed:', error.message);
    res.status(503).json({
      error: 'Unable to load redemption requests.',
    });
  }
});

router.post('/rewards/redemptions/:id/complete', async (req, res) => {
  try {
    let prior = null;
    try {
      const list = await getStudent4Redemptions();
      prior = list.find((item) => item.id === req.params.id) || null;
    } catch {
      prior = null;
    }

    const redemption = await completeStudent4Redemption(req.params.id);
    const email = redemption?.userEmail || prior?.userEmail;
    const rewardName = redemption?.reward || prior?.reward || 'reward';
    if (email) {
      createNotification(email, {
        type: 'reward',
        title: 'Redemption fulfilled',
        body: `Your redemption for ${rewardName} was marked fulfilled. Enjoy your reward!`,
        link: '/my-redemptions',
        dedupeKey: `redeem-fulfilled:${req.params.id}`,
      });
    }
    res.json(redemption);
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to complete redemption.';
    console.error('[POST /rewards/redemptions/:id/complete] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.post('/rewards/redemptions/:id/cancel', async (req, res) => {
  try {
    let prior = null;
    try {
      const list = await getStudent4Redemptions();
      prior = list.find((item) => item.id === req.params.id) || null;
    } catch {
      prior = null;
    }

    const reason = req.body?.reason;
    const redemption = await cancelStudent4Redemption(req.params.id, reason);
    const email = redemption?.userEmail || prior?.userEmail;
    const rewardName = redemption?.reward || prior?.reward || 'reward';
    const points = Number(redemption?.points ?? prior?.points) || 0;
    if (email) {
      createNotification(email, {
        type: 'reward',
        title: 'Redemption cancelled — points refunded',
        body: points
          ? `Your redemption for ${rewardName} was cancelled. ${points} points were refunded to your balance.`
          : `Your redemption for ${rewardName} was cancelled and points were refunded.`,
        link: '/my-redemptions',
        dedupeKey: `redeem-cancelled:${req.params.id}`,
      });
    }
    res.json(redemption);
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to cancel redemption.';
    console.error('[POST /rewards/redemptions/:id/cancel] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.get('/badges', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const badges = await getStudent4BadgeProgress(userToken);
    res.json(badges);
  } catch (error) {
    console.error('[GET /badges] Student 4 backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load badges. The badge service may be offline — please try again.',
    });
  }
});

router.get('/admin/badges', async (_req, res) => {
  try {
    const badges = await listStudent4BadgesAdmin();
    res.json(badges);
  } catch (error) {
    console.error('[GET /admin/badges] failed:', error.message);
    res.status(503).json({
      error: 'Unable to load badges for admin. The badge service may be offline.',
    });
  }
});

router.get('/admin/audit-logs', async (req, res) => {
  if (req.user?.role !== 'system_admin') {
    return res.status(403).json({ error: 'Only System Admin can view audit logs.' });
  }

  try {
    const result = await getStudent4AuditLogs({
      page: req.query.page,
      limit: req.query.limit,
      action: req.query.action,
      userId: req.query.userId,
    });
    res.json(result);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to load audit logs. The backend may be offline.';
    console.error('[GET /admin/audit-logs] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.post('/admin/badges', async (req, res) => {
  try {
    const badge = await createStudent4Badge(req.body || {});
    res.status(201).json(badge);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to create badge.';
    console.error('[POST /admin/badges] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.patch('/admin/badges/:id', async (req, res) => {
  try {
    const badge = await updateStudent4Badge(req.params.id, req.body || {});
    res.json(badge);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to update badge.';
    console.error('[PATCH /admin/badges/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.delete('/admin/badges/:id', async (req, res) => {
  try {
    const badge = await deactivateStudent4Badge(req.params.id);
    res.json(badge);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to deactivate badge.';
    console.error('[DELETE /admin/badges/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.get('/content', async (_req, res) => {
  try {
    const content = await getStudent4Content();
    res.json(content);
  } catch (error) {
    console.error('[GET /content] Student 4 backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load educational content. The content service may be offline — please try again.',
    });
  }
});

router.get('/content/:id', async (req, res) => {
  try {
    const content = await getStudent4ContentById(req.params.id);
    res.json(content);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unable to load this article.';
    console.error('[GET /content/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

function requireContentManager(req, res) {
  const role = req.user?.role;
  if (role !== 'content_manager' && role !== 'system_admin') {
    res.status(403).json({ error: 'Only Content Manager or System Admin can manage content and missions.' });
    return false;
  }
  return true;
}

router.get('/admin/content-missions', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    const [content, missions] = await Promise.all([
      listStudent4ContentAdmin(),
      listStudent4MissionsAdmin(),
    ]);
    res.json([...content, ...missions]);
  } catch (error) {
    console.error('[GET /admin/content-missions] failed:', error.message);
    res.status(503).json({
      error: 'Unable to load content and missions. The backend may be offline.',
    });
  }
});

router.post('/admin/content', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    const content = await createStudent4Content(req.body || {});
    res.status(201).json(content);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to create content.';
    console.error('[POST /admin/content] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.put('/admin/content/:id', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    const content = await updateStudent4Content(req.params.id, req.body || {});
    res.json(content);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to update content.';
    console.error('[PUT /admin/content/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.delete('/admin/content/:id', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    const content = await archiveStudent4Content(req.params.id);
    res.json(content);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to archive content.';
    console.error('[DELETE /admin/content/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.post('/admin/missions', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    // Always require Content Manager review — no auto-approve.
    const mission = await createStudent4Mission({
      ...(req.body || {}),
      autoApprove: false,
    });
    res.status(201).json(mission);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to create mission.';
    console.error('[POST /admin/missions] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.patch('/admin/missions/:id', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    const mission = await updateStudent4Mission(req.params.id, {
      ...(req.body || {}),
      autoApprove: false,
    });
    res.json(mission);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to update mission.';
    console.error('[PATCH /admin/missions/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.delete('/admin/missions/:id', async (req, res) => {
  if (!requireContentManager(req, res)) return;
  try {
    const mission = await archiveStudent4Mission(req.params.id);
    res.json(mission);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to archive mission.';
    console.error('[DELETE /admin/missions/:id] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.get('/quizzes', async (_req, res) => {
  try {
    const quizzes = await getStudent4Quizzes();
    res.json(quizzes);
  } catch (error) {
    console.error('[GET /quizzes] Student 4 backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load quizzes. The quiz service may be offline — please try again.',
    });
  }
});

router.get('/quizzes/:id', async (req, res) => {
  try {
    const quiz = await getStudent4Quiz(req.params.id);
    res.json(quiz);
  } catch (error) {
    if (error.status === 404 || error.response?.status === 404) {
      return res.status(404).json({ error: 'Quiz not found.' });
    }
    console.error('[GET /quizzes/:id] Student 4 backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load this quiz. The quiz service may be offline — please try again.',
    });
  }
});

router.post('/quizzes/:id/attempts', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;

    const { answers, timeSpentSeconds } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object is required.' });
    }
    const result = await submitStudent4QuizAttempt(
      req.params.id,
      answers,
      timeSpentSeconds,
      userToken
    );
    res.json(result);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to submit quiz attempt. Please try again.';
    console.error('[POST /quizzes/:id/attempts] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.get('/events', async (_req, res) => {
  try {
    const events = await getStudent4Missions();
    res.json(events);
  } catch (error) {
    console.error('[GET /events] Student 4 backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load events. The mission service may be offline — please try again.',
    });
  }
});

router.get('/events/my-submissions', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const submissions = await getStudent4MyMissionSubmissions(userToken);
    res.json(submissions);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to load your mission progress.';
    console.error('[GET /events/my-submissions] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.post('/events/:id/join', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const submission = await joinStudent4Mission(req.params.id, userToken);
    res.status(201).json(submission);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to join this event. Please try again.';
    console.error('[POST /events/:id/join] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.post('/events/mission-proof', (req, res) => {
  uploadMissionProofImage.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        error: uploadError.message || 'Invalid image upload. Use JPEG, PNG, or WebP (max 5MB).',
      });
    }

    try {
      const userToken = requireStudent4UserToken(req, res);
      if (!userToken) return;
      if (!req.file) {
        return res.status(400).json({ error: 'Please choose a proof photo to upload.' });
      }

      const upload = await uploadStudent4MissionProof(req.file, userToken);
      return res.status(201).json(upload);
    } catch (error) {
      const status = error.response?.status || error.status;
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.error ||
        error.message ||
        'Unable to upload proof photo.';
      console.error('[POST /events/mission-proof] failed:', error.message);
      return res.status(status && status < 500 ? status : 503).json({ error: message });
    }
  });
});

router.post('/events/:id/submit', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const submission = await submitStudent4Mission(
      req.params.id,
      req.body || {},
      userToken
    );

    if (req.user?.email) {
      if (submission?.status === 'APPROVED') {
        createNotification(req.user.email, {
          type: 'mission',
          title: 'Mission completed',
          body: 'Your mission proof was auto-approved.',
          link: '/missions',
          dedupeKey: `mission-auto:${submission.id || req.params.id}`,
        });
      } else if (submission?.status === 'PENDING_REVIEW') {
        createNotification(req.user.email, {
          type: 'mission',
          title: 'Mission submitted',
          body: 'Your proof is pending admin review.',
          link: '/missions',
          dedupeKey: `mission-submit:${submission.id || req.params.id}`,
        });
      }
    }

    res.status(201).json(submission);
  } catch (error) {
    const status = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to submit proof. Please try again.';
    console.error('[POST /events/:id/submit] failed:', error.message);
    res.status(status && status < 500 ? status : 503).json({ error: message });
  }
});

router.get('/mission-submissions', async (req, res) => {
  try {
    const status = req.query.status || 'PENDING_REVIEW';
    const submissions = await getStudent4MissionSubmissions(status);
    res.json(submissions);
  } catch (error) {
    console.error('[GET /mission-submissions] failed:', error.message);
    res.status(503).json({
      error: 'Unable to load mission submissions. The backend may be offline — please try again.',
    });
  }
});

router.patch('/mission-submissions/:id/review', async (req, res) => {
  try {
    const { status, reviewNote } = req.body || {};
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
    }

    let prior = null;
    try {
      const pending = await getStudent4MissionSubmissions('PENDING_REVIEW');
      prior = pending.find((item) => item.id === req.params.id) || null;
    } catch {
      prior = null;
    }

    const submission = await reviewStudent4MissionSubmission(
      req.params.id,
      status,
      reviewNote
    );

    const email = prior?.userEmail || submission?.userEmail;
    const missionTitle =
      prior?.missionTitle || submission?.missionTitle || 'your mission';
    if (email) {
      if (status === 'APPROVED') {
        createNotification(email, {
          type: 'mission',
          title: 'Mission approved',
          body: `${missionTitle} was approved. Points and badge progress may update.`,
          link: '/missions',
          dedupeKey: `mission-approved:${req.params.id}`,
        });
      } else {
        createNotification(email, {
          type: 'mission',
          title: 'Mission rejected',
          body: reviewNote
            ? `${missionTitle} was rejected: ${reviewNote}`
            : `${missionTitle} was rejected.`,
          link: '/missions',
          dedupeKey: `mission-rejected:${req.params.id}`,
        });
      }
    }

    res.json(submission);
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to review mission submission. Please try again.';
    console.error('[PATCH /mission-submissions/:id/review] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.get('/deposits', async (_req, res) => {
  try {
    const deposits = await getStudent4RecyclingDeposits();
    res.json(deposits);
  } catch (error) {
    console.error('[GET /deposits] backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load recycling deposits. The backend may be offline — please try again.',
    });
  }
});

router.patch('/deposits/:id/review', async (req, res) => {
  try {
    const { status, reviewNote } = req.body || {};
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
    }

    let prior = null;
    try {
      const deposits = await getStudent4RecyclingDeposits();
      prior = deposits.find((item) => item.id === req.params.id) || null;
    } catch {
      prior = null;
    }

    const deposit = await reviewStudent4RecyclingDeposit(
      req.params.id,
      status,
      reviewNote
    );

    const email = prior?.userEmail || deposit?.userEmail;
    if (email) {
      if (status === 'APPROVED') {
        createNotification(email, {
          type: 'deposit',
          title: 'Recycling deposit approved',
          body: `Your ${prior?.category || deposit?.category || 'recycling'} deposit was approved.`,
          link: '/dashboard',
          dedupeKey: `deposit-approved:${req.params.id}`,
        });
      } else {
        createNotification(email, {
          type: 'deposit',
          title: 'Recycling deposit rejected',
          body: reviewNote
            ? `Your deposit was rejected: ${reviewNote}`
            : 'Your recycling deposit was rejected.',
          link: '/dashboard',
          dedupeKey: `deposit-rejected:${req.params.id}`,
        });
      }
    }

    res.json(deposit);
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to review deposit. Please try again.';
    console.error('[PATCH /deposits/:id/review] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.post('/recycling/qr/issue', async (req, res) => {
  try {
    const qr = await issueStudent4RecyclingQr(req.body || {});
    res.status(201).json(qr);
  } catch (error) {
    const code = error.response?.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      'Unable to issue recycling QR.';
    console.error('[POST /recycling/qr/issue] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.get('/recycling/qr', async (req, res) => {
  try {
    const qrCodes = await listStudent4RecyclingQrCodes(req.query.status);
    res.json(qrCodes);
  } catch (error) {
    console.error('[GET /recycling/qr] failed:', error.message);
    res.status(503).json({ error: 'Unable to load recycling QR codes.' });
  }
});

router.post('/recycling/qr/claim', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const submission = await claimStudent4RecyclingQr(req.body || {}, userToken);
    res.status(201).json(submission);
  } catch (error) {
    const code = error.response?.status || error.status;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unable to claim QR. It may be invalid, expired, or already used.';
    console.error('[POST /recycling/qr/claim] failed:', error.message);
    res.status(code && code < 500 ? code : 503).json({ error: message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const userToken = requireStudent4UserToken(req, res);
    if (!userToken) return;
    const dashboard = await getStudent4Dashboard(userToken);
    res.json(dashboard);
  } catch (error) {
    console.error('[GET /dashboard] Student 4 backend unavailable:', error.message);
    res.status(503).json({
      error: 'Unable to load dashboard. The points service may be offline — please try again.',
    });
  }
});

router.get('/point-rates', async (_req, res) => {
  try {
    const rates = await getStudent4PointRates();
    res.json(rates);
  } catch (error) {
    console.error('[GET /point-rates] failed:', error.message);
    res.status(503).json({
      error: 'Unable to load point rates. The recycling service may be offline — please try again.',
    });
  }
});

export default router;
