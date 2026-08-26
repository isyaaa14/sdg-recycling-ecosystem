const STORAGE_KEY = 'sdg_known_earned_badges';
export const BADGE_CHECK_EVENT = 'sdg:check-badges';

export function getKnownEarnedBadgeIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null; // null = never initialized
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveKnownEarnedBadgeIds(ids) {
  const unique = [...new Set((ids || []).map(String))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function requestBadgeCheck() {
  window.dispatchEvent(new CustomEvent(BADGE_CHECK_EVENT));
}

export function findNewlyEarnedBadges(badgeList) {
  const earned = (badgeList || []).filter((b) => b.earned);
  const earnedIds = earned.map((b) => String(b.id)).filter((id) => id && id !== 'undefined');
  const known = getKnownEarnedBadgeIds();

  // First sync only: remember current badges, don't celebrate history.
  if (known === null) {
    saveKnownEarnedBadgeIds(earnedIds);
    return [];
  }

  // Ignore empty/partial payloads so a failed or early fetch cannot wipe memory
  // and re-trigger celebrations on the next successful load / login.
  if (earnedIds.length === 0) {
    return [];
  }

  const knownSet = new Set(known);
  const newlyEarned = earned.filter((b) => !knownSet.has(String(b.id)));

  // Only grow (or refresh) the known set — never shrink it from a short list.
  if (newlyEarned.length > 0 || earnedIds.length > known.length) {
    saveKnownEarnedBadgeIds([...knownSet, ...earnedIds]);
  }

  return newlyEarned;
}
