/**
 * A simplified Garmin GNS 530, built on the shared Garmin core. Waypoints
 * entered on the flight plan show their information page and need a second
 * ENT; loading an ILS puts the localiser in NAV standby for you to swap.
 */
import { createGarmin, INITIAL_STATE as CORE_INITIAL, type GarminState } from '../garmin/core';
import type { GnsScreen, TrainerSim } from '../screen';
import { GNS_NAV } from './navdata';

export type GnsState = GarminState;
export const INITIAL_STATE: GnsState = { ...CORE_INITIAL, nav1Active: '116.80', nav1Standby: '108.00' };
const COM = { active: '118.62', standby: '121.90' };

export const PROC_MENU = [
  'Activate Vector-To-Final?',
  'Activate Approach?',
  'Select Approach?',
  'Select Arrival?',
  'Select Departure?',
];

const gns = createGarmin({
  inner: 'Right inner',
  outer: 'Right outer',
  nav: GNS_NAV,
  menu: {
    items: PROC_MENU,
    departure: 'Select Departure?',
    arrival: 'Select Arrival?',
    approach: 'Select Approach?',
    activateApproach: 'Activate Approach?',
    vectorsToFinal: 'Activate Vector-To-Final?',
  },
  fplMenu: ['Activate Leg?', 'Crossfill?', 'Invert Flight Plan?', 'Delete Flight Plan?'],
  activateLeg: 'Activate Leg?',
  confirmWaypoint: true,
  ilsFrequencyTo: 'standby',
  unitKey(s, key) {
    switch (key) {
      case 'CDI':
        return { ...s, cdi: s.cdi === 'GPS' ? 'VLOC' : 'GPS' };
      case 'NAV ⇆':
        return { ...s, nav1Active: s.nav1Standby, nav1Standby: s.nav1Active };
      case 'COM ⇆':
      case 'OBS':
      case 'MSG':
      case 'VNAV':
        return s;
      default:
        return undefined;
    }
  },
});

export const { legs, pressKey, pick } = gns;

export function render(s: GnsState): GnsScreen {
  return {
    radios: { comActive: COM.active, comStandby: COM.standby, navActive: s.nav1Active, navStandby: s.nav1Standby },
    cdi: s.cdi,
    page: gns.page(s, 7),
  };
}

export const gnsSim: TrainerSim<GnsState, GnsScreen> = { ...gns.simBase, initial: INITIAL_STATE, render };
