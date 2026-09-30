/**
 * Navigation data for the GNS training flight, Paine Field to Seattle-Tacoma
 * in the classic Cessna 172. The airports and runways are real; the
 * procedures, transitions, frequencies and several fixes are made up for
 * training and will not match the sim's database. Lists are ordered so the
 * item the script wants is rarely first.
 */
import type { NavData } from '../garmin/core';

export const GNS_NAV: NavData = {
  RUNWAYS: {
    KPAE: ['34L', '16R', '34R', '16L'],
    KSEA: ['34R', '34C', '34L', '16R', '16C', '16L'],
  },
  SIDS: {
    KPAE: [
      { id: 'PAINE2', fixes: ['PAE'] },
      { id: 'EVRTT4', fixes: ['EVRTT'] },
      { id: 'SNOHO1', fixes: ['SNOHO'], transitions: ['HAROB', 'ELMAA'] },
    ],
  },
  STARS: {},
  APPROACHES: {
    KSEA: [
      { id: 'RNAV 34R', runway: '34R', transitions: ['VECTORS'], fixes: ['FF34R', 'RW34R'] },
      { id: 'ILS 16L', runway: '16L', transitions: ['VECTORS'], fixes: ['FF16L', 'RW16L'], frequency: '110.30' },
      { id: 'ILS 16R', runway: '16R', transitions: ['SUMMA', 'VECTORS'], fixes: ['FF16R', 'RW16R'], frequency: '111.70' },
    ],
  },
  FIXES: new Set(['PAE', 'EVRTT', 'SNOHO', 'HAROB', 'ELMAA', 'SUMMA', 'FF34R', 'RW34R', 'FF16L', 'RW16L', 'FF16R', 'RW16R']),
  AIRPORTS: new Set(['KPAE', 'KSEA', 'KBFI']),
};
