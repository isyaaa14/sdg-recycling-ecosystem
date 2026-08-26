import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './PointRates.module.css';

export default function PointRates() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/point-rates');
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => String(a.material).localeCompare(String(b.material)));
      setRates(list);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to load point rates. Please try again.'
      );
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Point Rates</h1>
        <p>How many points you earn per kilogram of approved recycling.</p>
      </header>

      {loading && <p className={styles.status}>Loading point rates…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadRates}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Points / kg</th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr>
                    <td colSpan={2} className={styles.empty}>
                      No point rates available yet.
                    </td>
                  </tr>
                ) : (
                  rates.map((rate) => (
                    <tr key={rate.material}>
                      <td>{rate.material}</td>
                      <td className={styles.points}>{rate.ratePerKg}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className={styles.noteBlock}>
            <p className={styles.note}>
              Points are added after a campus recycling claim is approved.
            </p>
            <p className={styles.noteEmphasis}>
              Mission points and badge points are calculated separately
              (including their respective point rates).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
