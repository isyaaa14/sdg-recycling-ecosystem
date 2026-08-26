import { useEffect, useRef, useState } from 'react';

export default function CountUp({
  value,
  decimals = 0,
  suffix = '',
  duration = 1400,
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const run = () => {
      if (started.current) return;
      started.current = true;

      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (prefersReduced) {
        setDisplay(value);
        return;
      }

      const startTime = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        const current = value * eased;

        setDisplay(
          decimals > 0
            ? parseFloat(current.toFixed(decimals))
            : Math.round(current)
        );

        if (progress < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) run();
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, decimals, duration]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : display.toLocaleString();

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}
