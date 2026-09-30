/**
 * The part of a Garmin navigator that the G1000 and the GNS share: a flight
 * plan built waypoint by waypoint, procedures loaded from a window of fields,
 * direct-to, and a cursor moved by the outer knob with values changed by the
 * inner one. Each unit supplies a `GarminProfile` for its key names, menu
 * wording and quirks, and draws its own screen from the pieces here.
 */
import type { FlightPhase, GarminRow, McduCell, McduColor } from '../screen';

export interface Procedure {
  id: string;
  fixes: string[];
  transitions?: string[];
}

export interface NavData {
  RUNWAYS: Record<string, string[]>;
  SIDS: Record<string, Procedure[]>;
  STARS: Record<string, Procedure[]>;
  APPROACHES: Record<string, (Procedure & { runway: string; frequency?: string })[]>;
  FIXES: Set<string>;
  AIRPORTS: Set<string>;
}

export interface GarminProfile {
  /** Knob keys turned clockwise; the same with CCW appended turns them back. */
  inner: string;
  outer: string;
  nav: NavData;
  /** The PROC menu, in order, and which item does what. */
  menu: {
    items: string[];
    departure: string;
    arrival?: string;
    approach: string;
    activateApproach: string;
    vectorsToFinal: string;
  };
  fplMenu: string[];
  activateLeg: string;
  /** A waypoint entered on the flight plan shows its information page first, and needs a second ENT. */
  confirmWaypoint: boolean;
  /** Where loading an ILS puts the localiser frequency. */
  ilsFrequencyTo: 'active' | 'standby';
  /** Keys only this unit has. Return the next state, or undefined if the key is not one of them. */
  unitKey?(s: GarminState, key: string): GarminState | undefined;
}

export const CCW = ' ↺';
/** Characters the inner knob cycles through, starting from blank. */
const ALPHABET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const IDENT_LENGTH = 6;

type ProcKind = 'departure' | 'arrival' | 'approach';

interface Field {
  name: string;
  options: string[];
  index: number;
  /** Index of the field whose choice decides this field's options: a transition list. */
  follows?: number;
}

export type GarminWindow =
  | { kind: 'entry'; purpose: 'fpl' | 'direct'; chars: string[]; cursor: number }
  | { kind: 'confirm'; ident: string }
  | { kind: 'direct'; ident: string; focus: 0 | 1 }
  | { kind: 'menu'; title: string; items: string[]; focus: number }
  | { kind: 'proc'; proc: ProcKind; fields: Field[]; buttons: string[]; focus: number };

export interface Leg {
  ident: string;
  section: 'departure' | 'enroute' | 'arrival' | 'approach';
  via?: string;
}

export interface GarminState {
  page: 'MAP' | 'FPL';
  window?: GarminWindow;
  /** Flight plan cursor: a leg index, or legs.length for the empty row at the end. Undefined when off. */
  cursor?: number;
  message?: string;
  phase: FlightPhase;
  /** Waypoints entered by hand, origin first and destination last. */
  enroute: string[];
  sid?: string;
  depRunway?: string;
  depTransition?: string;
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
  cdi: string;
  lateral: string;
  vertical: string;
  armed: string;
}

export const INITIAL_STATE: GarminState = {
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

export const origin = (s: GarminState) => s.enroute[0];
export const destination = (s: GarminState) => (s.enroute.length > 1 ? s.enroute[s.enroute.length - 1] : undefined);
const find = (list: Procedure[] | undefined, id?: string) => list?.find((p) => p.id === id);
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function createGarmin(profile: GarminProfile) {
  const { nav, inner: INNER, outer: OUTER } = profile;

  /** The whole flight plan as flown, procedures included. */
  function legs(s: GarminState): Leg[] {
    const org = origin(s);
    if (!org) return [];
    const dest = destination(s);
    const out: Leg[] = [{ ident: org, section: 'enroute' }];
    for (const fix of find(nav.SIDS[org], s.sid)?.fixes ?? []) out.push({ ident: fix, section: 'departure', via: s.sid });
    if (s.depTransition) out.push({ ident: s.depTransition, section: 'departure', via: s.sid });
    for (const fix of s.enroute.slice(1, dest ? -1 : undefined)) out.push({ ident: fix, section: 'enroute' });
    if (dest) {
      for (const fix of find(nav.STARS[dest], s.star)?.fixes ?? []) out.push({ ident: fix, section: 'arrival', via: s.star });
      const appr = nav.APPROACHES[dest]?.find((p) => p.id === s.appr);
      for (const fix of appr?.fixes ?? []) out.push({ ident: fix, section: 'approach', via: s.appr });
      out.push({ ident: dest, section: 'enroute' });
    }
    return out;
  }

  const isIls = (s: GarminState) => !!s.appr?.startsWith('ILS');

  /* ---------------------------------------------------------------- keys */

  function pressKey(state: GarminState, key: string): GarminState {
    const s: GarminState = { ...state, message: undefined };
    const w = s.window;

    if (w?.kind === 'entry') return entryKey(s, w, key);
    if (isTypingKey(key)) return s;
    const own = profile.unitKey?.(s, key);
    if (own) return own;

    switch (key) {
      case 'FPL':
        return { ...s, page: s.page === 'FPL' ? 'MAP' : 'FPL', window: undefined, cursor: undefined };
      case 'D→':
        return { ...s, window: { kind: 'entry', purpose: 'direct', chars: Array(IDENT_LENGTH).fill(' '), cursor: 0 } };
      case 'PROC':
        return { ...s, window: { kind: 'menu', title: 'PROCEDURES', items: profile.menu.items, focus: 0 } };
      case 'MENU':
        if (s.page === 'FPL' && s.cursor !== undefined) {
          return { ...s, window: { kind: 'menu', title: 'PAGE MENU', items: profile.fplMenu, focus: 0 } };
        }
        return s;
      case 'CLR':
        return w ? { ...s, window: undefined } : s;
      case 'PUSH CRSR':
        if (w) return { ...s, window: undefined };
        if (s.page !== 'FPL') return s;
        return { ...s, cursor: s.cursor !== undefined ? undefined : (s.active ?? legs(s).length) };
      case 'ENT':
        return w ? enter(s, w) : s;
      case OUTER:
      case `${OUTER}${CCW}`:
        return outer(s, key.endsWith(CCW) ? -1 : 1);
      case INNER:
      case `${INNER}${CCW}`:
        return inner(s, key.endsWith(CCW) ? -1 : 1);
      default:
        return s;
    }
  }

  function entryKey(s: GarminState, w: Extract<GarminWindow, { kind: 'entry' }>, key: string): GarminState {
    const chars = [...w.chars];
    const set = (patch: Partial<typeof w>): GarminState => ({ ...s, window: { ...w, chars, ...patch } });
    if (isTypingKey(key)) {
      // The spelling shortcut: the same as turning the inner knob to this letter, then the outer one step on.
      chars[w.cursor] = key;
      return set({ cursor: Math.min(w.cursor + 1, IDENT_LENGTH - 1) });
    }
    switch (key) {
      case INNER:
      case `${INNER}${CCW}`: {
        const step = key.endsWith(CCW) ? -1 : 1;
        const at = ALPHABET.indexOf(chars[w.cursor]);
        chars[w.cursor] = ALPHABET[(at + step + ALPHABET.length) % ALPHABET.length];
        return set({});
      }
      case OUTER:
      case `${OUTER}${CCW}`:
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
        if (!nav.FIXES.has(ident) && !nav.AIRPORTS.has(ident)) return { ...s, message: 'WAYPOINT NOT FOUND' };
        if (w.purpose === 'direct') return { ...s, window: { kind: 'direct', ident, focus: 1 } };
        if (profile.confirmWaypoint) return { ...s, window: { kind: 'confirm', ident } };
        return insertWaypoint(s, ident);
      }
      case 'PUSH CRSR':
        return { ...s, window: undefined };
      default:
        return s;
    }
  }

  /** A waypoint entered on the flight plan goes in before the row under the cursor, or at the end. */
  function insertWaypoint(s: GarminState, ident: string): GarminState {
    const all = legs(s);
    const slot = s.cursor ?? all.length;
    const at = all[slot];
    const enroute = [...s.enroute];
    const before = at && at.section === 'enroute' ? enroute.indexOf(at.ident) : -1;
    if (before >= 0) enroute.splice(before, 0, ident);
    else enroute.push(ident);
    return { ...s, enroute, window: undefined, cursor: slot + 1 };
  }

  /** Transition lists follow whichever procedure is chosen in the field before them. */
  function withTransitions(s: GarminState, w: Extract<GarminWindow, { kind: 'proc' }>): Field[] {
    const fields = [...w.fields];
    fields.forEach((field, i) => {
      if (field.follows === undefined) return;
      const parent = fields[field.follows];
      const chosen = parent.options[parent.index];
      const place = w.proc === 'departure' ? origin(s) : destination(s);
      const list: Procedure[] =
        w.proc === 'departure' ? nav.SIDS[place ?? ''] ?? [] : w.proc === 'approach' ? nav.APPROACHES[place ?? ''] ?? [] : nav.STARS[place ?? ''] ?? [];
      const options = list.find((p) => p.id === chosen)?.transitions ?? [];
      const current = field.options[field.index];
      fields[i] = { ...field, options, index: Math.max(0, options.indexOf(current)) };
    });
    return fields;
  }

  function inner(s: GarminState, step: number): GarminState {
    const w = s.window;
    if (w?.kind === 'proc') {
      // Reached by the outer knob rather than ENT, a transition list may not be filled in yet.
      const fields = withTransitions(s, w);
      const field = fields[w.focus];
      if (!field || field.options.length === 0) return { ...s, window: { ...w, fields } };
      fields[w.focus] = { ...field, index: (field.index + step + field.options.length) % field.options.length };
      return { ...s, window: { ...w, fields } };
    }
    // On the flight plan with the cursor out, the inner knob opens the waypoint entry.
    if (!w && s.page === 'FPL' && s.cursor !== undefined) {
      return { ...s, window: { kind: 'entry', purpose: 'fpl', chars: Array(IDENT_LENGTH).fill(' '), cursor: 0 } };
    }
    return s;
  }

  function outer(s: GarminState, step: number): GarminState {
    const w = s.window;
    if (w?.kind === 'menu') return { ...s, window: { ...w, focus: clamp(w.focus + step, 0, w.items.length - 1) } };
    if (w?.kind === 'proc') return { ...s, window: { ...w, focus: clamp(w.focus + step, 0, w.fields.length + w.buttons.length - 1) } };
    if (w?.kind === 'direct') return { ...s, window: { ...w, focus: clamp(w.focus + step, 0, 1) as 0 | 1 } };
    if (!w && s.page === 'FPL' && s.cursor !== undefined) return { ...s, cursor: clamp(s.cursor + step, 0, legs(s).length) };
    return s;
  }

  function procWindow(s: GarminState, proc: ProcKind): GarminState {
    const org = origin(s);
    const dest = destination(s);
    const field = (name: string, options: string[], follows?: number): Field => ({ name, options, index: 0, follows });
    const open = (fields: Field[], buttons: string[]): GarminState => ({ ...s, window: { kind: 'proc', proc, fields, buttons, focus: 0 } });
    if (proc === 'departure') {
      if (!org) return { ...s, window: undefined, message: 'NO ORIGIN' };
      const sids = nav.SIDS[org] ?? [];
      const fields = [field('DEPARTURE', sids.map((p) => p.id)), field('RUNWAY', nav.RUNWAYS[org] ?? [])];
      // Only units whose departures have transitions show the field.
      if (sids.some((p) => p.transitions?.length)) fields.push(field('TRANSITION', [], 0));
      return open(fields, ['LOAD?']);
    }
    if (!dest) return { ...s, window: undefined, message: 'NO DESTINATION' };
    if (proc === 'arrival') {
      return open([field('ARRIVAL', (nav.STARS[dest] ?? []).map((p) => p.id)), field('RUNWAY', nav.RUNWAYS[dest] ?? [])], ['LOAD?']);
    }
    return open([field('APPROACH', (nav.APPROACHES[dest] ?? []).map((p) => p.id)), field('TRANSITION', [], 0)], ['LOAD?', 'ACTIVATE?']);
  }

  function enter(s: GarminState, w: GarminWindow): GarminState {
    if (w.kind === 'confirm') return insertWaypoint({ ...s, window: undefined }, w.ident);
    if (w.kind === 'menu') return menuChoice({ ...s, window: undefined }, w.items[w.focus]);
    if (w.kind === 'direct') {
      if (w.focus === 0) return { ...s, window: { ...w, focus: 1 } };
      return { ...s, window: undefined, direct: w.ident, active: undefined };
    }
    if (w.kind === 'proc') {
      if (w.focus < w.fields.length) return { ...s, window: { ...w, fields: withTransitions(s, w), focus: w.focus + 1 } };
      return loadProcedure(s, w, w.buttons[w.focus - w.fields.length]);
    }
    return s;
  }

  function menuChoice(s: GarminState, item: string): GarminState {
    const { menu } = profile;
    if (item === menu.departure) return procWindow(s, 'departure');
    if (menu.arrival && item === menu.arrival) return procWindow(s, 'arrival');
    if (item === menu.approach) return procWindow(s, 'approach');
    if (item === menu.vectorsToFinal || item === menu.activateApproach) {
      if (!s.appr) return { ...s, message: 'NO APPROACH LOADED' };
      return { ...s, active: legs(s).findIndex((leg) => leg.section === 'approach'), direct: undefined };
    }
    if (item === profile.activateLeg) {
      return s.cursor !== undefined && s.cursor < legs(s).length ? { ...s, active: s.cursor, direct: undefined } : s;
    }
    return { ...s, message: 'NOT SIMULATED' };
  }

  function loadProcedure(s: GarminState, w: Extract<GarminWindow, { kind: 'proc' }>, button: string): GarminState {
    const fields = withTransitions(s, w);
    const value = (name: string) => {
      const f = fields.find((x) => x.name === name);
      return f?.options[f.index];
    };
    const closed: GarminState = { ...s, window: undefined };
    if (w.proc === 'departure') return { ...closed, sid: value('DEPARTURE'), depRunway: value('RUNWAY'), depTransition: value('TRANSITION') };
    if (w.proc === 'arrival') return { ...closed, star: value('ARRIVAL'), arrRunway: value('RUNWAY') };
    const appr = nav.APPROACHES[destination(s) ?? '']?.find((p) => p.id === value('APPROACH'));
    // Loading an ILS tunes the localiser: straight into the active box on the G1000, standby on the GNS.
    const tuned =
      appr?.frequency && profile.ilsFrequencyTo === 'active'
        ? { nav1Active: appr.frequency, nav1Standby: s.nav1Active }
        : appr?.frequency
          ? { nav1Standby: appr.frequency }
          : {};
    const loaded: GarminState = { ...closed, appr: value('APPROACH'), apprTransition: value('TRANSITION'), ...tuned };
    if (button !== 'ACTIVATE?') return loaded;
    return { ...loaded, active: legs(loaded).findIndex((leg) => leg.section === 'approach'), direct: undefined };
  }

  /* --------------------------------------------------------------- picks */

  /** Whether `text` is under the cursor, and if not, the knob turn that moves towards it. */
  function pick(s: GarminState, text: string): { onTarget: boolean; toward?: string } {
    const w = s.window;
    const turn = (knob: string, from: number, to: number) => `${knob}${to < from ? CCW : ''}`;

    if (w?.kind === 'menu') {
      const at = w.items.indexOf(text);
      if (at < 0) return { onTarget: false };
      return at === w.focus ? { onTarget: true } : { onTarget: false, toward: turn(OUTER, w.focus, at) };
    }
    if (w?.kind === 'direct') {
      if (text !== 'ACTIVATE?') return { onTarget: false };
      return w.focus === 1 ? { onTarget: true } : { onTarget: false, toward: OUTER };
    }
    if (w?.kind === 'proc') {
      const button = w.buttons.indexOf(text);
      if (button >= 0) {
        const at = w.fields.length + button;
        return at === w.focus ? { onTarget: true } : { onTarget: false, toward: turn(OUTER, w.focus, at) };
      }
      const fields = withTransitions(s, w);
      const fieldAt = fields.findIndex((f) => f.options.includes(text));
      if (fieldAt < 0) return { onTarget: false };
      if (fieldAt !== w.focus) return { onTarget: false, toward: turn(OUTER, w.focus, fieldAt) };
      const field = fields[fieldAt];
      const at = field.options.indexOf(text);
      if (at === field.index) return { onTarget: true };
      // Whichever way round the list is shorter.
      const forward = (at - field.index + field.options.length) % field.options.length;
      return { onTarget: false, toward: forward <= field.options.length / 2 ? INNER : `${INNER}${CCW}` };
    }
    if (!w && s.page === 'FPL' && s.cursor !== undefined) {
      const all = legs(s);
      const at = all.findIndex((leg, i) => leg.ident === text && (i >= s.cursor! || !all.slice(s.cursor!).some((l) => l.ident === text)));
      if (at < 0) return { onTarget: false };
      return at === s.cursor ? { onTarget: true } : { onTarget: false, toward: turn(OUTER, s.cursor, at) };
    }
    return { onTarget: false };
  }

  /* -------------------------------------------------------------- render */

  const SECTION_TITLE = (s: GarminState, section: Leg['section']): string | undefined => {
    if (section === 'departure' && s.sid) return `Departure - ${origin(s)}-RW${s.depRunway}.${s.sid}${s.depTransition ? `.${s.depTransition}` : ''}`;
    if (section === 'arrival' && s.star) return `Arrival - ${destination(s)}-${s.star}.RW${s.arrRunway}`;
    if (section === 'approach' && s.appr) return `Approach - ${destination(s)}-${s.appr}${s.apprTransition ? ` ${s.apprTransition}` : ''}`;
    return undefined;
  };

  function fplRows(s: GarminState, visible: number): GarminRow[] {
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
    const start = clamp(cursorRow - visible + 2, 0, Math.max(0, rows.length - visible));
    return rows.slice(cursorRow >= 0 ? start : 0).slice(0, visible).map((r) => r.row);
  }

  function windowView(s: GarminState): { title: string; rows: GarminRow[] } | undefined {
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
    if (w.kind === 'confirm') {
      const airport = nav.AIRPORTS.has(w.ident);
      return {
        title: 'WAYPOINT INFORMATION',
        rows: [
          { left: cell(w.ident, 'cyan'), right: cell(airport ? 'AIRPORT' : 'INTERSECTION', 'white', { small: true }) },
          { left: cell('Press ENT to add it', 'white', { small: true }), header: true },
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
    const fields = withTransitions(s, w);
    const rows: GarminRow[] = [];
    fields.forEach((f, i) => {
      rows.push({ left: cell(f.name, 'white', { small: true }), header: true });
      rows.push({ left: cell(f.options[f.index] ?? '-----', 'cyan', { cursor: i === w.focus }) });
    });
    rows.push({ cells: w.buttons.map((b, i) => cell(b, 'white', { cursor: fields.length + i === w.focus })) });
    return { title: `${w.proc.toUpperCase()} LOADING`, rows };
  }

  function mapRows(s: GarminState): GarminRow[] {
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

  /** The page and any window over it, with an error message taking the window's place. */
  function page(s: GarminState, visibleRows: number) {
    const body =
      s.page === 'FPL'
        ? { title: 'ACTIVE FLIGHT PLAN', rows: fplRows(s, visibleRows) }
        : { title: 'MAP - NAVIGATION MAP', rows: mapRows(s) };
    const message = s.message ? { title: 'MESSAGE', rows: [{ left: cell(s.message, 'amber') }] } : undefined;
    return { ...body, window: message ?? windowView(s) };
  }

  function enterPhase(s: GarminState, phase: FlightPhase, activeLeg?: string, keepPage?: boolean): GarminState {
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

  /** The TrainerSim parts every Garmin unit shares; each adds `render` and its own extras. */
  const simBase = {
    initial: INITIAL_STATE,
    press: pressKey,
    isTypingKey,
    scrollKeys: [`${OUTER}${CCW}`, OUTER] as [string, string],
    scratchpad: (s: GarminState) => (s.window?.kind === 'entry' ? s.window.chars.join('').trim() : ''),
    message: (s: GarminState) => s.message,
    enterPhase,
    freeKeys: [OUTER, `${OUTER}${CCW}`, INNER, `${INNER}${CCW}`],
    keyAlias: (key: string) => (key.endsWith(CCW) ? key.slice(0, -CCW.length) : key),
    isCommitKey: (key: string) => key === 'ENT',
    pick,
    confirmKey: 'ENT',
  };

  return { legs, pressKey, pick, page, isIls, simBase };
}

/* ---------------------------------------------------------------- helpers */

export const cell = (text: string, color: McduColor = 'white', extra?: Partial<McduCell>): McduCell => ({ text, color, ...extra });

/** A plausible track and distance for a leg, stable for a given ident. */
function legData(ident: string): string {
  let h = 0;
  for (const c of ident) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `${String(h % 360).padStart(3, '0')}°  ${(3 + (h % 25)).toString().padStart(2, ' ')}NM`;
}
