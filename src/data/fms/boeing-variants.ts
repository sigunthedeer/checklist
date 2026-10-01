import type { Avionics } from '../types';
import { boeingCdu } from './boeing-cdu';
import { deriveAvionics } from './variant';

/**
 * The same FMC and CDU in other Boeing types. Pages and keys match the 787
 * guide; each type gets its own example weights, flaps and page names for the
 * training flight, Seattle to San Francisco.
 */
export const b737Cdu: Avionics = deriveAvionics(boeingCdu, {
  id: 'boeing-cdu-737',
  name: 'Boeing 737 MAX FMC and CDU',
  notes: [
    'The MSFS 2024 737 MAX 8 has the same CDU keys and pages as the bigger Boeings, with one name change: the thrust page is N1 LIMIT, not THRUST LIM.',
    'Derates are written TO-1 and TO-2 on the 737. Flaps 5 is the usual takeoff setting; 30 or 40 for landing.',
    'Where a step gives no key number, press the key beside the label it names.',
  ],
  steps: {
    'perf-init/1': {
      entry: '58.0',
      note: 'Example for a 737 MAX 8 with a full cabin, in thousands. Take the real figure from the sim’s fuel and payload screen. GR WT then works itself out from the fuel on board.',
    },
    'perf-init/2': { entry: '2.5', note: 'Example, in thousands.' },
    'perf-init/3': { entry: '30' },
    'perf-init/4': { entry: 'FL370' },
    'perf-init/6': { do: 'Press N1 LIMIT at the bottom right.' },
    'takeoff/0': {
      do: 'On N1 LIMIT, enter an assumed temperature in SEL for a reduced-thrust takeoff, or leave it for full thrust.',
      entry: '45',
    },
    'takeoff/1': { do: 'Choose the takeoff rating: TO, or a derate such as TO-1 or TO-2.' },
    'takeoff/3': { entry: '5', note: 'Example. Flaps 5 is the usual 737 takeoff setting.' },
  },
});

export const b747Cdu: Avionics = deriveAvionics(boeingCdu, {
  id: 'boeing-cdu-747',
  name: 'Boeing 747-8 FMC and CDU',
  notes: [
    'The MSFS 747-8 (Intercontinental and the -8F freighter) uses the same CDU keys and pages as the 787, so this is that guide with 747-8 numbers.',
    'Takeoff flaps are 10 or 20; landing flaps 25 or 30. Weights are in thousands and run past 300.',
    'Where a step gives no key number, press the key beside the label it names.',
  ],
  steps: {
    'perf-init/1': {
      entry: '280.0',
      note: 'Example for a 747-8I, in thousands. Take the real figure from the sim’s fuel and payload screen. GR WT then works itself out from the fuel on board.',
    },
    'perf-init/2': { entry: '8.0', note: 'Example, in thousands.' },
    'perf-init/4': { entry: 'FL360' },
    'takeoff/0': { entry: '40' },
    'takeoff/3': { entry: '20', note: 'Example. The 747-8 takes off with flaps 10 or 20.' },
  },
});
