/**
 * A simplified Boeing FMC and CDU. Pure functions over an immutable state:
 * `pressKey` returns the next state and `render` draws the screen for it.
 *
 * Route and performance changes are provisional until EXEC, as on the real
 * unit: they set `pending`, which lights the EXEC key. Only the pages the
 * scripted procedures use are simulated; anything else renders a "not
 * simulated" page rather than pretending.
 */
import type { FlightPhase, McduCell, McduColor, McduLine, McduScreen, TrainerSim } from '../screen';
import {
  AIRPORTS,
  AIRWAYS,
  APPROACHES,
  FIXES,
  GPS_POSITION,
  RUNWAYS,
  SIDS,
  STARS,
} from './navdata';

type Page =
  | 'MENU'
  | 'IDENT'
  | 'POS INIT'
  | 'RTE'
  | 'DEP ARR'
  | 'DEPARTURES'
  | 'ARRIVALS'
  | 'LEGS'
  | 'HOLD'
  | 'PERF INIT'
  | 'THRUST LIM'
  | 'TAKEOFF'
  | 'APPROACH'
  | 'OTHER';

type Rating = 'TO' | 'TO 1' | 'TO 2';

export interface Leg {
  ident: string;
  kind: 'airport' | 'fix' | 'disco';
  /** Airway or procedure the leg belongs to. */
  via?: string;
}

export interface CduState {
  page: Page;
  otherTitle?: string;
  rtePage: 1 | 2;
  legsPage: number;
  /** LEGS is showing the HOLD AT box, after the HOLD key. */
  holdAt: boolean;
  scratchpad: string;
  /** An error from the last key, shown in place of the scratchpad until CLR or typing. */
  message?: string;
  phase: FlightPhase;
  refAirport?: string;
  irsSet: boolean;
  origin?: string;
  dest?: string;
  runway?: string;
  rows: { via?: string; to: string }[];
  sid?: string;
  star?: string;
  appr?: string;
  plan: Leg[];
  /** Index in `plan` of the leg being flown to, once airborne. */
  active?: number;
  /** A change is waiting for EXEC. */
  pending: boolean;
  /** ACTIVATE was pressed and EXEC will make the route live. */
  activating: boolean;
  activated: boolean;
  zfw?: string;
  reserves?: string;
  costIndex?: string;
  crzAlt?: string;
  sel?: string;
  rating: Rating;
  flaps?: string;
  accepted: { v1: boolean; vr: boolean; v2: boolean };
  flapSpd?: string;
  hold?: string;
}

export const INITIAL_STATE: CduState = {
  page: 'MENU',
  rtePage: 1,
  legsPage: 0,
  holdAt: false,
  scratchpad: '',
  phase: 'preflight',
  irsSet: false,
  rows: [],
  plan: [],
  pending: false,
  activating: false,
  activated: false,
  rating: 'TO',
  accepted: { v1: false, vr: false, v2: false },
};

const FUEL = 24.6;
const SPEEDS = { v1: '146', vr: '151', v2: '159' };
const VREF: [string, string][] = [
  ['20', '146'],
  ['25', '142'],
  ['30', '138'],
];
const LEGS_ROWS = 5;
const MAX_SCRATCHPAD = 24;

export function isTypingKey(key: string): boolean {
  return /^[A-Z0-9]$/.test(key) || key === '.' || key === '/' || key === 'SP' || key === '+/-';
}

/* ================================================================== keys */

export function pressKey(state: CduState, key: string): CduState {
  if (isTypingKey(key)) return type(state, key);
  if (key === 'CLR') return clear(state);
  if (key === 'DEL') return { ...state, message: undefined, scratchpad: 'DELETE' };
  const lsk = /^LSK ([1-6])([LR])$/.exec(key);
  if (lsk) return pressLsk({ ...state, message: undefined }, Number(lsk[1]), lsk[2] as 'L' | 'R');

  const s: CduState = { ...state, message: undefined, holdAt: false };
  switch (key) {
    case 'INIT REF':
      return { ...s, page: s.phase === 'preflight' ? 'IDENT' : 'APPROACH' };
    case 'RTE':
      return { ...s, page: 'RTE', rtePage: 1 };
    case 'DEP ARR':
      return { ...s, page: 'DEP ARR' };
    case 'LEGS':
      return { ...s, page: 'LEGS', legsPage: 0 };
    case 'HOLD':
      return { ...s, page: 'LEGS', legsPage: 0, holdAt: true };
    case 'EXEC':
      if (!s.pending) return s;
      return { ...s, pending: false, activated: s.activated || s.activating, activating: false };
    case 'NEXT PAGE':
    case 'PREV PAGE': {
      const step = key === 'NEXT PAGE' ? 1 : -1;
      if (s.page === 'RTE') return { ...s, rtePage: step > 0 ? 2 : 1 };
      if (s.page === 'LEGS') return { ...state, message: undefined, legsPage: clamp(s.legsPage + step, 0, legsPages(s) - 1) };
      return s;
    }
    case 'MENU':
      return { ...s, page: 'MENU' };
    default:
      return { ...s, page: 'OTHER', otherTitle: key };
  }
}

function type(state: CduState, key: string): CduState {
  const base = state.message || state.scratchpad === 'DELETE' ? '' : state.scratchpad;
  if (key === '+/-') {
    const last = base.slice(-1);
    const next = last === '-' ? `${base.slice(0, -1)}+` : last === '+' ? `${base.slice(0, -1)}-` : `${base}-`;
    return { ...state, message: undefined, scratchpad: next.slice(0, MAX_SCRATCHPAD) };
  }
  const char = key === 'SP' ? ' ' : key;
  return { ...state, message: undefined, scratchpad: (base + char).slice(0, MAX_SCRATCHPAD) };
}

/** Boeing CLR takes off one character; with the scratchpad empty it does nothing. */
function clear(state: CduState): CduState {
  if (state.message) return { ...state, message: undefined };
  if (state.scratchpad === 'DELETE') return { ...state, scratchpad: '' };
  return { ...state, scratchpad: state.scratchpad.slice(0, -1) };
}

const done = (s: CduState, patch: Partial<CduState>): CduState => ({ ...s, ...patch, scratchpad: '' });
const fail = (s: CduState, message = 'INVALID ENTRY'): CduState => ({ ...s, message });
const modify = (s: CduState, patch: Partial<CduState>): CduState => done(s, { ...patch, pending: true });

function pressLsk(s: CduState, line: number, side: 'L' | 'R'): CduState {
  const sp = s.scratchpad.trim();
  const key = `${line}${side}`;
  switch (s.page) {
    case 'IDENT':
      return key === '6R' && !sp ? { ...s, page: 'POS INIT' } : sp ? fail(s) : s;
    case 'POS INIT':
      return posInit(s, key, sp);
    case 'RTE':
      return s.rtePage === 1 ? rte1(s, key, sp) : rte2(s, line, side, sp);
    case 'DEP ARR':
      if (sp) return fail(s);
      if (key === '1L' && s.origin) return { ...s, page: 'DEPARTURES' };
      if (key === '2R' && s.dest) return { ...s, page: 'ARRIVALS' };
      return s;
    case 'DEPARTURES':
      return departures(s, line, side, sp);
    case 'ARRIVALS':
      return arrivals(s, line, side, sp);
    case 'LEGS':
      return legs(s, line, side, sp);
    case 'PERF INIT':
      return perfInit(s, key, sp);
    case 'THRUST LIM':
      return thrustLim(s, key, sp);
    case 'TAKEOFF':
      return takeoff(s, key, sp);
    case 'APPROACH':
      return approach(s, key, sp);
    default:
      return sp ? fail(s) : s;
  }
}

function posInit(s: CduState, key: string, sp: string): CduState {
  if (key === '2L' && sp) return AIRPORTS.has(sp) ? done(s, { refAirport: sp }) : fail(s, 'NOT IN DATA BASE');
  if (key === '4R' && !sp) return { ...s, scratchpad: GPS_POSITION };
  if (key === '5R' && sp) return sp === GPS_POSITION ? done(s, { irsSet: true }) : fail(s);
  if (key === '6R' && !sp) return { ...s, page: 'RTE', rtePage: 1 };
  return sp ? fail(s) : s;
}

function rte1(s: CduState, key: string, sp: string): CduState {
  if (key === '1L' && sp) {
    if (!AIRPORTS.has(sp)) return fail(s, 'NOT IN DATA BASE');
    return modify(s, { origin: sp, plan: [{ ident: sp, kind: 'airport' }, ...destTail(s.dest)] });
  }
  if (key === '1R' && sp) {
    if (!AIRPORTS.has(sp)) return fail(s, 'NOT IN DATA BASE');
    const head = s.plan.filter((leg) => !(leg.kind === 'airport' && leg.ident === s.dest)).filter((leg, i, all) => !(leg.kind === 'disco' && i === all.length - 1));
    return modify(s, { dest: sp, plan: [...head, ...destTail(sp)] });
  }
  if (key === '2L' && sp) {
    const match = /^RW(\d{2}[LRC]?)$/.exec(sp);
    if (!match || !s.origin || !RUNWAYS[s.origin]?.includes(match[1])) return fail(s);
    return modify(s, { runway: match[1] });
  }
  if (key === '6R' && !sp) return activateOrPerf(s);
  return sp ? fail(s) : s;
}

function activateOrPerf(s: CduState): CduState {
  if (s.activated) return { ...s, page: 'PERF INIT' };
  if (!s.origin || !s.dest) return s;
  return { ...s, activating: true, pending: true };
}

const destTail = (dest?: string): Leg[] => (dest ? [{ ident: '', kind: 'disco' }, { ident: dest, kind: 'airport' }] : []);

function rte2(s: CduState, line: number, side: 'L' | 'R', sp: string): CduState {
  if (line === 6) return side === 'R' && !sp ? activateOrPerf(s) : sp ? fail(s) : s;
  if (!sp) return s;
  const index = line - 1;
  const rows = [...s.rows];
  // One row is open for entry: the one after the last complete row.
  const open = rows.length > 0 && !rows[rows.length - 1].to ? rows.length - 1 : rows.length;
  if (index !== open) return fail(s);
  const from = index === 0 ? undefined : rows[index - 1].to;

  if (side === 'L') {
    const airway = AIRWAYS[sp];
    if (!airway || (from && !airway.includes(from))) return fail(s, 'NOT IN DATA BASE');
    rows[index] = { via: sp, to: '' };
    return modify(s, { rows });
  }
  const via = rows[index]?.via;
  if (via ? !AIRWAYS[via].includes(sp) : !FIXES.has(sp)) return fail(s, 'NOT IN DATA BASE');
  rows[index] = { via, to: sp };
  return modify(s, { rows, plan: routePlan({ ...s, rows }) });
}

/** The plan with the enroute legs rebuilt from the RTE 2 rows. */
function routePlan(s: CduState): Leg[] {
  const routeVias = new Set(s.rows.map((row) => row.via ?? 'DIRECT'));
  const enroute: Leg[] = [];
  let from: string | undefined;
  for (const row of s.rows.filter((r) => r.to)) {
    if (row.via) {
      const fixes = AIRWAYS[row.via];
      const a = from ? fixes.indexOf(from) : -1;
      const b = fixes.indexOf(row.to);
      enroute.push(...fixes.slice(a + 1, b + 1).map((ident) => ({ ident, kind: 'fix' as const, via: row.via })));
    } else {
      enroute.push({ ident: row.to, kind: 'fix', via: 'DIRECT' });
    }
    from = row.to;
  }
  const kept = s.plan.filter((leg) => !(leg.via && routeVias.has(leg.via)));
  const destIndex = kept.findIndex((leg) => leg.kind === 'airport' && leg.ident === s.dest);
  const head = destIndex >= 0 ? kept.slice(0, destIndex) : kept;
  while (head.length && head[head.length - 1].kind === 'disco') head.pop();
  return [...head, ...enroute, ...destTail(s.dest)];
}

/* ---------------------------------------------------------- departures */

export function departureLists(s: CduState) {
  return { sids: (SIDS[s.origin ?? ''] ?? []).map((p) => p.id), runways: (RUNWAYS[s.origin ?? ''] ?? []).slice(0, 5) };
}

function departures(s: CduState, line: number, side: 'L' | 'R', sp: string): CduState {
  if (sp) return fail(s);
  const { sids, runways } = departureLists(s);
  if (side === 'R') {
    const runway = runways[line - 1];
    return runway ? modify(s, { runway }) : s;
  }
  const sidId = sids[line - 1];
  if (!sidId) return s;
  const sid = SIDS[s.origin!].find((p) => p.id === sidId)!;
  // Only legs of a previous SID go; with no SID yet, `via !== undefined` would drop the airports too.
  const withoutOld = s.sid ? s.plan.filter((leg) => leg.via !== s.sid) : s.plan;
  const [origin, ...rest] = withoutOld;
  const sidLegs: Leg[] = sid.fixes.map((ident) => ({ ident, kind: 'fix', via: sid.id }));
  // A SID that does not end where the route starts leaves a gap to close by hand.
  const gap: Leg[] = rest[0] && rest[0].kind !== 'disco' && rest[0].ident !== sid.fixes[sid.fixes.length - 1] ? [{ ident: '', kind: 'disco' }] : [];
  return modify(s, { sid: sid.id, plan: [origin, ...sidLegs, ...gap, ...rest] });
}

/* ------------------------------------------------------------ arrivals */

export function arrivalLists(s: CduState) {
  return { stars: (STARS[s.dest ?? ''] ?? []).map((p) => p.id), approaches: (APPROACHES[s.dest ?? ''] ?? []).map((p) => p.id) };
}

function arrivals(s: CduState, line: number, side: 'L' | 'R', sp: string): CduState {
  if (sp) return fail(s);
  const { stars, approaches } = arrivalLists(s);
  const picked = side === 'L' ? stars[line - 1] : approaches[line - 1];
  if (!picked) return s;
  const next = side === 'L' ? { ...s, star: picked } : { ...s, appr: picked };
  return modify(next, { plan: arrivalPlan(next) });
}

/** The plan with the STAR and approach rebuilt onto the end of the route. */
function arrivalPlan(s: CduState): Leg[] {
  const dest = s.dest!;
  const arrivalIds = new Set([...(STARS[dest] ?? []), ...(APPROACHES[dest] ?? [])].map((p) => p.id));
  const head = s.plan.filter((leg) => !(leg.via && arrivalIds.has(leg.via)));
  while (head.length && (head[head.length - 1].kind === 'disco' || head[head.length - 1].ident === dest)) head.pop();
  const star = STARS[dest]?.find((p) => p.id === s.star);
  const appr = APPROACHES[dest]?.find((p) => p.id === s.appr);
  const starLegs: Leg[] = (star?.fixes ?? []).map((ident) => ({ ident, kind: 'fix', via: star!.id }));
  const apprLegs: Leg[] = (appr?.fixes ?? []).map((ident) => ({ ident, kind: 'fix', via: appr!.id }));
  const arrival = [...starLegs, ...apprLegs];
  const joins = arrival.length > 0 && head[head.length - 1]?.ident === arrival[0].ident;
  return [...head, ...(arrival.length && !joins ? [{ ident: '', kind: 'disco' as const }] : []), ...(joins ? arrival.slice(1) : arrival), { ident: dest, kind: 'airport' }];
}

/* ---------------------------------------------------------------- legs */

/** What LEGS lists: after the origin on the ground, from the active leg in the air. */
export function listedLegs(s: CduState): Leg[] {
  if (s.active !== undefined) return s.plan.slice(s.active);
  return s.plan.slice(1);
}

function legsPages(s: CduState): number {
  return Math.max(1, Math.ceil(listedLegs(s).length / LEGS_ROWS));
}

function legs(s: CduState, line: number, side: 'L' | 'R', sp: string): CduState {
  if (line === 6) {
    if (!s.holdAt || side !== 'L' || !sp) return sp ? fail(s) : s;
    if (!FIXES.has(sp)) return fail(s, 'NOT IN DATA BASE');
    return modify(s, { page: 'HOLD', hold: sp, holdAt: false });
  }
  if (side !== 'L') return sp ? fail(s) : s;
  const listed = listedLegs(s);
  const leg = listed[s.legsPage * LEGS_ROWS + line - 1];
  const at = leg ? s.plan.indexOf(leg) : -1;

  if (!sp) return leg && leg.kind !== 'disco' ? { ...s, scratchpad: leg.ident } : s;

  if (sp === 'DELETE') {
    if (!leg || leg.kind === 'airport') return fail(s);
    return modify(s, { plan: s.plan.filter((_, i) => i !== at) });
  }

  if (!FIXES.has(sp) && !AIRPORTS.has(sp)) return fail(s, 'NOT IN DATA BASE');
  const target = s.plan.findIndex((l, i) => i > (at >= 0 ? at : 0) && l.ident === sp);

  if (leg?.kind === 'disco') {
    // Copying the next waypoint onto the boxes closes the gap.
    if (target > at) return modify(s, { plan: [...s.plan.slice(0, at), ...s.plan.slice(target)] });
    const plan = [...s.plan];
    plan[at] = { ident: sp, kind: 'fix' };
    return modify(s, { plan });
  }

  if (line === 1 && s.legsPage === 0) {
    // The top line is where the aircraft goes next: a direct-to.
    const first = s.active ?? 1;
    const ahead = s.plan.findIndex((l, i) => i >= first && l.ident === sp);
    if (ahead >= 0) {
      return s.active !== undefined
        ? modify(s, { active: ahead })
        : modify(s, { plan: [...s.plan.slice(0, first), ...s.plan.slice(ahead)] });
    }
    const plan = [...s.plan.slice(0, first), { ident: sp, kind: 'fix' as const }, { ident: '', kind: 'disco' as const }, ...s.plan.slice(first)];
    return modify(s, { plan });
  }
  return fail(s);
}

/* ---------------------------------------------------------- performance */

function perfInit(s: CduState, key: string, sp: string): CduState {
  if (key === '6R' && !sp) return { ...s, page: 'THRUST LIM' };
  if (!sp) return s;
  switch (key) {
    case '3L':
      return /^\d{2,3}(\.\d)?$/.test(sp) ? modify(s, { zfw: Number(sp).toFixed(1) }) : fail(s);
    case '4L':
      return /^\d{1,2}(\.\d)?$/.test(sp) ? modify(s, { reserves: Number(sp).toFixed(1) }) : fail(s);
    case '5L':
      return /^\d{1,3}$/.test(sp) ? modify(s, { costIndex: String(Number(sp)) }) : fail(s);
    case '1R': {
      const match = /^(?:FL)?(\d{3})$/.exec(sp);
      return match ? modify(s, { crzAlt: `FL${match[1]}` }) : fail(s);
    }
    default:
      return fail(s);
  }
}

function thrustLim(s: CduState, key: string, sp: string): CduState {
  if (key === '1L' && sp) return /^\d{1,2}$/.test(sp) ? done(s, { sel: sp }) : fail(s);
  if (sp) return fail(s);
  const ratings: Record<string, Rating> = { '2L': 'TO', '3L': 'TO 1', '4L': 'TO 2' };
  if (ratings[key]) return { ...s, rating: ratings[key] };
  if (key === '6R') return { ...s, page: 'TAKEOFF' };
  return s;
}

function takeoff(s: CduState, key: string, sp: string): CduState {
  if (key === '1L' && sp) {
    if (!/^(5|10|15|20)$/.test(sp)) return fail(s);
    return done(s, { flaps: sp, accepted: { v1: false, vr: false, v2: false } });
  }
  if (sp) return fail(s);
  const computed = !!s.flaps && !!s.zfw;
  const accept: Record<string, keyof CduState['accepted']> = { '1R': 'v1', '2R': 'vr', '3R': 'v2' };
  if (accept[key] && computed) return { ...s, accepted: { ...s.accepted, [accept[key]]: true } };
  if (key === '6R') return { ...s, page: 'THRUST LIM' };
  return s;
}

function approach(s: CduState, key: string, sp: string): CduState {
  const option = { '1R': 0, '2R': 1, '3R': 2 }[key];
  if (option !== undefined && !sp) {
    const [flaps, speed] = VREF[option];
    return { ...s, scratchpad: `${flaps}/${speed}` };
  }
  if (key === '4R' && sp) {
    const match = /^(\d{2})\/(\d{3})$/.exec(sp);
    return match && VREF.some(([f]) => f === match[1]) ? done(s, { flapSpd: sp }) : fail(s);
  }
  return sp ? fail(s) : s;
}

/* ================================================================ render */

const blank: McduLine = {};
const cell = (text: string, color: McduColor = 'white', small?: boolean): McduCell => ({ text, color, small });
const label = (text: string): McduCell => cell(text, 'white', true);
const boxes = (n: number) => cell('□'.repeat(n));
const entered = (value: string | undefined, placeholder: McduCell): McduCell => (value ? cell(value) : placeholder);
const sixLines = (lines: McduLine[]): McduLine[] => [...lines, ...Array(6).fill(blank)].slice(0, 6);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** A plausible course and distance for a leg, stable for a given ident. */
function legData(ident: string): string {
  let h = 0;
  for (const c of ident) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `${String(140 + (h % 60)).padStart(3, '0')}°  ${20 + (h % 70)}NM`;
}

function routeTitle(s: CduState, suffix = ''): string {
  if (!s.activated) return `RTE 1${suffix}`;
  return `${s.pending ? 'MOD' : 'ACT'} RTE 1${suffix}`;
}

export function grossWeight(s: CduState): string | undefined {
  return s.zfw ? (Number(s.zfw) + FUEL).toFixed(1) : undefined;
}

export function render(s: CduState): McduScreen {
  // An error beats the scratchpad; the IRS reminder only shows when there is nothing else to show.
  const advisory = s.page === 'POS INIT' && !s.irsSet ? 'ENTER IRS POSITION' : '';
  const scratchpad = cell(s.message ?? (s.scratchpad || advisory));
  return { ...page(s), scratchpad };
}

function page(s: CduState): Omit<McduScreen, 'scratchpad'> {
  const index: McduLine = { valueL: cell('<INDEX') };
  switch (s.page) {
    case 'MENU':
      return { title: cell('MENU'), lines: sixLines([{ valueL: cell('<FMC', 'green') }, { valueL: cell('<ACARS') }, { valueL: cell('<SAT') }]) };

    case 'IDENT':
      return {
        title: cell('IDENT'),
        lines: sixLines([
          { labelL: label('MODEL'), valueL: cell('787-10'), labelR: label('ENGINES'), valueR: cell('GENX-1B76') },
          { labelL: label('NAV DATA'), valueL: cell('TRAINING'), labelR: label('ACTIVE'), valueR: cell('TRAINING') },
          { labelL: label('OP PROGRAM'), valueL: cell('TRAINER', 'white', true) },
          blank,
          blank,
          { ...index, valueR: cell('POS INIT>') },
        ]),
      };

    case 'POS INIT':
      return {
        title: cell('POS INIT'),
        titleR: label('1/3'),
        lines: sixLines([
          { labelR: label('LAST POS'), valueR: cell(GPS_POSITION, 'white', true) },
          {
            labelL: label('REF AIRPORT'),
            valueL: entered(s.refAirport, boxes(4)),
            valueR: s.refAirport ? cell(GPS_POSITION, 'white', true) : undefined,
          },
          { labelL: label('GATE'), valueL: cell('-----') },
          { labelR: label('GPS POS'), valueR: cell(GPS_POSITION) },
          { labelR: label('SET IRS POS'), valueR: s.irsSet ? cell(GPS_POSITION) : cell('□□□°□□.□ □□□□°□□.□') },
          { ...index, valueR: cell('ROUTE>') },
        ]),
      };

    case 'RTE': {
      const footer: McduLine = { valueR: cell(s.activated ? 'PERF INIT>' : 'ACTIVATE>') };
      if (s.rtePage === 1) {
        return {
          title: cell(routeTitle(s)),
          titleR: label('1/2'),
          lines: sixLines([
            { labelL: label('ORIGIN'), valueL: entered(s.origin, boxes(4)), labelR: label('DEST'), valueR: entered(s.dest, boxes(4)) },
            { labelL: label('RUNWAY'), valueL: entered(s.runway && `RW${s.runway}`, cell('-----')), labelR: label('FLT NO'), valueR: cell('--------') },
            { labelR: label('CO ROUTE'), valueR: cell('----------') },
            blank,
            blank,
            footer,
          ]),
        };
      }
      const rows: McduLine[] = s.rows.map((row) => ({
        labelL: label('VIA'),
        labelR: label('TO'),
        valueL: cell(row.via ?? 'DIRECT'),
        valueR: row.to ? cell(row.to) : boxes(5),
      }));
      if (rows.length < 5 && (s.rows.length === 0 || s.rows[s.rows.length - 1].to)) {
        rows.push({ labelL: label('VIA'), labelR: label('TO'), valueL: cell('-----'), valueR: cell('-----') });
      }
      return { title: cell(routeTitle(s)), titleR: label('2/2'), lines: sixLines([...rows.slice(0, 5), ...Array(5).fill(blank)].slice(0, 5).concat(footer)) };
    }

    case 'DEP ARR':
      return {
        title: cell('DEP/ARR INDEX'),
        lines: sixLines([
          { labelC: label('RTE 1'), valueL: cell('<DEP'), valueC: cell(s.origin ?? '----'), valueR: cell('ARR>') },
          { valueC: cell(s.dest ?? '----'), valueR: cell('ARR>') },
        ]),
      };

    case 'DEPARTURES': {
      const { sids, runways } = departureLists(s);
      const mark = s.pending ? '<SEL>' : '<ACT>';
      const lines: McduLine[] = Array.from({ length: 5 }, (_, i) => ({
        labelL: i === 0 ? label('SIDS') : undefined,
        labelR: i === 0 ? label('RUNWAYS') : undefined,
        valueL: sids[i] ? cell(sids[i] === s.sid ? `${sids[i]} ${mark}` : sids[i], sids[i] === s.sid ? 'green' : 'white') : undefined,
        valueR: runways[i] ? cell(runways[i] === s.runway ? `${mark} ${runways[i]}` : runways[i], runways[i] === s.runway ? 'green' : 'white') : undefined,
      }));
      return { title: cell(`${s.origin ?? ''} DEPARTURES`), titleR: label('1/1'), lines: [...lines, { valueL: cell('<INDEX'), valueR: cell('ROUTE>') }] };
    }

    case 'ARRIVALS': {
      const { stars, approaches } = arrivalLists(s);
      const mark = s.pending ? '<SEL>' : '<ACT>';
      const lines: McduLine[] = Array.from({ length: 5 }, (_, i) => ({
        labelL: i === 0 ? label('STARS') : undefined,
        labelR: i === 0 ? label('APPROACHES') : undefined,
        valueL: stars[i] ? cell(stars[i] === s.star ? `${stars[i]} ${mark}` : stars[i], stars[i] === s.star ? 'green' : 'white') : undefined,
        valueR: approaches[i] ? cell(approaches[i] === s.appr ? `${mark} ${approaches[i]}` : approaches[i], approaches[i] === s.appr ? 'green' : 'white') : undefined,
      }));
      return { title: cell(`${s.dest ?? ''} ARRIVALS`), titleR: label('1/1'), lines: [...lines, { valueL: cell('<INDEX'), valueR: cell('ROUTE>') }] };
    }

    case 'LEGS': {
      const listed = listedLegs(s);
      const shown = listed.slice(s.legsPage * LEGS_ROWS, (s.legsPage + 1) * LEGS_ROWS);
      const lines: McduLine[] = shown.map((leg) => {
        if (leg.kind === 'disco') return { labelC: label('ROUTE DISCONTINUITY'), valueL: boxes(5) };
        const isActive = s.active !== undefined && s.plan.indexOf(leg) === s.active;
        const name = leg.kind === 'airport' && leg.ident === s.dest && s.appr ? `RW${APPROACHES[s.dest]?.find((p) => p.id === s.appr)?.runway ?? ''}` : leg.ident;
        return {
          labelL: label(leg.ident === s.hold ? 'HOLD AT' : legData(leg.ident)),
          valueL: cell(name, isActive ? 'magenta' : 'white'),
          valueR: cell('---/------', 'white', true),
        };
      });
      while (lines.length < LEGS_ROWS) lines.push(blank);
      lines.push(s.holdAt ? { labelL: label('HOLD AT'), valueL: boxes(5), labelC: label('--------') } : { valueL: cell('<RTE 2 LEGS'), valueR: cell('RTE DATA>') });
      return {
        title: cell(routeTitle(s, ' LEGS')),
        titleR: label(`${s.legsPage + 1}/${legsPages(s)}`),
        lines,
      };
    }

    case 'HOLD':
      return {
        title: cell(routeTitle(s, ' HOLD')),
        titleR: label('1/1'),
        lines: sixLines([
          { labelL: label('FIX'), valueL: cell(s.hold ?? ''), labelR: label('SPD/TGT ALT'), valueR: cell('230/FL150', 'white', true) },
          { labelL: label('QUAD/RADIAL'), valueL: cell('--/---') },
          { labelL: label('INBD CRS/DIR'), valueL: cell('152°/R TURN') },
          { labelL: label('LEG TIME'), valueL: cell('1.0 MIN', 'white', true) },
          { labelL: label('LEG DIST'), valueL: cell('-.-NM') },
          { valueL: cell('<NEXT HOLD'), valueR: cell('EXIT HOLD>') },
        ]),
      };

    case 'PERF INIT':
      return {
        title: cell(s.activated && s.pending ? 'MOD PERF INIT' : 'PERF INIT'),
        titleR: label('1/2'),
        lines: sixLines([
          { labelL: label('GR WT'), valueL: cell(grossWeight(s) ?? '---.-', 'white', true), labelR: label('CRZ ALT'), valueR: entered(s.crzAlt, boxes(5)) },
          { labelL: label('FUEL'), valueL: cell(`${FUEL.toFixed(1)} CALC`, 'white', true) },
          { labelL: label('ZFW'), valueL: entered(s.zfw, boxes(5)) },
          { labelL: label('RESERVES'), valueL: entered(s.reserves, boxes(4)) },
          { labelL: label('COST INDEX'), valueL: entered(s.costIndex, boxes(4)) },
          { ...index, valueR: cell('THRUST LIM>') },
        ]),
      };

    case 'THRUST LIM': {
      const rating = (r: Rating) => cell(r === s.rating ? `<${r}   <SEL>` : `<${r}`, r === s.rating ? 'green' : 'white');
      return {
        title: cell('THRUST LIM'),
        lines: sixLines([
          { labelL: label('SEL'), valueL: s.sel ? cell(`${s.sel}°`) : cell('--°'), labelR: label('OAT'), valueR: cell('+12°C', 'white', true) },
          { valueL: rating('TO'), valueR: cell('CLB>') },
          { valueL: rating('TO 1'), valueR: cell('CLB 1>') },
          { valueL: rating('TO 2'), valueR: cell('CLB 2>') },
          blank,
          { ...index, valueR: cell('TAKEOFF>') },
        ]),
      };
    }

    case 'TAKEOFF': {
      const computed = !!s.flaps && !!s.zfw;
      const speed = (k: keyof typeof SPEEDS) =>
        !computed ? cell('---') : s.accepted[k] ? cell(SPEEDS[k]) : cell(SPEEDS[k], 'white', true);
      return {
        title: cell('TAKEOFF REF'),
        titleR: label('1/2'),
        lines: sixLines([
          { labelL: label('FLAPS'), valueL: s.flaps ? cell(`${s.flaps}°`) : cell('□□°'), labelR: label('V1'), valueR: speed('v1') },
          { labelL: label('E/O ACCEL HT'), valueL: cell('1000FT', 'white', true), labelR: label('VR'), valueR: speed('vr') },
          { labelL: label('THR REDUCTION'), valueL: cell('1500FT', 'white', true), labelR: label('V2'), valueR: speed('v2') },
          { labelL: label('WIND/SLOPE'), valueL: cell('H00/U0.0', 'white', true), labelR: label('RWY/POS'), valueR: cell(s.runway ? `RW${s.runway}` : '----', 'white', true) },
          { labelL: label('TRIM   CG'), valueL: cell('5.5   28.0%', 'white', true), labelR: label('TOGW'), valueR: cell(grossWeight(s) ?? '---.-', 'white', true) },
          { ...index, valueR: cell('THRUST LIM>') },
        ]),
      };
    }

    case 'APPROACH':
      return {
        title: cell('APPROACH REF'),
        lines: sixLines([
          { labelL: label('GROSS WT'), valueL: cell(grossWeight(s) ?? '---.-'), labelR: label('FLAPS    VREF'), valueR: cell(`${VREF[0][0]}°  ${VREF[0][1]}KT`) },
          { valueR: cell(`${VREF[1][0]}°  ${VREF[1][1]}KT`) },
          { valueR: cell(`${VREF[2][0]}°  ${VREF[2][1]}KT`) },
          { labelL: label(s.dest && s.appr ? `${s.dest}28R` : ''), labelR: label('FLAP/SPD'), valueR: s.flapSpd ? cell(s.flapSpd) : cell('--/---') },
          blank,
          { ...index, valueR: cell('THRUST LIM>') },
        ]),
      };

    default:
      return {
        title: cell(s.otherTitle ?? ''),
        lines: sixLines([blank, blank, { valueC: cell('NOT SIMULATED') }, { valueC: cell('IN THE TRAINER', 'white', true) }]),
      };
  }
}

/* =============================================================== trainer */

function enterPhase(s: CduState, phase: FlightPhase, activeLeg?: string, keepPage?: boolean): CduState {
  const active = activeLeg ? s.plan.findIndex((leg) => leg.ident === activeLeg) : -1;
  return {
    ...s,
    phase,
    active: active >= 0 ? active : undefined,
    page: keepPage ? s.page : phase === 'preflight' ? 'MENU' : 'LEGS',
    legsPage: 0,
    holdAt: false,
    scratchpad: '',
    message: undefined,
  };
}

export const boeingSim: TrainerSim<CduState> = {
  initial: INITIAL_STATE,
  press: pressKey,
  render,
  isTypingKey,
  scrollKeys: ['PREV PAGE', 'NEXT PAGE'],
  scratchpad: (s) => s.scratchpad,
  message: (s) => s.message,
  enterPhase,
  lit: (s) => (s.pending ? ['EXEC'] : []),
};
