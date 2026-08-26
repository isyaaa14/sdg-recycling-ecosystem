/** Experimental Nature Hub helpers — removable via keyword: UNDO NATURE HUB */

export const NATURE_HUB_UNLOCK_LEVEL = 2;
export { NATURE_PEAK_LEVEL } from './natureGrowth.js';

export const NATURE_SEEDS = [
  {
    id: 'canopy',
    name: 'Canopy Seed',
    blurb: 'Broad leaves. Steady growth.',
    sprout: '#5a9a4a',
    accent: '#8fbf6a',
  },
  {
    id: 'bamboo',
    name: 'Bamboo Seed',
    blurb: 'Upright. Quiet resilience.',
    sprout: '#3d8f6a',
    accent: '#6ecf9a',
  },
  {
    id: 'olive',
    name: 'Olive Seed',
    blurb: 'Soft silver-green. Long life.',
    sprout: '#7a9a58',
    accent: '#c4d48a',
  },
];

function storageKey(username) {
  return `sdg_nature_hub_${username || 'guest'}`;
}

export function readNatureHub(username) {
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeNatureHub(username, data) {
  try {
    localStorage.setItem(storageKey(username), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function clearNatureHub(username) {
  try {
    localStorage.removeItem(storageKey(username));
  } catch {
    /* ignore */
  }
}
