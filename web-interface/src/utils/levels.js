/** Lifetime points → level. Spendable balance is separate and does not reset level. */

export const POINTS_PER_LEVEL = 100;

const TITLES = [
  'Eco Rookie',
  'Sorter',
  'Recycler',
  'Eco Explorer',
  'Green Guardian',
  'Campus Champion',
  'SDG Steward',
  'Planet Protector',
  'Climate Crusader',
  'Legacy Legend',
];

export function getLevelProgress(lifetimePoints) {
  const pts = Math.max(0, Math.floor(Number(lifetimePoints) || 0));
  const level = Math.floor(pts / POINTS_PER_LEVEL) + 1;
  const intoLevel = pts % POINTS_PER_LEVEL;
  const titleIndex = Math.min(level - 1, TITLES.length - 1);
  const title =
    level > TITLES.length
      ? `${TITLES[TITLES.length - 1]} ${level}`
      : TITLES[titleIndex];

  return {
    level,
    title,
    intoLevel,
    pointsPerLevel: POINTS_PER_LEVEL,
    percent: Math.min(100, (intoLevel / POINTS_PER_LEVEL) * 100),
    lifetimePoints: pts,
  };
}

export function levelStorageKey(username) {
  const safe = String(username || 'guest')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return `sdg_last_level_${safe}`;
}
