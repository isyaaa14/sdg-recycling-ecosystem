import { ROLE_LABELS } from '../../context/AuthContext';
import Icon from '../../components/icons/Icon';
import styles from './DataAnalystPlaceholder.module.css';

export default function DataAnalystPlaceholder() {
  return (
    <div className="page">
      <div className={`card ${styles.placeholder}`}>
        <span className={styles.iconWrap}>
          <Icon name="bar-chart" size={34} />
        </span>
        <span className="badge-role">{ROLE_LABELS.data_analyst}</span>
        <h1 className={styles.title}>Coming Soon</h1>
        <p className={styles.message}>
          Analytics & Reporting module is coming soon. This feature is planned
          for future implementation.
        </p>
      </div>
    </div>
  );
}
