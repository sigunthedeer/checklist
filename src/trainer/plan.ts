/**
 * Flight plan editing shared by the FMS units that build a route the Boeing
 * and Collins way: VIA/TO rows, SIDs and STARs from lists, gaps closed by
 * copying a waypoint onto the boxes. Pure functions over a list of legs.
 */

export interface Leg {
  ident: string;
  kind: 'airport' | 'fix' | 'disco';
  /** Airway or procedure the leg belongs to. */
  via?: string;
}

export interface Procedure {
  id: string;
  fixes: string[];
}

export interface RouteRow {
  /** Airway, or undefined for a direct leg. */
  via?: string;
  to: string;
}

export const gap = (): Leg => ({ ident: '', kind: 'disco' });

const isDest = (leg: Leg, dest?: string) => leg.kind === 'airport' && leg.ident === dest;

/** Origin (and destination, once known) with a gap between them. */
export function endpoints(origin: string, dest?: string): Leg[] {
  return [{ ident: origin, kind: 'airport' }, ...(dest ? [gap(), { ident: dest, kind: 'airport' as const }] : [])];
}

/** Swap in a new destination, keeping everything before the old one. */
export function withDestination(plan: Leg[], oldDest: string | undefined, dest: string): Leg[] {
  const head = plan.filter((leg) => !isDest(leg, oldDest));
  while (head.length && head[head.length - 1].kind === 'disco') head.pop();
  return [...head, gap(), { ident: dest, kind: 'airport' }];
}

/** The plan with its enroute legs rebuilt from VIA/TO rows. */
export function withRoute(plan: Leg[], rows: RouteRow[], airways: Record<string, string[]>, dest?: string): Leg[] {
  const vias = new Set(rows.map((row) => row.via ?? 'DIRECT'));
  const enroute: Leg[] = [];
  let from: string | undefined;
  for (const row of rows.filter((r) => r.to)) {
    if (row.via) {
      const fixes = airways[row.via];
      const a = from ? fixes.indexOf(from) : -1;
      const b = fixes.indexOf(row.to);
      enroute.push(...fixes.slice(a + 1, b + 1).map((ident) => ({ ident, kind: 'fix' as const, via: row.via })));
    } else {
      enroute.push({ ident: row.to, kind: 'fix', via: 'DIRECT' });
    }
    from = row.to;
  }
  const kept = plan.filter((leg) => !(leg.via && vias.has(leg.via)));
  const destIndex = kept.findIndex((leg) => isDest(leg, dest));
  const head = destIndex >= 0 ? kept.slice(0, destIndex) : kept;
  while (head.length && head[head.length - 1].kind === 'disco') head.pop();
  return [...head, ...enroute, ...(dest ? [gap(), { ident: dest, kind: 'airport' as const }] : [])];
}

/** The plan with a SID after the origin, replacing any earlier one. */
export function withSid(plan: Leg[], oldSid: string | undefined, sid: Procedure): Leg[] {
  // Only legs of a previous SID go; with no SID yet, `via !== undefined` would drop the airports too.
  const withoutOld = oldSid ? plan.filter((leg) => leg.via !== oldSid) : plan;
  const [origin, ...rest] = withoutOld;
  const legs: Leg[] = sid.fixes.map((ident) => ({ ident, kind: 'fix', via: sid.id }));
  // A SID that does not end where the route starts leaves a gap to close by hand.
  const needsGap = rest[0] && rest[0].kind !== 'disco' && rest[0].ident !== sid.fixes[sid.fixes.length - 1];
  return [origin, ...legs, ...(needsGap ? [gap()] : []), ...rest];
}

/** The plan with a STAR and approach on the end of the route, replacing earlier ones. */
export function withArrival(
  plan: Leg[],
  dest: string,
  arrivalIds: Set<string>,
  star: Procedure | undefined,
  approach: Procedure | undefined,
): Leg[] {
  const head = plan.filter((leg) => !(leg.via && arrivalIds.has(leg.via)));
  while (head.length && (head[head.length - 1].kind === 'disco' || head[head.length - 1].ident === dest)) head.pop();
  const arrival: Leg[] = [
    ...(star?.fixes ?? []).map((ident) => ({ ident, kind: 'fix' as const, via: star!.id })),
    ...(approach?.fixes ?? []).map((ident) => ({ ident, kind: 'fix' as const, via: approach!.id })),
  ];
  // A STAR starting at the last route waypoint joins it; anything else leaves a gap.
  const joins = arrival.length > 0 && head[head.length - 1]?.ident === arrival[0].ident;
  return [
    ...head,
    ...(arrival.length && !joins ? [gap()] : []),
    ...(joins ? arrival.slice(1) : arrival),
    { ident: dest, kind: 'airport' },
  ];
}

/** Copying a waypoint onto a gap: it moves up and the gap closes. */
export function closeGap(plan: Leg[], at: number, ident: string): Leg[] {
  const target = plan.findIndex((leg, i) => i > at && leg.ident === ident);
  if (target > at) return [...plan.slice(0, at), ...plan.slice(target)];
  const next = [...plan];
  next[at] = { ident, kind: 'fix' };
  return next;
}

/**
 * Direct to a waypoint. One already ahead becomes the active leg (in the air)
 * or the first leg (on the ground); anything else goes first with a gap after.
 */
export function directTo(plan: Leg[], active: number | undefined, ident: string): { plan: Leg[]; active?: number } {
  const first = active ?? 1;
  const ahead = plan.findIndex((leg, i) => i >= first && leg.ident === ident);
  if (ahead >= 0) {
    return active !== undefined ? { plan, active: ahead } : { plan: [...plan.slice(0, first), ...plan.slice(ahead)] };
  }
  return { plan: [...plan.slice(0, first), { ident, kind: 'fix' }, gap(), ...plan.slice(first)], active };
}
