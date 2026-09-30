/**
 * A simplified Garmin G1000 NXi. Pure functions over an immutable state:
 * `pressKey` returns the next state and `render` draws the PFD strip and MFD.
 *
 * Everything is driven by a cursor, the way the real unit is: the outer FMS
 * knob moves it, the inner knob changes what is under it, ENT selects. Only
 * what the scripted procedures use is simulated.
 */
import type { FlightPhase, GarminRow, GarminScreen, McduCell, McduColor, TrainerSim } from '../screen';
import { AIRPORTS, APPROACHES, FIXES, RUNWAYS, SIDS, STARS, type Procedure } from './navdata';

/** Characters the inner knob cycles through, starting from blank. */
const ALPHABET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const IDENT_LENGTH = 6;
const CCW = ' ↺';
export const PROC_MENU = [
  'SELECT APPROACH',
  'ACTIVATE APPROACH',
  'ACTIVATE VECTOR-TO-FINAL',
  'ACTIVATE MISSED APPROACH',
  'SELECT ARRIVAL',
  'SELECT DEPARTURE',
];
export const FPL_MENU = ['LOAD AIRWAY', 'ACTIVATE LEG', 'STORE FLIGHT PLAN', 'DELETE FLIGHT PLAN'];

type ProcKind = 'departure' | 'arrival' | 'approach';

interface Field {
  name: string;
  options: string[];
  index: number;
}

type Window =
  | { kind: 'entry'; purpose: 'fpl' | 'direct'; chars: string[]; cursor: number }
  | { kind: 'direct'; ident: string; focus: 0 | 1 }
  | { kind: 'menu'; title: string; items: string[]; focus: number }
  | { kind: 'proc'; proc: ProcKind; fields: Field[]; buttons: string[]; focus: number };

export interface Leg {
  ident: string;
  section: 'departure' | 'enroute' | 'arrival' | 'approach';
  via?: string;
}

export interface G1000State {
  page: 'MAP' | 'FPL';
  window?: Window;
  /** FPL cursor: a leg index, or legs.length for the empty row at the end. Undefined when off. */
  cursor?: number;
  message?: string;
  phase: FlightPhase;
  /** Waypoints entered by hand, origin first and destination last. */
  enroute: string[];
  sid?: string;
  depRunway?: string;
  star?: string;
  arrRunway?: string;
  appr?: string;
  apprTransition?: string;
  /** Index into `legs()` of the leg being flown to. */
  active?: number;
  /** A direct-to waypoint off the flight plan. */
  direct?: string;
  nav1Active: string;
  nav1Standby: string;
  cdi: 'GPS' | 'LOC1';
  lateral: string;
  vertical: string;
  armed: string;
}

export const INITIAL_STATE: G1000State = {
  page: 'MAP',
  phase: 'preflight',
  enroute: [],
  nav1Active: '117.90',
  nav1Standby: '108.00',
  cdi: 'GPS',
  lateral: 'ROL',
  vertical: 'PIT',
  armed: '',
};

export function isTypingKey(key: string): boolean {
  return /^[A-Z0-9]$/.test(key);
}

const origin = (s: G1000State) => s.enroute[0];
const destination = (s: G1000State) => (s.enroute.length > 1 ? s.enroute[s.enroute.length - 1] : undefined);
const find = (list: Procedure[] | undefined, id?: string) => list?.find((p) => p.id === id);

/** The whole flight plan as flown, procedures included. */
export function legs(s: G1000State): Leg[] {
  const org = origin(s);
  if (!org) return [];
  const dest = destination(s);
  const out: Leg[] = [{ ident: org, section: 'enroute' }];
  for (const fix of find(SIDS[org], s.sid)?.fixes ?? []) out.push({ ident: fix, section: 'departure', via: s.sid });
  for (const fix of s.enroute.slice(1, dest ? -1 : undefined)) out.push({ ident: fix, section: 'enroute' });
  if (dest) {
    const star = find(STARS[dest], s.star);
    for (const fix of star?.fixes ?? []) out.push({ ident: fix, section: 'arrival', via: s.star });
    const appr = APPROACHES[dest]?.find((p) => p.id === s.appr);
    for (const fix of appr?.fixes ?? []) out.push({ ident: fix, section: 'approach', via: s.appr });
    out.push({ ident: dest, section: 'enroute' });
  }
  return out;
}

/* ================================================================== keys */

export function pressKey(state: G1000State, key: string): G1000State {
  const s: G1000State = { ...state, message: undefined };
  const w = s.window;

  if (w?.kind === 'entry') return entryKey(s, w, key);
  if (isTypingKey(key)) return s;

  switch (key) {
    case 'FPL':
      return { ...s, page: s.page === 'FPL' ? 'MAP' : 'FPL', window: undefined, cursor: undefined };
    case 'D→':
      return { ...s, window: { kind: 'entry', purpose: 'direct', chars: Array(IDENT_LENGTH).fill(' '), cursor: 0 } };
    case 'PROC':
      return { ...s, window: { kind: 'menu', title: 'PROCEDURES', items: PROC_MENU, focus: 0 } };
    case 'MENU':
      if (s.page === 'FPL' && s.cursor !== undefined) return { ...s, window: { kind: 'menu', title: 'PAGE MENU', items: FPL_MENU, focus: 0 } };
      return s;
    case 'CLR':
      return w ? { ...s, window: undefined } : s;
    case 'PUSH CRSR':
      if (w) return { ...s, window: undefined };
      if (s.page !== 'FPL') return s;
      return { ...s, cursor: s.cursor !== undefined ? undefined : (s.active ?? legs(s).length) };
    case 'ENT':
      return w ? enter(s, w) : s;
    case 'FMS outer':
    case `FMS outer${CCW}`:
      return outer(s, key.endsWith(CCW) ? -1 : 1);
    case 'FMS inner':
    case `FMS inner${CCW}`:
      return inner(s, key.endsWith(CCW) ? -1 : 1);
    case 'CDI':
      return { ...s, cdi: s.cdi === 'GPS' && isIls(s) ? 'LOC1' : 'GPS' };
    case 'HDG':
      return { ...s, lateral: 'HDG' };
    case 'NAV':
      return { ...s, lateral: s.cdi === 'GPS' ? 'GPS' : 'LOC' };
    case 'ALT':
      return { ...s, vertical: 'ALT' };
    case 'APR':
      return { ...s, armed: s.cdi === 'LOC1' ? 'LOC GS' : s.appr ? 'GPS GP' : 'GPS' };
    default:
      return s;
  }
}

function isIls(s: G1000State): boolean {
  return !!s.appr?.startsWith('ILS');
}

function entryKey(s: G1000State, w: Extract<Window, { kind: 'entry' }>, key: string): G1000State {
  const chars = [...w.chars];
  const set = (patch: Partial<typeof w>): G1000State => ({ ...s, window: { ...w, chars, ...patch } });
  if (isTypingKey(key)) {
    // The spelling shortcut: the same as turning the inner knob to this letter, then the outer one step on.
    chars[w.cursor] = key;
    return set({ cursor: Math.min(w.cursor + 1, IDENT_LENGTH - 1) });
  }
  switch (key) {
    case 'FMS inner':
    case `FMS inner${CCW}`: {
      const step = key.endsWith(CCW) ? -1 : 1;
      const at = ALPHABET.indexOf(chars[w.cursor]);
      chars[w.cursor] = ALPHABET[(at + step + ALPHABET.length) % ALPHABET.length];
      return set({});
    }
    case 'FMS outer':
    case `FMS outer${CCW}`:
      return set({ cursor: clamp(w.cursor + (key.endsWith(CCW) ? -1 : 1), 0, IDENT_LENGTH - 1) });
    case 'CLR':
      if (chars[w.cursor] !== ' ') {
        chars[w.cursor] = ' ';
        return set({});
      }
      if (w.cursor === 0) return { ...s, window: undefined };
      chars[w.cursor - 1] = ' ';
      return set({ cursor: w.cursor - 1 });
    case 'ENT': {
      const ident = chars.join('').trim();
      if (!FIXES.has(ident) && !AIRPORTS.has(ident)) return { ...s, message: 'WAYPOINT NOT FOUND' };
      if (w.purpose === 'direct') return { ...s, window: { kind: 'direct', ident, focus: 1 } };
      return insertWaypoint(s, ident);
    }
    case 'PUSH CRSR':
      return { ...s, window: undefined };
    default:
      return s;
  }
}

/** A waypoint entered on FPL goes in before the row under the cursor, or at the end. */
function insertWaypoint(s: G1000State, ident: string): G1000State {
  const all = legs(s);
  const slot = s.cursor ?? all.length;
  const at = all[slot];
  const enroute = [...s.enroute];
  const before = at && at.section === 'enroute' ? enroute.indexOf(at.ident) : -1;
  if (before >= 0) enroute.splice(before, 0, ident);
  else enroute.push(ident);
  return { ...s, enroute, window: undefined, cursor: slot + 1 };
}

function inner(s: G1000State, step: number): G1000State {
  const w = s.window;
  if (w?.kind === 'proc') {
    // Reached by the outer knob rather than ENT, the transition list may not be filled in yet.
    const fields = withTransitions(w.fields, destination(s));
    const field = fields[w.focus];
    if (!field || field.options.length === 0) return { ...s, window: { ...w, fields } };
    fields[w.focus] = { ...field, index: (field.index + step + field.options.length) % field.options.length };
    return { ...s, window: { ...w, fields } };
  }
  // On FPL with the cursor out, the inner knob opens the waypoint entry box.
  if (!w && s.page === 'FPL' && s.cursor !== undefined) {
    return { ...s, window: { kind: 'entry', purpose: 'fpl', chars: Array(IDENT_LENGTH).fill(' '), cursor: 0 } };
  }
  return s;
}

function outer(s: G1000State, step: number): G1000State {
  const w = s.window;
  if (w?.kind === 'menu') return { ...s, window: { ...w, focus: clamp(w.focus + step, 0, w.items.length - 1) } };
  if (w?.kind === 'proc') return { ...s, window: { ...w, focus: clamp(w.focus + step, 0, w.fields.length + w.buttons.length - 1) } };
  if (w?.kind === 'direct') return { ...s, window: { ...w, focus: clamp(w.focus + step, 0, 1) as 0 | 1 } };
  if (!w && s.page === 'FPL' && s.cursor !== undefined) return { ...s, cursor: clamp(s.cursor + step, 0, legs(s).length) };
  return s;
}

function procWindow(s: G1000State, proc: ProcKind): G1000State {
  const org = origin(s);
  const dest = destination(s);
  const field = (name: string, options: string[]): Field => ({ name, options, index: 0 });
  if (proc === 'departure') {
    if (!org) return { ...s, window: undefined, message: 'NO ORIGIN' };
    return {
      ...s,
      window: {
        kind: 'proc',
        proc,
        fields: [field('DEPARTURE', (SIDS[org] ?? []).map((p) => p.id)), field('RUNWAY', RUNWAYS[org] ?? [])],
        buttons: ['LOAD?'],
        focus: 0,
      },
    };
  }
  if (!dest) return { ...s, window: undefined, message: 'NO DESTINATION' };
  if (proc === 'arrival') {
    return {
      ...s,
      window: {
        kind: 'proc',
        proc,
        fields: [field('ARRIVAL', (STARS[dest] ?? []).map((p) => p.id)), field('RUNWAY', RUNWAYS[dest] ?? [])],
        buttons: ['LOAD?'],
        focus: 0,
      },
    };
  }
  return {
    ...s,
    window: {
      kind: 'proc',
      proc,
      fields: [field('APPROACH', (APPROACHES[dest] ?? []).map((p) => p.id)), field('TRANSITION', [])],
      buttons: ['LOAD?', 'ACTIVATE?'],
      focus: 0,
    },
  };
}

/** The transition list follows whichever approach is chosen. */
function withTransitions(fields: Field[], dest: string | undefined): Field[] {
  if (fields[0]?.name !== 'APPROACH') return fields;
  const appr = APPROACHES[dest ?? '']?.find((p) => p.id === fields[0].options[fields[0].index]);
  const options = appr?.transitions ?? [];
  const current = fields[1].options[fields[1].index];
  return [fields[0], { ...fields[1], options, index: Math.max(0, options.indexOf(current)) }];
}

function enter(s: G1000State, w: Window): G1000State {
  if (w.kind === 'menu') return menuChoice({ ...s, window: undefined }, w.items[w.focus]);
  if (w.kind === 'direct') {
    if (w.focus === 0) return { ...s, window: { ...w, focus: 1 } };
    return { ...s, window: undefined, direct: w.ident, active: undefined };
  }
  if (w.kind === 'proc') {
    if (w.focus < w.fields.length) {
      const fields = withTransitions(w.fields, destination(s));
      return { ...s, window: { ...w, fields, focus: w.focus + 1 } };
    }
    return loadProcedure(s, w, w.buttons[w.focus - w.fields.length]);
  }
  return s;
}

function menuChoice(s: G1000State, item: string): G1000State {
  switch (item) {
    case 'SELECT DEPARTURE':
      return procWindow(s, 'departure');
    case 'SELECT ARRIVAL':
      return procWindow(s, 'arrival');
    case 'SELECT APPROACH':
      return procWindow(s, 'approach');
    case 'ACTIVATE VECTOR-TO-FINAL':
    case 'ACTIVATE APPROACH': {
      if (!s.appr) return { ...s, message: 'NO APPROACH LOADED' };
      const all = legs(s);
      const first = all.findIndex((leg) => leg.section === 'approach');
      return { ...s, active: first, direct: undefined };
    }
    case 'ACTIVATE LEG':
      return s.cursor !== undefined && s.cursor < legs(s).length ? { ...s, active: s.cursor, direct: undefined } : s;
    default:
      return { ...s, message: 'NOT SIMULATED' };
  }
}

function loadProcedure(s: G1000State, w: Extract<Window, { kind: 'proc' }>, button: string): G1000State {
  const fields = withTransitions(w.fields, destination(s));
  const value = (i: number) => fields[i]?.options[fields[i].index];
  const closed: G1000State = { ...s, window: undefined };
  if (w.proc === 'departure') return { ...closed, sid: value(0), depRunway: value(1) };
  if (w.proc === 'arrival') return { ...closed, star: value(0), arrRunway: value(1) };
  const appr = APPROACHES[destination(s) ?? '']?.find((p) => p.id === value(0));
  // The NXi tunes the localiser for an ILS as the approach loads.
  const loaded: G1000State = {
    ...closed,
    appr: value(0),
    apprTransition: value(1),
    nav1Active: appr?.frequency ?? s.nav1Active,
    nav1Standby: appr?.frequency ? s.nav1Active : s.nav1Standby,
  };
  if (button !== 'ACTIVATE?') return loaded;
  return { ...loaded, active: legs(loaded).findIndex((leg) => leg.section === 'approach'), direct: undefined };
}

/* ================================================================= picks */

/** Whether `text` is under the cursor, and if not, the knob turn that moves towards it. */
export function pick(s: G1000State, text: string): { onTarget: boolean; toward?: string } {
  const w = s.window;
  const turn = (knob: 'outer' | 'inner', from: number, to: number) => `FMS ${knob}${to < from ? CCW : ''}`;

  if (w?.kind === 'menu') {
    const at = w.items.indexOf(text);
    if (at < 0) return { onTarget: false };
    return at === w.focus ? { onTarget: true } : { onTarget: false, toward: turn('outer', w.focus, at) };
  }
  if (w?.kind === 'direct') {
    if (text !== 'ACTIVATE?') return { onTarget: false };
    return w.focus === 1 ? { onTarget: true } : { onTarget: false, toward: 'FMS outer' };
  }
  if (w?.kind === 'proc') {
    const button = w.buttons.indexOf(text);
    if (button >= 0) {
      const at = w.fields.length + button;
      return at === w.focus ? { onTarget: true } : { onTarget: false, toward: turn('outer', w.focus, at) };
    }
    const fields = withTransitions(w.fields, destination(s));
    const fieldAt = fields.findIndex((f) => f.options.includes(text));
    if (fieldAt < 0) return { onTarget: false };
    if (fieldAt !== w.focus) return { onTarget: false, toward: turn('outer', w.focus, fieldAt) };
    const field = fields[fieldAt];
    const at = field.options.indexOf(text);
    if (at === field.index) return { onTarget: true };
    // Whichever way round the list is shorter.
    const forward = (at - field.index + field.options.length) % field.options.length;
    return { onTarget: false, toward: forward <= field.options.length / 2 ? 'FMS inner' : `FMS inner${CCW}` };
  }
  if (!w && s.page === 'FPL' && s.cursor !== undefined) {
    const all = legs(s);
    const at = all.findIndex((leg, i) => leg.ident === text && (i >= s.cursor! || !all.slice(s.cursor!).some((l) => l.ident === text)));
    if (at < 0) return { onTarget: false };
    return at === s.cursor ? { onTarget: true } : { onTarget: false, toward: turn('outer', s.cursor, at) };
  }
  return { onTarget: false };
}

/* ================================================================ render */

const cell = (text: string, color: McduColor = 'white', extra?: Partial<McduCell>): McduCell => ({ text, color, ...extra });
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const VISIBLE_ROWS = 9;

/** A plausible track and distance for a leg, stable for a given ident. */
function legData(ident: string): string {
  let h = 0;
  for (const c of ident) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `${String(h % 360).padStart(3, '0')}°  ${(3 + (h % 25)).toString().padStart(2, ' ')}NM`;
}

const SECTION_TITLE = (s: G1000State, section: Leg['section']): string | undefined => {
  if (section === 'departure' && s.sid) return `Departure - ${origin(s)}-RW${s.depRunway}.${s.sid}`;
  if (section === 'arrival' && s.star) return `Arrival - ${destination(s)}-${s.star}.RW${s.arrRunway}`;
  if (section === 'approach' && s.appr) return `Approach - ${destination(s)}-${s.appr}${s.apprTransition ? ` ${s.apprTransition}` : ''}`;
  return undefined;
};

function fplRows(s: G1000State): GarminRow[] {
  const all = legs(s);
  const rows: { row: GarminRow; slot?: number }[] = [];
  let section: Leg['section'] | undefined;
  all.forEach((leg, i) => {
    if (leg.section !== section) {
      section = leg.section;
      const title = SECTION_TITLE(s, leg.section);
      if (title) rows.push({ row: { left: cell(title, 'white', { small: true }), header: true } });
    }
    const active = s.active === i && !s.direct;
    rows.push({
      slot: i,
      row: {
        left: cell(leg.ident, active ? 'magenta' : 'white', { cursor: s.cursor === i }),
        right: cell(legData(leg.ident), active ? 'magenta' : 'white', { small: true }),
      },
    });
  });
  if (s.cursor !== undefined) rows.push({ slot: all.length, row: { left: cell('_____', 'cyan', { cursor: s.cursor === all.length }) } });
  // Keep the cursor row in view.
  const cursorRow = rows.findIndex((r) => r.slot === s.cursor);
  const start = clamp(cursorRow - VISIBLE_ROWS + 2, 0, Math.max(0, rows.length - VISIBLE_ROWS));
  return rows.slice(cursorRow >= 0 ? start : 0).slice(0, VISIBLE_ROWS).map((r) => r.row);
}

function windowView(s: G1000State): GarminScreen['mfd']['window'] {
  const w = s.window;
  if (!w) return undefined;
  if (w.kind === 'entry') {
    return {
      title: w.purpose === 'direct' ? 'DIRECT TO' : 'WAYPOINT INFORMATION',
      rows: [
        { left: cell('IDENT', 'white', { small: true }), header: true },
        { cells: w.chars.map((c, i) => cell(c === ' ' ? '_' : c, 'cyan', { cursor: i === w.cursor })) },
      ],
    };
  }
  if (w.kind === 'direct') {
    return {
      title: 'DIRECT TO',
      rows: [
        { left: cell('IDENT', 'white', { small: true }), header: true },
        { left: cell(w.ident, 'cyan', { cursor: w.focus === 0 }) },
        { left: cell('ACTIVATE?', 'white', { cursor: w.focus === 1 }) },
      ],
    };
  }
  if (w.kind === 'menu') {
    return { title: w.title, rows: w.items.map((item, i) => ({ left: cell(item, 'white', { cursor: i === w.focus }) })) };
  }
  const fields = withTransitions(w.fields, destination(s));
  const rows: GarminRow[] = [];
  fields.forEach((f, i) => {
    rows.push({ left: cell(f.name, 'white', { small: true }), header: true });
    rows.push({ left: cell(f.options[f.index] ?? '-----', 'cyan', { cursor: i === w.focus }) });
  });
  rows.push({ cells: w.buttons.map((b, i) => cell(b, 'white', { cursor: fields.length + i === w.focus })) });
  return { title: `${w.proc.toUpperCase()} LOADING`, rows };
}

function mapRows(s: G1000State): GarminRow[] {
  const all = legs(s);
  const to = s.direct ?? (s.active !== undefined ? all[s.active]?.ident : undefined);
  const from = s.active !== undefined && s.active > 0 ? all[s.active - 1]?.ident : undefined;
  return [
    { left: cell('ACTIVE LEG', 'white', { small: true }), header: true },
    { left: cell(s.direct ? `DIRECT TO ${to}` : to ? `${from ?? '---'} → ${to}` : 'NO ACTIVE LEG', to ? 'magenta' : 'white') },
    { left: cell('FLIGHT PLAN', 'white', { small: true }), header: true },
    { left: cell(all.length ? `${origin(s)} / ${destination(s) ?? '----'}` : 'NO FLIGHT PLAN') },
    { left: cell(s.phase === 'preflight' ? 'ON GROUND' : 'GS 105KT   TRK 352°', 'white', { small: true }) },
  ];
}

export function render(s: G1000State): GarminScreen {
  const mfd =
    s.page === 'FPL'
      ? { title: 'ACTIVE FLIGHT PLAN', rows: fplRows(s) }
      : { title: 'MAP - NAVIGATION MAP', rows: mapRows(s) };
  const window = windowView(s);
  const message = s.message ? { title: 'MESSAGE', rows: [{ left: cell(s.message, 'amber') }] } : undefined;
  return {
    pfd: {
      nav1Active: s.nav1Active,
      nav1Standby: s.nav1Standby,
      cdi: s.cdi,
      lateral: s.lateral,
      vertical: s.vertical,
      armed: s.armed,
    },
    softkeys: ['INSET', 'PFD', 'OBS', 'CDI', 'DME', 'XPDR'],
    mfd: { ...mfd, window: message ?? window },
  };
}

/* =============================================================== trainer */

function enterPhase(s: G1000State, phase: FlightPhase, activeLeg?: string, keepPage?: boolean): G1000State {
  const active = activeLeg ? legs(s).findIndex((leg) => leg.ident === activeLeg) : -1;
  const airborne = phase !== 'preflight';
  return {
    ...s,
    phase,
    active: active >= 0 ? active : undefined,
    page: keepPage ? s.page : 'MAP',
    window: undefined,
    cursor: undefined,
    message: undefined,
    lateral: airborne ? 'GPS' : 'ROL',
    vertical: airborne ? 'ALT' : 'PIT',
    armed: '',
  };
}

export const g1000Sim: TrainerSim<G1000State, GarminScreen> = {
  initial: INITIAL_STATE,
  press: pressKey,
  render,
  isTypingKey,
  scrollKeys: [`FMS outer${CCW}`, 'FMS outer'],
  scratchpad: (s) => (s.window?.kind === 'entry' ? s.window.chars.join('').trim() : ''),
  message: (s) => s.message,
  enterPhase,
  freeKeys: ['FMS outer', `FMS outer${CCW}`, 'FMS inner', `FMS inner${CCW}`],
  keyAlias: (key) => (key.endsWith(CCW) ? key.slice(0, -CCW.length) : key),
  isCommitKey: (key) => key === 'ENT',
  pick,
  confirmKey: 'ENT',
};
