import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';
import Icon from './icons/Icon';
import {
  BADGE_CHECK_EVENT,
  findNewlyEarnedBadges,
  requestBadgeCheck,
} from '../utils/badgeUnlocks';
import { requestNotificationsRefresh } from './NotificationBell';
import styles from './BadgeUnlockCelebration.module.css';

export { requestBadgeCheck };

export default function BadgeUnlockCelebration() {
  const [queue, setQueue] = useState([]);
  const current = queue[0] || null;

  const enqueueNew = useCallback((badges) => {
    if (!badges?.length) return;
    setQueue((prev) => {
      const seen = new Set(prev.map((b) => String(b.id)));
      const additions = badges.filter((b) => !seen.has(String(b.id)));
      return additions.length ? [...prev, ...additions] : prev;
    });

    badges.forEach((badge) => {
      api
        .post('/notifications', {
          type: 'badge',
          title: 'Badge unlocked',
          body:
            badge.rewardPoints > 0
              ? `You earned “${badge.name}” and +${badge.rewardPoints} bonus points.`
              : `You earned “${badge.name}”.`,
          link: '/badges',
          dedupeKey: `badge:${badge.id}`,
        })
        .then(() => requestNotificationsRefresh())
        .catch(() => {});
    });
  }, []);

  const checkBadges = useCallback(async () => {
    try {
      const { data } = await api.get('/badges');
      const list = Array.isArray(data) ? data : [];
      const newly = findNewlyEarnedBadges(list);
      enqueueNew(newly);
    } catch {
      // Silent — celebration is optional UX.
    }
  }, [enqueueNew]);

  useEffect(() => {
    checkBadges();
  }, [checkBadges]);

  useEffect(() => {
    const onCheck = () => checkBadges();
    window.addEventListener(BADGE_CHECK_EVENT, onCheck);
    return () => window.removeEventListener(BADGE_CHECK_EVENT, onCheck);
  }, [checkBadges]);

  const dismiss = () => {
    setQueue((prev) => prev.slice(1));
  };

  return createPortal(
    <AnimatePresence>
      {current && (
        <motion.div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-unlock-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className={styles.burst} aria-hidden="true">
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className={styles.particle}
                style={{ '--i': i }}
              />
            ))}
          </div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, scale: 0.72, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          >
            <p className={styles.eyebrow}>Badge unlocked</p>
            <motion.div
              className={styles.iconWrap}
              initial={{ rotate: -18, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.08 }}
            >
              <Icon name={current.icon || 'badge'} size={48} />
            </motion.div>
            <h2 id="badge-unlock-title" className={styles.title}>
              Congratulations!
            </h2>
            <p className={styles.badgeName}>{current.name}</p>
            <p className={styles.description}>{current.description}</p>
            {current.rewardPoints > 0 ? (
              <p className={styles.description}>
                Bonus: +{current.rewardPoints} points
              </p>
            ) : null}
            {current.tier ? (
              <span className={`tag ${styles.tier}`}>{current.tier}</span>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className="btn btn-primary" onClick={dismiss}>
                Nice!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
