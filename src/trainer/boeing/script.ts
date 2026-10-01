import type { ProcedureScript, TrainerUnit } from '../script';
import { beside, besideLabel } from '../script';
import { B787_PROFILE, createBoeingSim, type BoeingProfile } from './cdu';
import { BOEING_KEYBOARD } from './keyboard';

const PREFLIGHT = ['init', 'route', 'departure', 'discontinuity', 'perf-init', 'takeoff'];

/** The Boeing training flight, KSEA to KSFO, for one type. Keyed by guide procedure id. */
const scriptsFor = (profile: BoeingProfile): Record<string, ProcedureScript> => ({
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
      4: { ack: `No boxes here: the CG comes from the payload, so the trim is already worked out at ${profile.trim} units.` },
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
});

const CHAINS = [
  {
    id: 'preflight',
    name: 'Full preflight',
    summary: 'Six procedures back to back, from a cold FMC to takeoff speeds.',
    procedures: PREFLIGHT,
  },
];

function boeingType(unitId: string, profile: BoeingProfile, aircraft: string): TrainerUnit {
  return {
    unitId,
    sim: createBoeingSim(profile),
    keyboard: BOEING_KEYBOARD,
    scripts: scriptsFor(profile),
    scenario: `The flight is Seattle-Tacoma to San Francisco, with the CDU set up as a ${aircraft}. The airports, runways and VORs are real; the procedures, airway routing and several waypoints are made up for training.`,
    chains: CHAINS,
  };
}

export const boeingTrainer = boeingType('boeing-cdu', B787_PROFILE, '787-10');

export const b737Trainer = boeingType(
  'boeing-cdu-737',
  {
    model: '737-8',
    engines: 'LEAP-1B28',
    fuel: 8.4,
    thrustPage: 'N1 LIMIT',
    ratings: ['TO', 'TO-1', 'TO-2'],
    climbs: ['CLB', 'CLB-1', 'CLB-2'],
    takeoffFlaps: ['1', '5', '10', '15', '25'],
    speeds: { v1: '143', vr: '145', v2: '150' },
    vref: [
      ['15', '154'],
      ['30', '145'],
      ['40', '139'],
    ],
    trim: '5.0',
    cg: '24.0',
  },
  '737 MAX 8',
);

export const b747Trainer = boeingType(
  'boeing-cdu-747',
  {
    model: '747-8',
    engines: 'GENX-2B67',
    fuel: 30.0,
    thrustPage: 'THRUST LIM',
    ratings: ['TO', 'TO 1', 'TO 2'],
    climbs: ['CLB', 'CLB 1', 'CLB 2'],
    takeoffFlaps: ['10', '20'],
    speeds: { v1: '147', vr: '153', v2: '161' },
    vref: [
      ['25', '152'],
      ['30', '148'],
    ],
    trim: '6.0',
    cg: '22.0',
  },
  '747-8',
);
