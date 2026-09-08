import { Platform } from 'react-native';
import type { PhaseKind } from '@/data/types';

export type ThemeName = 'slate' | 'night' | 'day';

export interface Theme {
  name: ThemeName;
  dark: boolean;
  /** Page background, behind every panel. */
  bg: string;
  /** Chrome: nav bar, status strip, bottom action bar. */
  chrome: string;
  /** Panel background. Rows sit directly on this, separated by hairlines. */
  surface: string;
  surfacePress: string;
  /** Hairline between rows. */
  border: string;
  /** Panel outline and heavier separators. */
  borderStrong: string;
  text: string;
  textDim: string;
  textFaint: string;
  accent: string;
  /** Muted accent for fills behind accent text. */
  accentSoft: string;
  ok: string;
  caution: string;
  warning: string;
  leader: string;
  overlay: string;
  /** Night mode collapses every colour to red, so accents must not survive. */
  monochrome: boolean;
}

export const THEMES: Record<ThemeName, Theme> = {
  slate: {
    name: 'slate',
    dark: true,
    bg: '#0B1017',
    chrome: '#0F1620',
    surface: '#131C26',
    surfacePress: '#1B2836',
    border: '#1E2A36',
    borderStrong: '#2C3E4E',
    text: '#E6EDF5',
    textDim: '#91A3B5',
    textFaint: '#70859B',
    accent: '#22D3EE',
    accentSoft: '#0C3F4C',
    ok: '#34D399',
    caution: '#FBBF24',
    warning: '#FB7185',
    leader: '#22303D',
    overlay: 'rgba(5,9,14,0.86)',
    monochrome: false,
  },
  night: {
    name: 'night',
    dark: true,
    bg: '#000000',
    chrome: '#070202',
    surface: '#100303',
    surfacePress: '#1C0606',
    border: '#2A0C0C',
    borderStrong: '#4A1616',
    text: '#FF6B60',
    textDim: '#C8736E',
    textFaint: '#BE5953',
    accent: '#FF3B30',
    accentSoft: '#3A0D0B',
    ok: '#FF6B60',
    caution: '#FF8A65',
    warning: '#FF3B30',
    leader: '#331010',
    overlay: 'rgba(0,0,0,0.9)',
    monochrome: true,
  },
  day: {
    name: 'day',
    dark: false,
    bg: '#EDF1F5',
    chrome: '#FFFFFF',
    surface: '#FFFFFF',
    surfacePress: '#E3EAF1',
    border: '#DCE4EC',
    borderStrong: '#A9BAC9',
    text: '#0B1017',
    textDim: '#4A5C6E',
    textFaint: '#5D7082',
    accent: '#0E7490',
    accentSoft: '#D6F1F8',
    ok: '#047857',
    caution: '#AF5109',
    warning: '#BE123C',
    leader: '#C3D0DB',
    monochrome: false,
    overlay: 'rgba(255,255,255,0.88)',
  },
};

export const THEME_LABEL: Record<ThemeName, string> = {
  slate: 'Slate',
  night: 'Night',
  day: 'Day',
};

export const THEME_HINT: Record<ThemeName, string> = {
  slate: 'Dark slate with a cyan accent. The default.',
  night: 'Red on black, to protect dark adaptation.',
  day: 'Light, for a bright room or daylight.',
};

/** Phase accent, used for the marker beside each checklist. */
export const PHASE_COLOR: Record<PhaseKind, string> = {
  preflight: '#8B9EF7',
  start: '#F5A65B',
  taxi: '#EFD060',
  takeoff: '#4ADE9B',
  climb: '#3FD0E0',
  cruise: '#5FB8F5',
  descent: '#9B8BF5',
  approach: '#E084D2',
  landing: '#FF9A8B',
  shutdown: '#8497AB',
  emergency: '#FB7185',
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

/** Night mode flattens every per-aircraft and per-phase colour to the red accent. */
export function accentFor(theme: Theme, color: string): string {
  return theme.monochrome ? theme.accent : color;
}

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** EFB software has squared-off panels, not rounded cards. */
export const RADIUS = {
  xs: 3,
  sm: 5,
  md: 8,
  pill: 999,
} as const;

export const MONO = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, monospace',
});

/**
 * Type scale. `label` is the small-caps EFB header style used above every data
 * value and section; `data` is the tabular style for numbers and codes.
 */
export const TYPE = {
  display: { size: 22, weight: '700' as const },
  title: { size: 17, weight: '700' as const },
  body: { size: 15, weight: '500' as const },
  small: { size: 13, weight: '500' as const },
  label: { size: 11, weight: '700' as const, letterSpacing: 1.1 },
  data: { size: 14, weight: '600' as const },
} as const;
