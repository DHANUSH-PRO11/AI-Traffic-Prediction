/**
 * Unified Traffic Level Color and Badge Utility.
 * Follows a crisp white aesthetic with emerald green and red severity indicators.
 */

export const TRAFFIC_LEVELS = {
  LOW: {
    label: 'Low (Free Flow)',
    shortLabel: 'LOW',
    hex: '#10b981',        // Emerald-500
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    glowClass: '',
    dotClass: 'bg-emerald-500'
  },
  MEDIUM: {
    label: 'Medium (Moderate Delays)',
    shortLabel: 'MEDIUM',
    hex: '#f59e0b',        // Amber-500
    borderClass: 'border-amber-300',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    glowClass: '',
    dotClass: 'bg-amber-500'
  },
  HIGH: {
    label: 'High (Heavy Traffic)',
    shortLabel: 'HIGH',
    hex: '#ea580c',        // Orange-600
    borderClass: 'border-orange-300',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-800',
    glowClass: '',
    dotClass: 'bg-orange-600'
  },
  SEVERE: {
    label: 'Severe (Gridlock / Closed)',
    shortLabel: 'SEVERE',
    hex: '#ef4444',        // Red-500
    borderClass: 'border-red-300',
    bgClass: 'bg-red-50',
    textClass: 'text-red-800',
    glowClass: '',
    dotClass: 'bg-red-600'
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
  return `${conf.bgClass} ${conf.textClass} ${conf.borderClass}`;
}

export const getTrafficColor = getTrafficHex;
export const getTrafficColorHex = getTrafficHex;
