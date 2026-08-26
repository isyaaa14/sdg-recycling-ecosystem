import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { buildQrImageUrl, downloadQrImage } from '../../utils/qrHelpers';
import styles from './QrIssuance.module.css';

const MATERIALS = ['Plastic', 'Glass', 'Paper', 'Metal'];

const emptyForm = {
  materialType: 'Plastic',
  estimatedWeightKg: '',
  expiresInMinutes: '60',
};

export default function QrIssuance() {
  const [form, setForm] = useState(emptyForm);
  const [issued, setIssued] = useState(null);
  const [qrList, setQrList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/recycling/qr');
      setQrList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load QR codes.');
      setQrList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleIssue = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/recycling/qr/issue', {
        materialType: form.materialType.trim(),
        estimatedWeightKg: Number(form.estimatedWeightKg),
        expiresInMinutes: Number(form.expiresInMinutes) || undefined,
      });
      setIssued(data);
      setMessage('QR issued. Download it and send to the student.');
      setForm(emptyForm);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to issue QR.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async (qr) => {
    try {
      await downloadQrImage(qr.claimPayload, `${qr.id || 'recycling-qr'}.png`);
    } catch {
      setError('Unable to download QR image. Check your network and try again.');
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Claim code copied. You can also send this text to the student.');
    } catch {
      setError('Unable to copy. Select the claim code manually.');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Issue Recycling QR</h1>
        <p>
          Record the recycled material and weight, generate a QR, download it, then send it
          to the student on another platform.
        </p>
      </header>

      {error && (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className={styles.successMessage} role="status">
          {message}
        </p>
      )}

      <section className={styles.section}>
        <h2 className="section-title">Generate QR</h2>
        <form className={styles.form} onSubmit={handleIssue}>
          <div className="form-group">
            <label htmlFor="qr-material">Material</label>
            <select
              id="qr-material"
              className="form-input"
              value={form.materialType}
              onChange={(e) => setForm((p) => ({ ...p, materialType: e.target.value }))}
              required
            >
              {MATERIALS.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="qr-kg">Weight (kg)</label>
            <input
              id="qr-kg"
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              value={form.estimatedWeightKg}
              onChange={(e) =>
                setForm((p) => ({ ...p, estimatedWeightKg: e.target.value }))
              }
              placeholder="e.g. 2.5"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="qr-expiry">Expires in (minutes)</label>
            <input
              id="qr-expiry"
              type="number"
              min="1"
              max="1440"
              className="form-input"
              value={form.expiresInMinutes}
              onChange={(e) =>
                setForm((p) => ({ ...p, expiresInMinutes: e.target.value }))
              }
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Generating…' : 'Generate QR'}
          </button>
        </form>
      </section>

      {issued && (
        <section className={styles.section}>
          <h2 className="section-title">Latest QR — {issued.id}</h2>
          <div className={styles.preview}>
            <img
              src={buildQrImageUrl(issued.claimPayload)}
              alt={`QR ${issued.id}`}
              className={styles.qrImage}
            />
            <div className={styles.previewMeta}>
              <p>
                <strong>{issued.materialType}</strong> · {issued.estimatedWeightKg} kg
              </p>
              <p className={styles.muted}>
                Expires:{' '}
                {issued.expiresAt
                  ? new Date(issued.expiresAt).toLocaleString()
                  : '—'}
              </p>
              <div className={styles.rowActions}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDownload(issued)}
                >
                  Download QR
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => handleCopy(issued.claimPayload)}
                >
                  Copy claim code
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className="section-title">Issued QR codes</h2>
        {loading ? (
          <p className={styles.status}>Loading…</p>
        ) : qrList.length === 0 ? (
          <p className={styles.status}>No QR codes yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Material</th>
                  <th>KG</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {qrList.map((qr) => (
                  <tr key={qr.id}>
                    <td>{qr.id}</td>
                    <td>{qr.materialType}</td>
                    <td>{qr.estimatedWeightKg}</td>
                    <td>
                      <span className="tag">{qr.status}</span>
                    </td>
                    <td>
                      {qr.expiresAt
                        ? new Date(qr.expiresAt).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDownload(qr)}
                          disabled={!qr.claimPayload}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleCopy(qr.claimPayload)}
                          disabled={!qr.claimPayload}
                        >
                          Copy code
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
