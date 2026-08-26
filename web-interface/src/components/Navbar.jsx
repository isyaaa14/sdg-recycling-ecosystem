import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoMark from './LogoMark';
import Icon from './icons/Icon';
import NotificationBell from './NotificationBell';
import styles from './Navbar.module.css';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'leaderboard' },
  { to: '/rewards', label: 'Rewards', icon: 'rewards' },
  { to: '/badges', label: 'Badges', icon: 'badge' },
  { to: '/content', label: 'Educational Content', icon: 'content' },
  { to: '/quizzes', label: 'Quizzes', icon: 'quiz' },
  { to: '/missions', label: 'Missions', icon: 'events' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [naturePeek, setNaturePeek] = useState(false);
  const moreRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);

  const clearTimers = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleOpenPeek = () => {
    if (moreOpen) return;
    clearTimers();
    openTimer.current = setTimeout(() => setNaturePeek(true), 180);
  };

  const scheduleClosePeek = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setNaturePeek(false), 220);
  };

  useEffect(() => {
    setNaturePeek(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!moreOpen) return undefined;

    const handlePointerDown = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        setNaturePeek(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  return (
    <div
      className={styles.navShell}
      onMouseEnter={scheduleOpenPeek}
      onMouseLeave={scheduleClosePeek}
    >
      <header className={styles.navbar}>
        <div className={styles.inner}>
          <NavLink to="/dashboard" className={styles.brand}>
            <LogoMark size={34} className={styles.brandMark} />
            <div>
              <span className={styles.brandTitle}>SDG Recycling</span>
              <span className={styles.brandSub}>UOW Malaysia</span>
            </div>
          </NavLink>

          <nav className={styles.nav}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.active}` : styles.link
                }
              >
                <Icon name={link.icon} size={14} className={styles.linkIcon} />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.userArea}>
            <NotificationBell />
            <span className={styles.username}>{user.username}</span>
            <div className={styles.moreWrap} ref={moreRef}>
              <button
                type="button"
                className={`${styles.moreBtn} ${moreOpen ? styles.moreBtnOpen : ''}`}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => {
                  setNaturePeek(false);
                  setMoreOpen((open) => !open);
                }}
              >
                More
              </button>
              {moreOpen && (
                <div className={styles.moreMenu} role="menu">
                  <Link
                    to="/qr-claim"
                    className={styles.moreItem}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    QR Claim
                  </Link>
                  <Link
                    to="/point-rates"
                    className={styles.moreItem}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    Point Rate
                  </Link>
                  <Link
                    to="/my-redemptions"
                    className={styles.moreItem}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    My redemptions
                  </Link>
                  <Link
                    to="/nature-hub"
                    className={styles.moreItem}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    Nature Hub
                  </Link>
                  <Link
                    to="/settings"
                    className={styles.moreItem}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    className={`${styles.moreItem} ${styles.moreLogout}`}
                    role="menuitem"
                    onClick={() => {
                      setMoreOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div
        className={`${styles.naturePeek} ${naturePeek ? styles.naturePeekOpen : ''}`}
        aria-hidden={!naturePeek}
      >
        <div className={styles.naturePeekInner}>
          <div className={styles.naturePeekCopy}>
            <span className={styles.naturePeekEyebrow}>Hidden garden</span>
            <strong className={styles.naturePeekTitle}>Nature Hub</strong>
            <p className={styles.naturePeekText}>
              Your seed grows with your recycling level — slide in anytime.
            </p>
          </div>
          <Link
            to="/nature-hub"
            className={styles.naturePeekCta}
            onClick={() => setNaturePeek(false)}
          >
            Enter Nature Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
