import type { Avionics } from '../types';
import { airbusMcdu } from './airbus-mcdu';
import { boeingCdu } from './boeing-cdu';
import { cj4Fms } from './cj4-fms';
import { garminG1000 } from './garmin-g1000';
import { garminGns } from './garmin-gns';
import { garminTouch } from './garmin-touch';

/** Every FMS guide, airliners first. Aircraft point at these by id. */
export const AVIONICS: Avionics[] = [airbusMcdu, boeingCdu, cj4Fms, garminTouch, garminG1000, garminGns];
