/**
 * Formatter utilities for speed, distance, travel time, and timestamps.
 */

export function formatSpeed(val) {
  if (val === undefined || val === null) return '0.0 km/h';
  return `${Number(val).toFixed(1)} km/h`;
}

export function formatDistance(val) {
  if (val === undefined || val === null) return '0.0 km';
  return `${Number(val).toFixed(1)} km`;
}

export function formatTimeMinutes(val) {
  if (val === undefined || val === null) return '0.0 min';
  return `${Number(val).toFixed(1)} min`;
}

export function formatPercent(val) {
  if (val === undefined || val === null) return '0%';
  return `${Math.round(val)}%`;
}

export function formatTimestamp(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(isoString);
  }
}

export function formatDuration(val) {
  return formatTimeMinutes(val);
}

export function formatNumber(val) {
  if (val === undefined || val === null) return '0';
  return Number(val).toLocaleString();
}

export function roundTo(val, decimals = 1) {
  if (val === undefined || val === null) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(Number(val) * factor) / factor;
}

