/** Local real-time day cycle for Nature Hub (UNDO NATURE HUB) */

export function getNatureDayCycle(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;

  let period = 'night';
  if (hour >= 5 && hour < 7) period = 'dawn';
  else if (hour >= 7 && hour < 17) period = 'day';
  else if (hour >= 17 && hour < 19.5) period = 'dusk';

  // Sun arc across daytime / dusk / dawn; moon opposite at night
  let sunX = 78;
  let sunY = 12;
  let sunOpacity = 0;
  let moonOpacity = 0;
  let raysOpacity = 0;

  if (period === 'dawn') {
    const t = (hour - 5) / 2;
    sunX = 18 + t * 20;
    sunY = 28 - t * 14;
    sunOpacity = 0.35 + t * 0.45;
    raysOpacity = 0.25 + t * 0.25;
  } else if (period === 'day') {
    const t = (hour - 7) / 10;
    sunX = 28 + t * 50;
    sunY = 10 + Math.sin(t * Math.PI) * -4 + t * 6;
    sunOpacity = 0.9;
    raysOpacity = 0.65 + Math.sin(t * Math.PI) * 0.15;
  } else if (period === 'dusk') {
    const t = (hour - 17) / 2.5;
    sunX = 72 + t * 14;
    sunY = 16 + t * 22;
    sunOpacity = 0.75 - t * 0.55;
    raysOpacity = 0.45 - t * 0.35;
  } else {
    // night — soft moon
    const t = hour < 5 ? (hour + 5) / 10 : (hour - 19.5) / 9.5;
    sunX = 22 + Math.min(1, Math.max(0, t)) * 50;
    sunY = 14;
    moonOpacity = 0.85;
    sunOpacity = 0;
    raysOpacity = 0.08;
  }

  const labels = {
    dawn: 'Dawn',
    day: 'Day',
    dusk: 'Dusk',
    night: 'Night',
  };

  return {
    period,
    label: labels[period],
    sunX,
    sunY,
    sunOpacity,
    moonOpacity,
    raysOpacity,
    hour,
  };
}
