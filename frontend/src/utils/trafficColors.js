/**
 * Unified Traffic Level Color and Badge Utility.
 * Follows the light green and white aesthetic with standard traffic severity indicators.
 */

export const TRAFFIC_LEVELS = {
  LOW: {
    label: 'Low (Free Flow)',
    shortLabel: 'LOW',
    hex: '#10b981',        // Emerald-500
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-300',
    glowClass: 'glow-emerald',
    dotClass: 'bg-emerald-400'
  },
  MEDIUM: {
    label: 'Medium (Moderate Delays)',
    shortLabel: 'MEDIUM',
    hex: '#f59e0b',        // Amber-500
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    glowClass: 'glow-amber',
    dotClass: 'bg-amber-500'
  },
  HIGH: {
    label: 'High (Heavy Traffic)',
    shortLabel: 'HIGH',
    hex: '#f97316',        // Orange-500
    borderClass: 'border-orange-500/40',
    bgClass: 'bg-orange-500/15',
    textClass: 'text-orange-400',
    glowClass: 'glow-amber',
    dotClass: 'bg-orange-500'
  },
  SEVERE: {
    label: 'Severe (Gridlock / Closed)',
    shortLabel: 'SEVERE',
    hex: '#ef4444',        // Red-500
    borderClass: 'border-red-500/40',
    bgClass: 'bg-red-500/15',
    textClass: 'text-red-400',
    glowClass: 'glow-rose',
    dotClass: 'bg-red-500'
  }
};

export function getTrafficConfig(level) {
  const normalized = (level || 'LOW').toUpperCase();
  return TRAFFIC_LEVELS[normalized] || TRAFFIC_LEVELS.LOW;
}

export function getTrafficHex(level) {
  return getTrafficConfig(level).hex;
}

export function getTrafficBadgeClass(level) {
  const conf = getTrafficConfig(level);
  return `${conf.bgClass} ${conf.textClass} ${conf.borderClass} ${conf.glowClass}`;
}

export const getTrafficColor = getTrafficHex;
export const getTrafficColorHex = getTrafficHex;

