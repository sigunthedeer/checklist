/**
 * Navigation data for the CJ4 training flight, Teterboro to Boston Logan.
 * The airports, runways and VORs are real; the procedures, airway routing
 * and several fixes are made up for training and will not match the sim's
 * database.
 */
import type { Procedure } from '../plan';

export const ORIGIN = 'KTEB';
export const DESTINATION = 'KBOS';

export const RUNWAYS: Record<string, string[]> = {
  KTEB: ['01', '06', '19', '24'],
  KBOS: ['04R', '04L', '22L', '22R', '33L', '27'],
};

export const SIDS: Record<string, Procedure[]> = {
  KTEB: [
    { id: 'DUNNE2', fixes: ['DUNNE'] },
    { id: 'LANNA4', fixes: ['LANNA'] },
    { id: 'COATE3', fixes: ['COATE'] },
  ],
};

export const STARS: Record<string, Procedure[]> = {
  KBOS: [
    { id: 'KRANN2', fixes: ['GON', 'KRANN', 'BOSOX'] },
    { id: 'PVDNC1', fixes: ['PVD', 'BOSOX'] },
  ],
};

export const APPROACHES: Record<string, (Procedure & { runway: string })[]> = {
  KBOS: [
    { id: 'ILS04R', runway: '04R', fixes: ['FF04R', 'RW04R'] },
    { id: 'ILS22L', runway: '22L', fixes: ['FF22L', 'RW22L'] },
    { id: 'RNV33L', runway: '33L', fixes: ['FF33L', 'RW33L'] },
  ],
};

export const AIRWAYS: Record<string, string[]> = {
  V16: ['GON', 'PVD'],
};

export const FIXES = new Set([
  'DUNNE',
  'LANNA',
  'COATE',
  'GON',
  'PVD',
  'KRANN',
  'BOSOX',
  'FF04R',
  'RW04R',
  'FF22L',
  'RW22L',
  'FF33L',
  'RW33L',
]);

export const AIRPORTS = new Set([ORIGIN, DESTINATION]);

/** Where the aircraft is parked, as the GNSS reports it. */
export const GNSS_POSITION = 'N40°51.0W074°03.6';
