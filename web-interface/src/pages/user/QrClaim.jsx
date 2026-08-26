import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Icon from '../../components/icons/Icon';
import {
  decodeClaimFromImageFile,
  parseClaimPayloadText,
} from '../../utils/qrHelpers';
import styles from './QrClaim.module.css';

export default function QrClaim() {
  const [claimText, setClaimText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submitClaim = async (body) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post('/recycling/qr/claim', body);
      setSuccess(
        `QR claimed. Deposit ${data?.id || ''} is pending admin approval. Points are added after approve.`
      );
      setClaimText('');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to claim QR. It may be invalid, expired, or already used.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePasteSubmit = async (e) => {
    e.preventDefault();
    try {
      const body = parseClaimPayloadText(claimText);
      await submitClaim(body);
    } catch (err) {
      setError(err.message || 'Invalid claim code.');
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
        const body = await decodeClaimFromImageFile(file);
        await submitClaim(body);
      } else {
        const text = await file.text();
        const body = parseClaimPayloadText(text);
        await submitClaim(body);
      }
    } catch (err) {
      setBusy(false);
      setError(err.message || 'Unable to read this file.');
    }
  };

  return (
    <div className="page page--ambient">
      <header className="page-header">
        <span className="page-header__mark" aria-hidden="true">
          <Icon name="badge" size={96} />
        </span>
        <h1>QR Claim</h1>
        <p>
          Upload the recycling QR from your admin, or paste the claim code. After a valid
          claim, wait for admin approval to receive points.
        </p>
      </header>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <p className={styles.bannerEyebrow}>Could not claim</p>
          <p className={styles.bannerBody}>{error}</p>
        </div>
      )}
      {success && (
        <div className={styles.successBanner} role="status">
          <p className={styles.bannerEyebrow}>Claim received</p>
          <p className={styles.bannerBody}>{success}</p>
          <Link to="/dashboard" className={styles.bannerLink}>
            Go to dashboard
          </Link>
        </div>
      )}

      <section className={styles.section}>
        <h2 className="section-title">Upload QR image or claim file</h2>
        <label className={styles.uploadLabel}>
          {busy ? 'Working…' : 'Upload QR image'}
          <input
            type="file"
            accept="image/*,.json,.txt,application/json,text/plain"
            className={styles.fileInput}
            disabled={busy}
            onChange={handleFile}
          />
        </label>
        <p className={styles.hint}>
          Use the PNG downloaded from Issue Recycling QR. If upload still fails, ask admin
          for Copy claim code and paste it below.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className="section-title">Or paste claim code</h2>
        <form onSubmit={handlePasteSubmit}>
          <div className="form-group">
            <label htmlFor="claim-code">Claim code</label>
            <textarea
              id="claim-code"
              className={`form-input ${styles.textarea}`}
              rows={6}
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              placeholder="(Paste the claim code here.)"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !claimText.trim()}>
            {busy ? 'Claiming…' : 'Claim QR'}
          </button>
        </form>
      </section>
    </div>
  );
}
