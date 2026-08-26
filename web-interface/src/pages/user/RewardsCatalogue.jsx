import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../services/api';
import { requestNotificationsRefresh } from '../../components/NotificationBell';
import styles from './RewardsCatalogue.module.css';

function formatRedeemError(raw) {
  const message = String(raw || '');
  if (/not enough points/i.test(message)) {
    return 'You don’t have enough points to redeem this reward.';
  }
  const match = message.match(
    /Reward can be redeemed again after (.+)\.?$/i
  );
  if (match?.[1]) {
    const when = new Date(match[1]);
    if (!Number.isNaN(when.getTime())) {
      return `This reward is on cooldown. You can redeem it again after ${when.toLocaleString()}.`;
    }
  }
  return message || 'Unable to redeem. Check your points balance and stock.';
}

function extractRedemption(payload) {
  return (
    payload?.redemption ||
    payload?.data?.redemption ||
    (payload?.id && payload?.status ? payload : null) ||
    null
  );
}

export default function RewardsCatalogue() {
  const [rewards, setRewards] = useState([]);
  const [points, setPoints] = useState(null);
  const [reservedRewardIds, setReservedRewardIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmReward, setConfirmReward] = useState(null);
  const [insufficientReward, setInsufficientReward] = useState(null);
  const [flyingTicket, setFlyingTicket] = useState(null);
  const [successTicket, setSuccessTicket] = useState(null);
  const [galleryReward, setGalleryReward] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const loadRewards = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setLoadError('');
    }

    try {
      const [rewardsRes, dashRes, myRes] = await Promise.all([
        api.get('/rewards'),
        api.get('/dashboard').catch(() => ({ data: null })),
        api.get('/rewards/redemptions/me').catch(() => ({ data: [] })),
      ]);
      setRewards(Array.isArray(rewardsRes.data) ? rewardsRes.data : []);
      setPoints(dashRes.data?.stats?.totalPoints ?? null);

      const mine = Array.isArray(myRes.data) ? myRes.data : [];
      setReservedRewardIds(
        new Set(
          mine
            .filter((item) => item.status === 'Reserved' && item.rewardId)
            .map((item) => item.rewardId)
        )
      );
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Unable to load rewards. Please try again.';
      if (!silent) {
        setLoadError(msg);
        setRewards([]);
      } else {
        setActionError(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const requestRedeem = (reward) => {
    if (reward.stock <= 0 || busyId) return;
    setActionError('');

    const cost = reward.pointsRequired || 0;
    if (typeof points === 'number' && points < cost) {
      setInsufficientReward(reward);
      return;
    }

    setConfirmReward(reward);
  };

  const confirmRedeem = async () => {
    const reward = confirmReward;
    if (!reward || busyId) return;

    const cost = reward.pointsRequired || 0;
    if (typeof points === 'number' && points < cost) {
      setConfirmReward(null);
      setInsufficientReward(reward);
      return;
    }

    setConfirmReward(null);
    setBusyId(reward.id);
    setActionError('');

    try {
      const res = await api.post(`/rewards/${reward.id}/redeem`, { quantity: 1 });
      const redemption = extractRedemption(res.data);
      const ticketId = redemption?.id || null;

      setRewards((prev) =>
        prev.map((item) =>
          item.id === reward.id
            ? { ...item, stock: Math.max(0, (item.stock ?? 0) - 1) }
            : item
        )
      );
      setReservedRewardIds((prev) => new Set(prev).add(reward.id));
      setPoints((prev) =>
        typeof prev === 'number' ? Math.max(0, prev - cost) : prev
      );

      const ticketPayload = {
        ticketId,
        rewardName: reward.name,
        points: cost,
      };
      setFlyingTicket(ticketPayload);
      requestNotificationsRefresh();

      window.setTimeout(() => {
        setFlyingTicket(null);
        setSuccessTicket(ticketPayload);
      }, 1100);

      await loadRewards({ silent: true });
    } catch (err) {
      const raw =
        err.response?.data?.error ||
        'Unable to redeem. Check your points balance and stock.';
      if (/not enough points/i.test(String(raw))) {
        setInsufficientReward(reward);
      } else {
        setActionError(formatRedeemError(raw));
      }
    } finally {
      setBusyId(null);
    }
  };

  const openGallery = (reward) => {
    const images =
      Array.isArray(reward.images) && reward.images.length > 0
        ? reward.images
        : reward.image
          ? [{ id: 'main', url: reward.image, isMain: true }]
          : [];
    if (!images.length) return;
    const mainIdx = Math.max(
      0,
      images.findIndex((img) => img.isMain)
    );
    setGalleryReward({ ...reward, images });
    setGalleryIndex(mainIdx === -1 ? 0 : mainIdx);
  };

  const closeGallery = () => {
    setGalleryReward(null);
    setGalleryIndex(0);
  };

  const galleryImages = galleryReward?.images || [];
  const activeImage = galleryImages[galleryIndex];

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className={`page-header__mark ${styles.giftMark}`} aria-hidden="true">
          <svg
            className={styles.giftSvg}
            xmlns="http://www.w3.org/2000/svg"
            width={96}
            height={96}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line className={styles.flatPaper} x1="3" y1="14.5" x2="21" y2="14.5" />
            <polyline className={styles.boxBody} points="20 12 20 22 4 22 4 12" />
            <rect className={styles.boxLid} x="2" y="7" width="20" height="5" />
            <line className={styles.ribbon} x1="12" y1="22" x2="12" y2="7" />
            <path className={styles.bowLeft} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path className={styles.bowRight} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </span>
        <h1>Rewards Catalogue</h1>
        <p>
          Redeem points for campus rewards. Items stay listed while stock remains —
          your tickets are under More → My redemptions.
        </p>
        {points !== null && (
          <p className={styles.balance} aria-live="polite">
            <span className={styles.balanceLabel}>Your points :</span>
            <span className={styles.balanceValue}>{points}</span>
          </p>
        )}
      </header>

      {loading && <p className={styles.status}>Loading rewards…</p>}

      {!loading && loadError && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{loadError}</p>
          <button type="button" className={styles.retryBtn} onClick={() => loadRewards()}>
            Retry
          </button>
        </div>
      )}

      {!loading && actionError && (
        <p className={styles.errorMessage} role="alert">
          {actionError}
        </p>
      )}

      {!loading && !loadError && (
        <div className="grid-cards">
          {rewards.length === 0 ? (
            <p className={styles.status}>No rewards available yet.</p>
          ) : (
            rewards.map((reward) => {
              const unavailable = reward.stock <= 0;
              const alreadyReserved = reservedRewardIds.has(reward.id);
              const imageCount = Array.isArray(reward.images) ? reward.images.length : 0;
              return (
                <div key={reward.id} className={`card ${styles.rewardCard}`}>
                  <button
                    type="button"
                    className={styles.imageWrap}
                    onClick={() => openGallery(reward)}
                    aria-label={`View images for ${reward.name}`}
                  >
                    <img src={reward.image} alt="" className={styles.image} loading="lazy" />
                    {unavailable && (
                      <span className={styles.unavailableBadge}>Currently not available</span>
                    )}
                    {alreadyReserved && !unavailable && (
                      <span className={styles.reservedBadge}>Open ticket — redeem again anytime</span>
                    )}
                    {imageCount > 1 && (
                      <span className={styles.galleryCount}>{imageCount} photos</span>
                    )}
                  </button>
                  <h3 className={styles.name}>{reward.name}</h3>
                  <p className={styles.points}>
                    {reward.pointsRequired} points required
                    {typeof reward.stock === 'number' ? ` · Stock ${reward.stock}` : ''}
                  </p>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.redeemBtn}
                      disabled={unavailable || busyId === reward.id}
                      onClick={() => requestRedeem(reward)}
                    >
                      {unavailable
                        ? 'Unavailable'
                        : busyId === reward.id
                          ? 'Reserving…'
                          : 'Redeem'}
                    </button>
                    {alreadyReserved && !unavailable && (
                      <Link to="/my-redemptions" className={styles.ticketLink}>
                        View ticket
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {createPortal(
        <>
          <AnimatePresence>
            {confirmReward && (
              <motion.div
                className={styles.dialogOverlay}
                role="dialog"
                aria-modal="true"
                aria-labelledby="redeem-confirm-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmReward(null)}
              >
                <motion.div
                  className={styles.dialogPanel}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className={styles.dialogEyebrow}>Confirm redeem</p>
                  <h2 id="redeem-confirm-title" className={styles.dialogTitle}>
                    Redeem {confirmReward.name}?
                  </h2>
                  <p className={styles.dialogCopy}>
                    This will use {confirmReward.pointsRequired} points
                    {typeof points === 'number'
                      ? ` (balance after: ${Math.max(0, points - (confirmReward.pointsRequired || 0))})`
                      : ''}
                    . You can redeem this item again later if you have enough points.
                  </p>
                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.dialogPrimary}
                      onClick={confirmRedeem}
                    >
                      Yes, redeem
                    </button>
                    <button
                      type="button"
                      className={styles.dialogSecondary}
                      onClick={() => setConfirmReward(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {insufficientReward && (
              <motion.div
                className={styles.dialogOverlay}
                role="dialog"
                aria-modal="true"
                aria-labelledby="redeem-insufficient-title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setInsufficientReward(null)}
              >
                <motion.div
                  className={styles.dialogPanel}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className={styles.dialogEyebrow}>Not enough points</p>
                  <h2 id="redeem-insufficient-title" className={styles.dialogTitle}>
                    Keep recycling to unlock this
                  </h2>
                  <p className={styles.dialogCopy}>
                    <strong>{insufficientReward.name}</strong> needs{' '}
                    {insufficientReward.pointsRequired} points
                    {typeof points === 'number' ? `, but you currently have ${points}` : ''}.
                  </p>
                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.dialogPrimary}
                      onClick={() => setInsufficientReward(null)}
                    >
                      Got it
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {flyingTicket && (
              <motion.div
                className={styles.flyLayer}
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className={styles.flyTicket}
                  initial={{ opacity: 0, scale: 0.7, y: 40, rotate: -6 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scale: [0.7, 1.05, 1, 0.85],
                    y: [40, -20, -120, -280],
                    x: [0, 12, 40, 120],
                    rotate: [-6, 2, 8, 18],
                  }}
                  transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className={styles.flyTicketLabel}>Ticket</span>
                  <strong>{flyingTicket.rewardName}</strong>
                  {flyingTicket.ticketId ? (
                    <span className={styles.flyTicketId}>{flyingTicket.ticketId}</span>
                  ) : null}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {successTicket && (
            <div
              className={styles.successOverlay}
              role="dialog"
              aria-modal="true"
              aria-labelledby="redeem-success-title"
              onClick={() => setSuccessTicket(null)}
            >
              <div
                className={styles.successPanel}
                onClick={(e) => e.stopPropagation()}
              >
                <p className={styles.successEyebrow}>Reserved</p>
                <h2 id="redeem-success-title" className={styles.successTitle}>
                  {successTicket.rewardName}
                </h2>
                <p className={styles.successCopy}>
                  Points deducted
                  {successTicket.points != null ? ` (−${successTicket.points})` : ''}.
                  Show this ticket at pickup.
                </p>
                {successTicket.ticketId && (
                  <p className={styles.successTicketId}>{successTicket.ticketId}</p>
                )}
                <div className={styles.successActions}>
                  <Link
                    to="/my-redemptions"
                    className={styles.successPrimary}
                    onClick={() => setSuccessTicket(null)}
                  >
                    My redemptions
                  </Link>
                  <button
                    type="button"
                    className={styles.successSecondary}
                    onClick={() => setSuccessTicket(null)}
                  >
                    Keep browsing
                  </button>
                </div>
              </div>
            </div>
          )}

          {galleryReward && activeImage && (
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label={`${galleryReward.name} gallery`}
              onClick={closeGallery}
            >
              <div
                className={styles.lightboxPanel}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.lightboxHeader}>
                  <h2 className={styles.lightboxTitle}>{galleryReward.name}</h2>
                  <button type="button" className={styles.lightboxClose} onClick={closeGallery}>
                    Close
                  </button>
                </div>
                <img
                  src={activeImage.url}
                  alt=""
                  className={styles.lightboxImage}
                />
                {galleryImages.length > 1 && (
                  <div className={styles.lightboxNav}>
                    <button
                      type="button"
                      className={styles.lightboxNavBtn}
                      onClick={() =>
                        setGalleryIndex(
                          (galleryIndex - 1 + galleryImages.length) % galleryImages.length
                        )
                      }
                    >
                      Prev
                    </button>
                    <span className={styles.lightboxCounter}>
                      {galleryIndex + 1} / {galleryImages.length}
                    </span>
                    <button
                      type="button"
                      className={styles.lightboxNavBtn}
                      onClick={() =>
                        setGalleryIndex((galleryIndex + 1) % galleryImages.length)
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
                {galleryImages.length > 1 && (
                  <div className={styles.lightboxThumbs}>
                    {galleryImages.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        className={`${styles.lightboxThumb} ${
                          idx === galleryIndex ? styles.lightboxThumbActive : ''
                        }`}
                        onClick={() => setGalleryIndex(idx)}
                      >
                        <img src={img.url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}
