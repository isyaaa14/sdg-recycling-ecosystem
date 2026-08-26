import styles from './LogoMark.module.css';

/**
 * Project logo — same leaf paths as Icon name="leaf" (Badges page).
 */
export default function LogoMark({
  size = 32,
  className = '',
  color = 'currentColor',
  animate = false,
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${styles.mark} ${animate ? styles.markDraw : ''} ${className}`}
      aria-hidden="true"
    >
      <g
        className={styles.spinGroup}
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          className={styles.leafOutline}
          d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"
        />
        <path
          className={styles.leafVein}
          d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
        />
      </g>
    </svg>
  );
}
