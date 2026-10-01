import type { TrainerUnit } from '../script';
import {
  A310_NUMBERS,
  A321LR_NUMBERS,
  A330_NUMBERS,
  BELUGA_NUMBERS,
  type AirbusNumbers,
} from '../../data/fms/airbus-variants';
import { A320_PROFILE, createAirbusSim, type AirbusProfile } from './mcdu';
import { AIRBUS_KEYBOARD } from './keyboard';
import { beside, k, type ProcedureScript } from '../script';

const PREFLIGHT = ['init', 'departure', 'route', 'discontinuity', 'fuel', 'perf-takeoff'];

/** The numbers in the base A320 guide. */
const A320_NUMBERS: AirbusNumbers = {
  zfw: '60.0/27.0',
  block: '8.5',
  v1: '142',
  vr: '144',
  v2: '147',
  flapsThs: '1/UP0.5',
  flex: '55',
};

const tonnes = (n: number) => n.toFixed(1);

/** The training flight, EGLL to LFPG, for one Airbus type. Keyed by guide procedure id. */
function scriptsFor(profile: AirbusProfile, numbers: AirbusNumbers): Record<string, ProcedureScript> {
  const tow = Number(numbers.zfw.split('/')[0]) + Number(numbers.block) - profile.taxi;
  const lw = tow - profile.trip;
  return {
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
      steps: { 3: { ack: `TOW and LW on the right should read ${tonnes(tow)} and ${tonnes(lw)} tonnes.` } },
    },
    'perf-takeoff': {
      requires: ['init', 'departure', 'route', 'discontinuity', 'fuel'],
      phase: 'preflight',
      ...(numbers.flapsThs
        ? {}
        : { steps: { 5: { ack: 'Flaps and trim are set with the lever and trim wheels in this aircraft, not on this page.' } } }),
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
        5: { ack: `Stay with ${profile.landing.full} for this landing.` },
        6: { ack: `VAPP reads ${profile.vapp} knots.` },
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
}

const PLACES =
  'The airports and runways are real; the procedures, airway and several waypoints are made up for training.';

const CHAINS = [
  {
    id: 'preflight',
    name: 'Full cockpit preparation',
    summary: 'Six procedures back to back, from a blank MCDU to takeoff speeds.',
    procedures: PREFLIGHT,
  },
];

function airbusType(unitId: string, profile: AirbusProfile, numbers: AirbusNumbers, scenario: string): TrainerUnit {
  return {
    unitId,
    sim: createAirbusSim(profile),
    keyboard: AIRBUS_KEYBOARD,
    scripts: scriptsFor(profile, numbers),
    scenario: `${scenario} ${PLACES}`,
    chains: CHAINS,
  };
}

export const airbusTrainer = airbusType(
  'airbus-mcdu',
  A320_PROFILE,
  A320_NUMBERS,
  'The flight is London Heathrow to Paris Charles de Gaulle in an A320.',
);

export const a321lrTrainer = airbusType(
  'airbus-mcdu-a321lr',
  { ...A320_PROFILE, trip: 3.0, final: 1.2, vapp: '144' },
  A321LR_NUMBERS,
  'The flight is London Heathrow to Paris Charles de Gaulle in an A321LR, with a full cabin.',
);

export const a330Trainer = airbusType(
  'airbus-mcdu-a330',
  { ...A320_PROFILE, taxi: 0.4, trip: 5.5, rsv: 0.3, final: 2.4, vapp: '139' },
  A330_NUMBERS,
  'The flight is London Heathrow to Paris Charles de Gaulle in an A330-300.',
);

export const belugaTrainer = airbusType(
  'airbus-mcdu-belugaxl',
  { ...A320_PROFILE, taxi: 0.4, trip: 6.0, rsv: 0.3, final: 2.5, vapp: '142' },
  BELUGA_NUMBERS,
  'The flight is London Heathrow to Paris Charles de Gaulle in the BelugaXL, carrying a wing set.',
);

export const a310Trainer = airbusType(
  'airbus-mcdu-a310',
  { ...A320_PROFILE, taxi: 0.3, trip: 3.2, rsv: 0.2, final: 1.6, vapp: '136', landing: { full: '30/40', alt: '15/20' } },
  A310_NUMBERS,
  'The flight is London Heathrow to Paris Charles de Gaulle in an A310-300.',
);
