import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import styles from './DepositApproval.module.css';

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

export default function MissionReviews() {
  const [items, setItems] = useState([]);
  const [rejectReasons, setRejectReasons] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/mission-submissions', {
        params: { status: 'PENDING_REVIEW' },
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to load mission submissions. Please try again.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleApprove = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.patch(`/mission-submissions/${id}/review`, {
        status: 'APPROVED',
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
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
    setError('');
    try {
      await api.patch(`/mission-submissions/${id}/review`, {
        status: 'REJECTED',
        reviewNote: reason,
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
      setRejectReasons((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Reject failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Mission Reviews</h1>
        <p>Approve or reject student mission proof submissions.</p>
      </header>

      {loading && <p className={styles.status}>Loading submissions…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadItems}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="table-wrapper">
          {items.length === 0 ? (
            <p className={styles.status}>No pending mission submissions.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Mission</th>
                  <th>Date</th>
                  <th>Proof</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>{item.userName || '—'}</div>
                      {item.userEmail ? (
                        <div className={styles.done}>{item.userEmail}</div>
                      ) : null}
                    </td>
                    <td>
                      {item.missionTitle || item.missionId || '—'}
                      {item.missionPoints != null ? (
                        <div className={styles.done}>{item.missionPoints} pts</div>
                      ) : null}
                    </td>
                    <td>{item.date || '—'}</td>
                    <td style={{ maxWidth: 280 }}>
                      {item.proofText || '—'}
                      {isHttpUrl(item.proofImageUrl) ? (
                        <div className={styles.proofImageBlock}>
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => setPreviewUrl(item.proofImageUrl.trim())}
                          >
                            View image
                          </button>
                          <img
                            src={item.proofImageUrl.trim()}
                            alt="Mission proof thumbnail"
                            className={styles.proofThumb}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : item.proofImageUrl ? (
                        <div className={styles.done}>Proof image URL is invalid</div>
                      ) : null}
                    </td>
                    <td>{item.quantity != null ? item.quantity : '—'}</td>
                    <td>
                      <span className="tag tag-secondary">
                        {item.statusLabel || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyId === item.id}
                          onClick={() => handleApprove(item.id)}
                        >
                          Approve
                        </button>
                        <div className={styles.rejectGroup}>
                          <input
                            className={styles.rejectInput}
                            type="text"
                            placeholder="Reject reason"
                            value={rejectReasons[item.id] || ''}
                            onChange={(e) =>
                              setRejectReasons((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={
                              busyId === item.id || !rejectReasons[item.id]?.trim()
                            }
                            onClick={() => handleReject(item.id)}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {previewUrl
        ? createPortal(
            <div
              className={styles.previewOverlay}
              role="dialog"
              aria-modal="true"
              aria-label="Mission proof image"
              onClick={() => setPreviewUrl('')}
            >
              <div
                className={styles.previewPanel}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.previewToolbar}>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.linkBtn}
                  >
                    Open in new tab
                  </a>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPreviewUrl('')}
                  >
                    Close
                  </button>
                </div>
                <img
                  src={previewUrl}
                  alt="Mission proof"
                  className={styles.previewImage}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
