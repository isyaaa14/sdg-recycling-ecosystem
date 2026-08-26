import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import { useAuth } from '../../context/AuthContext';
import LeaderboardBinParade from './LeaderboardBinParade';
import styles from './Leaderboard.module.css';

function readStudent4UserId() {
  try {
    const token = localStorage.getItem('sdg_student4_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.sub || payload?.userId || payload?.id || null;
  } catch {
    return null;
  }
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const myRowRef = useRef(null);

  const myUserId = useMemo(() => readStudent4UserId(), []);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/leaderboard');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load leaderboard. Please try again.';
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const isMe = useCallback(
    (entry) => {
      if (myUserId && entry.userId && String(entry.userId) === String(myUserId)) {
        return true;
      }
      return namesMatch(entry.name, user?.username);
    },
    [myUserId, user?.username]
  );

  const myEntry = useMemo(() => rows.find((entry) => isMe(entry)) || null, [rows, isMe]);

  useEffect(() => {
    if (!myEntry || loading) return;
    const timer = window.setTimeout(() => {
      myRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [myEntry, loading]);

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className={`page-header__mark ${styles.trophyMark}`} aria-hidden="true">
          <Icon name="trophy" size={96} className={styles.trophyIcon} />
        </span>
        <h1>Campus Leaderboard</h1>
        <p>See how you rank among UOW Malaysia recyclers this semester.</p>
        {!loading && !error && myEntry && (
          <div className={styles.youBanner} role="status">
            <span className={styles.youBannerLabel}>Your spot</span>
            <span className={styles.youBannerRank}>#{myEntry.rank}</span>
            <span className={styles.youBannerMeta}>
              {Number(myEntry.points || 0).toLocaleString()} pts · {myEntry.kg} recycles
            </span>
          </div>
        )}
        {!loading && !error && rows.length > 0 && !myEntry && (
          <p className={styles.youMissing} role="status">
            You’re not on the board yet — keep recycling to appear here.
          </p>
        )}
      </header>

      {loading && <p className={styles.status}>Loading leaderboard…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadLeaderboard}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <LeaderboardBinParade />
          <div className="table-wrapper">
            {rows.length === 0 ? (
              <p className={styles.status}>No leaderboard entries yet.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Total Points</th>
                    <th>Approved Recycles</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => {
                    const mine = isMe(entry);
                    return (
                      <tr
                        key={`${entry.rank}-${entry.userId || entry.name}`}
                        ref={mine ? myRowRef : null}
                        className={mine ? `row-highlight ${styles.myRow}` : undefined}
                      >
                        <td>
                          <span
                            className={`${styles.rank} ${
                              entry.rank <= 3 ? styles[`rank${entry.rank}`] : ''
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td>
                          <span className={styles.nameCell}>
                            {entry.name}
                            {mine && <span className={styles.youTag}>You</span>}
                          </span>
                        </td>
                        <td>{Number(entry.points || 0).toLocaleString()}</td>
                        <td>{entry.kg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
