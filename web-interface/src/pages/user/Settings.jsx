import { useAuth, ROLE_LABELS, isAdminRole } from '../../context/AuthContext';
import styles from './Settings.module.css';

export default function Settings() {
  const { user } = useAuth();
  const admin = isAdminRole(user.role);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Account details and preferences.</p>
      </header>

      <section className={styles.section}>
        <h2 className="section-title">Profile</h2>
        <div className={styles.field}>
          <span className={styles.label}>Name</span>
          <span className={styles.value}>{user.username || '—'}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Email</span>
          <span className={styles.value}>{user.email || '—'}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Role</span>
          <span className={styles.value}>{ROLE_LABELS[user.role] || user.role || '—'}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="section-title">Change password</h2>
        <p className={styles.comingSoon}>Coming soon — not connected yet.</p>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="form-group">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              className="form-input"
              disabled
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              className="form-input"
              disabled
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              className="form-input"
              disabled
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled>
            Update password
          </button>
        </form>
      </section>

      {!admin && (
        <section className={styles.section}>
          <h2 className="section-title">Email confirmation</h2>
          <p className={styles.comingSoon}>
            Coming soon — email verification and change notifications are not connected yet.
          </p>
        </section>
      )}
    </div>
  );
}
