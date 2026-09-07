import type { PhaseKind } from '@/data/types';

export type ThemeName = 'cockpit' | 'night' | 'day';

export interface Theme {
  name: ThemeName;
  dark: boolean;
  bg: string;
  bgElevated: string;
  card: string;
  cardPressed: string;
  border: string;
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  /** Colour used for checklist responses and primary actions. */
  accent: string;
  accentDim: string;
  /** "Checked / complete" colour. */
  ok: string;
  caution: string;
  warning: string;
  /** Dotted leader between challenge and response. */
  leader: string;
  overlay: string;
  /** Set on aircraft accents so night mode stays monochrome red. */
  monochrome: boolean;
}

export const THEMES: Record<ThemeName, Theme> = {
  cockpit: {
    name: 'cockpit',
    dark: true,
    bg: '#080B10',
    bgElevated: '#0E141C',
    card: '#131B25',
    cardPressed: '#1B2634',
    border: '#1F2A38',
    borderStrong: '#31435A',
    text: '#E8EDF4',
    textDim: '#93A3B8',
    textFaint: '#5C6B7F',
    accent: '#FFB020',
    accentDim: '#8A5F14',
    ok: '#39D98A',
    caution: '#FFB020',
    warning: '#FF5C5C',
    leader: '#2A3949',
    overlay: 'rgba(4,7,11,0.82)',
    monochrome: false,
  },
  night: {
    name: 'night',
    dark: true,
    bg: '#000000',
    bgElevated: '#0A0202',
    card: '#140404',
    cardPressed: '#220707',
    border: '#341010',
    borderStrong: '#5A1C1C',
    text: '#FF6B60',
    textDim: '#B84A44',
    textFaint: '#7A2E2A',
    accent: '#FF3B30',
    accentDim: '#7A1C18',
    ok: '#FF6B60',
    caution: '#FF8A65',
    warning: '#FF3B30',
    leader: '#3E1212',
    overlay: 'rgba(0,0,0,0.9)',
    monochrome: true,
  },
  day: {
    name: 'day',
    dark: false,
    bg: '#F2F4F7',
    bgElevated: '#FFFFFF',
    card: '#FFFFFF',
    cardPressed: '#E8EDF3',
    border: '#D8DFE8',
    borderStrong: '#AFBCCC',
    text: '#0E1721',
    textDim: '#4E5C6E',
    textFaint: '#8494A6',
    accent: '#0B62C4',
    accentDim: '#9AC0E8',
    ok: '#1B8F52',
    caution: '#B26A00',
    warning: '#C62828',
    leader: '#C7D2DE',
    overlay: 'rgba(255,255,255,0.86)',
    monochrome: false,
  },
};

export const THEME_LABEL: Record<ThemeName, string> = {
  cockpit: 'Cockpit',
  night: 'Night (red)',
  day: 'Day',
};

/** Phase accent colours, used for the strip down the side of each phase card. */
export const PHASE_COLOR: Record<PhaseKind, string> = {
  preflight: '#7C9CF5',
  start: '#F5A65B',
  taxi: '#F5D95B',
  takeoff: '#5BE0A0',
  climb: '#5BD5E0',
  cruise: '#7ED0FF',
  descent: '#9E9BF5',
  approach: '#E08BD8',
  landing: '#FF9A8B',
  shutdown: '#96A6BC',
  emergency: '#FF5C5C',
};

export const PHASE_LABEL: Record<PhaseKind, string> = {
  preflight: 'Preflight',
  start: 'Start',
  taxi: 'Taxi',
  takeoff: 'Takeoff',
  climb: 'Climb',
  cruise: 'Cruise',
  descent: 'Descent',
  approach: 'Approach',
  landing: 'Landing',
  shutdown: 'Shutdown',
  emergency: 'Emergency',
};

/** In night mode every accent collapses to the red palette to protect dark adaptation. */
export function accentFor(theme: Theme, aircraftAccent: string): string {
  return theme.monochrome ? theme.accent : aircraftAccent;
}

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
