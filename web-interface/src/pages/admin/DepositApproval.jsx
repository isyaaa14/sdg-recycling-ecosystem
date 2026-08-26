import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './DepositApproval.module.css';

export default function DepositApproval() {
  const [deposits, setDeposits] = useState([]);
  const [rejectReasons, setRejectReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/deposits');
      setDeposits(Array.isArray(data) ? data : []);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        'Unable to load recycling deposits. Please try again.';
      setError(message);
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      const { data } = await api.patch(`/deposits/${id}/review`, {
        status: 'APPROVED',
      });
      setDeposits((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    } catch (err) {
      setError(err.response?.data?.error || 'Approve failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    const reason = rejectReasons[id]?.trim();
    if (!reason) return;

    setBusyId(id);
    try {
      const { data } = await api.patch(`/deposits/${id}/review`, {
        status: 'REJECTED',
        reviewNote: reason,
      });
      setDeposits((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)));
    } catch (err) {
      setError(err.response?.data?.error || 'Reject failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const getRowClass = (status) => {
    if (status === 'Approved') return 'row-approved';
    if (status === 'Rejected') return 'row-rejected';
    return '';
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Deposit Approval</h1>
        <p>Review and approve student recycling deposit submissions.</p>
      </header>

      {loading && <p className={styles.status}>Loading deposits…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadDeposits}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="table-wrapper">
          {deposits.length === 0 ? (
            <p className={styles.status}>No recycling deposits to review.</p>
          ) : (
            <table className="data-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>KG Submitted</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className={getRowClass(deposit.status)}>
                      <td>{deposit.userName}</td>
                      <td>{deposit.date}</td>
                      <td>{deposit.category}</td>
                      <td>{deposit.kg} kg</td>
                      <td>{deposit.source === 'QR' ? 'QR claim' : 'Manual'}</td>
                      <td>
                        <span
                          className={`tag ${deposit.status === 'Pending' ? 'tag-secondary' : ''}`}
                        >
                          {deposit.status}
                        </span>
                        {deposit.rejectionReason && (
                          <p className={styles.rejectionReason}>{deposit.rejectionReason}</p>
                        )}
                      </td>
                    <td>
                      {deposit.status === 'Pending' ? (
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(deposit.id)}
                            disabled={busyId === deposit.id}
                          >
                            Approve
                          </button>
                          <div className={styles.rejectGroup}>
                            <input
                              type="text"
                              className={styles.rejectInput}
                              placeholder="Rejection reason..."
                              value={rejectReasons[deposit.id] || ''}
                              onChange={(e) =>
                                setRejectReasons((prev) => ({
                                  ...prev,
                                  [deposit.id]: e.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReject(deposit.id)}
                              disabled={busyId === deposit.id}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className={styles.done}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
