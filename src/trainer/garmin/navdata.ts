/**
 * Navigation data for the G1000 training flight, Seattle-Tacoma to Paine
 * Field. The airports and runways are real; the procedures, transitions and
 * several fixes are made up for training and will not match the sim's
 * database. Lists are ordered so the item the script wants is rarely first,
 * so there is always some knob to turn.
 */

export interface Procedure {
  id: string;
  fixes: string[];
  transitions?: string[];
}

export const ORIGIN = 'KSEA';
export const DESTINATION = 'KPAE';

export const RUNWAYS: Record<string, string[]> = {
  KSEA: ['34R', '34C', '34L', '16R', '16C', '16L'],
  KPAE: ['34L', '16R', '34R', '16L'],
};

export const SIDS: Record<string, Procedure[]> = {
  KSEA: [
    { id: 'HAROB6', fixes: ['HAROB'] },
    { id: 'SUMMA2', fixes: ['SUMMA'] },
    { id: 'ELMAA3', fixes: ['ELMAA'] },
  ],
};

export const STARS: Record<string, Procedure[]> = {
  KPAE: [
    { id: 'HENDO2', fixes: ['HENDO', 'PAE'] },
    { id: 'GLASR1', fixes: ['GLASR', 'PAE'] },
  ],
};

export const APPROACHES: Record<string, (Procedure & { runway: string; frequency?: string })[]> = {
  KPAE: [
    { id: 'RNAV 34L', runway: '34L', transitions: ['VECTORS'], fixes: ['FF34L', 'RW34L'] },
    { id: 'ILS 16R', runway: '16R', transitions: ['PAE', 'VECTORS'], fixes: ['FF16R', 'RW16R'], frequency: '109.30' },
    { id: 'RNAV 16R', runway: '16R', transitions: ['VECTORS', 'GLASR'], fixes: ['FF16R', 'RW16R'] },
  ],
};

export const FIXES = new Set(['HAROB', 'SUMMA', 'ELMAA', 'HENDO', 'GLASR', 'PAE', 'FF16R', 'RW16R', 'FF34L', 'RW34L']);

export const AIRPORTS = new Set(['KSEA', 'KPAE', 'KBFI']);
