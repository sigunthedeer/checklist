/**
 * A simplified Airbus MCDU, as in the A320 family, A330 and A310. Pure functions over an immutable state: `pressKey`
 * returns the next state and `render` draws the screen for it.
 *
 * Only the pages the scripted procedures use are simulated, and only their
 * on-path behaviour needs to be right: the trainer rejects wrong keys before
 * they reach here. Everything else renders a "not simulated" page rather than
 * pretending.
 */
import {
  AIRPORTS,
  AIRWAYS,
  APPROACHES,
  DESTINATION,
  FIXES,
  ORIGIN,
  RUNWAYS,
  SIDS,
  STARS,
} from './navdata';

import type { FlightPhase, McduCell, McduColor, McduLine, McduScreen, TrainerSim } from '../screen';

type PerfPage = 'TAKE OFF' | 'CLB' | 'CRZ' | 'DES' | 'APPR';
type Page =
  | 'MENU'
  | 'INIT A'
  | 'INIT B'
  | 'F-PLN'
  | 'LAT REV'
  | 'DEPARTURES'
  | 'ARRIVAL'
  | 'AIRWAYS'
  | 'HOLD'
  | 'PERF'
  | 'DIR'
  | 'OTHER';

export interface Leg {
  ident: string;
  kind: 'airport' | 'fix' | 'disco' | 'tp';
  /** Airway or procedure the leg belongs to, shown above it on F-PLN. */
  via?: string;
}

interface Temporary {
  kind: 'departure' | 'arrival' | 'airways' | 'hold';
  runway?: string;
  sid?: string;
  appr?: string;
  star?: string;
  airways?: { via?: string; to?: string }[];
}

/**
 * What changes between Airbus types sharing this MCDU: the fuel burn the
 * predictions use, and the approach speed and landing settings shown.
 */
export interface AirbusProfile {
  /** Fuel in tonnes for the training flight. */
  taxi: number;
  trip: number;
  rsv: number;
  final: number;
  vapp: string;
  /** Landing settings as PERF APPR names them: the normal one, then the alternative. */
  landing: { full: string; alt: string };
}

export const A320_PROFILE: AirbusProfile = {
  taxi: 0.2,
  trip: 2.4,
  rsv: 0.1,
  final: 1.0,
  vapp: '134',
  landing: { full: 'FULL', alt: 'CONF3' },
};

export interface McduState {
  profile: AirbusProfile;
  page: Page;
  otherTitle?: string;
  scratchpad: string;
  /** A message shown in place of the scratchpad until CLR or typing. */
  message?: string;
  phase: FlightPhase;
  perfPage: PerfPage;
  fromTo?: [string, string];
  fltNbr?: string;
  costIndex?: string;
  crzFl?: number;
  irsAligned: boolean;
  zfw?: string;
  block?: string;
  v1?: string;
  vr?: string;
  v2?: string;
  transAlt?: string;
  flapsThs?: string;
  flex?: string;
  qnh?: string;
  temp?: string;
  wind?: string;
  baro?: string;
  ldgConf: 'FULL' | 'CONF3';
  runway?: string;
  sid?: string;
  appr?: string;
  star?: string;
  plan: Leg[];
  /** Index in `plan` of the leg being flown to. Undefined on the ground. */
  active?: number;
  tmpy?: Temporary;
  /** The waypoint a lateral revision, airway or hold page is working on. */
  revAt?: string;
  hold?: string;
  scroll: number;
}

export const INITIAL_STATE: McduState = {
  profile: A320_PROFILE,
  page: 'MENU',
  scratchpad: '',
  phase: 'preflight',
  perfPage: 'TAKE OFF',
  irsAligned: false,
  ldgConf: 'FULL',
  plan: [],
  scroll: 0,
};

/** Keys that type into the scratchpad, and what they type. */
const TYPED: Record<string, string> = { SP: ' ', '/': '/', '.': '.', OVFY: 'Δ' };
const MAX_SCRATCHPAD = 22;
/** F-PLN shows five legs; the sixth line is always the destination. */
const FPLN_ROWS = 5;

export function isTypingKey(key: string): boolean {
  return /^[A-Z0-9]$/.test(key) || key in TYPED || key === '+/-';
}

export function lskKey(key: string): { line: number; side: 'L' | 'R' } | undefined {
  const match = /^LSK ([1-6])([LR])$/.exec(key);
  return match ? { line: Number(match[1]), side: match[2] as 'L' | 'R' } : undefined;
}

/* ================================================================== keys */

export function pressKey(state: McduState, key: string): McduState {
  if (isTypingKey(key)) return type(state, key);
  if (key === 'CLR') return clear(state);
  const lsk = lskKey(key);
  if (lsk) return pressLsk({ ...state, message: undefined }, lsk.line, lsk.side);

  const s = { ...state, message: undefined };
  switch (key) {
    case 'INIT':
      return { ...s, page: 'INIT A' };
    case 'F-PLN':
      return { ...s, page: 'F-PLN', scroll: 0 };
    case 'DIR':
      return { ...s, page: 'DIR' };
    case 'PERF':
      return {
        ...s,
        page: 'PERF',
        perfPage: s.phase === 'preflight' ? 'TAKE OFF' : s.phase === 'cruise' ? 'CRZ' : 'DES',
      };
    case '→':
    case '←':
      if (s.page === 'INIT A') return { ...s, page: 'INIT B' };
      if (s.page === 'INIT B') return { ...s, page: 'INIT A' };
      return s;
    case '↑':
    case '↓':
      if (s.page !== 'F-PLN') return s;
      return { ...s, scroll: clamp(s.scroll + (key === '↓' ? 1 : -1), 0, maxScroll(s)) };
    case 'MCDU MENU':
      return { ...s, page: 'MENU' };
    default:
      return { ...s, page: 'OTHER', otherTitle: key };
  }
}

function type(state: McduState, key: string): McduState {
  const base = state.message || state.scratchpad === 'CLR' ? '' : state.scratchpad;
  if (key === '+/-') {
    const last = base.slice(-1);
    const next = last === '-' ? `${base.slice(0, -1)}+` : last === '+' ? `${base.slice(0, -1)}-` : `${base}-`;
    return { ...state, message: undefined, scratchpad: next.slice(0, MAX_SCRATCHPAD) };
  }
  const char = TYPED[key] ?? key;
  return { ...state, message: undefined, scratchpad: (base + char).slice(0, MAX_SCRATCHPAD) };
}

function clear(state: McduState): McduState {
  if (state.message) return { ...state, message: undefined };
  if (state.scratchpad === 'CLR') return { ...state, scratchpad: '' };
  if (state.scratchpad) return { ...state, scratchpad: state.scratchpad.slice(0, -1) };
  return { ...state, scratchpad: 'CLR' };
}

const done = (s: McduState, patch: Partial<McduState>): McduState => ({ ...s, ...patch, scratchpad: '' });
const fail = (s: McduState, message: string): McduState => ({ ...s, message });

function pressLsk(s: McduState, line: number, side: 'L' | 'R'): McduState {
  const sp = s.scratchpad.trim();
  const key = `${line}${side}`;

  switch (s.page) {
    case 'INIT A':
      return initA(s, key, sp);
    case 'INIT B':
      return initB(s, key, sp);
    case 'F-PLN':
      return fpln(s, line, side, sp);
    case 'LAT REV':
      return latRev(s, key);
    case 'DEPARTURES':
      return departures(s, line, side);
    case 'ARRIVAL':
      return arrival(s, line, side);
    case 'AIRWAYS':
      return airways(s, line, side, sp);
    case 'HOLD':
      return holdPage(s, key);
    case 'PERF':
      return perf(s, key, sp);
    case 'DIR':
      return dir(s, key, sp);
    default:
      return sp ? fail(s, 'NOT ALLOWED') : s;
  }
}

function initA(s: McduState, key: string, sp: string): McduState {
  if (key === '1R' && sp) {
    const match = /^([A-Z]{4})\/([A-Z]{4})$/.exec(sp);
    if (!match) return fail(s, 'FORMAT ERROR');
    if (!AIRPORTS.has(match[1]) || !AIRPORTS.has(match[2])) return fail(s, 'NOT IN DATABASE');
    return done(s, {
      fromTo: [match[1], match[2]],
      plan: [
        { ident: match[1], kind: 'airport' },
        { ident: '', kind: 'disco' },
        { ident: match[2], kind: 'airport' },
      ],
      runway: undefined,
      sid: undefined,
      appr: undefined,
      star: undefined,
    });
  }
  if (key === '3L' && sp) {
    return /^[A-Z0-9]{1,8}$/.test(sp) ? done(s, { fltNbr: sp }) : fail(s, 'FORMAT ERROR');
  }
  if (key === '3R' && !sp && s.fromTo && !s.irsAligned) return { ...s, irsAligned: true };
  if (key === '5L' && sp) {
    return /^\d{1,3}$/.test(sp) ? done(s, { costIndex: String(Number(sp)) }) : fail(s, 'FORMAT ERROR');
  }
  if (key === '6L' && sp) {
    const match = /^(?:FL)?(\d{2,3})$/.exec(sp);
    return match ? done(s, { crzFl: Number(match[1]) }) : fail(s, 'FORMAT ERROR');
  }
  return sp ? fail(s, 'NOT ALLOWED') : s;
}

function initB(s: McduState, key: string, sp: string): McduState {
  if (key === '1R' && sp) {
    const match = /^(\d{1,3}(?:\.\d)?)\/(\d{1,2}(?:\.\d)?)$/.exec(sp);
    if (!match) return fail(s, 'FORMAT ERROR');
    return done(s, { zfw: `${Number(match[1]).toFixed(1)}/${Number(match[2]).toFixed(1)}` });
  }
  if (key === '2R' && sp) {
    return /^\d{1,3}(?:\.\d)?$/.test(sp) ? done(s, { block: Number(sp).toFixed(1) }) : fail(s, 'FORMAT ERROR');
  }
  return sp ? fail(s, 'NOT ALLOWED') : s;
}

/** Legs as F-PLN lists them: from the last waypoint passed, if airborne. */
export function visibleLegs(s: McduState): Leg[] {
  const from = s.active !== undefined ? Math.max(0, s.active - 1) : 0;
  return s.plan.slice(from);
}

function maxScroll(s: McduState): number {
  return Math.max(0, visibleLegs(s).length - FPLN_ROWS);
}

function fpln(s: McduState, line: number, side: 'L' | 'R', sp: string): McduState {
  if (side !== 'L') return sp ? fail(s, 'NOT ALLOWED') : s;
  if (line === 6) {
    if (sp || !s.fromTo) return sp ? fail(s, 'NOT ALLOWED') : s;
    return { ...s, page: 'LAT REV', revAt: s.fromTo[1] };
  }
  const legs = visibleLegs(s);
  const leg = legs[s.scroll + line - 1];
  if (!leg) return sp ? fail(s, 'NOT ALLOWED') : s;
  if (sp === 'CLR') {
    if (leg.kind !== 'disco') return fail(s, 'NOT ALLOWED');
    const index = s.plan.indexOf(leg);
    return done(s, { plan: s.plan.filter((_, i) => i !== index) });
  }
  if (sp) return fail(s, 'NOT ALLOWED');
  if (leg.kind === 'airport' || leg.kind === 'fix') return { ...s, page: 'LAT REV', revAt: leg.ident };
  return s;
}

type RevRole = 'origin' | 'destination' | 'fix';

function revRole(s: McduState): RevRole {
  if (s.fromTo && s.revAt === s.fromTo[0]) return 'origin';
  if (s.fromTo && s.revAt === s.fromTo[1]) return 'destination';
  return 'fix';
}

function latRev(s: McduState, key: string): McduState {
  const role = revRole(s);
  if (key === '6L') return { ...s, page: 'F-PLN' };
  if (role === 'origin' && key === '1L') return { ...s, page: 'DEPARTURES', tmpy: undefined };
  if (role === 'destination' && key === '1R') return { ...s, page: 'ARRIVAL', tmpy: undefined };
  if (role === 'fix' && key === '3L') return { ...s, page: 'HOLD', tmpy: { kind: 'hold' } };
  if (role === 'fix' && key === '5R') return { ...s, page: 'AIRWAYS', tmpy: undefined };
  return s;
}

/** The list a DEPARTURES page is currently offering, one per line from line 2. */
export function departureChoices(s: McduState): string[] {
  const origin = s.fromTo?.[0] ?? ORIGIN;
  if (!s.tmpy?.runway) return (RUNWAYS[origin] ?? []).map((r) => r.id);
  return (SIDS[origin] ?? []).map((p) => p.id);
}

function departures(s: McduState, line: number, side: 'L' | 'R'): McduState {
  if (line === 6) {
    if (side === 'L') return { ...s, tmpy: undefined, page: s.tmpy ? 'DEPARTURES' : 'F-PLN' };
    if (!s.tmpy?.runway) return s;
    const origin = s.fromTo?.[0] ?? ORIGIN;
    const sid = SIDS[origin]?.find((p) => p.id === s.tmpy?.sid);
    const originIndex = s.plan.findIndex((leg) => leg.ident === origin);
    // Replace any earlier SID: keep the origin and everything from the first leg not in the old SID.
    const oldFixes = new Set(SIDS[origin]?.find((p) => p.id === s.sid)?.fixes ?? []);
    const rest = s.plan.slice(originIndex + 1).filter((leg) => !(oldFixes.has(leg.ident) && leg.via === s.sid));
    const sidLegs: Leg[] = (sid?.fixes ?? []).map((ident) => ({ ident, kind: 'fix', via: sid?.id }));
    return {
      ...s,
      runway: s.tmpy.runway,
      sid: s.tmpy.sid,
      plan: [...s.plan.slice(0, originIndex + 1), ...sidLegs, ...rest],
      tmpy: undefined,
      page: 'F-PLN',
      scroll: 0,
    };
  }
  if (side !== 'L' || line < 2) return s;
  const choice = departureChoices(s)[line - 2];
  if (!choice) return s;
  if (!s.tmpy?.runway) return { ...s, tmpy: { kind: 'departure', runway: choice } };
  return { ...s, tmpy: { ...s.tmpy, sid: choice } };
}

/** The list an ARRIVAL page is currently offering, one per line from line 3. */
export function arrivalChoices(s: McduState): string[] {
  const dest = s.fromTo?.[1] ?? DESTINATION;
  if (!s.tmpy?.appr) return (APPROACHES[dest] ?? []).map((p) => p.id);
  return (STARS[dest] ?? []).map((p) => p.id);
}

function arrival(s: McduState, line: number, side: 'L' | 'R'): McduState {
  const dest = s.fromTo?.[1] ?? DESTINATION;
  if (line === 6) {
    if (side === 'L') return { ...s, tmpy: undefined, page: s.tmpy ? 'ARRIVAL' : 'F-PLN' };
    if (!s.tmpy?.appr) return s;
    const appr = APPROACHES[dest]?.find((p) => p.id === s.tmpy?.appr);
    const star = STARS[dest]?.find((p) => p.id === s.tmpy?.star);
    const destIndex = s.plan.findIndex((leg) => leg.kind === 'airport' && leg.ident === dest);
    let route = s.plan.slice(0, destIndex);
    while (route.length && route[route.length - 1].kind === 'disco') route = route.slice(0, -1);
    const starFixes = star?.fixes ?? [];
    const join = route.findIndex((leg) => leg.ident === starFixes[0]);
    // A STAR that starts at a waypoint already in the route joins it; otherwise there is a gap.
    const head: Leg[] =
      join >= 0 ? route.slice(0, join + 1) : [...route, ...(starFixes.length ? [{ ident: '', kind: 'disco' as const }] : [])];
    const starLegs: Leg[] = starFixes
      .slice(join >= 0 ? 1 : 0)
      .map((ident) => ({ ident, kind: 'fix', via: star?.id }));
    const apprLegs: Leg[] = (appr?.fixes ?? []).map((ident) => ({ ident, kind: 'fix', via: appr?.id }));
    return {
      ...s,
      appr: s.tmpy.appr,
      star: s.tmpy.star,
      plan: [...head, ...starLegs, ...apprLegs, { ident: dest, kind: 'airport' }],
      tmpy: undefined,
      page: 'F-PLN',
      scroll: 0,
    };
  }
  if (side !== 'L' || line < 3) return s;
  const choice = arrivalChoices(s)[line - 3];
  if (!choice) return s;
  if (!s.tmpy?.appr) return { ...s, tmpy: { kind: 'arrival', appr: choice } };
  return { ...s, tmpy: { ...s.tmpy, star: choice } };
}

function airways(s: McduState, line: number, side: 'L' | 'R', sp: string): McduState {
  const rows = s.tmpy?.airways ?? [];
  if (line === 6) {
    if (side === 'L') return { ...s, tmpy: undefined, page: rows.length ? 'AIRWAYS' : 'F-PLN' };
    const complete = rows.filter((row) => row.via && row.to);
    if (!complete.length || !s.revAt) return s;
    let from = s.revAt;
    const added: Leg[] = [];
    for (const row of complete) {
      const fixes = AIRWAYS[row.via!];
      const a = fixes.indexOf(from);
      const b = fixes.indexOf(row.to!);
      const slice = a < b ? fixes.slice(a + 1, b + 1) : fixes.slice(b, a).reverse();
      added.push(...slice.map((ident) => ({ ident, kind: 'fix' as const, via: row.via })));
      from = row.to!;
    }
    const at = s.plan.findIndex((leg) => leg.ident === s.revAt);
    const after = s.plan.slice(at + 1);
    const tail: Leg[] = after[0]?.kind === 'disco' ? after : [{ ident: '', kind: 'disco' }, ...after];
    return {
      ...s,
      plan: [...s.plan.slice(0, at + 1), ...added, ...tail],
      tmpy: undefined,
      page: 'F-PLN',
      scroll: 0,
    };
  }
  if (!sp) return s;
  const index = rows.findIndex((row) => !row.to);
  const activeRow = index >= 0 ? index : rows.length;
  if (line - 1 !== activeRow) return fail(s, 'NOT ALLOWED');
  const row = rows[activeRow] ?? {};
  const from = activeRow === 0 ? s.revAt! : rows[activeRow - 1].to!;
  if (side === 'L') {
    if (!AIRWAYS[sp]?.includes(from)) return fail(s, 'NOT IN DATABASE');
    const next = [...rows];
    next[activeRow] = { via: sp };
    return done(s, { tmpy: { kind: 'airways', airways: next } });
  }
  if (!row.via) return fail(s, 'NOT ALLOWED');
  if (!AIRWAYS[row.via].includes(sp) || sp === from) return fail(s, 'NOT IN DATABASE');
  const next = [...rows];
  next[activeRow] = { via: row.via, to: sp };
  return done(s, { tmpy: { kind: 'airways', airways: next } });
}

function holdPage(s: McduState, key: string): McduState {
  if (key === '6R' && s.tmpy?.kind === 'hold') return { ...s, hold: s.revAt, tmpy: undefined, page: 'F-PLN', scroll: 0 };
  if (key === '6L') return { ...s, tmpy: undefined, page: 'F-PLN' };
  return s;
}

const NEXT_PHASE: Record<PerfPage, PerfPage | undefined> = {
  'TAKE OFF': 'CLB',
  CLB: 'CRZ',
  CRZ: 'DES',
  DES: 'APPR',
  APPR: undefined,
};

function perf(s: McduState, key: string, sp: string): McduState {
  if (key === '6R' && !sp) {
    const next = NEXT_PHASE[s.perfPage];
    return next ? { ...s, perfPage: next } : s;
  }
  if (s.perfPage === 'TAKE OFF' && sp) {
    const speed = /^\d{3}$/.test(sp) && Number(sp) >= 90 && Number(sp) <= 200;
    switch (key) {
      case '1L':
        return speed ? done(s, { v1: sp }) : fail(s, 'FORMAT ERROR');
      case '2L':
        return speed ? done(s, { vr: sp }) : fail(s, 'FORMAT ERROR');
      case '3L':
        return speed ? done(s, { v2: sp }) : fail(s, 'FORMAT ERROR');
      case '4L':
        return /^\d{3,5}$/.test(sp) ? done(s, { transAlt: sp }) : fail(s, 'FORMAT ERROR');
      case '3R':
        return /^[1-3]\/(UP|DN)\d(\.\d)?$/.test(sp) ? done(s, { flapsThs: sp }) : fail(s, 'FORMAT ERROR');
      case '4R':
        return /^\d{1,2}$/.test(sp) ? done(s, { flex: sp }) : fail(s, 'FORMAT ERROR');
    }
  }
  if (s.perfPage === 'APPR') {
    if (!sp && key === '4R') return { ...s, ldgConf: 'CONF3' };
    if (!sp && key === '5R') return { ...s, ldgConf: 'FULL' };
    if (sp) {
      switch (key) {
        case '1L':
          return /^(\d{3,4}|\d{2}\.\d{2})$/.test(sp) ? done(s, { qnh: sp }) : fail(s, 'FORMAT ERROR');
        case '2L':
          return /^[+-]?\d{1,2}$/.test(sp) ? done(s, { temp: sp }) : fail(s, 'FORMAT ERROR');
        case '3L':
          return /^\d{3}\/\d{1,3}$/.test(sp) ? done(s, { wind: sp }) : fail(s, 'FORMAT ERROR');
        case '2R':
          return /^\d{2,5}$/.test(sp) ? done(s, { baro: sp }) : fail(s, 'FORMAT ERROR');
      }
    }
  }
  return sp ? fail(s, 'NOT ALLOWED') : s;
}

/** Waypoints ahead of the aircraft, offered as direct-to choices from line 2. */
export function directChoices(s: McduState): string[] {
  const from = s.active ?? 1;
  return s.plan
    .slice(from)
    .filter((leg) => leg.kind === 'fix')
    .map((leg) => leg.ident)
    .slice(0, 4);
}

function dir(s: McduState, key: string, sp: string): McduState {
  let target: string | undefined;
  if (key === '1L' && sp) {
    if (!FIXES.has(sp)) return fail(s, 'NOT IN DATABASE');
    target = sp;
  } else if (!sp && key.endsWith('L')) {
    target = directChoices(s)[Number(key[0]) - 2];
  }
  if (!target) return sp ? fail(s, 'NOT ALLOWED') : s;

  const ahead = s.plan.slice(s.active ?? 1);
  const inPlan = ahead.findIndex((leg) => leg.ident === target);
  // Direct to a waypoint already ahead skips to it; to anything else it leaves a gap after.
  const legs: Leg[] =
    inPlan >= 0
      ? [{ ident: 'T-P', kind: 'tp' }, ...ahead.slice(inPlan)]
      : [{ ident: 'T-P', kind: 'tp' }, { ident: target, kind: 'fix' }, { ident: '', kind: 'disco' }, ...ahead];
  return done(s, { plan: legs, active: 1, page: 'F-PLN', scroll: 0 });
}

/* ================================================================ render */

const blank: McduLine = {};
const cell = (text: string, color: McduColor = 'white', small?: boolean): McduCell => ({ text, color, small });
const label = (text: string, color: McduColor = 'white'): McduCell => cell(text, color, true);
const boxes = (n: number) => cell('□'.repeat(n), 'amber');
const entered = (value: string | undefined, placeholder: McduCell): McduCell =>
  value ? cell(value, 'cyan') : placeholder;
const sixLines = (lines: McduLine[]): McduLine[] => [...lines, ...Array(6).fill(blank)].slice(0, 6);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function isaTemp(fl: number): string {
  return `${Math.round(15 - 1.98 * (fl / 10))}°`;
}

/** Fuel figures in tonnes, from the entries. Rough but consistent. */
export function fuelFigures(s: McduState) {
  if (!s.zfw || !s.block) return undefined;
  const zfw = Number(s.zfw.split('/')[0]);
  const block = Number(s.block);
  const { taxi, trip, rsv, final } = s.profile;
  const tow = zfw + block - taxi;
  return { taxi, trip, rsv, final, extra: block - taxi - trip - rsv - final, tow, lw: tow - trip };
}

export function render(s: McduState): McduScreen {
  const scratchpad = s.message ? cell(s.message, 'white') : cell(s.scratchpad, 'white');
  const screen = page(s);
  return { ...screen, scratchpad };
}

function page(s: McduState): Omit<McduScreen, 'scratchpad'> {
  const yellow = !!s.tmpy;
  const tmpyFooter = (): McduLine =>
    yellow
      ? { valueL: cell('<ERASE', 'amber'), labelR: label('TMPY', 'yellow'), valueR: cell('INSERT*', 'amber') }
      : { valueL: cell('<RETURN') };

  switch (s.page) {
    case 'MENU':
      return {
        title: cell('MCDU MENU'),
        lines: sixLines([
          { valueL: cell('<FMGC', 'green') },
          { valueL: cell('<ACARS') },
          { valueL: cell('<AIDS') },
          { valueL: cell('<CFDS') },
        ]),
      };

    case 'INIT A':
      return {
        title: cell('INIT'),
        titleR: cell('→'),
        lines: sixLines([
          {
            labelL: label('CO RTE'),
            valueL: s.fromTo ? cell('NONE', 'green', true) : boxes(10),
            labelR: label('FROM/TO'),
            valueR: s.fromTo ? cell(s.fromTo.join('/'), 'cyan') : boxes(9),
          },
          { labelL: label('ALTN/CO RTE'), valueL: cell('----/---------') },
          {
            labelL: label('FLT NBR'),
            valueL: entered(s.fltNbr, boxes(8)),
            valueR: s.fromTo && !s.irsAligned ? cell('ALIGN IRS→', 'amber') : undefined,
          },
          blank,
          { labelL: label('COST INDEX'), valueL: entered(s.costIndex, boxes(3)) },
          {
            labelL: label('CRZ FL/TEMP'),
            valueL: s.crzFl
              ? cell(`FL${String(s.crzFl).padStart(3, '0')}/${isaTemp(s.crzFl)}`, 'cyan')
              : cell('□□□□□/---°', 'amber'),
            labelR: label('TROPO'),
            valueR: cell('36090', 'cyan', true),
          },
        ]),
      };

    case 'INIT B': {
      const fuel = fuelFigures(s);
      const t = (n: number) => n.toFixed(1);
      return {
        title: cell('INIT B'),
        titleR: cell('←'),
        lines: sixLines([
          {
            labelL: label('TAXI'),
            valueL: cell('0.2', 'cyan', true),
            labelR: label('ZFW/ZFWCG'),
            valueR: entered(s.zfw, cell('□□.□/□□.□', 'amber')),
          },
          {
            labelL: label('TRIP/TIME'),
            valueL: cell(fuel ? `${t(fuel.trip)}/0045` : '---.-/----', fuel ? 'green' : 'white'),
            labelR: label('BLOCK'),
            valueR: entered(s.block, cell('□□.□', 'amber')),
          },
          {
            labelL: label('RTE RSV/%'),
            valueL: cell(fuel ? `${t(fuel.rsv)}/5.0` : '---.-/5.0', fuel ? 'green' : 'white'),
          },
          {
            labelL: label('ALTN/TIME'),
            valueL: cell('---.-/----'),
            labelR: label('TOW/LW'),
            valueR: cell(fuel ? `${t(fuel.tow)}/${t(fuel.lw)}` : '---.-/---.-', fuel ? 'green' : 'white'),
          },
          {
            labelL: label('FINAL/TIME'),
            valueL: cell(fuel ? `${t(fuel.final)}/0030` : '---.-/0030', fuel ? 'green' : 'white'),
            labelR: label('TRIP WIND'),
            valueR: cell('HD000', 'cyan', true),
          },
          {
            labelL: label('EXTRA/TIME'),
            valueL: cell(fuel ? `${t(fuel.extra)}/----` : '---.-/----', fuel ? 'green' : 'white'),
          },
        ]),
      };
    }

    case 'F-PLN': {
      const legs = visibleLegs(s).slice(s.scroll, s.scroll + FPLN_ROWS);
      const lines: McduLine[] = legs.map((leg) => {
        if (leg.kind === 'disco') return { valueC: cell('--F-PLN DISCONTINUITY--') };
        const isOrigin = s.fromTo && leg.ident === s.fromTo[0] && leg.kind === 'airport';
        const isDest = s.fromTo && leg.ident === s.fromTo[1] && leg.kind === 'airport';
        const name = isOrigin && s.runway ? `${leg.ident}${s.runway}` : isDest && s.appr ? `${leg.ident}${APPROACHES[leg.ident]?.find((p) => p.id === s.appr)?.runway ?? ''}` : leg.ident;
        const legIndex = s.plan.indexOf(leg);
        const isActive = s.active !== undefined && legIndex === s.active;
        const via = leg.ident === s.hold ? 'HOLD R' : leg.via;
        return {
          labelL: via ? label(via) : undefined,
          valueL: cell(name, isActive ? 'white' : 'green'),
          valueR: cell('----  ---/-----', 'green', true),
        };
      });
      const dest = s.fromTo?.[1];
      const fuel = fuelFigures(s);
      lines.length = FPLN_ROWS;
      lines.push(
        dest
          ? {
              labelL: label('DEST'),
              labelR: label('DIST  EFOB'),
              valueL: cell(s.appr ? `${dest}${APPROACHES[dest]?.find((p) => p.id === s.appr)?.runway ?? ''}` : dest),
              valueR: cell(`212  ${fuel ? fuel.extra.toFixed(1) : '--.-'}`, 'white'),
            }
          : blank,
      );
      return {
        titleL: label('FROM'),
        title: cell(''),
        titleR: label(s.fltNbr ?? ''),
        lines: Array.from({ length: 6 }, (_, i) => lines[i] ?? blank),
      };
    }

    case 'LAT REV': {
      const role = revRole(s);
      const title = cell(`LAT REV FROM ${s.revAt ?? ''}`);
      if (role === 'origin') {
        return {
          title,
          lines: sixLines([{ valueL: cell('<DEPARTURE'), valueR: cell('FIX INFO>') }, blank, blank, blank, blank, { valueL: cell('<RETURN') }]),
        };
      }
      if (role === 'destination') {
        return {
          title,
          lines: sixLines([{ valueR: cell('ARRIVAL>') }, blank, blank, blank, blank, { valueL: cell('<RETURN') }]),
        };
      }
      return {
        title,
        lines: sixLines([
          { valueR: cell('FIX INFO>') },
          blank,
          { valueL: cell('<HOLD'), labelR: label('NEXT WPT'), valueR: cell('[     ]', 'cyan') },
          { labelR: label('NEW DEST'), valueR: cell('[    ]', 'cyan') },
          { valueR: cell('AIRWAYS>') },
          { valueL: cell('<RETURN') },
        ]),
      };
    }

    case 'DEPARTURES': {
      const choosingRunway = !s.tmpy?.runway;
      const shown = (value: string | undefined, fallback: string) =>
        cell(value ?? fallback, value ? (yellow ? 'yellow' : 'green') : 'white');
      const lines: McduLine[] = [
        {
          labelL: label('RWY'),
          labelC: label('SID'),
          labelR: label('TRANS'),
          valueL: shown(s.tmpy?.runway ?? s.runway, '---'),
          valueC: shown(s.tmpy?.sid ?? s.sid, '------'),
          valueR: cell('------'),
        },
      ];
      departureChoices(s).slice(0, 4).forEach((choice, i) => {
        const runway = RUNWAYS[s.fromTo?.[0] ?? ORIGIN]?.find((r) => r.id === choice);
        lines.push({
          labelC: i === 0 ? label(choosingRunway ? 'AVAILABLE RUNWAYS' : 'SIDS   AVAILABLE') : undefined,
          valueL: cell(runway ? `<${choice}  ${runway.length}` : `<${choice}`, 'cyan'),
        });
      });
      while (lines.length < 5) lines.push(blank);
      lines.push(tmpyFooter());
      return { title: cell(`DEPARTURES FROM ${s.fromTo?.[0] ?? ''}`, yellow ? 'yellow' : 'white'), lines };
    }

    case 'ARRIVAL': {
      const choosingAppr = !s.tmpy?.appr;
      const shown = (value: string | undefined) =>
        cell(value ?? '------', value ? (yellow ? 'yellow' : 'green') : 'white');
      const lines: McduLine[] = [
        { labelL: label('APPR'), valueL: shown(s.tmpy?.appr ?? s.appr), labelR: label('VIA'), valueR: cell('------') },
        { labelL: label('STAR'), valueL: shown(s.tmpy?.star ?? s.star), labelR: label('TRANS'), valueR: cell('------') },
      ];
      arrivalChoices(s).slice(0, 3).forEach((choice, i) => {
        lines.push({
          labelC: i === 0 ? label(choosingAppr ? 'APPROACHES' : 'STARS   AVAILABLE') : undefined,
          valueL: cell(`<${choice}`, 'cyan'),
        });
      });
      while (lines.length < 5) lines.push(blank);
      lines.push(tmpyFooter());
      return { title: cell(`ARRIVAL TO ${s.fromTo?.[1] ?? ''}`, yellow ? 'yellow' : 'white'), lines };
    }

    case 'AIRWAYS': {
      const rows = s.tmpy?.airways ?? [];
      const activeRow = rows.findIndex((row) => !row.to);
      const current = activeRow >= 0 ? activeRow : rows.length;
      const lines: McduLine[] = [];
      for (let i = 0; i < 5; i += 1) {
        const row = rows[i];
        if (i < current && row) {
          lines.push({ labelL: label('VIA'), labelR: label('TO'), valueL: cell(row.via!, 'yellow'), valueR: cell(row.to!, 'yellow') });
        } else if (i === current) {
          lines.push({
            labelL: label('VIA'),
            labelR: label('TO'),
            valueL: row?.via ? cell(row.via, 'yellow') : cell('[    ]', 'cyan'),
            valueR: cell('[    ]', 'cyan'),
          });
        } else {
          lines.push(blank);
        }
      }
      lines.push(tmpyFooter());
      return { title: cell(`AIRWAYS FROM ${s.revAt ?? ''}`, yellow ? 'yellow' : 'white'), lines };
    }

    case 'HOLD':
      return {
        title: cell(`HOLD AT ${s.revAt ?? ''}`, yellow ? 'yellow' : 'white'),
        lines: sixLines([
          { labelL: label('INB CRS'), valueL: cell('271°', 'cyan'), labelR: label('COMPUTED', 'green') },
          { labelL: label('TURN'), valueL: cell('R', 'cyan') },
          { labelL: label('TIME/DIST'), valueL: cell('1.0/----', 'cyan') },
          blank,
          blank,
          tmpyFooter(),
        ]),
      };

    case 'PERF':
      return perfPage(s);

    case 'DIR': {
      const choices = directChoices(s);
      return {
        title: cell('DIR TO'),
        lines: sixLines([
          { labelL: label('WAYPOINT'), valueL: cell('[     ]', 'cyan') },
          ...choices.map((ident, i) => ({
            labelL: i === 0 ? label('F-PLN WPTS') : undefined,
            valueL: cell(`<${ident}`, 'cyan'),
          })),
        ]),
      };
    }

    default:
      return {
        title: cell(s.otherTitle ?? ''),
        lines: sixLines([blank, blank, { valueC: cell('NOT SIMULATED') }, { valueC: cell('IN THE TRAINER', 'white', true) }]),
      };
  }
}

function perfPage(s: McduState): Omit<McduScreen, 'scratchpad'> {
  const next: McduLine = { labelR: label('NEXT'), valueR: cell('PHASE>') };
  switch (s.perfPage) {
    case 'TAKE OFF':
      return {
        title: cell('TAKE OFF', 'green'),
        lines: [
          { labelL: label('V1'), valueL: entered(s.v1, boxes(3)), labelR: label('RWY'), valueR: cell(s.runway ?? '---', 'green') },
          { labelL: label('VR'), valueL: entered(s.vr, boxes(3)), labelR: label('TO SHIFT'), valueR: cell('[M]  [   ]*', 'cyan', true) },
          { labelL: label('V2'), valueL: entered(s.v2, boxes(3)), labelR: label('FLAPS/THS'), valueR: entered(s.flapsThs, cell('[ ]/[    ]', 'cyan')) },
          {
            labelL: label('TRANS ALT'),
            valueL: s.transAlt ? cell(s.transAlt, 'cyan') : cell('6000', 'cyan', true),
            labelR: label('FLEX TO TEMP'),
            valueR: s.flex ? cell(`${s.flex}°`, 'cyan') : cell('[   ]°', 'cyan'),
          },
          { labelL: label('THR RED/ACC'), valueL: cell('1500/1500', 'cyan', true), labelR: label('ENG OUT ACC'), valueR: cell('1500', 'cyan', true) },
          next,
        ],
      };
    case 'APPR': {
      const appr = s.appr ?? '------';
      const { full, alt } = s.profile.landing;
      return {
        title: cell('APPR', 'green'),
        lines: [
          { labelL: label('QNH'), valueL: entered(s.qnh, boxes(4)), labelR: label('FINAL'), valueR: cell(appr, 'green') },
          { labelL: label('TEMP'), valueL: s.temp ? cell(`${s.temp}°`, 'cyan') : cell('---°', 'cyan'), labelR: label('BARO'), valueR: entered(s.baro, cell('[    ]', 'cyan')) },
          { labelL: label('MAG WIND'), valueL: entered(s.wind, cell('---°/---', 'cyan')), labelR: label('RADIO'), valueR: cell('[    ]', 'cyan') },
          { labelL: label('TRANS FL'), valueL: cell('FL050', 'cyan', true), labelR: label('LDG CONF'), valueR: cell(s.ldgConf === 'CONF3' ? alt : `${alt}*`, s.ldgConf === 'CONF3' ? 'green' : 'cyan') },
          { labelL: label('VAPP'), valueL: cell(s.profile.vapp, 'green'), valueR: cell(s.ldgConf === 'FULL' ? full : `${full}*`, s.ldgConf === 'FULL' ? 'green' : 'cyan') },
          { labelL: label('PREV'), valueL: cell('<PHASE') },
        ],
      };
    }
    default:
      return {
        title: cell(s.perfPage, 'green'),
        lines: sixLines([
          { labelL: label('ACT MODE'), valueL: cell('MANAGED', 'green') },
          { labelL: label('CI'), valueL: cell(s.costIndex ?? '---', 'green') },
          blank,
          blank,
          blank,
          { labelL: label('PREV'), valueL: cell('<PHASE'), ...next },
        ]),
      };
  }
}

/* =============================================================== trainer */

function enterPhase(sim: McduState, phase: FlightPhase, activeLeg?: string, keepPage?: boolean): McduState {
  const active = activeLeg ? sim.plan.findIndex((leg) => leg.ident === activeLeg) : -1;
  return {
    ...sim,
    phase,
    active: active >= 0 ? active : undefined,
    page: keepPage ? sim.page : phase === 'preflight' ? 'MENU' : 'F-PLN',
    scratchpad: '',
    message: undefined,
    scroll: 0,
  };
}

export function createAirbusSim(profile: AirbusProfile): TrainerSim<McduState> {
  return { ...airbusSim, initial: { ...INITIAL_STATE, profile } };
}

export const airbusSim: TrainerSim<McduState> = {
  initial: INITIAL_STATE,
  press: pressKey,
  render,
  isTypingKey,
  scrollKeys: ['↑', '↓'],
  scratchpad: (s) => s.scratchpad,
  message: (s) => s.message,
  enterPhase,
};
