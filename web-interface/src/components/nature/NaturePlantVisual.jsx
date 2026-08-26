import { motion } from 'framer-motion';
import styles from './NaturePlantVisual.module.css';

/**
 * Seed-specific plant art by growth stage (0–6).
 * Experimental Nature Hub (UNDO NATURE HUB)
 */
export default function NaturePlantVisual({
  seedId = 'canopy',
  stageId = 0,
  sprout = '#5a9a4a',
  accent = '#8fbf6a',
  microScale = 1,
  animateEntrance = false,
}) {
  const stage = Math.max(0, Math.min(6, stageId));
  const scale = (0.72 + stage * 0.07) * microScale;

  return (
    <motion.div
      className={styles.wrap}
      style={{ '--sprout': sprout, '--accent': accent }}
      animate={{ scale }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg className={styles.svg} viewBox="0 0 100 130" aria-hidden="true">
        {seedId === 'bamboo' ? (
          <Bamboo stage={stage} animateEntrance={animateEntrance} />
        ) : seedId === 'olive' ? (
          <Olive stage={stage} animateEntrance={animateEntrance} />
        ) : (
          <Canopy stage={stage} animateEntrance={animateEntrance} />
        )}
      </svg>
    </motion.div>
  );
}

function Stem({ d, width = 2.2, animateEntrance }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="var(--sprout)"
      strokeWidth={width}
      strokeLinecap="round"
      initial={animateEntrance ? { pathLength: 0, opacity: 0 } : false}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={
        animateEntrance
          ? { duration: 1.2, ease: [0.22, 1, 0.36, 1] }
          : { duration: 0 }
      }
    />
  );
}

function Canopy({ stage, animateEntrance }) {
  return (
    <g>
      <Stem
        d={
          stage < 2
            ? 'M50 118 C50 90, 49 70, 50 48'
            : stage < 4
              ? 'M50 118 C50 88, 48 60, 50 36'
              : 'M50 118 C52 85, 46 55, 50 28'
        }
        width={stage < 3 ? 2.2 : 3.2}
        animateEntrance={animateEntrance}
      />
      {stage >= 0 && (
        <motion.g
          style={{ transformOrigin: '50px 55px' }}
          animate={{ rotate: [-3, 4, -3] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ellipse cx="40" cy="52" rx={10 + stage} ry={6 + stage * 0.4} fill="var(--accent)" />
          <ellipse cx="60" cy="54" rx={9 + stage} ry={5 + stage * 0.4} fill="var(--sprout)" />
        </motion.g>
      )}
      {stage >= 2 && (
        <ellipse cx="50" cy="42" rx={14 + stage * 2} ry={10 + stage} fill="var(--accent)" opacity="0.9" />
      )}
      {stage >= 3 && (
        <ellipse cx="50" cy="34" rx={20 + stage * 2.5} ry={14 + stage} fill="var(--sprout)" opacity="0.92" />
      )}
      {stage >= 5 && (
        <>
          <ellipse cx="38" cy="30" rx="18" ry="14" fill="var(--accent)" opacity="0.85" />
          <ellipse cx="64" cy="32" rx="17" ry="13" fill="var(--sprout)" opacity="0.88" />
        </>
      )}
      {stage >= 6 && (
        <ellipse cx="50" cy="26" rx="28" ry="18" fill="var(--accent)" opacity="0.8" />
      )}
      {stage >= 4 && (
        <path d="M50 118 C50 100, 48 90, 47 78" stroke="#5a4030" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

function Bamboo({ stage, animateEntrance }) {
  const stalks = stage < 2 ? 1 : stage < 4 ? 2 : 3;
  return (
    <g>
      {Array.from({ length: stalks }, (_, i) => {
        const x = 50 + (i - (stalks - 1) / 2) * (10 + stage);
        const top = 118 - (55 + stage * 8 + i * 4);
        return (
          <g key={i}>
            <Stem
              d={`M${x} 118 L${x} ${top}`}
              width={2 + stage * 0.15}
              animateEntrance={animateEntrance && i === 0}
            />
            {/* nodes */}
            {stage >= 1 &&
              [0.35, 0.55, 0.75].slice(0, 1 + Math.min(2, stage)).map((t, n) => {
                const y = 118 - (118 - top) * t;
                return (
                  <line
                    key={n}
                    x1={x - 3}
                    y1={y}
                    x2={x + 3}
                    y2={y}
                    stroke="var(--accent)"
                    strokeWidth="1.4"
                  />
                );
              })}
            {stage >= 1 && (
              <motion.g
                style={{ transformOrigin: `${x}px ${top + 8}px` }}
                animate={{ rotate: [-5, 6, -5] }}
                transition={{
                  duration: 4.8 + i * 0.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <path
                  d={`M${x} ${top + 10} Q${x - 14} ${top - 2}, ${x - 18} ${top + 8}`}
                  fill="var(--accent)"
                />
                <path
                  d={`M${x} ${top + 14} Q${x + 14} ${top + 2}, ${x + 18} ${top + 12}`}
                  fill="var(--sprout)"
                />
              </motion.g>
            )}
          </g>
        );
      })}
      {stage >= 5 && (
        <ellipse cx="50" cy="36" rx="8" ry="4" fill="var(--accent)" opacity="0.35" />
      )}
    </g>
  );
}

function Olive({ stage, animateEntrance }) {
  return (
    <g>
      <Stem
        d={
          stage < 3
            ? 'M50 118 C50 92, 52 70, 48 50'
            : 'M50 118 C54 95, 42 70, 50 40 C56 55, 44 65, 50 118'
        }
        width={stage < 3 ? 2.1 : 3}
        animateEntrance={animateEntrance}
      />
      {stage >= 4 && (
        <path
          d="M50 118 C48 96, 55 78, 46 58"
          stroke="#6a5840"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
        />
      )}
      <motion.g
        style={{ transformOrigin: '50px 48px' }}
        animate={{ rotate: [-2.5, 3, -2.5] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {stage >= 0 && (
          <>
            <ellipse cx="42" cy="50" rx={8 + stage * 0.8} ry={4 + stage * 0.3} fill="var(--accent)" transform="rotate(-25 42 50)" />
            <ellipse cx="58" cy="52" rx={7 + stage * 0.8} ry={3.5 + stage * 0.3} fill="var(--sprout)" transform="rotate(20 58 52)" />
          </>
        )}
        {stage >= 2 && (
          <>
            <ellipse cx="36" cy="42" rx="9" ry="4" fill="var(--accent)" transform="rotate(-35 36 42)" opacity="0.9" />
            <ellipse cx="64" cy="44" rx="9" ry="4" fill="var(--sprout)" transform="rotate(30 64 44)" opacity="0.9" />
          </>
        )}
        {stage >= 3 && (
          <ellipse cx="50" cy="36" rx={16 + stage} ry={11 + stage * 0.6} fill="var(--accent)" opacity="0.75" />
        )}
        {stage >= 5 && (
          <>
            <ellipse cx="40" cy="32" rx="14" ry="10" fill="var(--sprout)" opacity="0.7" />
            <ellipse cx="62" cy="34" rx="13" ry="9" fill="var(--accent)" opacity="0.7" />
          </>
        )}
        {stage >= 6 && (
          <ellipse cx="50" cy="28" rx="22" ry="14" fill="var(--sprout)" opacity="0.65" />
        )}
      </motion.g>
    </g>
  );
}
