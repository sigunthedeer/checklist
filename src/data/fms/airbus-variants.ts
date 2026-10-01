import type { Avionics } from '../types';
import { airbusMcdu } from './airbus-mcdu';
import { deriveAvionics, type StepPatch } from './variant';

/**
 * The same MCDU in other Airbus types. The pages and keys are the A320's;
 * what changes is the example weights and speeds, which are worked out for
 * each type on the guide's training flight, Heathrow to Paris CDG.
 */
export interface AirbusNumbers {
  zfw: string;
  block: string;
  v1: string;
  vr: string;
  v2: string;
  /** Left out where the type's TAKE OFF page has no FLAPS/THS field. */
  flapsThs?: string;
  flex: string;
  crzFl?: string;
}

function numberPatches(n: AirbusNumbers, aircraft: string): Record<string, StepPatch> {
  return {
    ...(n.crzFl ? { 'init/4': { entry: n.crzFl } } : {}),
    'fuel/1': {
      entry: n.zfw,
      note: `Example for a ${aircraft}: weight in tonnes, CG in percent. Take both from the sim’s fuel and payload screen, or the aircraft’s EFB.`,
    },
    'fuel/2': { entry: n.block, note: 'Example, in tonnes.' },
    'perf-takeoff/1': {
      entry: n.v1,
      note: `Example speeds for a ${aircraft} at this weight, here and in the next two steps. Use the aircraft’s EFB or a performance calculator for real ones.`,
    },
    'perf-takeoff/2': { entry: n.vr },
    'perf-takeoff/3': { entry: n.v2 },
    ...(n.flapsThs ? { 'perf-takeoff/5': { entry: n.flapsThs } } : {}),
    'perf-takeoff/6': { entry: n.flex },
  };
}

export const A321LR_NUMBERS: AirbusNumbers = {
  zfw: '69.0/28.0',
  block: '10.0',
  v1: '146',
  vr: '148',
  v2: '152',
  flapsThs: '1/UP0.3',
  flex: '50',
};

export const A330_NUMBERS: AirbusNumbers = {
  zfw: '165.0/28.0',
  block: '15.0',
  v1: '141',
  vr: '145',
  v2: '151',
  flapsThs: '2/UP0.5',
  flex: '52',
};

export const BELUGA_NUMBERS: AirbusNumbers = {
  zfw: '168.0/30.0',
  block: '18.0',
  v1: '143',
  vr: '148',
  v2: '154',
  flapsThs: '2/UP0.8',
  flex: '45',
  crzFl: 'FL310',
};

export const A310_NUMBERS: AirbusNumbers = {
  zfw: '105.0/27.0',
  block: '12.0',
  v1: '136',
  vr: '140',
  v2: '146',
  flex: '48',
};

export const a321lrMcdu: Avionics = deriveAvionics(airbusMcdu, {
  id: 'airbus-mcdu-a321lr',
  name: 'Airbus A321LR MCDU',
  notes: [
    'The iniBuilds A321LR uses the A320 MCDU pages, so this is the A320 guide with A321LR numbers: heavier, so higher speeds.',
    'Line select key numbers match the real MCDU. If a label is not where a step says, press the key beside the label.',
    'The A321 tail is close to the runway at rotation. The speeds here are correct for the weight; rotate at VR, not before.',
  ],
  steps: numberPatches(A321LR_NUMBERS, 'A321LR'),
});

export const a330Mcdu: Avionics = deriveAvionics(airbusMcdu, {
  id: 'airbus-mcdu-a330',
  name: 'Airbus A330 MCDU',
  notes: [
    'The iniBuilds A330 (-200, -300 and the -300P2F freighter) uses the same MCDU pages as the A320, so this is the A320 guide with A330 numbers.',
    'Weights are much bigger: a ZFW of 165 tonnes is normal. The format is the same, tonnes with one decimal.',
    'Line select key numbers match the real MCDU. If a label is not where a step says, press the key beside the label.',
  ],
  steps: numberPatches(A330_NUMBERS, 'A330-300'),
});

export const belugaMcdu: Avionics = deriveAvionics(airbusMcdu, {
  id: 'airbus-mcdu-belugaxl',
  name: 'Airbus BelugaXL MCDU',
  notes: [
    'The BelugaXL is built on the A330-200 and uses the same MCDU pages, so this is the A320 guide with BelugaXL numbers.',
    'The real aircraft shuttles aircraft parts between Airbus sites; the training flight here is Heathrow to Paris to match the other Airbus guides.',
    'The huge cargo bay adds drag, so it cruises lower and slower than an A330. FL310 is used here as the example level.',
  ],
  steps: {
    ...numberPatches(BELUGA_NUMBERS, 'BelugaXL'),
    'init/4': { entry: 'FL310', note: 'Example. The temperature at that level fills in by itself.' },
  },
});

export const a310Fms: Avionics = deriveAvionics(airbusMcdu, {
  id: 'airbus-mcdu-a310',
  name: 'Airbus A310 FMS',
  short: 'FMS',
  summary:
    'The two keyboards with screens on the pedestal. In the iniBuilds A310 they follow the Airbus MCDU layout: INIT, F-PLN and PERF, with the same line select keys.',
  notes: [
    'This is the A320 guide adapted for the A310: same page names (INIT, INIT B, F-PLN, PERF) and the same order. Some lines may sit in a different place on the A310; if a label is not where a step says, press the key beside the label, and flag the step so it can be fixed.',
    'INIT B can only be opened with both engines off. Do the weights at the gate.',
    'Takeoff thrust is set on the thrust rating panel beside the engine gauges, not by lever detents: press FLX TO there and dial the same temperature you enter here.',
  ],
  steps: {
    ...numberPatches(A310_NUMBERS, 'A310-300'),
    'fuel/0': { note: 'Only available with both engines off.' },
    'perf-takeoff/5': {
      do: 'Set the slats and flaps for takeoff with the lever (15/15 here) and the pitch trim for the CG from the load sheet.',
      keys: null,
      entry: null,
      note: 'If your version shows a flap and trim field on this page, enter them there as well.',
    },
    'perf-takeoff/6': {
      entry: A310_NUMBERS.flex,
      note: 'Example. Set the same temperature on the thrust rating panel: press FLX TO and turn the knob.',
    },
    'perf-approach/5': { do: 'Select 15/20 if you will land with less flap. 30/40 is the default.' },
  },
});
