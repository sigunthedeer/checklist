import { matchesAll, searchTerms } from '../utils/search';
import type { Aircraft, AircraftCategory, Avionics, FmsProcedure, SimVersion } from './types';
import { AVIONICS } from './fms';
import {
  cessna152,
  cessna152Aerobat,
  cessna172Classic,
  cessna172G1000,
} from './aircraft/cessna-pistons';
import {
  cessna208b,
  cessna408SkyCourier,
  citationCJ4,
  citationLongitude,
} from './aircraft/cessna-turbine';
import {
  a310,
  a320neo,
  a321lr,
  a330,
  b737max8,
  b744Supertanker,
  b7478i,
  b78710,
} from './aircraft/airliners';
import {
  baronG58,
  bonanzaG36,
  cirrusSR22,
  da40ng,
  da40tdi,
  da62,
  dv20,
} from './aircraft/pistons';
import { airTractor802, kingAir350i, kingAirC90, tbm930 } from './aircraft/turboprops';
import {
  ctls,
  iconA5,
  nxcub,
  savageCub,
  shockUltra,
  virusSW121,
  vl3,
  xcub,
} from './aircraft/light';
import { cap10c, extra330lt, pittsS2S } from './aircraft/aerobatic';
import { bell407, cabriG2, h125, h225, r22, r44 } from './aircraft/helicopters';
import { discus2c, dg1001e, ls8 } from './aircraft/gliders';
import { boeing247d } from './aircraft/vintage';
import { a10c, a400m, c17, fa18e } from './aircraft/military';

/**
 * The fleet. Adding an aircraft is a matter of writing its data file and
 * appending it here: every screen is driven off this array.
 */
export const AIRCRAFT: Aircraft[] = [
  // Airliners
  a320neo,
  a321lr,
  a330,
  a310,
  b737max8,
  b7478i,
  b78710,
  b744Supertanker,
  // Business jets
  citationCJ4,
  citationLongitude,
  // Turboprops
  tbm930,
  cessna208b,
  kingAir350i,
  kingAirC90,
  cessna408SkyCourier,
  airTractor802,
  // Piston twins
  baronG58,
  da62,
  // Piston singles
  cessna152,
  cessna172G1000,
  cessna172Classic,
  cirrusSR22,
  bonanzaG36,
  da40ng,
  da40tdi,
  dv20,
  // Light sport and ultralight
  xcub,
  nxcub,
  savageCub,
  shockUltra,
  iconA5,
  ctls,
  vl3,
  virusSW121,
  // Aerobatic
  pittsS2S,
  extra330lt,
  cap10c,
  cessna152Aerobat,
  // Helicopters
  h125,
  h225,
  bell407,
  cabriG2,
  r22,
  r44,
  // Gliders
  dg1001e,
  discus2c,
  ls8,
  // Military
  fa18e,
  a10c,
  c17,
  a400m,
  // Vintage
  boeing247d,
];

const BY_ID = new Map(AIRCRAFT.map((a) => [a.id, a]));

export function getAircraft(id: string | undefined): Aircraft | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function getPhase(aircraft: Aircraft, phaseId: string | undefined) {
  if (!phaseId) return undefined;
  return (
    aircraft.phases.find((p) => p.id === phaseId) ??
    aircraft.emergency?.find((p) => p.id === phaseId)
  );
}

/** Total number of checklist items across an aircraft's normal procedures. */
export function normalItemCount(aircraft: Aircraft): number {
  return aircraft.phases.reduce((sum, p) => sum + p.items.length, 0);
}

/** Lower-cased haystack per aircraft, built once so search stays cheap while typing. */
const SEARCH_INDEX = new Map<string, string>(
  AIRCRAFT.map((a) => [
    a.id,
    [a.name, a.manufacturer, a.model, a.icao ?? '', a.category, ...(a.tags ?? [])]
      .join(' ')
      .toLowerCase(),
  ]),
);

export interface FleetQuery {
  search?: string;
  sim?: SimVersion | 'all';
  category?: AircraftCategory | 'all';
  favoritesOnly?: boolean;
  favorites?: string[];
}

export function filterFleet(query: FleetQuery): Aircraft[] {
  const terms = searchTerms(query.search ?? '');

  return AIRCRAFT.filter((a) => {
    if (query.sim && query.sim !== 'all' && !a.sims.includes(query.sim)) return false;
    if (query.category && query.category !== 'all' && a.category !== query.category) return false;
    if (query.favoritesOnly && !(query.favorites ?? []).includes(a.id)) return false;
    return matchesAll(SEARCH_INDEX.get(a.id) ?? '', terms);
  });
}

/** Aircraft grouped by category, in the canonical category order. */
export function groupByCategory(list: Aircraft[]): { category: AircraftCategory; items: Aircraft[] }[] {
  const buckets = new Map<AircraftCategory, Aircraft[]>();
  for (const a of list) {
    const bucket = buckets.get(a.category);
    if (bucket) bucket.push(a);
    else buckets.set(a.category, [a]);
  }
  return [...buckets.entries()].map(([category, items]) => ({ category, items }));
}

/* ---------------------------------------------------------------- FMS guides */

export { AVIONICS };

const AVIONICS_BY_ID = new Map(AVIONICS.map((u) => [u.id, u]));

export function getAvionics(id: string | undefined): Avionics | undefined {
  return id ? AVIONICS_BY_ID.get(id) : undefined;
}

export function getProcedure(unit: Avionics, procedureId: string | undefined): FmsProcedure | undefined {
  return procedureId ? unit.procedures.find((p) => p.id === procedureId) : undefined;
}

/** The aircraft whose FMS guide is this unit, in fleet order. */
export function aircraftUsing(unitId: string): Aircraft[] {
  return AIRCRAFT.filter((a) => a.avionics === unitId);
}

const LSK = /^LSK [1-6][LR]$/;

/** Whether a step's key token names a real key on this unit. */
export function isKnownKey(unit: Avionics, key: string): boolean {
  if (LSK.test(key)) return !!unit.lsk;
  return unit.keys.includes(key);
}

export * from './types';
