import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './icons/Icon';
import { RecycleSimple } from './icons/recycleSymbol';
import styles from './RecyclePlayground.module.css';

const MATERIALS = [
  { id: 'bottle', icon: 'bottle', label: 'Plastic Bottle', code: '01' },
  { id: 'can', icon: 'can', label: 'Aluminium Can', code: '02' },
  { id: 'paper', icon: 'paper', label: 'Paper & Cardboard', code: '03' },
];

const BIN_COLORS = [
  { bg: '#dfff00', fg: '#000000' },
  { bg: '#00e5a0', fg: '#000000' },
  { bg: '#7eb6ff', fg: '#000000' },
  { bg: '#ff9f0a', fg: '#000000' },
  { bg: '#ff6bcb', fg: '#000000' },
];

const CHARGE_PER_TAP = 20;
const STAGE_STORAGE_KEY = 'sdg_eco_portal_stage';
const ENERGY_PARTICLES = Array.from({ length: 18 }, (_, i) => i);

/** Soft, premium evolution — only glow / particle / galaxy hues change. */
const EVOLUTION_STAGES = [
  {
    glow: 'rgba(190, 230, 90, 0.42)',
    particle: '#c6e85c',
    galaxy: 'rgba(190, 230, 90, 0.13)',
    accent: '#b8e040',
    ring: 'rgba(190, 230, 90, 0.28)',
  },
  {
    glow: 'rgba(90, 220, 180, 0.4)',
    particle: '#5ee0c8',
    galaxy: 'rgba(70, 210, 190, 0.14)',
    accent: '#4fd4b8',
    ring: 'rgba(80, 220, 190, 0.3)',
  },
  {
    glow: 'rgba(90, 160, 255, 0.38)',
    particle: '#6eb0ff',
    galaxy: 'rgba(80, 150, 255, 0.14)',
    accent: '#5a9fff',
    ring: 'rgba(90, 160, 255, 0.3)',
  },
  {
    glow: 'rgba(170, 120, 255, 0.38)',
    particle: '#b48cff',
    galaxy: 'rgba(160, 110, 255, 0.14)',
    accent: '#a878ff',
    ring: 'rgba(170, 120, 255, 0.3)',
  },
  {
    glow: 'rgba(230, 195, 80, 0.42)',
    particle: '#e8c84a',
    galaxy: 'rgba(230, 195, 80, 0.14)',
    accent: '#d4b23a',
    ring: 'rgba(230, 195, 80, 0.32)',
  },
];

function readStage() {
  try {
    const raw = Number(localStorage.getItem(STAGE_STORAGE_KEY));
    if (Number.isFinite(raw) && raw >= 1 && raw <= EVOLUTION_STAGES.length) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 1;
}

function writeStage(stage) {
  try {
    localStorage.setItem(STAGE_STORAGE_KEY, String(stage));
  } catch {
    /* ignore */
  }
}

function triggerEcoPulse() {
  const root = document.documentElement;
  root.classList.remove('eco-pulse');
  // Retrigger CSS animation if pulsed again quickly
  void root.offsetWidth;
  root.classList.add('eco-pulse');
  window.setTimeout(() => {
    root.classList.remove('eco-pulse');
  }, 1800);
}

export default function RecyclePlayground() {
  const [sessionCount, setSessionCount] = useState(0);
  const [charge, setCharge] = useState(0);
  const [stage, setStage] = useState(readStage);
  const [colorIndex, setColorIndex] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [absorbing, setAbsorbing] = useState(false);
  const [chargingUp, setChargingUp] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [activeMaterialId, setActiveMaterialId] = useState(null);
  const [sequence, setSequence] = useState(null);
  const timeoutRef = useRef([]);
  const chargeRef = useRef(0);

  const evolution = useMemo(
    () => EVOLUTION_STAGES[Math.min(stage, EVOLUTION_STAGES.length) - 1],
    [stage]
  );

  const clearTimers = () => {
    timeoutRef.current.forEach((id) => window.clearTimeout(id));
    timeoutRef.current = [];
  };

  const schedule = (fn, delay) => {
    const id = window.setTimeout(fn, delay);
    timeoutRef.current.push(id);
  };

  useEffect(() => () => clearTimers(), []);

  const handleTap = useCallback(
    (material, materialIndex) => {
      if (disabled) return;

      clearTimers();

      const palette = BIN_COLORS[colorIndex % BIN_COLORS.length];
      setColorIndex((index) => index + 1);
      setDisabled(true);
      setActiveMaterialId(material.id);
      setAbsorbing(false);
      setChargingUp(false);
      setReleasing(false);
      setSequence({
        id: Date.now(),
        material,
        materialIndex,
        palette,
      });

      // Bin reaches portal — absorb
      schedule(() => {
        setAbsorbing(true);
        setSessionCount((count) => count + 1);

        const next = Math.min(100, chargeRef.current + CHARGE_PER_TAP);
        const filled = next >= 100;
        chargeRef.current = next;
        setCharge(next);

        if (filled) {
          schedule(() => setChargingUp(true), 280);

          schedule(() => {
            setReleasing(true);
            setChargingUp(false);
            triggerEcoPulse();
            setStage((current) => {
              const advanced = Math.min(EVOLUTION_STAGES.length, current + 1);
              writeStage(advanced);
              return advanced;
            });
          }, 1080);

          schedule(() => {
            chargeRef.current = 0;
            setCharge(0);
            setAbsorbing(false);
            setReleasing(false);
            setSequence(null);
            setActiveMaterialId(null);
            setDisabled(false);
          }, 2180);
        } else {
          schedule(() => setAbsorbing(false), 1000);
          schedule(() => {
            setSequence(null);
            setActiveMaterialId(null);
            setDisabled(false);
          }, 1200);
        }
      }, 1850);
    },
    [colorIndex, disabled]
  );

  const filledDots = Math.round((charge / 100) * 8);

  let status = 'Every recycled material is transformed into Eco Energy.';
  if (releasing) status = 'Eco pulse';
  else if (chargingUp) status = 'Energy building…';
  else if (absorbing) status = 'Converting…';
  else if (sequence) status = 'Bin incoming…';

  return (
    <section
      className={`${styles.playground} ${chargingUp ? styles.playgroundCharging : ''} ${
        releasing ? styles.playgroundPulse : ''
      }`}
      aria-label="Interactive recycling demo"
      style={{
        '--portal-glow': evolution.glow,
        '--portal-particle': evolution.particle,
        '--portal-galaxy': evolution.galaxy,
        '--portal-accent': evolution.accent,
        '--portal-ring': evolution.ring,
      }}
    >
      <div className={styles.topBar}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Interactive</p>
          <h2 className={styles.title}>Tap to recycle</h2>
          <p className={styles.hint}>
            Each tap powers something greater.
          </p>
        </div>

        <div
          className={`${styles.sessionPanel} ${absorbing ? styles.sessionPanelPulse : ''} ${
            releasing ? styles.sessionPanelPulseStrong : ''
          }`}
          aria-live="polite"
        >
          <span className={styles.sessionLabel}>Session</span>
          <strong className={styles.sessionCount}>{sessionCount}</strong>
          <div className={styles.sessionDots} aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span
                key={index}
                className={`${styles.sessionDot} ${
                  index < filledDots ? styles.sessionDotFilled : ''
                }`}
              />
            ))}
          </div>
          <span className={styles.sessionNote}>Demo only</span>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.materials}>
          <p className={styles.materialsLabel}>Materials</p>
          {MATERIALS.map((material, index) => {
            const isActive = activeMaterialId === material.id;

            return (
              <button
                key={material.id}
                type="button"
                className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
                disabled={disabled}
                onClick={() => handleTap(material, index)}
                aria-label={`Recycle ${material.label}`}
              >
                <span className={styles.chipCode}>{material.code}</span>
                <span className={styles.chipIcon}>
                  <Icon name={material.icon} size={24} />
                </span>
                <span className={styles.chipCopy}>
                  <span className={styles.chipLabel}>{material.label}</span>
                  <span className={styles.chipAction}>Tap to dispatch bin</span>
                </span>
                <span className={styles.chipArrow} aria-hidden="true">
                  →
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.flow} aria-hidden="true">
          <span className={styles.flowLine} />
          <span className={`${styles.flowDot} ${sequence ? styles.flowDotActive : ''}`} />
          <span
            className={`${styles.flowDot} ${styles.flowDotDelay} ${
              sequence ? styles.flowDotActive : ''
            }`}
          />
          <span
            className={`${styles.flowDot} ${styles.flowDotDelay2} ${
              sequence ? styles.flowDotActive : ''
            }`}
          />
        </div>

        <div
          className={`${styles.vault} ${absorbing ? styles.vaultAbsorb : ''} ${
            chargingUp ? styles.vaultCharging : ''
          } ${releasing ? styles.vaultRelease : ''}`}
          data-stage={stage}
          style={{
            '--portal-charge': `${charge}%`,
            ...(sequence ? { '--vault-glow': sequence.palette.bg } : null),
          }}
        >
          <div className={styles.vaultTop}>
            <span
              className={`${styles.vaultSlotTrack} ${
                absorbing ? styles.vaultSlotTrackFlash : ''
              } ${chargingUp || releasing ? styles.vaultSlotTrackFull : ''}`}
              aria-hidden="true"
            >
              <span className={styles.vaultSlotFill} />
            </span>
            <span className={styles.vaultSlotGlow} />
          </div>

          <div className={styles.vaultBody}>
            <div
              className={`${styles.galaxy} ${absorbing ? styles.galaxyAbsorb : ''} ${
                chargingUp ? styles.galaxyCharging : ''
              }`}
              aria-hidden="true"
            />
            <div
              className={`${styles.ringOuter} ${absorbing ? styles.ringOuterAbsorb : ''}`}
              aria-hidden="true"
            />
            <div
              className={`${styles.ringInner} ${absorbing ? styles.ringAbsorb : ''}`}
              aria-hidden="true"
            />

            <div
              className={`${styles.vaultIcon} ${absorbing ? styles.vaultIconPulse : ''} ${
                chargingUp ? styles.vaultIconCharging : ''
              }`}
            >
              <RecycleSimple color="var(--portal-accent, var(--signal))" strokeWidth={1.55} />
            </div>

            {absorbing && (
              <div className={styles.energyField} aria-hidden="true">
                {ENERGY_PARTICLES.map((particle) => (
                  <span
                    key={particle}
                    className={styles.energyParticle}
                    style={{ '--i': particle }}
                  />
                ))}
              </div>
            )}

            {absorbing && <span className={styles.coreFlash} aria-hidden="true" />}
            {absorbing && <span className={styles.ripple} aria-hidden="true" />}
            {absorbing && <span className={styles.rippleDelay} aria-hidden="true" />}
            {absorbing && <span className={styles.rippleWide} aria-hidden="true" />}
            {chargingUp && <span className={styles.chargeBuild} aria-hidden="true" />}
            {chargingUp && <span className={styles.chargeBuildOuter} aria-hidden="true" />}
            {releasing && <span className={styles.releaseWave} aria-hidden="true" />}
            {releasing && <span className={styles.releaseWaveOuter} aria-hidden="true" />}
            {releasing && <span className={styles.releaseBurst} aria-hidden="true" />}
          </div>

          <div className={styles.vaultFooter}>
            <span className={styles.vaultLabel}>Energy Portal</span>
            <span className={styles.vaultStatus}>{status}</span>
          </div>
        </div>

        {sequence && (
          <div key={sequence.id} className={styles.animLayer} aria-hidden="true">
            <div
              className={styles.collectorBin}
              style={{
                '--row': sequence.materialIndex,
                '--bin-bg': sequence.palette.bg,
                '--bin-fg': sequence.palette.fg,
              }}
            >
              <span className={styles.collectorItem}>
                <Icon name={sequence.material.icon} size={20} />
              </span>

              <div className={styles.collectorBody}>
                <span className={styles.collectorLid} />
                <span className={styles.collectorFace}>
                  <RecycleSimple color="var(--bin-fg)" strokeWidth={1.5} />
                </span>
              </div>

              <span className={styles.collectorShadow} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
