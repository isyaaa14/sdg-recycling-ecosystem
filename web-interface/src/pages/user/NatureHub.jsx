import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import NaturePlantScene from '../../components/nature/NaturePlantScene';
import GrowthStagesGuide from '../../components/nature/GrowthStagesGuide';
import { getLevelProgress } from '../../utils/levels';
import { getNatureGrowth, NATURE_PEAK_LEVEL } from '../../utils/natureGrowth';
import {
  NATURE_SEEDS,
  readNatureHub,
  writeNatureHub,
} from '../../utils/natureHub';
import styles from './NatureHub.module.css';

/** Experimental Nature Hub — undo with keyword: UNDO NATURE HUB */
export default function NatureHub() {
  const { user } = useAuth();
  const stored = readNatureHub(user?.username);
  const initialSeed = NATURE_SEEDS.find((s) => s.id === stored?.seedId) || null;

  const [phase, setPhase] = useState(() => (initialSeed ? 'grown' : 'pick'));
  const [selected, setSelected] = useState(initialSeed);
  const [level, setLevel] = useState(1);
  const [pickingNext, setPickingNext] = useState(false);
  const [stagesOpen, setStagesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/dashboard');
        const lifetime =
          data?.stats?.lifetimePoints ?? data?.stats?.totalPoints ?? 0;
        if (!cancelled) setLevel(getLevelProgress(lifetime).level);
      } catch {
        if (!cancelled) setLevel(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const growth = useMemo(() => getNatureGrowth(level), [level]);

  const handlePick = (seed) => {
    if (phase !== 'pick') return;
    setSelected(seed);
    setPhase('planting');
  };

  const handlePlanted = useCallback(() => {
    if (!selected) return;
    const prev = readNatureHub(user?.username) || {};
    const pastTrees = Array.isArray(prev.pastTrees) ? [...prev.pastTrees] : [];
    if (pickingNext && prev.seedId) {
      pastTrees.push({
        seedId: prev.seedId,
        peakedAt: new Date().toISOString(),
      });
    }
    writeNatureHub(user?.username, {
      seedId: selected.id,
      plantedAt: new Date().toISOString(),
      pastTrees,
    });
    setPickingNext(false);
    setPhase('grown');
  }, [selected, user?.username, pickingNext]);

  const handleChooseNext = () => {
    setPickingNext(true);
    setPhase('pick');
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Nature Hub</h1>
        <p>Your seed grows with your recycling level.</p>
      </header>

      <GrowthStagesGuide
        open={stagesOpen}
        onClose={() => setStagesOpen(false)}
        currentStageId={growth.stage.id}
        level={growth.level}
      />

      {phase === 'pick' && (
        <section className={styles.pickSection}>
          <p className={styles.kicker}>
            {pickingNext
              ? `Level ${NATURE_PEAK_LEVEL} peak — choose your next seed`
              : 'Select one seed to plant'}
          </p>
          <div className={styles.seedGrid}>
            {NATURE_SEEDS.map((seed) => (
              <button
                key={seed.id}
                type="button"
                className={styles.seedCard}
                onClick={() => handlePick(seed)}
              >
                <span
                  className={styles.seedOrb}
                  style={{
                    background: `linear-gradient(145deg, ${seed.accent}, ${seed.sprout})`,
                  }}
                  aria-hidden="true"
                />
                <span className={styles.seedName}>{seed.name}</span>
                <span className={styles.seedBlurb}>{seed.blurb}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {(phase === 'planting' || phase === 'grown') && selected && (
        <NaturePlantScene
          key={
            phase === 'planting'
              ? `plant-${selected.id}`
              : `rooted-${selected.id}-${growth.stage.id}`
          }
          seed={selected}
          mode={phase === 'planting' ? 'animate' : 'settled'}
          growth={growth}
          onComplete={handlePlanted}
          caption={
            phase === 'planting'
              ? `Planting ${selected.name}`
              : `${selected.name} · ${growth.stage.label}`
          }
          footer={
            phase === 'grown' ? (
              <div className={styles.grownFooter}>
                <p className={styles.stageLine}>
                  Level {growth.level} · {growth.stage.label}
                  {growth.nextStage
                    ? ` · next look at level ${growth.nextStage.minLevel}`
                    : ' · peak form'}
                </p>
                <p className={styles.grownHint}>{growth.stage.blurb}</p>
                <div className={styles.footerActions}>
                  <button
                    type="button"
                    className={styles.stagesLink}
                    onClick={() => setStagesOpen(true)}
                  >
                    Growth stages
                  </button>
                  {growth.canChooseNextSeed && (
                    <button
                      type="button"
                      className={styles.replantBtn}
                      onClick={handleChooseNext}
                    >
                      Choose next seed
                    </button>
                  )}
                </div>
              </div>
            ) : null
          }
        />
      )}
    </div>
  );
}
