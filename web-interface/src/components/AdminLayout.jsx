import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth, ROLES } from '../context/AuthContext';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const { user } = useAuth();

  if (user.role === ROLES.END_USER) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
