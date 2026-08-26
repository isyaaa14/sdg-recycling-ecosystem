import { NavLink } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';
import { adminModules } from '../data/dummyData';
import LogoMark from './LogoMark';
import Icon from './icons/Icon';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const allowedModules = adminModules.filter((mod) =>
    mod.roles.includes(user.role)
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <LogoMark size={38} className={styles.logoMark} />
        <div>
          <h2 className={styles.title}>SDG Admin</h2>
          <p className={styles.subtitle}>UOW Malaysia</p>
        </div>
      </div>

      <div className={styles.roleBadge}>{ROLE_LABELS[user.role]}</div>

      <nav className={styles.nav}>
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          <span className={styles.linkIcon}>
            <Icon name="home" size={18} />
          </span>
          Dashboard
        </NavLink>

        {allowedModules.map((mod) => (
          <NavLink
            key={mod.id}
            to={mod.path}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            <span className={styles.linkIcon}>
              <Icon name={mod.icon} size={18} />
            </span>
            {mod.title}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <p className={styles.userName}>{user.username}</p>
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            isActive ? `${styles.settingsLink} ${styles.settingsActive}` : styles.settingsLink
          }
        >
          Settings
        </NavLink>
        <button type="button" className={styles.switchBtn} onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
