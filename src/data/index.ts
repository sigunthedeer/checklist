import type { Aircraft, AircraftCategory, SimVersion } from './types';
import { cessna152, cessna172Classic, cessna172G1000 } from './aircraft/cessna-pistons';
import {
  cessna208b,
  cessna408SkyCourier,
  citationCJ4,
  citationLongitude,
} from './aircraft/cessna-turbine';
import { a320neo, b7478i, b78710 } from './aircraft/airliners';

/**
 * The fleet. Adding an aircraft is a matter of writing its data file and
 * appending it here: every screen is driven off this array.
 */
export const AIRCRAFT: Aircraft[] = [
  a320neo,
  b7478i,
  b78710,
  citationCJ4,
  citationLongitude,
  cessna208b,
  cessna408SkyCourier,
  cessna152,
  cessna172G1000,
  cessna172Classic,
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
