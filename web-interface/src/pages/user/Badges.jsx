import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import BadgeEmblem from '../../components/BadgeEmblem';
import styles from './Badges.module.css';

export default function Badges() {
  const [badgeList, setBadgeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEarned, setSelectedEarned] = useState(null);

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/badges');
      setBadgeList(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load badges. Please check your connection and try again.';
      setError(message);
      setBadgeList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const earnedBadges = useMemo(
    () => badgeList.filter((badge) => badge.earned),
    [badgeList]
  );

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className={`page-header__mark ${styles.badgeMark}`} aria-hidden="true">
          <Icon name="badge" size={96} />
        </span>
        <h1>Your Badges</h1>
        <p>Earn badges by reaching recycling milestones on campus.</p>
      </header>

      {loading && (
        <p className={styles.status} aria-live="polite">
          Loading badges…
        </p>
      )}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadBadges}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className={styles.myBadges} aria-labelledby="my-badges-title">
            <div className={styles.myBadgesHead}>
              <h2 id="my-badges-title" className={styles.myBadgesTitle}>
                My Badges
              </h2>
              <p className={styles.myBadgesCount}>
                {earnedBadges.length} earned
              </p>
            </div>

            {earnedBadges.length === 0 ? (
              <p className={styles.myBadgesEmpty}>
                No badges earned yet — complete missions, quizzes, and recycling to unlock your first emblem.
              </p>
            ) : (
              <div className={styles.myBadgesRail}>
                {earnedBadges.map((badge) => (
                  <button
                    key={badge.id}
                    type="button"
                    className={styles.myBadgeItem}
                    title={`View reward for ${badge.name}`}
                    onClick={() => setSelectedEarned(badge)}
                  >
                    <BadgeEmblem badge={badge} size={72} className={styles.myBadgeEmblem} />
                    <span className={styles.myBadgeName}>{badge.name}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="grid-cards">
            {badgeList.map((badge) => (
              <div
                key={badge.id}
                className={`card ${styles.badgeCard} ${!badge.earned ? styles.locked : ''}`}
              >
                <div className={styles.iconWrap}>
                  <BadgeEmblem badge={badge} size={52} />
                </div>
                <h3 className={styles.name}>{badge.name}</h3>
                <p className={styles.description}>{badge.description}</p>
                <span className={`tag ${badge.earned ? '' : 'tag-secondary'}`}>
                  {badge.earned ? 'Earned' : 'Locked'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {createPortal(
        <AnimatePresence>
          {selectedEarned && (
            <motion.div
              className={styles.rewardOverlay}
              role="dialog"
              aria-modal="true"
              aria-labelledby="badge-reward-title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEarned(null)}
            >
              <motion.div
                className={styles.rewardPanel}
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                onClick={(e) => e.stopPropagation()}
              >
                <BadgeEmblem badge={selectedEarned} size={88} />
                <p className={styles.rewardEyebrow}>Badge reward</p>
                <h2 id="badge-reward-title" className={styles.rewardTitle}>
                  {selectedEarned.name}
                </h2>
                <p className={styles.rewardCopy}>{selectedEarned.description}</p>
                <p className={styles.rewardPoints}>
                  {selectedEarned.rewardPoints > 0
                    ? `You earned +${selectedEarned.rewardPoints} bonus points for this badge.`
                    : 'This badge has no bonus points configured yet.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedEarned(null)}
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
