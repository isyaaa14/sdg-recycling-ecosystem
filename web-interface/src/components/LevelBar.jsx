import styles from './LevelBar.module.css';
import { getLevelProgress } from '../utils/levels';

export default function LevelBar({ lifetimePoints = 0, spendablePoints = null }) {
  const progress = getLevelProgress(lifetimePoints);
  const fillWidth = progress.percent > 0 ? Math.max(progress.percent, 3) : 0;

  return (
    <section className={styles.wrap} aria-label="Player level">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.gridWash} aria-hidden="true" />

      <div className={styles.top}>
        <div>
          <p className={styles.kicker}>Your level</p>
          <h2 className={styles.title}>
            <span className={styles.levelChip}>
              <span className={styles.levelWord}>Level</span>{' '}
              <span className={styles.levelNum}>{progress.level}</span>
            </span>
            <span className={styles.rank}> · {progress.title}</span>
          </h2>
        </div>
        <div className={styles.meta}>
          <span className={styles.metaValue}>{progress.lifetimePoints}</span>
          <span className={styles.metaLabel}>lifetime pts</span>
        </div>
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={progress.pointsPerLevel}
        aria-valuenow={progress.intoLevel}
        aria-label={`Progress to level ${progress.level + 1}`}
      >
        <div className={styles.trackInset} aria-hidden="true">
          <span className={styles.tick} />
          <span className={styles.tick} />
          <span className={styles.tick} />
          <span className={styles.tick} />
        </div>

        <div
          className={`${styles.fill} ${fillWidth === 0 ? styles.fillEmpty : ''}`}
          style={{ width: fillWidth === 0 ? '10px' : `${fillWidth}%` }}
        >
          <span className={styles.energy} aria-hidden="true" />
          <span className={styles.shimmer} aria-hidden="true" />
          <span className={styles.tip} aria-hidden="true">
            <span className={styles.tipCore} />
            <span className={styles.tipBloom} />
          </span>
        </div>
      </div>

      <div className={styles.footer}>
        <span>
          {progress.intoLevel} / {progress.pointsPerLevel} to Level {progress.level + 1}
        </span>
        {spendablePoints !== null && (
          <span className={styles.spendable}>
            Available to redeem: {Number(spendablePoints).toLocaleString()}
          </span>
        )}
      </div>
    </section>
  );
}
