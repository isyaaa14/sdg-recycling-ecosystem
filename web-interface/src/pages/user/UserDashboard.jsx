import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import CountUp from '../../components/CountUp';
import LevelBar from '../../components/LevelBar';
import LevelUpCelebration from '../../components/LevelUpCelebration';
import RecyclePlayground from '../../components/RecyclePlayground';
import InteractiveGrass from '../../components/InteractiveGrass';
import RecyclingMaterialStrip from '../../components/RecyclingMaterialStrip'; // UNDO RECYCLING POLISH
import { getLevelProgress, levelStorageKey } from '../../utils/levels';
import styles from './UserDashboard.module.css';

const emptyStats = {
  totalPoints: 0,
  lifetimePoints: 0,
  totalKg: 0,
  totalDeposits: 0,
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(emptyStats);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelUp, setLevelUp] = useState(null);

  const dismissLevelUp = useCallback(() => {
    setLevelUp(null);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/dashboard');
      const nextStats = {
        ...emptyStats,
        ...(data?.stats || {}),
        lifetimePoints:
          data?.stats?.lifetimePoints ?? data?.stats?.totalPoints ?? 0,
      };
      setStats(nextStats);
      setHistory(Array.isArray(data?.history) ? data.history : []);

      const progress = getLevelProgress(nextStats.lifetimePoints);
      const key = levelStorageKey(user?.username);
      const stored = localStorage.getItem(key);
      if (stored === null) {
        localStorage.setItem(key, String(progress.level));
      } else {
        const lastLevel = Number(stored) || 1;
        if (progress.level > lastLevel) {
          setLevelUp({ level: progress.level, title: progress.title });
          localStorage.setItem(key, String(progress.level));
        } else if (progress.level < lastLevel) {
          // Shouldn't happen with lifetime XP; keep stored max
          localStorage.setItem(key, String(Math.max(lastLevel, progress.level)));
        }
      }
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load dashboard. Please check your connection and try again.';
      setError(message);
      setStats(emptyStats);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="page">
      <header className={`page-header page-header--banner ${styles.bannerGrass}`}>
        <h1>Welcome back, {user.username}!</h1>
        <p>Track your recycling contributions and SDG impact at UOW Malaysia.</p>
        <InteractiveGrass />
      </header>

      {loading && (
        <p className={styles.status} aria-live="polite">
          Loading dashboard…
        </p>
      )}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadDashboard}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <LevelBar
            lifetimePoints={stats.lifetimePoints}
            spendablePoints={stats.totalPoints}
          />

          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">
                <Icon name="target" size={14} />
                Available Points
              </div>
              <div className="value">
                <CountUp value={stats.totalPoints} />
              </div>
            </div>
            <div className="stat-card">
              <div className="label">
                <Icon name="recycle" size={14} />
                Total KG Recycled
              </div>
              <div className="value">
                <CountUp value={stats.totalKg} decimals={1} suffix=" kg" />
              </div>
            </div>
            <div className="stat-card">
              <div className="label">
                <Icon name="bin" size={14} />
                Total Deposits
              </div>
              <div className="value">
                <CountUp value={stats.totalDeposits} />
              </div>
            </div>
          </div>

          <RecyclePlayground />

          {/* UNDO RECYCLING POLISH */}
          <RecyclingMaterialStrip />

          <section>
            <h2 className="section-title">Contribution History</h2>
            {history.length === 0 ? (
              <p className={styles.emptyHistory}>No approved contributions yet.</p>
            ) : (
              <div className={`table-wrapper ${styles.tableReveal}`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>KG</th>
                      <th>Points Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date}</td>
                        <td>{item.category}</td>
                        <td>{item.kg} kg</td>
                        <td className={styles.points}>+{item.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {levelUp && (
        <LevelUpCelebration
          level={levelUp.level}
          title={levelUp.title}
          onClose={dismissLevelUp}
        />
      )}
    </div>
  );
}
