/** Static material legend strip — keyword: UNDO RECYCLING POLISH */
import styles from './RecyclingMaterialStrip.module.css';

const MATERIALS = [
  { key: 'plastic', label: 'Plastic', tip: 'Bottles & containers' },
  { key: 'paper', label: 'Paper', tip: 'Clean paper & cardboard' },
  { key: 'metal', label: 'Metal', tip: 'Cans & tins' },
  { key: 'glass', label: 'Glass', tip: 'Rinse before drop-off' },
];

export default function RecyclingMaterialStrip() {
  return (
    <section
      className={styles.strip}
      aria-label="Campus recycling material types"
      data-undo="UNDO RECYCLING POLISH"
    >
      <div className={styles.head}>
        <p className={styles.eyebrow}>Campus materials</p>
        <h2 className={styles.title}>What you can recycle</h2>
      </div>
      <ul className={styles.grid}>
        {MATERIALS.map((item) => (
          <li key={item.key} className={`${styles.item} ${styles[item.key]}`}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.label}>{item.label}</span>
            <span className={styles.tip}>{item.tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
