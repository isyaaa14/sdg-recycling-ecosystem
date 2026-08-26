import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './BadgeAuthoring.module.css';

const CRITERIA_OPTIONS = [
  { value: 'MISSIONS_COMPLETED', label: 'Complete N missions' },
  { value: 'QUIZZES_PASSED', label: 'Pass N quizzes' },
  { value: 'CONTENT_COMPLETED', label: 'Complete N content items' },
  { value: 'APPROVED_SUBMISSIONS', label: 'N approved mission submissions' },
  { value: 'RECYCLING_APPROVED', label: 'N approved recycling deposits' },
];

const TIER_DEFAULT_POINTS = { BRONZE: 20, SILVER: 50, GOLD: 100 };

const emptyForm = {
  name: '',
  description: '',
  tier: 'BRONZE',
  criteriaType: 'MISSIONS_COMPLETED',
  criteriaValue: '1',
  rewardPoints: '20',
};

function requirementLabel(badge) {
  const opt = CRITERIA_OPTIONS.find((item) => item.value === badge.criteriaType);
  const base = opt?.label || badge.criteriaType || 'Requirement';
  return base.replace('N', String(badge.criteriaValue ?? '?'));
}

export default function BadgeAuthoring() {
  const [badges, setBadges] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBadges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/badges');
      setBadges(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load badges.');
      setBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'tier' && TIER_DEFAULT_POINTS[value] != null) {
        next.rewardPoints = String(TIER_DEFAULT_POINTS[value]);
      }
      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (badge) => {
    setEditingId(badge.id);
    setForm({
      name: badge.name || '',
      description: badge.description || '',
      tier: badge.tier || 'BRONZE',
      criteriaType: badge.criteriaType || 'MISSIONS_COMPLETED',
      criteriaValue: String(badge.criteriaValue ?? 1),
      rewardPoints: String(badge.rewardPoints ?? 0),
    });
    setMessage('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) return;

    setBusy(true);
    setError('');
    setMessage('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      tier: form.tier,
      criteriaType: form.criteriaType,
      criteriaValue: Number(form.criteriaValue) || 1,
      rewardPoints: Number(form.rewardPoints) || 0,
    };

    try {
      if (editingId) {
        await api.patch(`/admin/badges/${editingId}`, payload);
        setMessage('Badge updated.');
      } else {
        await api.post('/admin/badges', payload);
        setMessage('Badge created.');
      }
      resetForm();
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save badge.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivate = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/admin/badges/${id}`);
      setMessage('Badge deactivated.');
      if (editingId === id) resetForm();
      await loadBadges();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to deactivate badge.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Badge Authoring</h1>
        <p>
          Define badge name, description, requirement, and bonus points reward.
          Students earn badges automatically when they meet the requirement.
        </p>
      </header>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {message && <p className={styles.message}>{message}</p>}

      <div className={`card ${styles.formCard}`}>
        <h2 className="section-title">{editingId ? 'Edit Badge' : 'New Badge'}</h2>
        <form className={styles.form} onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="badge-name">Badge Name</label>
            <input
              id="badge-name"
              name="name"
              className="form-input"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Mission Achiever"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="badge-description">Description</label>
            <textarea
              id="badge-description"
              name="description"
              className="form-input"
              rows={3}
              value={form.description}
              onChange={handleChange}
              placeholder="What this badge represents"
              required
            />
          </div>
          <div className={styles.row}>
            <div className="form-group">
              <label htmlFor="badge-tier">Tier</label>
              <select
                id="badge-tier"
                name="tier"
                className="form-input"
                value={form.tier}
                onChange={handleChange}
              >
                <option value="BRONZE">Bronze</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="badge-reward">Reward (points)</label>
              <input
                id="badge-reward"
                name="rewardPoints"
                type="number"
                min={0}
                className="form-input"
                value={form.rewardPoints}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className={styles.row}>
            <div className="form-group">
              <label htmlFor="badge-criteria">Requirement type</label>
              <select
                id="badge-criteria"
                name="criteriaType"
                className="form-input"
                value={form.criteriaType}
                onChange={handleChange}
              >
                {CRITERIA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="badge-target">Requirement target (N)</label>
              <input
                id="badge-target"
                name="criteriaValue"
                type="number"
                min={1}
                className="form-input"
                value={form.criteriaValue}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editingId ? 'Update Badge' : 'Create Badge'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      <section className={styles.listSection}>
        <h2 className="section-title">Existing Badges</h2>
        {loading ? (
          <p className={styles.status}>Loading…</p>
        ) : badges.length === 0 ? (
          <p className={styles.status}>No badges yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Requirement</th>
                  <th>Reward</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {badges.map((badge) => (
                  <tr key={badge.id} className={badge.isActive ? '' : 'row-rejected'}>
                    <td>{badge.name}</td>
                    <td className={styles.descCell}>{badge.description}</td>
                    <td>{requirementLabel(badge)}</td>
                    <td>{badge.rewardPoints} pts</td>
                    <td>{badge.tier}</td>
                    <td>
                      <span className={`tag ${badge.isActive ? '' : 'tag-secondary'}`}>
                        {badge.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() => handleEdit(badge)}
                        >
                          Edit
                        </button>
                        {badge.isActive && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={busy}
                            onClick={() => handleDeactivate(badge.id)}
                          >
                            Deactivate
                          </button>
                        )}
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
