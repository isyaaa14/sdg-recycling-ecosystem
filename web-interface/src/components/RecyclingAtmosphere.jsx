/** Decorative recycling motifs — keyword: UNDO RECYCLING POLISH */
import styles from './RecyclingAtmosphere.module.css';

const MOTIFS = [
  { id: 'loop-a', kind: 'loop', className: styles.loopA },
  { id: 'loop-b', kind: 'loop', className: styles.loopB },
  { id: 'bottle', kind: 'bottle', className: styles.bottle },
  { id: 'leaf', kind: 'leaf', className: styles.leaf },
  { id: 'can', kind: 'can', className: styles.can },
];

function LoopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.svg}>
      <path
        d="M7 5.5 9.2 10H7.4L6.2 12.6c1.4-.4 2.8 0 3.9.8L12.2 10H14L8.8 4.2 7 5.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <g transform="rotate(120 12 12)">
        <path
          d="M7 5.5 9.2 10H7.4L6.2 12.6c1.4-.4 2.8 0 3.9.8L12.2 10H14L8.8 4.2 7 5.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
      <g transform="rotate(240 12 12)">
        <path
          d="M7 5.5 9.2 10H7.4L6.2 12.6c1.4-.4 2.8 0 3.9.8L12.2 10H14L8.8 4.2 7 5.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.svg}>
      <path
        d="M9 3h6v2.5c0 1-.4 1.8-1.1 2.4L13 9v10a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V9l-.9-1.1C7.4 7.3 7 6.5 7 5.5V3h2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M9 3h6" fill="none" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.svg}>
      <path
        d="M5 19c8-1 12-7 13-14-7 1-13 5-13 14z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <path d="M8 16c3-3 6-5 10-7" fill="none" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function CanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.svg}>
      <ellipse cx="12" cy="5" rx="5" ry="2" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M7 5v12c0 1.1 2.2 2 5 2s5-.9 5-2V5" fill="none" stroke="currentColor" strokeWidth="1.35" />
      <path d="M7 12c0 1.1 2.2 2 5 2s5-.9 5-2" fill="none" stroke="currentColor" strokeWidth="1.35" />
    </svg>
  );
}

function MotifIcon({ kind }) {
  if (kind === 'loop') return <LoopIcon />;
  if (kind === 'bottle') return <BottleIcon />;
  if (kind === 'leaf') return <LeafIcon />;
  return <CanIcon />;
}

export default function RecyclingAtmosphere() {
  return (
    <div className={styles.layer} aria-hidden="true" data-undo="UNDO RECYCLING POLISH">
      {MOTIFS.map((motif) => (
        <span key={motif.id} className={`${styles.motif} ${motif.className}`}>
          <MotifIcon kind={motif.kind} />
        </span>
      ))}
    </div>
  );
}
