import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './RewardsAdministration.module.css';

export default function RedemptionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/rewards/redemptions');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load redemption requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleComplete = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.post(`/rewards/redemptions/${id}/complete`);
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to complete redemption.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.post(`/rewards/redemptions/${id}/cancel`, {
        reason: 'Cancelled by rewards admin',
      });
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to cancel redemption.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Redemption Requests</h1>
        <p>Match student tickets at pickup, then mark Fulfilled or Cancel / Refund.</p>
      </header>

      {loading && <p className={styles.status}>Loading…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadRequests}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <section className={styles.section}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>User Name</th>
                  <th>Reward</th>
                  <th>Points</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No redemption requests yet.</td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr
                      key={req.id}
                      className={req.status === 'Fulfilled' ? 'row-approved' : ''}
                    >
                      <td>{req.id}</td>
                      <td>{req.userName}</td>
                      <td>{req.reward}</td>
                      <td>{req.points}</td>
                      <td>{req.date}</td>
                      <td>
                        <span
                          className={`tag ${
                            req.status === 'Reserved' || req.status === 'Pending'
                              ? 'tag-secondary'
                              : ''
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'Reserved' || req.status === 'Pending' ? (
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busyId === req.id}
                              onClick={() => handleComplete(req.id)}
                            >
                              Mark Fulfilled
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={busyId === req.id}
                              onClick={() => handleCancel(req.id)}
                            >
                              Cancel / Refund
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
