/**
 * Navigation data for the Boeing training flight, Seattle-Tacoma to San
 * Francisco. The airports, runways and VORs are real; the procedures, the
 * airway routing and several fixes are made up for training and will not
 * match the sim's database.
 */

export interface Procedure {
  id: string;
  fixes: string[];
}

export const ORIGIN = 'KSEA';
export const DESTINATION = 'KSFO';

export const RUNWAYS: Record<string, string[]> = {
  KSEA: ['16L', '16C', '16R', '34L', '34C', '34R'],
  KSFO: ['28L', '28R', '19L', '19R', '10L', '10R', '01L', '01R'],
};

export const SIDS: Record<string, Procedure[]> = {
  KSEA: [
    { id: 'SUMMA2', fixes: ['SUMMA'] },
    { id: 'HAROB6', fixes: ['HAROB'] },
    { id: 'ELMAA3', fixes: ['ELMAA'] },
  ],
};

export const STARS: Record<string, Procedure[]> = {
  KSFO: [
    { id: 'BRIXX2', fixes: ['OED', 'BRIXX', 'PIRAT'] },
    { id: 'GOLDN5', fixes: ['RBL', 'GOLDN', 'PIRAT'] },
  ],
};

export const APPROACHES: Record<string, (Procedure & { runway: string })[]> = {
  KSFO: [
    { id: 'ILS28R', runway: '28R', fixes: ['FF28R', 'RW28R'] },
    { id: 'ILS28L', runway: '28L', fixes: ['FF28L', 'RW28L'] },
    { id: 'RNV19L', runway: '19L', fixes: ['FF19L', 'RW19L'] },
  ],
};

/** Airways as an ordered list of fixes. */
export const AIRWAYS: Record<string, string[]> = {
  J589: ['BTG', 'OED', 'RBL'],
};

export const FIXES = new Set([
  'SUMMA',
  'HAROB',
  'ELMAA',
  'BTG',
  'OED',
  'RBL',
  'BRIXX',
  'GOLDN',
  'PIRAT',
  'FF28R',
  'RW28R',
  'FF28L',
  'RW28L',
  'FF19L',
  'RW19L',
]);

export const AIRPORTS = new Set([ORIGIN, DESTINATION]);

/** Where the aircraft is parked, as the GPS reports it. */
export const GPS_POSITION = 'N47°26.9W122°18.5';
