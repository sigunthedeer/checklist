import type { ProcedureScript, TrainerUnit } from '../script';
import { beside, besideLabel } from '../script';
import { boeingSim } from './cdu';
import { BOEING_KEYBOARD } from './keyboard';

const PREFLIGHT = ['init', 'route', 'departure', 'discontinuity', 'perf-init', 'takeoff'];

/** The Boeing training flight, KSEA to KSFO. Keyed by guide procedure id. */
const SCRIPTS: Record<string, ProcedureScript> = {
  init: {
    requires: [],
    phase: 'preflight',
    steps: {
      2: { keys: [besideLabel('REF AIRPORT')] },
      3: { keys: [besideLabel('GPS POS'), besideLabel('SET IRS POS')] },
    },
  },
  route: {
    requires: ['init'],
    phase: 'preflight',
    continues: true,
    steps: { 2: { keys: [besideLabel('RUNWAY')] } },
  },
  departure: {
    requires: ['init', 'route'],
    phase: 'preflight',
    steps: {
      2: { keys: [beside('16L')] },
      3: { keys: [beside('SUMMA2')] },
    },
  },
  discontinuity: {
    requires: ['init', 'route', 'departure'],
    phase: 'preflight',
    steps: {
      1: { keys: [beside('BTG')] },
      2: { keys: [besideLabel('ROUTE DISCONTINUITY')] },
    },
  },
  'perf-init': {
    requires: ['init', 'route', 'departure', 'discontinuity'],
    phase: 'preflight',
    steps: {
      0: { keys: [{ key: 'RTE' }, beside('PERF INIT')] },
      1: { keys: [besideLabel('ZFW')] },
      2: { keys: [besideLabel('RESERVES')] },
      3: { keys: [besideLabel('COST INDEX')] },
      4: { keys: [besideLabel('CRZ ALT')] },
    },
  },
  takeoff: {
    requires: ['init', 'route', 'departure', 'discontinuity', 'perf-init'],
    phase: 'preflight',
    continues: true,
    steps: {
      0: { keys: [besideLabel('SEL')] },
      1: { keys: [beside('TO 1')] },
      4: { ack: 'No boxes here: the CG comes from the payload, so the trim is already worked out at 5.5 units.' },
    },
  },
  arrival: {
    requires: PREFLIGHT,
    phase: 'cruise',
    activeLeg: 'BTG',
    steps: {
      1: { keys: [beside('ILS28R')] },
      2: { keys: [beside('BRIXX2')] },
    },
  },
  'approach-ref': {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'descent',
    activeLeg: 'BRIXX',
    steps: {
      1: { keys: [beside('30')] },
      2: { keys: [besideLabel('FLAP/SPD')] },
    },
  },
  direct: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'BTG',
    steps: { 3: { ack: 'The mode control panel is not simulated here. In the sim, press LNAV on the glareshield.' } },
  },
  hold: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'BTG',
    steps: {
      1: { keys: [besideLabel('HOLD AT')] },
      2: { ack: 'The hold matches the chart: inbound 152°, right turns, one minute legs.' },
    },
  },
};

export const boeingTrainer: TrainerUnit = {
  unitId: 'boeing-cdu',
  sim: boeingSim,
  keyboard: BOEING_KEYBOARD,
  scripts: SCRIPTS,
  scenario:
    'The flight is Seattle-Tacoma to San Francisco, with the CDU set up as a 787-10. The airports, runways and VORs are real; the procedures, airway routing and several waypoints are made up for training.',
  chains: [
    {
      id: 'preflight',
      name: 'Full preflight',
      summary: 'Six procedures back to back, from a cold FMC to takeoff speeds.',
      procedures: PREFLIGHT,
    },
  ],
};
