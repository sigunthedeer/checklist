import type { ProcedureScript, TrainerUnit } from '../script';
import { cursorTo, k, pick } from '../script';
import { g1000Sim } from './g1000';
import { G1000_CONTROLS } from './keyboard';

const DEPARTURE = ['flight-plan', 'departure'];
const ARRIVAL = [...DEPARTURE, 'arrival'];

/** The G1000 training flight, KSEA to KPAE in a Cessna 172. Keyed by guide procedure id. */
const SCRIPTS: Record<string, ProcedureScript> = {
  'flight-plan': { requires: [], phase: 'preflight' },
  departure: {
    requires: ['flight-plan'],
    phase: 'preflight',
    steps: {
      1: { keys: [pick('SELECT DEPARTURE')] },
      2: { keys: [pick('ELMAA3'), pick('16L')] },
      3: { keys: [pick('LOAD?')] },
    },
  },
  arrival: {
    requires: DEPARTURE,
    phase: 'cruise',
    activeLeg: 'ELMAA',
    steps: {
      1: { keys: [pick('SELECT ARRIVAL')] },
      2: { keys: [pick('GLASR1'), pick('16R')] },
      3: { keys: [pick('LOAD?')] },
    },
  },
  approach: {
    requires: ARRIVAL,
    phase: 'descent',
    activeLeg: 'GLASR',
    steps: {
      1: { keys: [pick('SELECT APPROACH')] },
      2: { keys: [pick('ILS 16R'), pick('VECTORS')] },
      3: { keys: [pick('LOAD?')] },
      4: { keys: [k('PROC'), pick('ACTIVATE VECTOR-TO-FINAL')] },
      5: { ack: 'NAV1 shows 109.30 in the active box: the NXi tuned the localiser as the approach loaded.' },
    },
  },
  'fly-approach': {
    requires: [...ARRIVAL, 'approach'],
    phase: 'descent',
    activeLeg: 'FF16R',
    steps: {
      2: { ack: 'This is an ILS, so the CDI belongs on LOC1, not GPS.' },
      4: { ack: 'The ALT knob is not simulated here. In the sim, set 3000 ft for the missed approach.' },
    },
  },
  direct: {
    requires: DEPARTURE,
    phase: 'cruise',
    activeLeg: 'ELMAA',
    steps: { 2: { keys: [pick('ACTIVATE?')] } },
  },
  'activate-leg': {
    requires: ARRIVAL,
    phase: 'cruise',
    activeLeg: 'ELMAA',
    steps: {
      1: { keys: [cursorTo('GLASR')] },
      2: { keys: [k('MENU'), pick('ACTIVATE LEG')] },
    },
  },
};

export const g1000Trainer: TrainerUnit = {
  unitId: 'garmin-g1000',
  display: 'garmin',
  // Arrow keys turn the FMS knob on a desktop: left and right the outer ring, up and down the inner.
  hardwareKeys: { ArrowRight: 'FMS outer', ArrowLeft: 'FMS outer ↺', ArrowUp: 'FMS inner', ArrowDown: 'FMS inner ↺' },
  sim: g1000Sim,
  keyboard: G1000_CONTROLS,
  scripts: SCRIPTS,
  scenario:
    'The flight is Seattle-Tacoma to Paine Field in a Cessna 172. The airports and runways are real; the procedures, transitions and several waypoints are made up for training. The letter keys are a shortcut for spelling: the real G1000 has no keyboard, and you turn the inner knob for each letter.',
  chains: [
    {
      id: 'preflight',
      name: 'Flight plan and departure',
      summary: 'Build the route from nothing, then load the departure.',
      procedures: DEPARTURE,
    },
    {
      id: 'approach',
      name: 'Arrival to final approach',
      summary: 'Arrival, approach and the autopilot, from cruise to established on the localiser.',
      procedures: ['arrival', 'approach', 'fly-approach'],
    },
  ],
};
