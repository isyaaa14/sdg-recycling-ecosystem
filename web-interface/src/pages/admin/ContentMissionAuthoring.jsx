import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

const CONTENT_TAGS = [
  'plastic',
  'paper',
  'ewaste',
  'food-waste',
  'sorting',
  'cleanliness',
  'safety',
  'general',
];

const emptyForm = {
  title: '',
  type: 'Content',
  tags: ['general'],
  body: '',
  missionType: 'QUANTITY_BASED',
  startAt: '',
  endAt: '',
  points: '50',
  submissionCap: '3',
  targetQuantity: '10',
};

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const normalized = String(value).replace('Z', '').slice(0, 16);
  return normalized;
}

function statusLabel(status) {
  if (!status) return '—';
  if (status === 'PUBLISHED' || status === 'ACTIVE') return 'Published';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'ARCHIVED') return 'Archived';
  return status;
}

export default function ContentMissionAuthoring() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingKind, setEditingKind] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/content-missions');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to load content and missions. Please try again.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleTag = (tag) => {
    setForm((prev) => {
      const has = prev.tags.includes(tag);
      const tags = has ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag];
      return { ...prev, tags: tags.length ? tags : ['general'] };
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setEditingKind(null);
  };

  const buildContentPayload = (status) => ({
    title: form.title.trim(),
    body: form.body.trim(),
    summary: form.body.trim().slice(0, 160) || form.title.trim(),
    tags: form.tags,
    status,
  });

  const buildMissionPayload = (status) => {
    const startAt = form.startAt
      ? new Date(form.startAt).toISOString()
      : new Date().toISOString();
    const endAt = form.endAt
      ? new Date(form.endAt).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      title: form.title.trim(),
      description: form.body.trim(),
      type: form.missionType,
      startAt,
      endAt,
      submissionCap: Number(form.submissionCap) || 1,
      points: Number(form.points) || 10,
      autoApprove: false,
      status,
      isActive: status === 'ACTIVE',
    };

    if (form.missionType === 'QUANTITY_BASED') {
      payload.targetQuantity = Number(form.targetQuantity) || 1;
    }
    if (form.missionType === 'STREAK_BASED' || form.missionType === 'TIME_LIMITED') {
      payload.targetDays = 7;
    }

    return payload;
  };

  const saveEntry = async (asPublished) => {
    if (!form.title.trim() || !form.body.trim()) {
      setError('Title and body are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (form.type === 'Content') {
        const status = asPublished ? 'PUBLISHED' : 'DRAFT';
        const payload = buildContentPayload(status);
        if (editingId && editingKind === 'Content') {
          await api.put(`/admin/content/${editingId}`, payload);
        } else {
          await api.post('/admin/content', payload);
        }
      } else {
        const status = asPublished ? 'ACTIVE' : 'DRAFT';
        const payload = buildMissionPayload(status);
        if (editingId && editingKind === 'Mission') {
          await api.patch(`/admin/missions/${editingId}`, payload);
        } else {
          await api.post('/admin/missions', payload);
        }
      }

      resetForm();
      await loadItems();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Unable to save. Check required fields and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditingKind(item.kind);
    setForm({
      title: item.title || '',
      type: item.kind === 'Mission' ? 'Mission' : 'Content',
      tags: item.tags?.length ? item.tags : ['general'],
      body: item.body || item.description || '',
      missionType: item.missionType || 'QUANTITY_BASED',
      startAt: toDatetimeLocalValue(item.startAt),
      endAt: toDatetimeLocalValue(item.endAt),
      points: String(item.points ?? 50),
      submissionCap: String(item.submissionCap ?? 3),
      targetQuantity: String(item.targetQuantity || 10),
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Archive "${item.title}"?`)) return;
    setError('');
    try {
      if (item.kind === 'Mission') {
        await api.delete(`/admin/missions/${item.id}`);
      } else {
        await api.delete(`/admin/content/${item.id}`);
      }
      if (editingId === item.id) resetForm();
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to archive item.');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Content & Mission Authoring</h1>
        <p>Create and manage educational content and sustainability missions.</p>
      </header>

      {error && (
        <p className="status" role="alert" style={{ color: 'var(--danger)', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div className="card" style={{ marginBottom: 28 }}>
        <h2 className="section-title">{editingId ? 'Edit Entry' : 'New Entry'}</h2>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            className="form-input"
            value={form.title}
            onChange={handleChange}
            placeholder="Enter title..."
            disabled={saving}
          />
        </div>
        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            name="type"
            className="form-select"
            value={form.type}
            onChange={handleChange}
            disabled={saving || Boolean(editingId)}
          >
            <option value="Content">Content</option>
            <option value="Mission">Mission</option>
          </select>
        </div>

        {form.type === 'Content' && (
          <div className="form-group">
            <label>Tags (pick at least one)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {CONTENT_TAGS.map((tag) => (
                <label key={tag} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    disabled={saving}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>
        )}

        {form.type === 'Mission' && (
          <>
            <div className="form-group">
              <label htmlFor="missionType">Mission type</label>
              <select
                id="missionType"
                name="missionType"
                className="form-select"
                value={form.missionType}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="QUANTITY_BASED">Quantity based</option>
                <option value="STREAK_BASED">Streak based</option>
                <option value="TIME_LIMITED">Time limited</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="startAt">Start</label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                className="form-input"
                value={form.startAt}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label htmlFor="endAt">End</label>
              <input
                id="endAt"
                name="endAt"
                type="datetime-local"
                className="form-input"
                value={form.endAt}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label htmlFor="points">Points</label>
              <input
                id="points"
                name="points"
                type="number"
                min="1"
                className="form-input"
                value={form.points}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label htmlFor="submissionCap">Submission cap</label>
              <input
                id="submissionCap"
                name="submissionCap"
                type="number"
                min="1"
                className="form-input"
                value={form.submissionCap}
                onChange={handleChange}
                disabled={saving}
              />
            </div>
            {form.missionType === 'QUANTITY_BASED' && (
              <div className="form-group">
                <label htmlFor="targetQuantity">Target quantity</label>
                <input
                  id="targetQuantity"
                  name="targetQuantity"
                  type="number"
                  min="1"
                  className="form-input"
                  value={form.targetQuantity}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
            )}
          </>
        )}

        <div className="form-group">
          <label htmlFor="body">{form.type === 'Mission' ? 'Description' : 'Body Text'}</label>
          <textarea
            id="body"
            name="body"
            className="form-textarea"
            value={form.body}
            onChange={handleChange}
            placeholder={
              form.type === 'Mission'
                ? 'Describe the mission...'
                : 'Write your educational content...'
            }
            disabled={saving}
          />
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => saveEntry(true)}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Publish'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => saveEntry(false)}
            disabled={saving}
          >
            Save Draft
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <section>
        <h2 className="section-title">Existing Content & Missions</h2>
        {loading ? (
          <p className="status">Loading…</p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Tags / Mission type</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No content or missions yet.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={`${item.kind}-${item.id}`}>
                      <td>{item.title}</td>
                      <td>{item.kind}</td>
                      <td>
                        {item.kind === 'Mission'
                          ? item.missionType
                          : (item.tags || []).join(', ')}
                      </td>
                      <td>{item.date || '—'}</td>
                      <td>
                        <span
                          className={`tag ${
                            statusLabel(item.status) === 'Draft' ? 'tag-draft' : ''
                          }`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td>
                        <div className="form-actions" style={{ marginTop: 0 }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item)}
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
