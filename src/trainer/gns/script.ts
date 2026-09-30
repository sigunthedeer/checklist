import type { ProcedureScript, TrainerUnit } from '../script';
import { k, pick } from '../script';
import { gnsSim } from './gns';
import { GNS_CONTROLS } from './keyboard';

const DEPARTURE = ['flight-plan', 'departure'];

/** The GNS training flight, KPAE to KSEA in the classic Cessna 172. Keyed by guide procedure id. */
const SCRIPTS: Record<string, ProcedureScript> = {
  'flight-plan': { requires: [], phase: 'preflight' },
  departure: {
    requires: ['flight-plan'],
    phase: 'preflight',
    steps: {
      1: { keys: [pick('Select Departure?')] },
      2: { keys: [pick('SNOHO1'), pick('16R'), pick('ELMAA')] },
      3: { keys: [pick('LOAD?')] },
    },
  },
  approach: {
    requires: DEPARTURE,
    phase: 'descent',
    activeLeg: 'ELMAA',
    steps: {
      1: { keys: [pick('Select Approach?')] },
      2: { keys: [pick('ILS 16R'), pick('VECTORS')] },
      3: { keys: [pick('LOAD?')] },
      4: { keys: [k('PROC'), pick('Activate Vector-To-Final?')] },
    },
  },
  'fly-ils': {
    requires: [...DEPARTURE, 'approach'],
    phase: 'descent',
    activeLeg: 'FF16R',
    steps: {
      0: { ack: 'NAV standby shows 111.70: the GNS put the localiser there when you loaded the ILS.' },
      3: { ack: 'The autopilot is a separate unit, not simulated here. In the sim, press APR on it.' },
    },
  },
  direct: {
    requires: DEPARTURE,
    phase: 'cruise',
    activeLeg: 'ELMAA',
    steps: {
      2: { keys: [pick('ACTIVATE?')] },
      3: { ack: 'The autopilot is a separate unit, not simulated here. In the sim, press NAV on it.' },
    },
  },
};

export const gnsTrainer: TrainerUnit = {
  unitId: 'garmin-gns',
  display: 'gns',
  sim: gnsSim,
  keyboard: GNS_CONTROLS,
  scripts: SCRIPTS,
  scenario:
    'The flight is Paine Field to Seattle-Tacoma in the classic Cessna 172. The airports and runways are real; the procedures, transitions, frequencies and several waypoints are made up for training. The letter keys are a shortcut for spelling: the real GNS has no keyboard, and you turn the right inner knob for each letter.',
  hardwareKeys: { ArrowRight: 'Right outer', ArrowLeft: 'Right outer ↺', ArrowUp: 'Right inner', ArrowDown: 'Right inner ↺' },
  chains: [
    {
      id: 'preflight',
      name: 'Flight plan and departure',
      summary: 'Build the route from nothing, then load the departure with its transition.',
      procedures: DEPARTURE,
    },
    {
      id: 'approach',
      name: 'Approach and ILS',
      summary: 'Load the ILS, go to vectors to final, then set up the radio and CDI for it.',
      procedures: ['approach', 'fly-ils'],
    },
  ],
};
