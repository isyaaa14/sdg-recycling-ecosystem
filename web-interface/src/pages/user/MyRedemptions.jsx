import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './MyRedemptions.module.css';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleString();
}

function statusClass(status) {
  if (status === 'Fulfilled') return styles.statusFulfilled;
  if (status === 'Cancelled') return styles.statusCancelled;
  return styles.statusReserved;
}

export default function MyRedemptions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/rewards/redemptions/me');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to load your redemptions. Please try again.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>My redemptions</h1>
        <p>
          Your pickup tickets. Show a Reserved ticket to Rewards Admin when you
          collect.
        </p>
      </header>

      {loading && <p className={styles.status}>Loading tickets…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={load}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <p>No redemptions yet.</p>
          <Link to="/rewards" className="btn btn-primary">
            Browse rewards
          </Link>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.ticket}>
              <div className={styles.ticketTop}>
                <span className={styles.ticketId}>{item.id}</span>
                <span className={`${styles.statusTag} ${statusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <h2 className={styles.rewardName}>{item.reward}</h2>
              <dl className={styles.meta}>
                <div>
                  <dt>Points spent</dt>
                  <dd>{item.points}</dd>
                </div>
                <div>
                  <dt>Qty</dt>
                  <dd>{item.quantity ?? 1}</dd>
                </div>
                <div>
                  <dt>Reserved</dt>
                  <dd>{formatWhen(item.createdAt || item.date)}</dd>
                </div>
                {item.status === 'Fulfilled' && item.completedAt && (
                  <div>
                    <dt>Fulfilled</dt>
                    <dd>{formatWhen(item.completedAt)}</dd>
                  </div>
                )}
              </dl>
              {item.status === 'Reserved' && (
                <p className={styles.hint}>
                  Present this ticket ID at pickup.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
