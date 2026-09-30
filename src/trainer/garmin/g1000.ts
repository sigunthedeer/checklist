/**
 * A simplified Garmin G1000 NXi, built on the shared Garmin core: a strip of
 * the PFD over the MFD, with the GFC 700 autopilot keys and the CDI softkey.
 */
import type { GarminScreen, TrainerSim } from '../screen';
import { createGarmin, INITIAL_STATE as CORE_INITIAL, type GarminState } from './core';
import { AIRPORTS, APPROACHES, FIXES, RUNWAYS, SIDS, STARS } from './navdata';

export type { Leg } from './core';
export type G1000State = GarminState;
export const INITIAL_STATE = CORE_INITIAL;

export const PROC_MENU = [
  'SELECT APPROACH',
  'ACTIVATE APPROACH',
  'ACTIVATE VECTOR-TO-FINAL',
  'ACTIVATE MISSED APPROACH',
  'SELECT ARRIVAL',
  'SELECT DEPARTURE',
];
export const FPL_MENU = ['LOAD AIRWAY', 'ACTIVATE LEG', 'STORE FLIGHT PLAN', 'DELETE FLIGHT PLAN'];

const g1000 = createGarmin({
  inner: 'FMS inner',
  outer: 'FMS outer',
  nav: { RUNWAYS, SIDS, STARS, APPROACHES, FIXES, AIRPORTS },
  menu: {
    items: PROC_MENU,
    departure: 'SELECT DEPARTURE',
    arrival: 'SELECT ARRIVAL',
    approach: 'SELECT APPROACH',
    activateApproach: 'ACTIVATE APPROACH',
    vectorsToFinal: 'ACTIVATE VECTOR-TO-FINAL',
  },
  fplMenu: FPL_MENU,
  activateLeg: 'ACTIVATE LEG',
  confirmWaypoint: false,
  ilsFrequencyTo: 'active',
  unitKey(s, key) {
    switch (key) {
      case 'CDI':
        return { ...s, cdi: s.cdi === 'GPS' && g1000.isIls(s) ? 'LOC1' : 'GPS' };
      case 'HDG':
        return { ...s, lateral: 'HDG' };
      case 'NAV':
        return { ...s, lateral: s.cdi === 'GPS' ? 'GPS' : 'LOC' };
      case 'ALT':
        return { ...s, vertical: 'ALT' };
      case 'APR':
        return { ...s, armed: s.cdi === 'LOC1' ? 'LOC GS' : s.appr ? 'GPS GP' : 'GPS' };
      default:
        return undefined;
    }
  },
});

export const { legs, pressKey, pick } = g1000;

export function render(s: G1000State): GarminScreen {
  return {
    pfd: {
      nav1Active: s.nav1Active,
      nav1Standby: s.nav1Standby,
      cdi: s.cdi,
      lateral: s.lateral,
      vertical: s.vertical,
      armed: s.armed,
    },
    softkeys: ['INSET', 'PFD', 'OBS', 'CDI', 'DME', 'XPDR'],
    mfd: g1000.page(s, 9),
  };
}

export const g1000Sim: TrainerSim<G1000State, GarminScreen> = { ...g1000.simBase, render };
