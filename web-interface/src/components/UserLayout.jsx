import { Outlet, Navigate } from 'react-router-dom';
import Navbar from './Navbar';
import BadgeUnlockCelebration from './BadgeUnlockCelebration';
import RecyclingAtmosphere from './RecyclingAtmosphere'; // UNDO RECYCLING POLISH
import { useAuth, ROLES } from '../context/AuthContext';
import styles from './UserLayout.module.css';

export default function UserLayout() {
  const { user } = useAuth();
  const role = user.role === 'STUDENT' ? ROLES.END_USER : user.role;

  if (role && role !== ROLES.END_USER) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className={styles.layout}>
      {/* UNDO RECYCLING POLISH */}
      <RecyclingAtmosphere />
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <BadgeUnlockCelebration />
    </div>
  );
}
