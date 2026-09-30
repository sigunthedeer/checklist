import type { ProcedureScript, TrainerUnit } from '../script';
import { beside, besideLabel, k } from '../script';
import { cj4Sim } from './fms';
import { CJ4_KEYBOARD } from './keyboard';

const PREFLIGHT = ['init', 'departure', 'discontinuity', 'takeoff'];

/** The CJ4 training flight, KTEB to KBOS. Keyed by guide procedure id. */
const SCRIPTS: Record<string, ProcedureScript> = {
  init: {
    requires: [],
    phase: 'preflight',
    steps: {
      0: { keys: [k('IDX'), beside('POS INIT')] },
      1: { keys: [beside('LOAD')] },
      6: { keys: [besideLabel('VIA')] },
      7: { keys: [besideLabel('TO')] },
    },
  },
  departure: {
    requires: ['init'],
    phase: 'preflight',
    steps: {
      1: { keys: [beside('24')] },
      2: { keys: [beside('DUNNE2')] },
    },
  },
  discontinuity: {
    requires: ['init', 'departure'],
    phase: 'preflight',
    steps: {
      1: { keys: [beside('GON')] },
      2: { keys: [besideLabel('DISCONTINUITY')] },
    },
  },
  takeoff: {
    requires: ['init', 'departure', 'discontinuity'],
    phase: 'preflight',
    steps: {
      0: { keys: [k('PERF'), beside('PERF INIT')] },
      1: { keys: [besideLabel('PASS')] },
      2: { keys: [besideLabel('CARGO')] },
      3: { keys: [k('PERF'), beside('TAKEOFF')] },
      4: { keys: [besideLabel('WIND')] },
      5: { keys: [besideLabel('OAT')] },
      6: { keys: [besideLabel('QNH')] },
      8: { keys: [besideLabel('T/O FLAPS')] },
      9: { ack: 'A/I reads OFF, which is right for a dry, mild day.' },
      11: { keys: [beside('SEND')] },
    },
  },
  arrival: {
    requires: PREFLIGHT,
    phase: 'cruise',
    activeLeg: 'GON',
    steps: {
      0: { keys: [k('DEP ARR'), k('LSK 2R')] },
      1: { keys: [beside('ILS04R')] },
      2: { keys: [beside('KRANN2')] },
    },
  },
  'approach-ref': {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'descent',
    activeLeg: 'BOSOX',
    steps: {
      0: { keys: [k('PERF'), beside('APPROACH')] },
      1: { keys: [besideLabel('WIND')] },
      2: { keys: [besideLabel('OAT')] },
      3: { keys: [besideLabel('QNH')] },
      5: { keys: [beside('SEND')] },
    },
  },
  direct: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'GON',
    steps: { 3: { ack: 'The autopilot panel is not simulated here. In the sim, press NAV on the glareshield.' } },
  },
};

export const cj4Trainer: TrainerUnit = {
  unitId: 'cj4-fms',
  sim: cj4Sim,
  keyboard: CJ4_KEYBOARD,
  scripts: SCRIPTS,
  scenario:
    'The flight is Teterboro to Boston Logan. The airports, runways and VORs are real; the procedures, airway routing and several waypoints are made up for training.',
  chains: [
    {
      id: 'preflight',
      name: 'Full preflight',
      summary: 'Four procedures back to back, from a cold FMS to takeoff speeds on the PFD.',
      procedures: PREFLIGHT,
    },
  ],
};
