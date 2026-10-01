import type { Avionics } from '../types';
import { airbusMcdu } from './airbus-mcdu';
import { a310Fms, a321lrMcdu, a330Mcdu, belugaMcdu } from './airbus-variants';
import { boeingCdu } from './boeing-cdu';
import { b737Cdu, b747Cdu } from './boeing-variants';
import { cj4Fms } from './cj4-fms';
import { garminG1000 } from './garmin-g1000';
import { garminGns } from './garmin-gns';
import { garminTouch } from './garmin-touch';
import { hornetUfc } from './hornet-ufc';

/** Every FMS guide, airliners first. Aircraft point at these by id. */
export const AVIONICS: Avionics[] = [
  airbusMcdu,
  a321lrMcdu,
  a330Mcdu,
  belugaMcdu,
  a310Fms,
  boeingCdu,
  b737Cdu,
  b747Cdu,
  cj4Fms,
  garminTouch,
  garminG1000,
  garminGns,
  hornetUfc,
];
