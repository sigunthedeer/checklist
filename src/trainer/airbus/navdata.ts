/**
 * Navigation data for the training flight, London Heathrow to Paris Charles
 * de Gaulle. The airports and runways are real; the procedures, the airway
 * and several fixes are made up for training and will not match the sim's
 * database. Kept deliberately small: only what the scripted procedures touch,
 * plus a few alternatives so there is something to choose between.
 */

export interface Procedure {
  id: string;
  fixes: string[];
}

export interface Runway {
  id: string;
  length: string;
}

export const ORIGIN = 'EGLL';
export const DESTINATION = 'LFPG';

export const RUNWAYS: Record<string, Runway[]> = {
  EGLL: [
    { id: '27R', length: '3902M' },
    { id: '27L', length: '3660M' },
    { id: '09R', length: '3660M' },
    { id: '09L', length: '3902M' },
  ],
};

export const SIDS: Record<string, Procedure[]> = {
  EGLL: [
    { id: 'DVR5J', fixes: ['LON', 'DET', 'DVR'] },
    { id: 'CPT3F', fixes: ['CPT'] },
    { id: 'MID3G', fixes: ['MID'] },
    { id: 'NO SID', fixes: [] },
  ],
};

export const APPROACHES: Record<string, (Procedure & { runway: string })[]> = {
  LFPG: [
    { id: 'ILS27R', runway: '27R', fixes: ['FF27R', 'RW27R'] },
    { id: 'ILS26L', runway: '26L', fixes: ['FF26L', 'RW26L'] },
    { id: 'RNP27R', runway: '27R', fixes: ['FF27R', 'RW27R'] },
  ],
};

export const STARS: Record<string, Procedure[]> = {
  LFPG: [
    { id: 'NATEB5W', fixes: ['NATEB', 'PONAN', 'RESMI'] },
    { id: 'MOPAR5W', fixes: ['MOPAR', 'RESMI'] },
    { id: 'NO STAR', fixes: [] },
  ],
};

/** Airways as an ordered list of fixes. */
export const AIRWAYS: Record<string, string[]> = {
  UN160: ['DVR', 'NATEB', 'MOPAR'],
};

export const FIXES = new Set([
  'LON',
  'DET',
  'DVR',
  'CPT',
  'MID',
  'NATEB',
  'MOPAR',
  'PONAN',
  'RESMI',
  'KONAN',
  'FF27R',
  'RW27R',
  'FF26L',
  'RW26L',
]);

export const AIRPORTS = new Set([ORIGIN, DESTINATION]);
