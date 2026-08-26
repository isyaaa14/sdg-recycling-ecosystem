import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './RewardsAdministration.module.css';

export default function RewardsAdministration() {
  const [rewards, setRewards] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rewardsRes = await api.get('/rewards', {
        params: { includeInactive: true },
      });
      const list = Array.isArray(rewardsRes.data) ? rewardsRes.data : [];
      // Soft-deleted rewards stay in DB but leave the admin catalogue view.
      setRewards(list.filter((item) => item.isActive !== false));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load rewards admin data.');
      setRewards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const startEdit = (reward) => {
    setEditingId(reward.id);
    setEditDraft({
      name: reward.name,
      category: reward.category || '',
      pointsRequired: String(reward.pointsRequired ?? ''),
      stock: String(reward.stock ?? 0),
      imageUrl: reward.image || '',
      tier: reward.tier || 'small',
    });
  };

  const handleSaveEdit = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.patch(`/rewards/${id}`, {
        name: editDraft.name.trim(),
        category: editDraft.category.trim() || 'General',
        pointsRequired: Number(editDraft.pointsRequired) || 1,
        stock: Number(editDraft.stock) || 0,
        imageUrl: editDraft.imageUrl.trim(),
        tier: editDraft.tier || 'small',
      });
      setEditingId(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update reward.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (reward) => {
    const ok = window.confirm(
      `Delete “${reward.name}”? It will be removed from the student catalogue.`
    );
    if (!ok) return;

    setBusyId(`delete-${reward.id}`);
    setError('');
    try {
      await api.delete(`/rewards/${reward.id}`);
      if (editingId === reward.id) setEditingId(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to delete reward.');
    } finally {
      setBusyId(null);
    }
  };

  const handleUploadImages = async (id, fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setBusyId(`upload-${id}`);
    setError('');
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/rewards/${id}/image`, formData);
      }
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to upload image.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetMainImage = async (rewardId, imageId) => {
    setBusyId(`main-${rewardId}-${imageId}`);
    setError('');
    try {
      await api.post(`/rewards/${rewardId}/images/${imageId}/main`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to set main image.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveImage = async (rewardId, imageId) => {
    setBusyId(`remove-${rewardId}-${imageId}`);
    setError('');
    try {
      await api.delete(`/rewards/${rewardId}/images/${imageId}`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to remove image.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page">
      <header className={`page-header ${styles.pageHeaderRow}`}>
        <div>
          <h1>Rewards Administration</h1>
          <p>Manage the reward catalogue — stock, images, and availability.</p>
        </div>
        <Link to="/admin/rewards/new" className={`btn btn-primary ${styles.addRewardBtn}`}>
          Add reward
        </Link>
      </header>

      {loading && <p className={styles.status}>Loading…</p>}

      {!loading && error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadAll}>
            Retry
          </button>
        </div>
      )}

      {!loading && (
        <section className={styles.section}>
          <h2 className="section-title">Reward Catalogue</h2>
          {rewards.length === 0 ? (
            <p className={styles.status}>
              No rewards yet.{' '}
              <Link to="/admin/rewards/new">Add your first reward</Link>.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Points</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id}>
                      {editingId === reward.id ? (
                        <>
                          <td>
                            <input
                              className="form-input"
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((p) => ({ ...p, name: e.target.value }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              value={editDraft.category}
                              onChange={(e) =>
                                setEditDraft((p) => ({ ...p, category: e.target.value }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="form-input"
                              inputMode="numeric"
                              value={editDraft.pointsRequired}
                              onChange={(e) =>
                                setEditDraft((p) => ({
                                  ...p,
                                  pointsRequired: e.target.value.replace(/[^\d]/g, ''),
                                }))
                              }
                            />
                          </td>
                          <td>
                            <div className={styles.stockStepper}>
                              <button
                                type="button"
                                className={styles.stockBtn}
                                aria-label="Decrease stock"
                                onClick={() =>
                                  setEditDraft((p) => ({
                                    ...p,
                                    stock: String(Math.max(0, (Number(p.stock) || 0) - 1)),
                                  }))
                                }
                              >
                                −
                              </button>
                              <input
                                className={`${styles.stockInput} form-input`}
                                inputMode="numeric"
                                value={editDraft.stock}
                                onChange={(e) =>
                                  setEditDraft((p) => ({
                                    ...p,
                                    stock: e.target.value.replace(/[^\d]/g, ''),
                                  }))
                                }
                              />
                              <button
                                type="button"
                                className={styles.stockBtn}
                                aria-label="Increase stock"
                                onClick={() =>
                                  setEditDraft((p) => ({
                                    ...p,
                                    stock: String((Number(p.stock) || 0) + 1),
                                  }))
                                }
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={busyId === reward.id}
                                onClick={() => handleSaveEdit(reward.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                            <input
                              type="text"
                              className="form-input"
                              style={{ marginTop: 8 }}
                              placeholder="Image URL"
                              value={editDraft.imageUrl}
                              onChange={(e) =>
                                setEditDraft((p) => ({ ...p, imageUrl: e.target.value }))
                              }
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{reward.name}</td>
                          <td>{reward.category || '—'}</td>
                          <td>{reward.pointsRequired}</td>
                          <td>{reward.stock}</td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => startEdit(reward)}
                              >
                                Edit
                              </button>
                              <label className={styles.uploadLabel}>
                                {busyId === `upload-${reward.id}`
                                  ? 'Uploading…'
                                  : 'Add images'}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  multiple
                                  className={styles.fileInput}
                                  disabled={busyId === `upload-${reward.id}`}
                                  onChange={(e) => {
                                    handleUploadImages(reward.id, e.target.files);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                className={`btn btn-sm ${styles.deleteBtn}`}
                                disabled={busyId === `delete-${reward.id}`}
                                onClick={() => handleDelete(reward)}
                              >
                                {busyId === `delete-${reward.id}` ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                            {Array.isArray(reward.images) && reward.images.length > 0 && (
                              <div className={styles.galleryStrip}>
                                {reward.images.map((img) => (
                                  <div
                                    key={img.id}
                                    className={`${styles.galleryThumb} ${
                                      img.isMain ? styles.galleryThumbMain : ''
                                    }`}
                                  >
                                    <img src={img.url} alt="" />
                                    <div className={styles.galleryThumbActions}>
                                      {!img.isMain && (
                                        <button
                                          type="button"
                                          className={styles.galleryBtn}
                                          disabled={Boolean(busyId)}
                                          onClick={() =>
                                            handleSetMainImage(reward.id, img.id)
                                          }
                                        >
                                          Main
                                        </button>
                                      )}
                                      {img.isMain && (
                                        <span className={styles.mainTag}>Main</span>
                                      )}
                                      <button
                                        type="button"
                                        className={styles.galleryBtnDanger}
                                        disabled={Boolean(busyId)}
                                        onClick={() =>
                                          handleRemoveImage(reward.id, img.id)
                                        }
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
