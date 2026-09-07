import type { Aircraft, AircraftCategory, SimVersion } from './types';
import { cessna152, cessna172Classic, cessna172G1000 } from './aircraft/cessna-pistons';
import {
  cessna208b,
  cessna408SkyCourier,
  citationCJ4,
  citationLongitude,
} from './aircraft/cessna-turbine';
import { a320neo, b7478i, b78710 } from './aircraft/airliners';
import { baronG58, bonanzaG36, cirrusSR22, da40ng, da62 } from './aircraft/pistons';
import { airTractor802, kingAir350i, tbm930 } from './aircraft/turboprops';
import { ctls, iconA5, savageCub, vl3, xcub } from './aircraft/light';
import { cap10c, extra330lt, pittsS2S } from './aircraft/aerobatic';
import { bell407, cabriG2, h125, r22 } from './aircraft/helicopters';
import { discus2c, dg1001e } from './aircraft/gliders';
import { boeing247d } from './aircraft/vintage';

/**
 * The fleet. Adding an aircraft is a matter of writing its data file and
 * appending it here: every screen is driven off this array.
 */
export const AIRCRAFT: Aircraft[] = [
  // Airliners
  a320neo,
  b7478i,
  b78710,
  // Business jets
  citationCJ4,
  citationLongitude,
  // Turboprops
  tbm930,
  cessna208b,
  kingAir350i,
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
  // Light sport and ultralight
  xcub,
  savageCub,
  iconA5,
  ctls,
  vl3,
  // Aerobatic
  pittsS2S,
  extra330lt,
  cap10c,
  // Helicopters
  h125,
  bell407,
  cabriG2,
  r22,
  // Gliders
  dg1001e,
  discus2c,
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
  const term = query.search?.trim().toLowerCase() ?? '';
  const terms = term.length > 0 ? term.split(/\s+/) : [];

  return AIRCRAFT.filter((a) => {
    if (query.sim && query.sim !== 'all' && !a.sims.includes(query.sim)) return false;
    if (query.category && query.category !== 'all' && a.category !== query.category) return false;
    if (query.favoritesOnly && !(query.favorites ?? []).includes(a.id)) return false;
    if (terms.length === 0) return true;
    const haystack = SEARCH_INDEX.get(a.id) ?? '';
    return terms.every((t) => haystack.includes(t));
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

export * from './types';
