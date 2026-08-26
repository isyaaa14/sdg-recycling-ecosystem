/** Level → plant growth stages. Nature Hub trial (UNDO NATURE HUB) */

export const NATURE_PEAK_LEVEL = 50;

/** Big visual breakpoints (inclusive min level). */
export const NATURE_STAGES = [
  { id: 0, key: 'sprout', label: 'Sprout', minLevel: 2, blurb: 'Just rooted.' },
  { id: 1, key: 'seedling', label: 'Seedling', minLevel: 5, blurb: 'First true leaves.' },
  { id: 2, key: 'young', label: 'Young plant', minLevel: 10, blurb: 'Finding its shape.' },
  { id: 3, key: 'sapling', label: 'Sapling', minLevel: 20, blurb: 'Species shows clearly.' },
  { id: 4, key: 'growing', label: 'Growing', minLevel: 30, blurb: 'Filling out.' },
  { id: 5, key: 'mature', label: 'Mature', minLevel: 40, blurb: 'Almost a tree.' },
  { id: 6, key: 'peak', label: 'Peak', minLevel: 50, blurb: 'Full form reached.' },
];

export function getNatureGrowth(level) {
  const lv = Math.max(1, Math.floor(Number(level) || 1));

  let stage = NATURE_STAGES[0];
  for (const candidate of NATURE_STAGES) {
    if (lv >= candidate.minLevel) stage = candidate;
  }

  const next = NATURE_STAGES.find((s) => s.minLevel > stage.minLevel) || null;
  const peak = lv >= NATURE_PEAK_LEVEL;

  // Soft scale within a stage so each level still nudges a little
  const spanStart = stage.minLevel;
  const spanEnd = next ? next.minLevel : NATURE_PEAK_LEVEL + 10;
  const into = Math.min(1, Math.max(0, (lv - spanStart) / Math.max(1, spanEnd - spanStart)));
  const microScale = 1 + into * 0.06;

  return {
    level: lv,
    stage,
    nextStage: next,
    levelsToNext: next ? Math.max(0, next.minLevel - lv) : 0,
    isPeak: peak,
    canChooseNextSeed: peak,
    microScale,
  };
}
