import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './InteractiveGrass.module.css';

const BLADE_COUNT = 120;
const BUTTERFLY_COUNT = 6;

function makeBlades() {
  return Array.from({ length: BLADE_COUNT }, (_, i) => {
    const t = i / (BLADE_COUNT - 1);
    const tall = 28 + ((i * 23) % 42);
    const curve = ((i % 7) - 3) * 2.2;
    const tipX = 6 + curve;
    return {
      id: i,
      left: `${t * 100}%`,
      height: tall,
      width: 9 + (i % 4),
      hue: 95 + (i % 8) * 6,
      sat: 55 + (i % 5) * 6,
      light: 32 + (i % 6) * 4,
      lean: ((i % 7) - 3) * 4,
      swayAmp: 5 + (i % 5) * 1.2,
      swaySpeed: 0.55 + (i % 7) * 0.08,
      phase: (i * 0.37) % (Math.PI * 2),
      d: `M6 40 C ${5 + (i % 3) * 0.4} 28, ${4.5 + curve * 0.15} 16, ${tipX} 2 C ${tipX + 1.2} 10, ${8.5} 24, 7.2 40 Z`,
      z: i % 3,
    };
  });
}

function makeButterflies() {
  const hues = [28, 200, 310, 45, 165, 265, 12, 330];
  return Array.from({ length: BUTTERFLY_COUNT }, (_, i) => ({
    id: i,
    left: 8 + ((i * 17) % 84),
    bottom: 18 + (i % 4) * 10,
    hue: hues[i % hues.length] + (i % 3) * 8,
    scale: 0.55 + (i % 4) * 0.12,
    duration: `${7 + (i % 5) * 1.4}s`,
    delay: `${(i % 6) * 0.7}s`,
    drift: 18 + (i % 5) * 8,
    z: 4 + (i % 2),
  }));
}

export default function InteractiveGrass() {
  const stripRef = useRef(null);
  const pointerRef = useRef(null);
  const smoothRef = useRef({ x: 0, strength: 0, width: 1 });
  const [frame, setFrame] = useState({ t: 0, x: 0, strength: 0, width: 1 });
  const blades = useMemo(makeBlades, []);
  const butterflies = useMemo(makeButterflies, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frameSkip = 0;

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const target = pointerRef.current;
      const smooth = smoothRef.current;

      if (target) {
        const follow = 1 - Math.exp(-dt * 7.5);
        const engage = 1 - Math.exp(-dt * 4.2);
        smooth.x += (target.x - smooth.x) * follow;
        smooth.width = target.width;
        smooth.strength += (1 - smooth.strength) * engage;
      } else {
        const release = 1 - Math.exp(-dt * 2.4);
        smooth.strength += (0 - smooth.strength) * release;
      }

      frameSkip += 1;
      if (frameSkip % 2 === 0) {
        setFrame({
          t: now / 1000,
          x: smooth.x,
          strength: smooth.strength,
          width: smooth.width,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleMove = (e) => {
    const el = stripRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointerRef.current = {
      x: e.clientX - rect.left,
      width: rect.width,
    };
  };

  const handleLeave = () => {
    pointerRef.current = null;
  };

  return (
    <div
      ref={stripRef}
      className={styles.strip}
      aria-hidden="true"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className={styles.soil} />

      {butterflies.map((bug) => (
        <span
          key={bug.id}
          className={styles.butterfly}
          style={{
            left: `${bug.left}%`,
            bottom: `${bug.bottom}px`,
            '--hue': bug.hue,
            '--scale': bug.scale,
            '--duration': bug.duration,
            '--delay': bug.delay,
            '--drift': `${bug.drift}px`,
            zIndex: bug.z,
          }}
        >
          <svg viewBox="0 0 24 18" className={styles.butterflySvg}>
            <g className={styles.wingLeft}>
              <ellipse
                cx="7"
                cy="8"
                rx="6"
                ry="5"
                fill={`hsl(${bug.hue} 78% 62%)`}
                fillOpacity="0.92"
              />
              <ellipse
                cx="6.5"
                cy="8"
                rx="3.2"
                ry="2.6"
                fill={`hsl(${(bug.hue + 40) % 360} 85% 78%)`}
                fillOpacity="0.75"
              />
            </g>
            <g className={styles.wingRight}>
              <ellipse
                cx="17"
                cy="8"
                rx="6"
                ry="5"
                fill={`hsl(${(bug.hue + 18) % 360} 80% 58%)`}
                fillOpacity="0.92"
              />
              <ellipse
                cx="17.5"
                cy="8"
                rx="3.2"
                ry="2.6"
                fill={`hsl(${(bug.hue + 55) % 360} 85% 76%)`}
                fillOpacity="0.75"
              />
            </g>
            <ellipse cx="12" cy="9" rx="1.1" ry="3.2" fill="#1a1a14" />
            <circle cx="12" cy="5.4" r="1.1" fill="#1a1a14" />
          </svg>
        </span>
      ))}

      {blades.map((blade, index) => {
        const idleSway =
          Math.sin(frame.t * blade.swaySpeed + blade.phase) * blade.swayAmp;

        let bend = 0;
        if (frame.strength > 0.01) {
          const bladeX = (index / (BLADE_COUNT - 1)) * frame.width;
          const dist = Math.abs(frame.x - bladeX);
          const radius = 130;
          if (dist < radius) {
            const force = 1 - dist / radius;
            const soft = force * force * (3 - 2 * force);
            const dir = frame.x >= bladeX ? 1 : -1;
            bend = dir * soft * 42 * frame.strength;
          }
        }

        const rotate = blade.lean + idleSway + bend;

        return (
          <svg
            key={blade.id}
            className={styles.blade}
            style={{
              left: blade.left,
              width: blade.width,
              height: blade.height,
              zIndex: blade.z,
              transform: `rotate(${rotate}deg)`,
            }}
            viewBox="0 0 12 40"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`g${blade.id}`} x1="0" y1="1" x2="0" y2="0">
                <stop
                  offset="0%"
                  stopColor={`hsl(${blade.hue} ${blade.sat}% ${Math.max(18, blade.light - 12)}%)`}
                />
                <stop
                  offset="55%"
                  stopColor={`hsl(${blade.hue} ${blade.sat}% ${blade.light}%)`}
                />
                <stop
                  offset="100%"
                  stopColor={`hsl(${blade.hue + 8} ${blade.sat + 8}% ${blade.light + 16}%)`}
                />
              </linearGradient>
            </defs>
            <path d={blade.d} fill={`url(#g${blade.id})`} />
          </svg>
        );
      })}
    </div>
  );
}
