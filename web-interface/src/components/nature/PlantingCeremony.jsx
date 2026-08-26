import NaturePlantScene from './NaturePlantScene';

/** @deprecated Prefer NaturePlantScene — kept as thin wrapper for Nature Hub trial */
export default function PlantingCeremony({ seed, onComplete }) {
  return (
    <NaturePlantScene
      seed={seed}
      mode="animate"
      onComplete={onComplete}
      caption={`Planting ${seed?.name || 'your seed'}`}
    />
  );
}
