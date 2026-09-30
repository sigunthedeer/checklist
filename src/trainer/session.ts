/**
 * The trainer: plays an FMS guide procedure against the simulated MCDU.
 *
 * The guide is the script. Each step's `entry` has to be typed and its `keys`
 * pressed in order. A scenario only fills the gaps the guide leaves on
 * purpose: where a key depends on what the page lists (a runway, a SID), it
 * names the text to press beside, and it explains steps that have nothing to
 * press here.
 */
import { AVIONICS } from '../data/fms';
import type { FmsProcedure, FmsStep } from '../data/types';
import {
  INITIAL_STATE,
  isTypingKey,
  pressKey,
  render,
  type FlightPhase,
  type McduScreen,
  type McduState,
} from './mcdu';

export type TrainerAction = { key: string } | { beside: string };

interface StepScript {
  /** Replaces the guide's keys, for picks whose line depends on the page. */
  keys?: TrainerAction[];
  /** Nothing to press in this scenario, and why. */
  ack?: string;
}

interface ProcedureScript {
  /** Procedures played automatically first, to set the scene. */
  requires: string[];
  phase: FlightPhase;
  /** Index into `plan` of the leg being flown to, once airborne. */
  activeLeg?: string;
  steps?: Record<number, StepScript>;
}

const PREFLIGHT = ['init', 'departure', 'route', 'discontinuity', 'fuel', 'perf-takeoff'];
const k = (key: string): TrainerAction => ({ key });
const beside = (text: string): TrainerAction => ({ beside: text });

/** The A320 training flight, EGLL to LFPG. Keyed by guide procedure id. */
const A320_SCRIPTS: Record<string, ProcedureScript> = {
  init: { requires: [], phase: 'preflight' },
  departure: {
    requires: ['init'],
    phase: 'preflight',
    steps: {
      3: { keys: [beside('27R')] },
      4: { keys: [beside('DVR5J')] },
    },
  },
  route: {
    requires: ['init', 'departure'],
    phase: 'preflight',
    steps: {
      0: { keys: [k('F-PLN'), beside('DVR')] },
      1: { keys: [beside('AIRWAYS')] },
      5: { ack: 'This route has no direct legs, so there is nothing to add here.' },
      6: { ack: 'The discontinuity after NATEB is next. The following procedure clears it.' },
    },
  },
  discontinuity: {
    requires: ['init', 'departure', 'route'],
    phase: 'preflight',
    steps: {
      1: { keys: [k('CLR'), beside('DISCONTINUITY')] },
      2: { ack: 'This version removes the discontinuity straight away, so there is no TMPY INSERT to press.' },
    },
  },
  fuel: {
    requires: ['init', 'departure', 'route', 'discontinuity'],
    phase: 'preflight',
    steps: { 3: { ack: 'TOW and LW on the right should read 68.3 and 65.9 tonnes.' } },
  },
  'perf-takeoff': {
    requires: ['init', 'departure', 'route', 'discontinuity', 'fuel'],
    phase: 'preflight',
  },
  arrival: {
    requires: PREFLIGHT,
    phase: 'cruise',
    activeLeg: 'NATEB',
    steps: {
      2: { keys: [beside('ILS27R')] },
      3: { keys: [beside('NATEB5W')] },
      5: { ack: 'The STAR starts at NATEB, which is already in the route, so there is no gap.' },
    },
  },
  'perf-approach': {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'descent',
    activeLeg: 'PONAN',
    steps: {
      5: { ack: 'Stay with FULL for this landing.' },
      6: { ack: 'VAPP reads 134 knots.' },
    },
  },
  direct: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'NATEB',
    steps: {
      2: { ack: 'No confirmation in this version: the direct-to is already in the flight plan.' },
      3: { ack: 'The FCU is not simulated here. In the sim, push the HDG knob.' },
    },
  },
  hold: {
    requires: [...PREFLIGHT, 'arrival'],
    phase: 'cruise',
    activeLeg: 'NATEB',
    steps: {
      0: { keys: [k('F-PLN'), beside('NATEB')] },
      1: { keys: [beside('HOLD')] },
      2: { ack: 'The computed hold matches the chart: inbound 271°, right turns, one minute legs.' },
    },
  },
};

const SCRIPTS: Record<string, Record<string, ProcedureScript>> = { 'airbus-mcdu': A320_SCRIPTS };

/** A run that plays several procedures back to back, sharing one MCDU. */
export const CHAINS: Record<string, { id: string; name: string; summary: string; procedures: string[] }[]> = {
  'airbus-mcdu': [
    {
      id: 'preflight',
      name: 'Full cockpit preparation',
      summary: 'Six procedures back to back, from a blank MCDU to takeoff speeds.',
      procedures: PREFLIGHT,
    },
  ],
};

export function hasTrainer(unitId: string): boolean {
  return unitId in SCRIPTS;
}

export function trainerProcedures(unitId: string): FmsProcedure[] {
  const unit = AVIONICS.find((u) => u.id === unitId);
  const scripts = SCRIPTS[unitId] ?? {};
  return unit ? unit.procedures.filter((p) => p.id in scripts) : [];
}

/* --------------------------------------------------------------- building */

export interface BuiltStep {
  guide: FmsStep;
  actions: TrainerAction[];
  /** Explanation for a step with nothing to press. */
  ack?: string;
}

export interface BuiltProcedure {
  procedure: FmsProcedure;
  steps: BuiltStep[];
}

export function buildProcedure(unitId: string, procedureId: string): BuiltProcedure {
  const unit = AVIONICS.find((u) => u.id === unitId);
  const procedure = unit?.procedures.find((p) => p.id === procedureId);
  const script = SCRIPTS[unitId]?.[procedureId];
  if (!procedure || !script) throw new Error(`No trainer script for ${unitId}/${procedureId}`);
  return {
    procedure,
    steps: procedure.steps.map((guide, i) => {
      const override = script.steps?.[i];
      if (override?.ack) return { guide, actions: [], ack: override.ack };
      return { guide, actions: override?.keys ?? (guide.keys ?? []).map(k) };
    }),
  };
}

/* ---------------------------------------------------------------- session */

export interface Feedback {
  kind: 'error' | 'info';
  text: string;
}

export interface Session {
  unitId: string;
  runs: BuiltProcedure[];
  procIndex: number;
  stepIndex: number;
  actionIndex: number;
  sim: McduState;
  /** Wrong presses across the whole session. */
  mistakes: number;
  /** Wrong presses on the current action, for revealing hints. */
  missesHere: number;
  feedback?: Feedback;
  finished: boolean;
}

/** The MCDU as it would be after the procedures a script requires, in its phase. */
export function initialSim(unitId: string, procedureIds: string[]): McduState {
  const first = SCRIPTS[unitId]?.[procedureIds[0]];
  if (!first) throw new Error(`No trainer script for ${unitId}/${procedureIds[0]}`);
  let sim = INITIAL_STATE;
  for (const id of first.requires) sim = autoplay(unitId, id, sim);
  return enterPhase(sim, first);
}

function enterPhase(sim: McduState, script: ProcedureScript): McduState {
  const active = script.activeLeg ? sim.plan.findIndex((leg) => leg.ident === script.activeLeg) : -1;
  return {
    ...sim,
    phase: script.phase,
    active: active >= 0 ? active : undefined,
    page: script.phase === 'preflight' ? 'MENU' : 'F-PLN',
    scratchpad: '',
    message: undefined,
    scroll: 0,
  };
}

export function createSession(unitId: string, procedureIds: string[]): Session {
  return {
    unitId,
    runs: procedureIds.map((id) => buildProcedure(unitId, id)),
    procIndex: 0,
    stepIndex: 0,
    actionIndex: 0,
    sim: initialSim(unitId, procedureIds),
    mistakes: 0,
    missesHere: 0,
    finished: false,
  };
}

export function currentStep(session: Session): BuiltStep | undefined {
  return session.runs[session.procIndex]?.steps[session.stepIndex];
}

export function screenOf(session: Session): McduScreen {
  return render(session.sim);
}

/** Tokens for the text beside a line select key, for matching `beside` actions. */
function tokens(text: string | undefined): string[] {
  return (text ?? '').split(/[^A-Z0-9]+/).filter(Boolean);
}

/**
 * The line select key beside some text on the screen, or undefined if it is
 * not showing (scrolled off, or on another page).
 */
export function lskBeside(screen: McduScreen, text: string): string | undefined {
  for (let i = 0; i < 6; i += 1) {
    const line = screen.lines[i];
    if ([line.valueL, line.valueC].some((c) => tokens(c?.text).includes(text))) return `LSK ${i + 1}L`;
    if (tokens(line.valueR?.text).includes(text)) return `LSK ${i + 1}R`;
  }
  return undefined;
}

/** The key the current action wants, resolved against the screen. */
export function expectedKey(session: Session): string | undefined {
  const step = currentStep(session);
  const action = step?.actions[session.actionIndex];
  if (!action) return undefined;
  return 'key' in action ? action.key : lskBeside(screenOf(session), action.beside);
}

/** Whether the step wants its entry in the scratchpad when this action's key is pressed. */
function entryDueNow(step: BuiltStep, actionIndex: number, key: string): boolean {
  if (!step.guide.entry || !key.startsWith('LSK ')) return false;
  // The entry is consumed by the step's first line select key; a `beside` pick is always one.
  const firstLsk = step.actions.findIndex((a) => !('key' in a) || a.key.startsWith('LSK '));
  return actionIndex === firstLsk;
}

const normalise = (text: string) => text.trim().toUpperCase().replace(/\s+/g, ' ');

function advance(session: Session): Session {
  const run = session.runs[session.procIndex];
  const nextStep = session.stepIndex + 1;
  if (nextStep < run.steps.length) {
    return { ...session, stepIndex: nextStep, actionIndex: 0, missesHere: 0 };
  }
  const nextProc = session.procIndex + 1;
  if (nextProc < session.runs.length) {
    const script = SCRIPTS[session.unitId][session.runs[nextProc].procedure.id];
    return {
      ...session,
      procIndex: nextProc,
      stepIndex: 0,
      actionIndex: 0,
      missesHere: 0,
      sim: { ...session.sim, phase: script.phase },
    };
  }
  return { ...session, finished: true, missesHere: 0 };
}

function wrong(session: Session, text: string): Session {
  return { ...session, mistakes: session.mistakes + 1, missesHere: session.missesHere + 1, feedback: { kind: 'error', text } };
}

export function press(session: Session, key: string): Session {
  if (session.finished) return session;
  const step = currentStep(session);
  if (!step) return session;
  const action = step.actions[session.actionIndex];

  // Typing and scrolling are never wrong; the scratchpad is checked when it is used.
  const expected = expectedKey(session);
  const free = isTypingKey(key) || ((key === '↑' || key === '↓') && expected !== key) || (key === 'CLR' && expected !== 'CLR');
  if (free) return { ...session, sim: pressKey(session.sim, key), feedback: undefined };

  if (!action) {
    return { ...session, feedback: { kind: 'info', text: 'Nothing to press for this step. Tap Continue.' } };
  }

  if (!expected) {
    // A `beside` target that is not on screen: almost always scrolled off.
    const target = 'beside' in action ? action.beside : '';
    return wrong(session, `${target} is not on screen. Scroll with ↑ and ↓ until it is.`);
  }

  if (key !== expected) {
    return wrong(session, `That was ${key}.`);
  }

  const scratchpad = normalise(session.sim.scratchpad);
  if (entryDueNow(step, session.actionIndex, key)) {
    const entry = normalise(step.guide.entry!);
    if (scratchpad !== entry) {
      return {
        ...session,
        feedback: {
          kind: 'error',
          text: scratchpad
            ? `The scratchpad reads ${scratchpad}. Clear it with CLR and type ${entry}.`
            : `Type ${entry} first. It goes into the scratchpad, then this key moves it into place.`,
        },
      };
    }
  } else if (key.startsWith('LSK ') && scratchpad && !(scratchpad === 'CLR' && step.actions.some((a) => 'key' in a && a.key === 'CLR'))) {
    return { ...session, feedback: { kind: 'error', text: 'Clear the scratchpad with CLR first, or this key will try to enter it.' } };
  }

  const sim = pressKey(session.sim, key);
  const moved = { ...session, sim, feedback: undefined, missesHere: 0, actionIndex: session.actionIndex + 1 };
  return moved.actionIndex >= step.actions.length ? advance(moved) : moved;
}

/** Move past a step that has nothing to press. */
export function acknowledge(session: Session): Session {
  const step = currentStep(session);
  if (!step || step.actions.length > 0) return session;
  return advance({ ...session, feedback: undefined });
}

/* --------------------------------------------------------------- autoplay */

/**
 * Plays a procedure's script without a person: types each entry and presses
 * each key, scrolling to find `beside` targets. Throws if the script cannot
 * be followed, which is how the tests prove every script works.
 */
export function autoplay(
  unitId: string,
  procedureId: string,
  from: McduState,
  observe?: (screen: McduScreen, key: string) => void,
): McduState {
  const script = SCRIPTS[unitId]?.[procedureId];
  if (!script) throw new Error(`No trainer script for ${unitId}/${procedureId}`);
  let session = createSessionFrom(unitId, procedureId, enterPhase(from, script));
  let guard = 0;
  while (!session.finished) {
    if ((guard += 1) > 500) throw new Error(`${procedureId}: autoplay did not finish`);
    const step = currentStep(session)!;
    if (step.actions.length === 0) {
      session = acknowledge(session);
      continue;
    }
    const action = step.actions[session.actionIndex];
    if (session.actionIndex === 0 && step.guide.entry && normalise(session.sim.scratchpad) !== normalise(step.guide.entry)) {
      // Type the entry the way a person would, one key at a time.
      for (const char of step.guide.entry.toUpperCase()) {
        session = press(session, char === ' ' ? 'SP' : char);
      }
    }
    let key = expectedKey(session);
    for (let scrolls = 0; !key && scrolls < 20; scrolls += 1) {
      session = press(session, '↓');
      key = expectedKey(session);
    }
    if (!key) throw new Error(`${procedureId} step ${session.stepIndex}: cannot find ${JSON.stringify(action)}`);
    observe?.(screenOf(session), key);
    const before = session;
    session = press(session, key);
    if (session.feedback?.kind === 'error' || session === before) {
      throw new Error(`${procedureId} step ${before.stepIndex}: ${key} rejected: ${session.feedback?.text ?? 'no change'}`);
    }
    if (session.sim.message) {
      // The trainer accepted the key but the MCDU refused the entry: the script and the sim disagree.
      throw new Error(`${procedureId} step ${before.stepIndex}: MCDU says ${session.sim.message} after ${key}`);
    }
  }
  return session.sim;
}

function createSessionFrom(unitId: string, procedureId: string, sim: McduState): Session {
  return {
    unitId,
    runs: [buildProcedure(unitId, procedureId)],
    procIndex: 0,
    stepIndex: 0,
    actionIndex: 0,
    sim,
    mistakes: 0,
    missesHere: 0,
    finished: false,
  };
}
