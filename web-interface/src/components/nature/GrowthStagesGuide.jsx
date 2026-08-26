import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NATURE_STAGES, NATURE_PEAK_LEVEL } from '../../utils/natureGrowth';
import styles from './GrowthStagesGuide.module.css';

/** Experimental Nature Hub (UNDO NATURE HUB) */
export default function GrowthStagesGuide({
  open,
  onClose,
  currentStageId = 0,
  level = 1,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="growth-stages-title"
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div>
            <p className={styles.eyebrow}>Nature Hub</p>
            <h2 id="growth-stages-title" className={styles.title}>
              Growth stages
            </h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose}>
            Close
          </button>
        </div>

        <p className={styles.lead}>
          Your plant changes as your recycling level rises. Each seed grows into
          a different shape. Peak at level {NATURE_PEAK_LEVEL}.
        </p>

        <p className={styles.youAre}>
          You are level {level}
          {currentStageId >= 0 ? ` · ${NATURE_STAGES[currentStageId]?.label}` : ''}
        </p>

        <ol className={styles.list}>
          {NATURE_STAGES.map((stage) => {
            const reached = level >= stage.minLevel;
            const current = stage.id === currentStageId;
            return (
              <li
                key={stage.key}
                className={`${styles.item} ${reached ? styles.reached : ''} ${
                  current ? styles.current : ''
                }`}
              >
                <span className={styles.level}>Lv {stage.minLevel}</span>
                <span className={styles.body}>
                  <span className={styles.name}>
                    {stage.label}
                    {current ? ' · now' : ''}
                  </span>
                  <span className={styles.blurb}>{stage.blurb}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <p className={styles.foot}>
          At level {NATURE_PEAK_LEVEL} you can plant another seed. Until then, your
          first plant stays.
        </p>
      </div>
    </div>,
    document.body
  );
}
