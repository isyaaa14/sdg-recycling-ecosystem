import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext';
import { adminModules } from '../../data/dummyData';
import Icon from '../../components/icons/Icon';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const { user } = useAuth();

  const accessibleModules = adminModules.filter((mod) =>
    mod.roles.includes(user.role)
  );

  return (
    <div className="page">
      <header className="page-header page-header--banner">
        <h1>Admin Dashboard</h1>
        <p>
          Welcome, {user.username}. You are logged in as{' '}
          <span className="badge-role">{ROLE_LABELS[user.role]}</span>
        </p>
      </header>

      <div className="grid-cards">
        {accessibleModules.map((mod) => (
          <Link key={mod.id} to={mod.path} className={`card ${styles.moduleCard}`}>
            <span className={styles.iconWrap}>
              <Icon name={mod.icon} size={22} />
            </span>
            <h3 className={styles.title}>{mod.title}</h3>
            <p className={styles.description}>{mod.description}</p>
            <span className={styles.arrow}>
              <Icon name="arrow" size={18} />
            </span>
          </Link>
        ))}
      </div>

      {accessibleModules.length === 0 && (
        <div className="empty-state">
          <p>No modules available for your role.</p>
        </div>
      )}
    </div>
  );
}
