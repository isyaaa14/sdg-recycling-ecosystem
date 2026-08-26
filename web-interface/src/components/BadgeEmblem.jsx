/**
 * Unique colored badge emblems. Visual only — does not change badge data.
 */

const EMBLEM_BY_ID = {
  BDG001: { hue: 28, shape: 'flag', label: 'Mission' },
  BDG002: { hue: 38, shape: 'medal', label: 'Achiever' },
  BDG003: { hue: 48, shape: 'crown', label: 'Master' },
  BDG004: { hue: 200, shape: 'book', label: 'Quiz' },
  BDG005: { hue: 210, shape: 'bolt', label: 'Builder' },
  BDG006: { hue: 222, shape: 'brain', label: 'Expert' },
  BDG007: { hue: 145, shape: 'seed', label: 'Content' },
  BDG008: { hue: 160, shape: 'layers', label: 'Collector' },
  BDG009: { hue: 175, shape: 'owl', label: 'Scholar' },
  BDG010: { hue: 95, shape: 'check', label: 'Approval' },
  BDG011: { hue: 110, shape: 'shield', label: 'Steady' },
  BDG012: { hue: 125, shape: 'spark', label: 'Pro' },
  BDG013: { hue: 75, shape: 'recycle', label: 'Recycle' },
  BDG014: { hue: 85, shape: 'leaf', label: 'Green' },
  BDG015: { hue: 55, shape: 'globe', label: 'Planet' },
};

function hashHue(input) {
  const str = String(input || 'badge');
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

function resolveEmblem(badge) {
  const id = String(badge?.id || '').toUpperCase();
  if (EMBLEM_BY_ID[id]) return EMBLEM_BY_ID[id];

  const name = String(badge?.name || '').toLowerCase();
  if (name.includes('mission')) return { hue: 36, shape: 'flag', label: 'Mission' };
  if (name.includes('quiz')) return { hue: 205, shape: 'book', label: 'Quiz' };
  if (name.includes('content') || name.includes('knowledge') || name.includes('scholar')) {
    return { hue: 155, shape: 'seed', label: 'Learn' };
  }
  if (name.includes('recycl') || name.includes('deposit') || name.includes('approval')) {
    return { hue: 90, shape: 'recycle', label: 'Eco' };
  }

  return { hue: hashHue(id || name), shape: 'star', label: 'Badge' };
}

function palette(hue) {
  const h = ((hue % 360) + 360) % 360;
  return {
    a: `hsl(${h} 72% 42%)`,
    b: `hsl(${(h + 28) % 360} 78% 52%)`,
    c: `hsl(${(h + 8) % 360} 85% 62%)`,
    ink: `hsl(${h} 40% 18%)`,
    ring: `hsl(${h} 55% 88%)`,
  };
}

function ShapeGlyph({ shape, ink }) {
  const common = {
    fill: 'none',
    stroke: ink,
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (shape) {
    case 'flag':
      return (
        <g {...common}>
          <path d="M8 6v20" />
          <path d="M8 7h14l-3 5 3 5H8" fill={ink} fillOpacity="0.18" />
        </g>
      );
    case 'medal':
      return (
        <g {...common}>
          <circle cx="16" cy="14" r="6.5" fill={ink} fillOpacity="0.18" />
          <path d="M12 20.5 10 28l6-3 6 3-2-7.5" />
        </g>
      );
    case 'crown':
      return (
        <g {...common}>
          <path d="M6 22h20L23 11l-5 5-2-8-2 8-5-5z" fill={ink} fillOpacity="0.18" />
          <path d="M8 22h16" />
        </g>
      );
    case 'book':
      return (
        <g {...common}>
          <path d="M7 8h9a3 3 0 0 1 3 3v13H10a3 3 0 0 0-3 3V8z" fill={ink} fillOpacity="0.14" />
          <path d="M19 8h-9" />
          <path d="M10 14h6M10 18h5" />
        </g>
      );
    case 'bolt':
      return (
        <path
          d="M18 5 10 17h5l-1 10 8-12h-5l1-10z"
          fill={ink}
          fillOpacity="0.2"
          stroke={ink}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      );
    case 'brain':
      return (
        <g {...common}>
          <path d="M11 10a4 4 0 0 1 5-3 3.5 3.5 0 0 1 5 3c0 5-4 8-7.5 10C10 18 7 15 7 11a3.5 3.5 0 0 1 4-1z" fill={ink} fillOpacity="0.16" />
          <path d="M13 12c1 1 2 1 3 0M12 16c1.2.8 2.8.8 4 0" />
        </g>
      );
    case 'seed':
      return (
        <g {...common}>
          <path d="M16 26c0-8 6-12 10-14-1 8-5 14-10 14z" fill={ink} fillOpacity="0.18" />
          <path d="M16 26c0-8-6-12-10-14 1 8 5 14 10 14z" fill={ink} fillOpacity="0.1" />
          <path d="M16 26V14" />
        </g>
      );
    case 'layers':
      return (
        <g {...common}>
          <path d="M16 7 27 13 16 19 5 13z" fill={ink} fillOpacity="0.16" />
          <path d="M5 17l11 6 11-6" />
          <path d="M5 21l11 6 11-6" />
        </g>
      );
    case 'owl':
      return (
        <g {...common}>
          <circle cx="16" cy="16" r="9" fill={ink} fillOpacity="0.14" />
          <circle cx="12.5" cy="15" r="2.2" />
          <circle cx="19.5" cy="15" r="2.2" />
          <path d="M14.5 19.5 16 21l1.5-1.5" />
        </g>
      );
    case 'check':
      return (
        <g {...common}>
          <circle cx="16" cy="16" r="9" fill={ink} fillOpacity="0.16" />
          <path d="m11 16.5 3 3 7-7" />
        </g>
      );
    case 'shield':
      return (
        <path
          d="M16 5 26 9v7c0 6-4.5 10-10 12-5.5-2-10-6-10-12V9z"
          fill={ink}
          fillOpacity="0.16"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case 'spark':
      return (
        <g {...common}>
          <path d="M16 6v6M16 20v6M6 16h6M20 16h6M9 9l4 4M19 19l4 4M23 9l-4 4M13 19l-4 4" />
          <circle cx="16" cy="16" r="2.5" fill={ink} />
        </g>
      );
    case 'recycle':
      return (
        <g {...common}>
          <path d="M9 18 7 12l5.5 1.5" />
          <path d="M11 10.5 16 7l1.2 5.2" />
          <path d="M20 12.5 23 18l-5.2.8" />
          <path d="M8.5 19.5h7.5l-2 4.5" fill={ink} fillOpacity="0.12" />
        </g>
      );
    case 'leaf':
      return (
        <g {...common}>
          <path d="M16 26C8 24 6 14 10 8c6-1 10 2 12 8 0 6-3 9-6 10z" fill={ink} fillOpacity="0.18" />
          <path d="M12 20c3-2 6-6 8-11" />
        </g>
      );
    case 'globe':
      return (
        <g {...common}>
          <circle cx="16" cy="16" r="9" fill={ink} fillOpacity="0.12" />
          <path d="M7 16h18M16 7c3 3 3 15 0 18M16 7c-3 3-3 15 0 18" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path
            d="m16 6 2.4 5.4L24 12l-4.4 3.8L21 22l-5-3-5 3 1.4-6.2L8 12l5.6-.6z"
            fill={ink}
            fillOpacity="0.18"
          />
        </g>
      );
  }
}

export function getBadgeEmblemMeta(badge) {
  return resolveEmblem(badge);
}

export default function BadgeEmblem({ badge, size = 56, className = '' }) {
  const meta = resolveEmblem(badge);
  const colors = palette(meta.hue);
  const gradId = `badgeGrad_${String(badge?.id || meta.shape).replace(/[^a-zA-Z0-9_-]/g, '')}_${size}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={`${badge?.name || 'Badge'} emblem`}
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.b} />
          <stop offset="0.55" stopColor={colors.a} />
          <stop offset="1" stopColor={colors.c} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${gradId})`} />
      <circle cx="16" cy="16" r="12.5" fill={colors.ring} fillOpacity="0.35" />
      <circle cx="16" cy="16" r="11.2" fill="#fff" fillOpacity="0.22" />
      <g transform="translate(0 0)">
        <ShapeGlyph shape={meta.shape} ink={colors.ink} />
      </g>
    </svg>
  );
}
