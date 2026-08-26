import { useNavigate } from 'react-router-dom';
import { useAuth, getDashboardPath } from '../../context/AuthContext';
import Icon from '../../components/icons/Icon';
import styles from './Unauthorized.module.css';

export default function Unauthorized() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (user.role) {
      navigate(getDashboardPath(user.role));
    } else {
      navigate('/admin-login');
    }
  };

  return (
    <div className={styles.page}>
      <div className={`card ${styles.card}`}>
        <span className={styles.iconWrap}>
          <Icon name="shield-x" size={32} />
        </span>
        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.message}>
          You do not have permission to view this page.
        </p>
        <button type="button" className="btn btn-primary" onClick={handleGoBack}>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
