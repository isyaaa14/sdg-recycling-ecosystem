import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './LevelUpCelebration.module.css';

function makeParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${8 + ((i * 37) % 84)}%`,
    delay: `${(i % 8) * 0.05}s`,
    duration: `${0.9 + (i % 5) * 0.12}s`,
    size: 4 + (i % 4) * 2,
    drift: `${-40 + (i % 9) * 10}px`,
  }));
}

export default function LevelUpCelebration({ level, title, onClose }) {
  const [visible, setVisible] = useState(true);
  const particles = useMemo(() => makeParticles(24), []);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const ms = prefersReduced ? 2200 : 4200;
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, ms);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-live="polite" aria-label="Level up">
      <div className={styles.panel}>
        {particles.map((p) => (
          <span
            key={p.id}
            className={styles.particle}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
              '--drift': p.drift,
            }}
          />
        ))}
        <p className={styles.kicker}>Level up</p>
        <h2 className={styles.level}>Level {level}</h2>
        <p className={styles.title}>{title}</p>
        <button type="button" className={styles.closeBtn} onClick={() => {
          setVisible(false);
          onClose?.();
        }}>
          Nice
        </button>
      </div>
    </div>,
    document.body
  );
}
