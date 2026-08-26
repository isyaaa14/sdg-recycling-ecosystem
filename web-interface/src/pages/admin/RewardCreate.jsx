import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './RewardsAdministration.module.css';

const emptyReward = {
  name: '',
  category: '',
  pointsRequired: '',
  stock: '10',
  imageUrl: '',
  tier: 'small',
};

export default function RewardCreate() {
  const navigate = useNavigate();
  const [newReward, setNewReward] = useState(emptyReward);
  const [newImages, setNewImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleAddReward = async (e) => {
    e.preventDefault();
    if (!newReward.name.trim()) return;

    setBusy(true);
    setError('');
    try {
      const created = await api.post('/rewards', {
        name: newReward.name.trim(),
        category: newReward.category.trim() || 'General',
        pointsRequired: Number(newReward.pointsRequired) || 1,
        stock: Number(newReward.stock) || 0,
        imageUrl: newReward.imageUrl.trim() || undefined,
        tier: newReward.tier || 'small',
      });

      const rewardId = created.data?.id;
      if (rewardId && newImages.length > 0) {
        for (const file of newImages) {
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/rewards/${rewardId}/image`, formData);
        }
      }

      navigate('/admin/rewards');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create reward.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <p className={styles.backRow}>
          <Link to="/admin/rewards" className={styles.backLink}>
            ← Back to catalogue
          </Link>
        </p>
        <h1>Add Reward</h1>
        <p>Create a new catalogue item with stock and optional images.</p>
      </header>

      {error && (
        <div className={styles.status} role="alert">
          <p className={styles.errorMessage}>{error}</p>
        </div>
      )}

      <section className={styles.section}>
        <form onSubmit={handleAddReward} className={styles.createForm}>
          <div className="form-group">
            <label htmlFor="reward-name">Name</label>
            <input
              id="reward-name"
              className="form-input"
              value={newReward.name}
              onChange={(e) => setNewReward((p) => ({ ...p, name: e.target.value }))}
              placeholder="Reward name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reward-category">Category</label>
            <input
              id="reward-category"
              className="form-input"
              value={newReward.category}
              onChange={(e) => setNewReward((p) => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Eco Gear"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reward-points">Points Required</label>
            <input
              id="reward-points"
              type="number"
              className="form-input"
              value={newReward.pointsRequired}
              onChange={(e) =>
                setNewReward((p) => ({ ...p, pointsRequired: e.target.value }))
              }
              placeholder="e.g. 300"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="reward-stock">Stock</label>
            <input
              id="reward-stock"
              type="number"
              className="form-input"
              value={newReward.stock}
              onChange={(e) => setNewReward((p) => ({ ...p, stock: e.target.value }))}
              placeholder="e.g. 10"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reward-images">Upload images</label>
            <div className={styles.createUploadRow}>
              <label className={styles.uploadLabel} htmlFor="reward-images">
                Choose files
                <input
                  id="reward-images"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className={styles.fileInput}
                  disabled={busy}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setNewImages((prev) => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </label>
              {newImages.length > 0 && (
                <button
                  type="button"
                  className={styles.clearImagesBtn}
                  onClick={() => setNewImages([])}
                >
                  Clear ({newImages.length})
                </button>
              )}
            </div>
            {newImages.length > 0 && (
              <ul className={styles.createImageList}>
                {newImages.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <span>{file.name}</span>
                    <button
                      type="button"
                      className={styles.galleryBtnDanger}
                      onClick={() =>
                        setNewImages((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.hint}>
              You can select multiple images. The first uploaded becomes the main cover.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="reward-image">Image URL (optional)</label>
            <input
              id="reward-image"
              className="form-input"
              value={newReward.imageUrl}
              onChange={(e) =>
                setNewReward((p) => ({ ...p, imageUrl: e.target.value }))
              }
              placeholder="https://... (optional if uploading files)"
            />
          </div>
          <div className={styles.createActions}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Adding…' : 'Add Reward'}
            </button>
            <Link to="/admin/rewards" className="btn btn-sm">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
