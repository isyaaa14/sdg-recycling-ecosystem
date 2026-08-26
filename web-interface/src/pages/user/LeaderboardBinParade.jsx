/** Decorative recycle-bin + tree parade for leaderboard — UNDO LEADERBOARD BINS */
import styles from './Leaderboard.module.css';

const BINS = [
  { id: 'blue', body: '#2f6fed', lid: '#1e4fc4', accent: '#7eb0ff', delay: '0s' },
  { id: 'yellow', body: '#e6b422', lid: '#c4920a', accent: '#ffe066', delay: '0.35s' },
  { id: 'green', body: '#2f9e4a', lid: '#1f7a36', accent: '#7ddea0', delay: '0.7s' },
  { id: 'orange', body: '#e86a2c', lid: '#c44f16', accent: '#ffb087', delay: '1.05s' },
  { id: 'teal', body: '#1f9e8a', lid: '#157a6a', accent: '#6fd9c6', delay: '1.4s' },
];

function BinWithTree({ body, lid, accent, delay, className }) {
  return (
    <div className={`${styles.binUnit} ${className || ''}`} style={{ '--bin-delay': delay }}>
      <svg className={styles.binSvg} viewBox="0 0 64 88" aria-hidden="true">
        {/* Tree canopy */}
        <g className={styles.tree}>
          <path
            className={styles.trunk}
            d="M31 46 V28"
            fill="none"
            stroke="#6b4a2a"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <ellipse className={styles.leafBack} cx="31" cy="22" rx="14" ry="11" fill="#1f7a36" />
          <ellipse className={styles.leafMid} cx="24" cy="26" rx="9" ry="8" fill="#2f9e4a" />
          <ellipse className={styles.leafFront} cx="38" cy="25" rx="10" ry="8.5" fill="#3db85c" />
          <ellipse className={styles.leafHighlight} cx="34" cy="18" rx="5" ry="4" fill="#7ddea0" opacity="0.85" />
        </g>

        {/* Bin body */}
        <g className={styles.bin}>
          <path
            d="M16 48 h32 l-3.5 32 H19.5 Z"
            fill={body}
            stroke="#111"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <rect x="14" y="44" width="36" height="6" rx="0" fill={lid} stroke="#111" strokeWidth="1.2" />
          <rect x="28" y="45.5" width="8" height="3" fill={accent} stroke="#111" strokeWidth="0.8" />
          {/* recycle mark */}
          <g transform="translate(32 64) scale(0.55)" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.9">
            <path d="M-6 -8 -2 0 H-5 L-7 4 c2-.6 4 0 5.5 1.2 L2 0 H5 L-1 -10 Z" />
            <g transform="rotate(120)">
              <path d="M-6 -8 -2 0 H-5 L-7 4 c2-.6 4 0 5.5 1.2 L2 0 H5 L-1 -10 Z" />
            </g>
            <g transform="rotate(240)">
              <path d="M-6 -8 -2 0 H-5 L-7 4 c2-.6 4 0 5.5 1.2 L2 0 H5 L-1 -10 Z" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function LeaderboardBinParade() {
  return (
    <div className={styles.binParade} aria-hidden="true" data-undo="UNDO LEADERBOARD BINS">
      <div className={styles.binRail}>
        {BINS.map((bin) => (
          <BinWithTree key={bin.id} {...bin} />
        ))}
      </div>
    </div>
  );
}
