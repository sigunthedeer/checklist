import type { TrainerUnit } from '../script';
import { airbusSim } from './mcdu';
import { AIRBUS_KEYBOARD } from './keyboard';
import { beside, k, type ProcedureScript } from '../script';

const PREFLIGHT = ['init', 'departure', 'route', 'discontinuity', 'fuel', 'perf-takeoff'];

/** The A320 training flight, EGLL to LFPG. Keyed by guide procedure id. */
const SCRIPTS: Record<string, ProcedureScript> = {
  init: { requires: [], phase: 'preflight' },
  departure: {
    requires: ['init'],
    phase: 'preflight',
    steps: {
      3: { keys: [beside('27R')] },
      4: { keys: [beside('DVR5J')] },
    },
  },
  route: {
    requires: ['init', 'departure'],
    phase: 'preflight',
    steps: {
      0: { keys: [k('F-PLN'), beside('DVR')] },
      1: { keys: [beside('AIRWAYS')] },
      5: { ack: 'This route has no direct legs, so there is nothing to add here.' },
      6: { ack: 'The discontinuity after NATEB is next. The following procedure clears it.' },
    },
  },
  discontinuity: {
    requires: ['init', 'departure', 'route'],
    phase: 'preflight',
    steps: {
      1: { keys: [k('CLR'), beside('DISCONTINUITY')] },
      2: { ack: 'This version removes the discontinuity straight away, so there is no TMPY INSERT to press.' },
    },
  },
  fuel: {
    requires: ['init', 'departure', 'route', 'discontinuity'],
    phase: 'preflight',
    steps: { 3: { ack: 'TOW and LW on the right should read 68.3 and 65.9 tonnes.' } },
  },
  'perf-takeoff': {
    requires: ['init', 'departure', 'route', 'discontinuity', 'fuel'],
    phase: 'preflight',
  },
  arrival: {
    requires: PREFLIGHT,
    phase: 'cruise',
    activeLeg: 'NATEB',
    steps: {
      2: { keys: [beside('ILS27R')] },
      3: { keys: [beside('NATEB5W')] },
      5: { ack: 'The STAR starts at NATEB, which is already in the route, so there is no gap.' },
    },
  },
  'perf-approach': {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'descent',
    activeLeg: 'PONAN',
    steps: {
      5: { ack: 'Stay with FULL for this landing.' },
      6: { ack: 'VAPP reads 134 knots.' },
    },
  },
  direct: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'NATEB',
    steps: {
      2: { ack: 'No confirmation in this version: the direct-to is already in the flight plan.' },
      3: { ack: 'The FCU is not simulated here. In the sim, push the HDG knob.' },
    },
  },
  hold: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'NATEB',
    steps: {
      0: { keys: [k('F-PLN'), beside('NATEB')] },
      1: { keys: [beside('HOLD')] },
      2: { ack: 'The computed hold matches the chart: inbound 271°, right turns, one minute legs.' },
    },
  },
};

export const airbusTrainer: TrainerUnit = {
  unitId: 'airbus-mcdu',
  sim: airbusSim,
  keyboard: AIRBUS_KEYBOARD,
  scripts: SCRIPTS,
  scenario:
    'The flight is London Heathrow to Paris Charles de Gaulle. The airports and runways are real; the procedures, airway and several waypoints are made up for training.',
  chains: [
    {
      id: 'preflight',
      name: 'Full cockpit preparation',
      summary: 'Six procedures back to back, from a blank MCDU to takeoff speeds.',
      procedures: PREFLIGHT,
    },
  ],
};
