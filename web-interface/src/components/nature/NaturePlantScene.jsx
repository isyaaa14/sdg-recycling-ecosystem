import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getNatureDayCycle } from '../../utils/natureDayCycle';
import NaturePlantVisual from './NaturePlantVisual';
import styles from './NaturePlantScene.module.css';

const DURATION = 5.8;

const MOTES = [
  { x: 18, y: 22, s: 2, d: 0 },
  { x: 72, y: 18, s: 1.5, d: 0.08 },
  { x: 40, y: 30, s: 2.2, d: 0.14 },
  { x: 58, y: 26, s: 1.4, d: 0.2 },
  { x: 28, y: 36, s: 1.8, d: 0.1 },
  { x: 66, y: 40, s: 1.6, d: 0.18 },
  { x: 46, y: 16, s: 1.3, d: 0.06 },
  { x: 82, y: 32, s: 2, d: 0.22 },
];

const DUST = [
  { x: -18, y: -6, delay: 0 },
  { x: 8, y: -10, delay: 0.03 },
  { x: 22, y: -4, delay: 0.05 },
  { x: -8, y: -12, delay: 0.02 },
  { x: 14, y: -8, delay: 0.07 },
  { x: -24, y: -2, delay: 0.04 },
];

const STARS = [
  { x: 12, y: 14, s: 1.5 },
  { x: 28, y: 22, s: 1 },
  { x: 44, y: 12, s: 1.2 },
  { x: 62, y: 18, s: 1 },
  { x: 78, y: 10, s: 1.4 },
  { x: 88, y: 26, s: 1 },
  { x: 35, y: 30, s: 1.1 },
  { x: 55, y: 8, s: 1.3 },
];

/**
 * Shared cinematic plant scene — live sway + real local day/night.
 * Experimental Nature Hub (UNDO NATURE HUB)
 */
export default function NaturePlantScene({
  seed,
  mode = 'settled',
  onComplete,
  caption,
  footer = null,
  growth = null,
}) {
  const animate = mode === 'animate';
  const sprout = seed?.sprout || '#5a9a4a';
  const accent = seed?.accent || '#8fbf6a';
  const stageId = growth?.stage?.id ?? 0;
  const microScale = growth?.microScale ?? 1;
  const [cycle, setCycle] = useState(() => getNatureDayCycle());

  useEffect(() => {
    if (!animate) return undefined;
    const id = window.setTimeout(() => onComplete?.(), 5900);
    return () => window.clearTimeout(id);
  }, [animate, onComplete]);

  useEffect(() => {
    const tick = () => setCycle(getNatureDayCycle());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const hold = (playing, settled) => (animate ? playing : settled);
  const isNight = cycle.period === 'night';
  const settledRays = isNight ? 0.06 : cycle.raysOpacity;
  const settledSun = isNight ? 0 : cycle.sunOpacity;
  const moteBoost = isNight ? 0.15 : 0.4;

  return (
    <div className={styles.stage}>
      {caption != null && (
        <div className={styles.captionRow}>
          <p className={styles.caption}>{caption}</p>
          <span className={styles.periodChip} title="Based on your local time">
            {cycle.label}
          </span>
        </div>
      )}

      <div className={styles.frame}>
        <span className={styles.letterboxTop} aria-hidden="true" />
        <span className={styles.letterboxBottom} aria-hidden="true" />

        <motion.div
          className={styles.camera}
          initial={animate ? { scale: 1.1, y: 14 } : false}
          animate={{ scale: 1, y: 0 }}
          transition={
            animate
              ? { duration: DURATION, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0 }
          }
        >
          <div
            className={`${styles.scene} ${styles[`period_${cycle.period}`]}`}
            style={{
              '--sprout': sprout,
              '--accent': accent,
              '--sun-x': `${cycle.sunX}%`,
              '--sun-y': `${cycle.sunY}%`,
            }}
            aria-label={animate ? 'Planting ceremony' : 'Your planted seed'}
          >
            <div className={styles.sky} />

            {/* Stars — night / late dusk */}
            <motion.div
              className={styles.stars}
              aria-hidden="true"
              initial={false}
              animate={{
                opacity: animate
                  ? 0
                  : cycle.period === 'night'
                    ? 0.85
                    : cycle.period === 'dusk'
                      ? 0.25
                      : 0,
              }}
              transition={{ duration: 1.4, ease: 'easeInOut' }}
            >
              {STARS.map((star, i) => (
                <span
                  key={i}
                  className={styles.star}
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    width: star.s,
                    height: star.s,
                    animationDelay: `${i * 0.35}s`,
                  }}
                />
              ))}
            </motion.div>

            <motion.div
              className={styles.haze}
              initial={false}
              animate={{
                opacity: hold(
                  [0.5, 0.4, 0.28, 0.16, 0.18],
                  isNight ? 0.35 : 0.18
                ),
              }}
              transition={
                animate
                  ? { duration: DURATION, times: [0, 0.25, 0.5, 0.75, 1] }
                  : { duration: 1.2 }
              }
            />

            <motion.div
              className={styles.godRays}
              initial={false}
              animate={{
                opacity: hold([0, 0, 0, 0.5, 0.82, 0.72], settledRays),
              }}
              transition={
                animate
                  ? {
                      duration: DURATION,
                      times: [0, 0.48, 0.52, 0.62, 0.8, 1],
                    }
                  : { duration: 1.4 }
              }
            />

            {/* Sun */}
            <motion.div
              className={styles.sunBloom}
              initial={false}
              animate={
                animate
                  ? {
                      opacity: [0, 0, 0.15, 0.9, 1, 0.9],
                      scale: [0.7, 0.7, 0.85, 1.05, 1.08, 1],
                    }
                  : { opacity: settledSun, scale: 1 }
              }
              transition={
                animate
                  ? {
                      duration: DURATION,
                      times: [0, 0.48, 0.55, 0.65, 0.82, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : { duration: 1.6, ease: 'easeInOut' }
              }
            />

            {/* Moon */}
            <motion.div
              className={styles.moon}
              aria-hidden="true"
              initial={false}
              animate={{
                opacity: animate ? 0 : cycle.moonOpacity,
                scale: animate ? 0.8 : 1,
              }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
              style={{ left: `${cycle.sunX}%`, top: `${cycle.sunY}%` }}
            />

            <div className={styles.motes} aria-hidden="true">
              {MOTES.map((mote, i) => (
                <motion.span
                  key={i}
                  className={styles.mote}
                  style={{
                    left: `${mote.x}%`,
                    top: `${mote.y}%`,
                    width: mote.s,
                    height: mote.s,
                  }}
                  initial={false}
                  animate={
                    animate
                      ? {
                          opacity: [0, 0, 0, 0.65, 0.85, 0.4],
                          y: [8, 8, 8, 0, -10, -16],
                          x: [0, 0, 0, 0, 3, 6],
                        }
                      : {
                          opacity: moteBoost * (0.7 + (i % 3) * 0.15),
                          y: [-6, -14, -8],
                          x: [0, 3, -2],
                        }
                  }
                  transition={
                    animate
                      ? {
                          duration: DURATION,
                          times: [0, 0.5, 0.55, 0.65, 0.85, 1],
                          delay: mote.d,
                        }
                      : {
                          duration: 5 + (i % 3),
                          repeat: Infinity,
                          repeatType: 'mirror',
                          delay: mote.d,
                          ease: 'easeInOut',
                        }
                  }
                />
              ))}
            </div>

            {animate && (
              <>
                <motion.div
                  className={styles.seed}
                  initial={{ y: -210, opacity: 0, scaleX: 0.8, scaleY: 1.2, rotate: -20 }}
                  animate={{
                    y: [-210, -50, 58, 64, 72, 72],
                    opacity: [0, 1, 1, 1, 0.7, 0],
                    scaleX: [0.8, 0.88, 1.08, 1.12, 0.65, 0.3],
                    scaleY: [1.2, 1.25, 0.9, 0.82, 0.5, 0.2],
                    rotate: [-20, -12, 8, 2, 0, 0],
                  }}
                  transition={{
                    duration: DURATION,
                    times: [0, 0.08, 0.22, 0.26, 0.32, 0.38],
                    ease: [0.55, 0.05, 0.9, 0.35],
                  }}
                >
                  <span className={styles.seedBody} />
                  <span className={styles.seedHighlight} />
                </motion.div>

                <div className={styles.dustBurst} aria-hidden="true">
                  {DUST.map((speck, i) => (
                    <motion.span
                      key={i}
                      className={styles.dust}
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                      animate={{
                        opacity: [0, 0, 0.7, 0],
                        x: [0, 0, speck.x, speck.x * 1.35],
                        y: [0, 0, speck.y, speck.y - 10],
                        scale: [0.4, 0.4, 1, 0.25],
                      }}
                      transition={{
                        duration: DURATION,
                        times: [0, 0.24, 0.28, 0.4],
                        delay: speck.delay,
                        ease: 'easeOut',
                      }}
                    />
                  ))}
                </div>

                <motion.div
                  className={styles.pour}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{
                    scaleY: [0, 0, 1, 1, 0],
                    opacity: [0, 0, 0.8, 0.5, 0],
                  }}
                  transition={{
                    duration: DURATION,
                    times: [0, 0.36, 0.4, 0.5, 0.56],
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              </>
            )}

            <motion.div
              className={styles.crater}
              initial={false}
              animate={{
                opacity: hold([0, 0, 0.55, 0.3, 0.22], 0.22),
                scale: hold([0.3, 0.3, 1, 1.12, 1.15], 1.15),
              }}
              transition={
                animate
                  ? { duration: DURATION, times: [0, 0.24, 0.3, 0.45, 1] }
                  : { duration: 0 }
              }
            />

            <motion.div
              className={styles.splash}
              initial={false}
              animate={
                animate
                  ? {
                      opacity: [0, 0, 0.65, 0.3, 0],
                      scaleX: [0.3, 0.3, 1.2, 1.35, 1.4],
                      scaleY: [0.4, 0.4, 1, 0.65, 0.35],
                    }
                  : { opacity: 0, scaleX: 1.4, scaleY: 0.35 }
              }
              transition={
                animate
                  ? {
                      duration: DURATION,
                      times: [0, 0.4, 0.46, 0.56, 0.68],
                    }
                  : { duration: 0 }
              }
            />

            <motion.div
              className={styles.wetSoil}
              initial={false}
              animate={{ opacity: hold([0, 0, 0.5, 0.55, 0.4], 0.4) }}
              transition={
                animate
                  ? { duration: DURATION, times: [0, 0.42, 0.5, 0.65, 1] }
                  : { duration: 0 }
              }
            />

            {/* Planting film uses sprout; settled uses seed+stage art */}
            {animate ? (
              <motion.div
                className={styles.sproutWrap}
                style={{ transformOrigin: '50% 92%' }}
              >
                <svg className={styles.sprout} viewBox="0 0 80 100" aria-hidden="true">
                  <motion.path
                    d="M40 92 C40 70, 39 48, 40 28"
                    fill="none"
                    stroke={sprout}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    initial={false}
                    animate={{
                      pathLength: [0, 0, 0, 0.55, 1],
                      opacity: [0, 0, 0, 1, 1],
                    }}
                    transition={{
                      duration: DURATION,
                      times: [0, 0.7, 0.74, 0.88, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                  <motion.g
                    style={{ transformOrigin: '40px 42px' }}
                    initial={false}
                    animate={{
                      scale: [0, 0, 0, 0.85, 1],
                      rotate: [-18, -18, -18, -6, 0],
                      opacity: [0, 0, 0, 1, 1],
                    }}
                    transition={{
                      duration: DURATION,
                      times: [0, 0.78, 0.82, 0.92, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <path
                      d="M40 44 C28 36, 18 34, 12 40 C20 48, 30 50, 40 46"
                      fill={accent}
                    />
                  </motion.g>
                  <motion.g
                    style={{ transformOrigin: '40px 48px' }}
                    initial={false}
                    animate={{
                      scale: [0, 0, 0, 0.85, 1],
                      rotate: [16, 16, 16, 5, 0],
                      opacity: [0, 0, 0, 1, 1],
                    }}
                    transition={{
                      duration: DURATION,
                      times: [0, 0.82, 0.86, 0.95, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <path
                      d="M40 48 C52 40, 62 38, 68 45 C60 52, 50 54, 40 50"
                      fill={sprout}
                    />
                  </motion.g>
                </svg>
              </motion.div>
            ) : (
              <motion.div
                className={styles.sproutWrap}
                style={{ transformOrigin: '50% 92%' }}
                animate={{ rotate: [-2.2, 2.4, -1.6, 2.0, -2.2] }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <NaturePlantVisual
                  seedId={seed?.id}
                  stageId={stageId}
                  sprout={sprout}
                  accent={accent}
                  microScale={microScale}
                />
              </motion.div>
            )}

            <motion.div
              className={styles.lifeGlow}
              initial={false}
              animate={{
                opacity: hold(
                  [0, 0, 0, 0.32, 0.22],
                  isNight ? 0.12 : 0.22
                ),
              }}
              transition={
                animate
                  ? { duration: DURATION, times: [0, 0.85, 0.9, 0.96, 1] }
                  : { duration: 1.2 }
              }
            />

            <div className={styles.ground} aria-hidden="true">
              <div className={styles.soilFar} />
              <div className={styles.soil} />
              <div className={styles.soilRim} />
            </div>

            <div className={styles.vignette} aria-hidden="true" />
            <div className={styles.grain} aria-hidden="true" />
          </div>
        </motion.div>

        {animate && (
          <motion.div
            className={styles.fade}
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0, 0, 0, 0] }}
            transition={{
              duration: DURATION,
              times: [0, 0.1, 0.2, 0.9, 1],
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {footer}
    </div>
  );
}
