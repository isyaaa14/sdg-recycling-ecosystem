import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './DepositApproval.module.css';
import pageStyles from './AuditLogs.module.css';

function formatWhen(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatDetails(details) {
  if (details == null) return '—';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/audit-logs', {
          params: {
            page,
            limit: 20,
            ...(actionFilter.trim() ? { action: actionFilter.trim() } : {}),
          },
        });
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
        setPagination(
          data?.pagination || {
            page,
            limit: 20,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (err) {
        setError(
          err.response?.data?.error ||
            'Unable to load audit logs. Please try again.'
        );
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [actionFilter]
  );

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Audit Logs</h1>
        <p>System Admin activity trail from the backend audit log.</p>
      </header>

      <div className={pageStyles.toolbar}>
        <label className={pageStyles.filterLabel} htmlFor="audit-action-filter">
          Filter by action
          <input
            id="audit-action-filter"
            type="text"
            className={pageStyles.filterInput}
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g. APPROVED"
          />
        </label>
        <button
          type="button"
          className={styles.retryBtn}
          onClick={() => loadLogs(1)}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading && <p className={styles.status}>Loading audit logs…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={() => loadLogs(pagination.page || 1)}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="table-wrapper">
            {logs.length === 0 ? (
              <p className={styles.status}>
                No audit logs yet. Logs will appear when the system records admin
                actions.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatWhen(log.createdAt)}</td>
                      <td>{log.action || '—'}</td>
                      <td>
                        {log.user?.name || log.user?.email || log.userId || '—'}
                        {log.user?.role ? (
                          <span className={pageStyles.roleHint}> ({log.user.role})</span>
                        ) : null}
                      </td>
                      <td className={pageStyles.details}>{formatDetails(log.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className={pageStyles.pager}>
              <button
                type="button"
                className={styles.retryBtn}
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadLogs(pagination.page - 1)}
              >
                Previous
              </button>
              <span className={pageStyles.pageInfo}>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
                total)
              </span>
              <button
                type="button"
                className={styles.retryBtn}
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadLogs(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
