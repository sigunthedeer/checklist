/**
 * A simplified Citation CJ4 FMS, Collins style. Pure functions over an
 * immutable state: `pressKey` returns the next state and `render` draws it.
 *
 * Flight plan changes are provisional until EXEC, and the first EXEC is what
 * activates the plan. Only the pages the scripted procedures use are
 * simulated; anything else renders a "not simulated" page.
 */
import { closeGap, directTo, endpoints, withArrival, withDestination, withRoute, withSid, type Leg, type RouteRow } from '../plan';
import type { FlightPhase, McduCell, McduColor, McduLine, McduScreen, TrainerSim } from '../screen';
import { AIRPORTS, AIRWAYS, APPROACHES, FIXES, GNSS_POSITION, RUNWAYS, SIDS, STARS } from './navdata';

type Page =
  | 'STATUS'
  | 'INDEX'
  | 'POS INIT'
  | 'FPLN'
  | 'DEP ARR'
  | 'DEPARTURES'
  | 'ARRIVALS'
  | 'LEGS'
  | 'DIR'
  | 'PERF MENU'
  | 'PERF INIT'
  | 'TAKEOFF'
  | 'APPROACH'
  | 'OTHER';

interface Conditions {
  wind?: string;
  oat?: string;
  qnh?: string;
  sent: boolean;
}

export interface FmsState {
  page: Page;
  otherTitle?: string;
  /** Page number within FPLN, LEGS, TAKEOFF REF or APPROACH REF, from 0. */
  sub: number;
  scratchpad: string;
  message?: string;
  phase: FlightPhase;
  posLoaded: boolean;
  origin?: string;
  dest?: string;
  runway?: string;
  rows: RouteRow[];
  sid?: string;
  star?: string;
  appr?: string;
  plan: Leg[];
  active?: number;
  pending: boolean;
  activated: boolean;
  pax?: number;
  cargo?: number;
  flaps?: string;
  takeoff: Conditions;
  landing: Conditions;
}

export const INITIAL_STATE: FmsState = {
  page: 'STATUS',
  sub: 0,
  scratchpad: '',
  phase: 'preflight',
  posLoaded: false,
  rows: [],
  plan: [],
  pending: false,
  activated: false,
  takeoff: { sent: false },
  landing: { sent: false },
};

const BOW = 10280;
const FUEL = 3900;
const PAX_WEIGHT = 170;
export const TAKEOFF_SPEEDS = { V1: '104', VR: '110', V2: '118', VT: '160' };
export const LANDING_SPEEDS = { VREF: '112', VAPP: '117' };
const LIST_ROWS = 5;
const MAX_SCRATCHPAD = 24;
/** Pages each multi-page screen has. */
const PAGES: Partial<Record<Page, number>> = { FPLN: 2, TAKEOFF: 3, APPROACH: 2 };

export function isTypingKey(key: string): boolean {
  return /^[A-Z0-9]$/.test(key) || key === '.' || key === '/' || key === 'SP' || key === '+/-';
}

/* ================================================================== keys */

export function pressKey(state: FmsState, key: string): FmsState {
  if (isTypingKey(key)) return type(state, key);
  if (key === 'CLR') return clear(state);
  if (key === 'DEL') return { ...state, message: undefined, scratchpad: 'DELETE' };
  const lsk = /^LSK ([1-6])([LR])$/.exec(key);
  if (lsk) return pressLsk({ ...state, message: undefined }, Number(lsk[1]), lsk[2] as 'L' | 'R');

  const s: FmsState = { ...state, message: undefined };
  const open = (page: Page): FmsState => ({ ...s, page, sub: 0 });
  switch (key) {
    case 'IDX':
      return open('INDEX');
    case 'FPLN':
      return open('FPLN');
    case 'LEGS':
      return open('LEGS');
    case 'DEP ARR':
      return open('DEP ARR');
    case 'PERF':
      return open('PERF MENU');
    case 'DIR':
      return open('DIR');
    case 'EXEC':
      return s.pending ? { ...s, pending: false, activated: true } : s;
    case 'NEXT':
    case 'PREV': {
      const pages = s.page === 'LEGS' ? legsPages(s) : PAGES[s.page] ?? 1;
      return { ...s, sub: clamp(s.sub + (key === 'NEXT' ? 1 : -1), 0, pages - 1) };
    }
    default:
      return { ...s, page: 'OTHER', otherTitle: key };
  }
}

function type(state: FmsState, key: string): FmsState {
  const base = state.message || state.scratchpad === 'DELETE' ? '' : state.scratchpad;
  if (key === '+/-') {
    const last = base.slice(-1);
    const next = last === '-' ? `${base.slice(0, -1)}+` : last === '+' ? `${base.slice(0, -1)}-` : `${base}-`;
    return { ...state, message: undefined, scratchpad: next.slice(0, MAX_SCRATCHPAD) };
  }
  return { ...state, message: undefined, scratchpad: (base + (key === 'SP' ? ' ' : key)).slice(0, MAX_SCRATCHPAD) };
}

function clear(state: FmsState): FmsState {
  if (state.message) return { ...state, message: undefined };
  if (state.scratchpad === 'DELETE') return { ...state, scratchpad: '' };
  return { ...state, scratchpad: state.scratchpad.slice(0, -1) };
}

const done = (s: FmsState, patch: Partial<FmsState>): FmsState => ({ ...s, ...patch, scratchpad: '' });
const fail = (s: FmsState, message = 'INVALID ENTRY'): FmsState => ({ ...s, message });
const modify = (s: FmsState, patch: Partial<FmsState>): FmsState => done(s, { ...patch, pending: true });

function pressLsk(s: FmsState, line: number, side: 'L' | 'R'): FmsState {
  const sp = s.scratchpad.trim();
  const key = `${line}${side}`;
  switch (s.page) {
    case 'STATUS':
      return key === '6R' && !sp ? { ...s, page: 'POS INIT', sub: 0 } : sp ? fail(s) : s;
    case 'INDEX':
      if (sp) return fail(s);
      if (key === '1L') return { ...s, page: 'STATUS', sub: 0 };
      if (key === '2L') return { ...s, page: 'POS INIT', sub: 0 };
      return s;
    case 'POS INIT':
      if (sp) return fail(s);
      if (key === '3R') return { ...s, posLoaded: true };
      if (key === '6R' && s.posLoaded) return { ...s, page: 'FPLN', sub: 0 };
      if (key === '6L') return { ...s, page: 'INDEX', sub: 0 };
      return s;
    case 'FPLN':
      return s.sub === 0 ? fpln1(s, key, sp) : fpln2(s, line, side, sp);
    case 'DEP ARR':
      if (sp) return fail(s);
      if (key === '1L' && s.origin) return { ...s, page: 'DEPARTURES', sub: 0 };
      if (key === '2R' && s.dest) return { ...s, page: 'ARRIVALS', sub: 0 };
      return s;
    case 'DEPARTURES':
      return departures(s, line, side, sp);
    case 'ARRIVALS':
      return arrivals(s, line, side, sp);
    case 'LEGS':
      return legs(s, line, side, sp);
    case 'DIR':
      return direct(s, line, side, sp);
    case 'PERF MENU':
      if (sp) return fail(s);
      if (key === '1L') return { ...s, page: 'PERF INIT', sub: 0 };
      if (key === '1R') return { ...s, page: 'TAKEOFF', sub: 0 };
      if (key === '2R') return { ...s, page: 'APPROACH', sub: 0 };
      return s;
    case 'PERF INIT':
      return perfInit(s, key, sp);
    case 'TAKEOFF':
      return takeoff(s, key, sp);
    case 'APPROACH':
      return approach(s, key, sp);
    default:
      return sp ? fail(s) : s;
  }
}

function fpln1(s: FmsState, key: string, sp: string): FmsState {
  if (key === '1L' && sp) {
    return AIRPORTS.has(sp) ? modify(s, { origin: sp, plan: endpoints(sp, s.dest) }) : fail(s, 'NOT IN DATABASE');
  }
  if (key === '1R' && sp) {
    return AIRPORTS.has(sp) ? modify(s, { dest: sp, plan: withDestination(s.plan, s.dest, sp) }) : fail(s, 'NOT IN DATABASE');
  }
  if (key === '3L' && sp) {
    const match = /^RW(\d{2}[LRC]?)$/.exec(sp);
    return match && s.origin && RUNWAYS[s.origin]?.includes(match[1]) ? modify(s, { runway: match[1] }) : fail(s);
  }
  if (key === '6R' && !sp) return { ...s, page: 'PERF INIT', sub: 0 };
  return sp ? fail(s) : s;
}

function fpln2(s: FmsState, line: number, side: 'L' | 'R', sp: string): FmsState {
  if (!sp || line === 6) return sp ? fail(s) : s;
  const rows = [...s.rows];
  const open = rows.length > 0 && !rows[rows.length - 1].to ? rows.length - 1 : rows.length;
  if (line - 1 !== open) return fail(s);
  const from = open === 0 ? undefined : rows[open - 1].to;
  if (side === 'L') {
    const airway = AIRWAYS[sp];
    if (!airway || (from && !airway.includes(from))) return fail(s, 'NOT IN DATABASE');
    rows[open] = { via: sp, to: '' };
    return modify(s, { rows });
  }
  const via = rows[open]?.via;
  if (via ? !AIRWAYS[via].includes(sp) : !FIXES.has(sp)) return fail(s, 'NOT IN DATABASE');
  rows[open] = { via, to: sp };
  return modify(s, { rows, plan: withRoute(s.plan, rows, AIRWAYS, s.dest) });
}

export function departureLists(s: FmsState) {
  return { sids: (SIDS[s.origin ?? ''] ?? []).map((p) => p.id), runways: (RUNWAYS[s.origin ?? ''] ?? []).slice(0, LIST_ROWS) };
}

function departures(s: FmsState, line: number, side: 'L' | 'R', sp: string): FmsState {
  if (sp) return fail(s);
  const { sids, runways } = departureLists(s);
  if (side === 'R') return runways[line - 1] ? modify(s, { runway: runways[line - 1] }) : s;
  const sid = SIDS[s.origin ?? '']?.find((p) => p.id === sids[line - 1]);
  return sid ? modify(s, { sid: sid.id, plan: withSid(s.plan, s.sid, sid) }) : s;
}

export function arrivalLists(s: FmsState) {
  return { stars: (STARS[s.dest ?? ''] ?? []).map((p) => p.id), approaches: (APPROACHES[s.dest ?? ''] ?? []).map((p) => p.id) };
}

function arrivals(s: FmsState, line: number, side: 'L' | 'R', sp: string): FmsState {
  if (sp || !s.dest) return sp ? fail(s) : s;
  const { stars, approaches } = arrivalLists(s);
  const picked = side === 'L' ? stars[line - 1] : approaches[line - 1];
  if (!picked) return s;
  const next = side === 'L' ? { ...s, star: picked } : { ...s, appr: picked };
  const ids = new Set([...(STARS[s.dest] ?? []), ...(APPROACHES[s.dest] ?? [])].map((p) => p.id));
  const star = STARS[s.dest]?.find((p) => p.id === next.star);
  const appr = APPROACHES[s.dest]?.find((p) => p.id === next.appr);
  return modify(next, { plan: withArrival(s.plan, s.dest, ids, star, appr) });
}

/** What LEGS lists: after the origin on the ground, from the active leg in the air. */
export function listedLegs(s: FmsState): Leg[] {
  return s.active !== undefined ? s.plan.slice(s.active) : s.plan.slice(1);
}

function legsPages(s: FmsState): number {
  return Math.max(1, Math.ceil(listedLegs(s).length / LIST_ROWS));
}

function legs(s: FmsState, line: number, side: 'L' | 'R', sp: string): FmsState {
  if (line === 6 || side !== 'L') return sp ? fail(s) : s;
  const leg = listedLegs(s)[s.sub * LIST_ROWS + line - 1];
  const at = leg ? s.plan.indexOf(leg) : -1;
  if (!sp) return leg && leg.kind !== 'disco' ? { ...s, scratchpad: leg.ident } : s;
  if (sp === 'DELETE') {
    if (!leg || leg.kind === 'airport') return fail(s);
    return modify(s, { plan: s.plan.filter((_, i) => i !== at) });
  }
  if (!FIXES.has(sp) && !AIRPORTS.has(sp)) return fail(s, 'NOT IN DATABASE');
  if (leg?.kind === 'disco') return modify(s, { plan: closeGap(s.plan, at, sp) });
  if (line === 1 && s.sub === 0) return modify(s, directTo(s.plan, s.active, sp));
  return fail(s);
}

/** Waypoints ahead, offered as direct-to choices. */
export function directChoices(s: FmsState): string[] {
  return listedLegs(s)
    .filter((leg) => leg.kind === 'fix')
    .map((leg) => leg.ident)
    .slice(0, LIST_ROWS);
}

function direct(s: FmsState, line: number, side: 'L' | 'R', sp: string): FmsState {
  if (side !== 'L' || line === 6) return sp ? fail(s) : s;
  let target: string | undefined;
  if (sp) {
    if (line !== 1) return fail(s);
    if (!FIXES.has(sp)) return fail(s, 'NOT IN DATABASE');
    target = sp;
  } else {
    target = directChoices(s)[line - 1];
  }
  if (!target) return s;
  return modify(s, { ...directTo(s.plan, s.active, target), page: 'LEGS', sub: 0 });
}

export function grossWeight(s: FmsState): number | undefined {
  return s.pax !== undefined && s.cargo !== undefined ? BOW + FUEL + s.pax * PAX_WEIGHT + s.cargo : undefined;
}

function perfInit(s: FmsState, key: string, sp: string): FmsState {
  if (key === '2L' && sp) return /^\d$/.test(sp) ? done(s, { pax: Number(sp) }) : fail(s);
  if (key === '3L' && sp) return /^\d{1,4}$/.test(sp) ? done(s, { cargo: Number(sp) }) : fail(s);
  if (key === '6L' && !sp) return { ...s, page: 'PERF MENU', sub: 0 };
  return sp ? fail(s) : s;
}

/** Wind, OAT and QNH entries on page 1 of TAKEOFF REF and APPROACH REF. */
function conditions(c: Conditions, key: string, sp: string): Conditions | 'invalid' | undefined {
  if (key === '1R') return /^\d{3}\/\d{1,2}$/.test(sp) ? { ...c, wind: sp } : 'invalid';
  if (key === '2R') return /^[+-]?\d{1,2}$/.test(sp) ? { ...c, oat: sp } : 'invalid';
  if (key === '3R') return /^(\d{2}\.\d{2}|\d{4})$/.test(sp) ? { ...c, qnh: sp } : 'invalid';
  return undefined;
}

function takeoff(s: FmsState, key: string, sp: string): FmsState {
  if (s.sub === 0 && sp) {
    const next = conditions(s.takeoff, key, sp);
    if (next === 'invalid' || !next) return fail(s);
    return done(s, { takeoff: next });
  }
  if (s.sub === 1 && key === '2L' && sp) return /^(0|15)$/.test(sp) ? done(s, { flaps: sp }) : fail(s);
  if (s.sub === 2 && key === '6R' && !sp && takeoffReady(s)) return { ...s, takeoff: { ...s.takeoff, sent: true } };
  return sp ? fail(s) : s;
}

export function takeoffReady(s: FmsState): boolean {
  const t = s.takeoff;
  return !!(t.wind && t.oat && t.qnh && s.flaps && grossWeight(s));
}

function approach(s: FmsState, key: string, sp: string): FmsState {
  if (s.sub === 0 && sp) {
    const next = conditions(s.landing, key, sp);
    if (next === 'invalid' || !next) return fail(s);
    return done(s, { landing: next });
  }
  if (s.sub === 1 && key === '6R' && !sp && landingReady(s)) return { ...s, landing: { ...s.landing, sent: true } };
  return sp ? fail(s) : s;
}

export function landingReady(s: FmsState): boolean {
  const l = s.landing;
  return !!(l.wind && l.oat && l.qnh && s.appr);
}

/* ================================================================ render */

const blank: McduLine = {};
const cell = (text: string, color: McduColor = 'white', small?: boolean): McduCell => ({ text, color, small });
const label = (text: string): McduCell => cell(text, 'white', true);
const boxes = (n: number) => cell('□'.repeat(n));
const entered = (value: string | undefined, placeholder: McduCell): McduCell => (value ? cell(value, 'cyan') : placeholder);
const sixLines = (lines: McduLine[]): McduLine[] => [...lines, ...Array(6).fill(blank)].slice(0, 6);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function planTitle(s: FmsState, name: string): string {
  if (s.pending) return `MOD ${name}`;
  return s.activated ? `ACT ${name}` : name;
}

/** Headwind and crosswind components, for the RWY WIND line. */
function runwayWind(wind: string | undefined, runway: string | undefined): string {
  const match = wind && /^(\d{3})\/(\d{1,2})$/.exec(wind);
  if (!match || !runway) return '---';
  const heading = Number(runway.slice(0, 2)) * 10;
  const angle = ((Number(match[1]) - heading) * Math.PI) / 180;
  const speed = Number(match[2]);
  const head = Math.round(speed * Math.cos(angle));
  const cross = Math.round(speed * Math.sin(angle));
  return `${Math.abs(head)}${head >= 0 ? 'H' : 'T'} ${Math.abs(cross)}${cross >= 0 ? 'R' : 'L'}`;
}

function conditionLines(c: Conditions, runway: string | undefined, first: McduLine): McduLine[] {
  return [
    { ...first, labelR: label('WIND'), valueR: entered(c.wind && `${c.wind.replace('/', '°/')}`, cell('---°/--', 'cyan')) },
    { labelL: label('RWY ID'), valueL: cell(runway ? `RW${runway}` : '----', 'green'), labelR: label('OAT'), valueR: entered(c.oat && `${c.oat}°C`, cell('---°C', 'cyan')) },
    { labelL: label('RWY WIND'), valueL: cell(runwayWind(c.wind, runway), 'green', true), labelR: label('QNH'), valueR: entered(c.qnh, cell('--.--', 'cyan')) },
    { labelL: label('RWY SLOPE'), valueL: cell('-0.2%', 'green', true), labelR: label('P ALT'), valueR: cell(c.qnh ? '10 FT' : '---- FT', 'green', true) },
    { labelL: label('RWY COND'), valueL: cell('DRY', 'cyan', true) },
  ];
}

export function render(s: FmsState): McduScreen {
  return { ...page(s), scratchpad: cell(s.message ?? s.scratchpad) };
}

function page(s: FmsState): Omit<McduScreen, 'scratchpad'> {
  const pageNo = (n: number) => label(`${s.sub + 1}/${n}`);
  switch (s.page) {
    case 'STATUS':
      return {
        title: cell('STATUS'),
        lines: sixLines([
          { labelL: label('NAV DATA'), valueL: cell('TRAINING', 'green') },
          { labelL: label('ACTIVE DATA BASE'), valueL: cell('TRAINING', 'green') },
          { labelL: label('SEC DATA BASE'), valueL: cell('TRAINING', 'green', true) },
          blank,
          blank,
          { valueL: cell('<INDEX'), valueR: cell('POS INIT>') },
        ]),
      };

    case 'INDEX':
      return {
        title: cell('INDEX'),
        titleR: label('1/2'),
        lines: sixLines([
          { valueL: cell('<STATUS'), valueR: cell('GNSS CTL>') },
          { valueL: cell('<POS INIT'), valueR: cell('FREQUENCY>') },
          { valueL: cell('<VOR CTL'), valueR: cell('FIX>') },
          { valueL: cell('<ROUTE MENU'), valueR: cell('HOLD>') },
        ]),
      };

    case 'POS INIT':
      return {
        title: cell('POS INIT'),
        titleR: label('1/1'),
        lines: sixLines([
          { labelL: label('FMS POS'), valueL: s.posLoaded ? cell(GNSS_POSITION, 'cyan') : cell('□□□°□□.□ □□□□°□□.□') },
          { labelL: label('AIRPORT'), valueL: cell('-----') },
          { labelL: label('GNSS1 POS'), valueL: cell(GNSS_POSITION, 'green', true), valueR: cell('LOAD>') },
          blank,
          blank,
          { valueL: cell('<INDEX'), valueR: s.posLoaded ? cell('FPLN>') : undefined },
        ]),
      };

    case 'FPLN': {
      const title = cell(planTitle(s, 'FPLN'));
      if (s.sub === 0) {
        return {
          title,
          titleR: pageNo(2),
          lines: sixLines([
            { labelL: label('ORIGIN'), valueL: entered(s.origin, boxes(4)), labelR: label('DEST'), valueR: entered(s.dest, boxes(4)) },
            { labelL: label('ROUTE'), valueL: cell('----------'), labelR: label('DIST'), valueR: cell(s.dest ? '171' : '---', 'green', true) },
            { labelL: label('ORIG RWY'), valueL: entered(s.runway && `RW${s.runway}`, cell('----')), labelR: label('FLT ID'), valueR: cell('--------') },
            blank,
            blank,
            { valueL: cell('<SEC FPLN'), valueR: cell('PERF INIT>') },
          ]),
        };
      }
      const rows: McduLine[] = s.rows.map((row) => ({
        labelL: label('VIA'),
        labelR: label('TO'),
        valueL: cell(row.via ?? 'DIRECT', 'cyan'),
        valueR: row.to ? cell(row.to, 'cyan') : boxes(5),
      }));
      if (rows.length < 5 && (s.rows.length === 0 || s.rows[s.rows.length - 1].to)) {
        rows.push({ labelL: label('VIA'), labelR: label('TO'), valueL: cell('-----'), valueR: cell('-----') });
      }
      return { title, titleR: pageNo(2), lines: sixLines([...rows, ...Array(5).fill(blank)].slice(0, 5).concat({ valueL: cell('<SEC FPLN') })) };
    }

    case 'DEP ARR':
      return {
        title: cell('DEP/ARR INDEX'),
        lines: sixLines([
          { labelC: label('ACT FPLN'), valueL: cell('<DEP'), valueC: cell(s.origin ?? '----'), valueR: cell('ARR>') },
          { valueC: cell(s.dest ?? '----'), valueR: cell('ARR>') },
        ]),
      };

    case 'DEPARTURES':
    case 'ARRIVALS': {
      const dep = s.page === 'DEPARTURES';
      const { sids, runways } = departureLists(s);
      const { stars, approaches } = arrivalLists(s);
      const left = dep ? sids : stars;
      const right = dep ? runways : approaches;
      const selL = dep ? s.sid : s.star;
      const selR = dep ? s.runway : s.appr;
      const mark = s.pending ? '<SEL>' : '<ACT>';
      const lines: McduLine[] = Array.from({ length: LIST_ROWS }, (_, i) => ({
        labelL: i === 0 ? label(dep ? 'DEPARTURES' : 'STARS') : undefined,
        labelR: i === 0 ? label(dep ? 'RUNWAYS' : 'APPROACHES') : undefined,
        valueL: left[i] ? cell(left[i] === selL ? `${left[i]} ${mark}` : left[i], left[i] === selL ? 'green' : 'cyan') : undefined,
        valueR: right[i] ? cell(right[i] === selR ? `${mark} ${right[i]}` : right[i], right[i] === selR ? 'green' : 'cyan') : undefined,
      }));
      return {
        title: cell(`${dep ? s.origin : s.dest} ${dep ? 'DEPARTURE' : 'ARRIVAL'}`),
        titleR: label('1/1'),
        lines: [...lines, { valueL: cell('<DEP ARR IDX') }],
      };
    }

    case 'LEGS': {
      const shown = listedLegs(s).slice(s.sub * LIST_ROWS, (s.sub + 1) * LIST_ROWS);
      const lines: McduLine[] = shown.map((leg) => {
        if (leg.kind === 'disco') return { labelC: label('DISCONTINUITY'), valueL: boxes(5) };
        const active = s.active !== undefined && s.plan.indexOf(leg) === s.active;
        return {
          labelL: label(leg.via && leg.via !== 'DIRECT' ? leg.via : ''),
          valueL: cell(leg.ident, active ? 'magenta' : 'green'),
          valueR: cell('---/-----', 'cyan', true),
        };
      });
      while (lines.length < LIST_ROWS) lines.push(blank);
      lines.push({ valueL: cell('<SEC FPLN'), valueR: cell('LEG WIND>') });
      return { title: cell(planTitle(s, 'LEGS')), titleR: label(`${s.sub + 1}/${legsPages(s)}`), lines };
    }

    case 'DIR':
      return {
        title: cell(planTitle(s, 'DIRECT-TO')),
        titleR: label('1/1'),
        lines: sixLines(directChoices(s).map((ident, i) => ({ labelL: i === 0 ? label('FPLN WPTS') : undefined, valueL: cell(ident, 'green') }))),
      };

    case 'PERF MENU':
      return {
        title: cell('PERFORMANCE MENU'),
        titleR: label('1/1'),
        lines: sixLines([
          { valueL: cell('<PERF INIT'), valueR: cell('TAKEOFF>') },
          { valueL: cell('<VNAV SETUP'), valueR: cell('APPROACH>') },
          { valueL: cell('<FUEL MGMT') },
          { valueL: cell('<FLT LOG') },
        ]),
      };

    case 'PERF INIT': {
      const gw = grossWeight(s);
      return {
        title: cell('PERF INIT'),
        titleR: label('1/1'),
        lines: sixLines([
          { labelL: label('BOW'), valueL: cell(`${BOW} LB`, 'cyan', true), labelR: label('CRZ ALT'), valueR: cell('FL410', 'cyan', true) },
          { labelL: label('PASS/WT'), valueL: s.pax !== undefined ? cell(`${s.pax}/${PAX_WEIGHT}`, 'cyan') : cell(`□/${PAX_WEIGHT}`) },
          { labelL: label('CARGO'), valueL: s.cargo !== undefined ? cell(`${s.cargo} LB`, 'cyan') : cell('□□□□ LB') },
          { labelL: label('SENSED FUEL'), valueL: cell(`${FUEL} LB`, 'green', true) },
          { labelL: label('GROSS WT'), valueL: cell(gw ? `${gw} LB` : '----- LB', 'green') },
          { valueL: cell('<PERF MENU') },
        ]),
      };
    }

    case 'TAKEOFF': {
      const title = cell('TAKEOFF REF');
      if (s.sub === 0) {
        return { title, titleR: pageNo(3), lines: sixLines(conditionLines(s.takeoff, s.runway, { labelL: label('DEP APT'), valueL: cell(s.origin ?? '----', 'green') }).concat({ valueL: cell('<PERF MENU') })) };
      }
      if (s.sub === 1) {
        const gw = grossWeight(s);
        return {
          title,
          titleR: pageNo(3),
          lines: sixLines([
            { labelL: label('A/I'), valueL: cell('OFF', 'cyan'), labelR: label('TOFL'), valueR: cell(takeoffReady(s) ? '3920 FT' : '---- FT', 'green', true) },
            { labelL: label('T/O FLAPS'), valueL: entered(s.flaps, boxes(2)), labelR: label('RWY LENGTH'), valueR: cell('6013 FT', 'green', true) },
            { labelL: label('TOW'), valueL: cell(gw ? `${gw} LB` : '----- LB', 'green') },
            { labelL: label('MAX TOW'), valueL: cell('17110 LB', 'green', true) },
            blank,
            { valueL: cell('<PERF MENU') },
          ]),
        };
      }
      const ready = takeoffReady(s);
      const v = (k: keyof typeof TAKEOFF_SPEEDS): McduLine => ({ labelL: label(k), valueL: cell(ready ? TAKEOFF_SPEEDS[k] : '---', ready ? 'green' : 'white') });
      return {
        title,
        titleR: pageNo(3),
        lines: [
          v('V1'),
          v('VR'),
          v('V2'),
          v('VT'),
          s.takeoff.sent ? { valueR: cell('SENT TO PFD', 'green', true) } : blank,
          { valueL: cell('<PERF MENU'), valueR: ready ? cell('SEND>') : undefined },
        ],
      };
    }

    case 'APPROACH': {
      const title = cell('APPROACH REF');
      const runway = APPROACHES[s.dest ?? '']?.find((p) => p.id === s.appr)?.runway;
      if (s.sub === 0) {
        return { title, titleR: pageNo(2), lines: sixLines(conditionLines(s.landing, runway, { labelL: label('SEL APT'), valueL: cell(s.dest ?? '----', 'green') }).concat({ valueL: cell('<PERF MENU') })) };
      }
      const ready = landingReady(s);
      return {
        title,
        titleR: pageNo(2),
        lines: [
          { labelL: label('LW'), valueL: cell('14500 LB', 'green') },
          { labelL: label('LDG FLAPS'), valueL: cell('35°', 'cyan') },
          { labelL: label('VREF'), valueL: cell(ready ? LANDING_SPEEDS.VREF : '---', ready ? 'green' : 'white') },
          { labelL: label('VAPP'), valueL: cell(ready ? LANDING_SPEEDS.VAPP : '---', ready ? 'green' : 'white') },
          s.landing.sent ? { valueR: cell('SENT TO PFD', 'green', true) } : blank,
          { valueL: cell('<PERF MENU'), valueR: ready ? cell('SEND>') : undefined },
        ],
      };
    }

    default:
      return {
        title: cell(s.otherTitle ?? ''),
        lines: sixLines([blank, blank, { valueC: cell('NOT SIMULATED') }, { valueC: cell('IN THE TRAINER', 'white', true) }]),
      };
  }
}

/* =============================================================== trainer */

function enterPhase(s: FmsState, phase: FlightPhase, activeLeg?: string, keepPage?: boolean): FmsState {
  const active = activeLeg ? s.plan.findIndex((leg) => leg.ident === activeLeg) : -1;
  return {
    ...s,
    phase,
    active: active >= 0 ? active : undefined,
    page: keepPage ? s.page : phase === 'preflight' ? 'STATUS' : 'LEGS',
    sub: keepPage ? s.sub : 0,
    scratchpad: '',
    message: undefined,
  };
}

export const cj4Sim: TrainerSim<FmsState> = {
  initial: INITIAL_STATE,
  press: pressKey,
  render,
  isTypingKey,
  scrollKeys: ['PREV', 'NEXT'],
  scratchpad: (s) => s.scratchpad,
  message: (s) => s.message,
  enterPhase,
  lit: (s) => (s.pending ? ['EXEC'] : []),
};
