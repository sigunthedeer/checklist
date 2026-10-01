/**
 * The trainer: plays an FMS guide procedure against a simulated unit.
 *
 * The guide is the script. Each step's `entry` has to be typed and its `keys`
 * pressed in order. A unit's script only fills the gaps the guide leaves on
 * purpose: where a key depends on what the page lists (a runway, a SID), it
 * names the text to press beside, and it explains steps with nothing to press.
 */
import { AVIONICS } from '../data/fms';
import type { FmsProcedure, FmsStep } from '../data/types';
import { a310Trainer, a321lrTrainer, a330Trainer, airbusTrainer, belugaTrainer } from './airbus/script';
import { b737Trainer, b747Trainer, boeingTrainer } from './boeing/script';
import { cj4Trainer } from './cj4/script';
import { g1000Trainer } from './garmin/script';
import { gnsTrainer } from './gns/script';
import type { McduScreen } from './screen';
import type { Chain, ProcedureScript, TrainerAction, TrainerUnit } from './script';

export type { TrainerAction } from './script';

export const TRAINERS: Record<string, TrainerUnit> = {
  [airbusTrainer.unitId]: airbusTrainer,
  [a321lrTrainer.unitId]: a321lrTrainer,
  [a330Trainer.unitId]: a330Trainer,
  [belugaTrainer.unitId]: belugaTrainer,
  [a310Trainer.unitId]: a310Trainer,
  [boeingTrainer.unitId]: boeingTrainer,
  [b737Trainer.unitId]: b737Trainer,
  [b747Trainer.unitId]: b747Trainer,
  [cj4Trainer.unitId]: cj4Trainer,
  [g1000Trainer.unitId]: g1000Trainer,
  [gnsTrainer.unitId]: gnsTrainer,
};

export function getTrainer(unitId: string | undefined): TrainerUnit | undefined {
  return unitId ? TRAINERS[unitId] : undefined;
}

export function hasTrainer(unitId: string): boolean {
  return unitId in TRAINERS;
}

export function trainerChains(unitId: string): Chain[] {
  return TRAINERS[unitId]?.chains ?? [];
}

/** The unit's guide procedures that have a script, in guide order. */
export function trainerProcedures(unitId: string): FmsProcedure[] {
  const unit = AVIONICS.find((u) => u.id === unitId);
  const scripts = TRAINERS[unitId]?.scripts ?? {};
  return unit ? unit.procedures.filter((p) => p.id in scripts) : [];
}

function scriptFor(unitId: string, procedureId: string): ProcedureScript {
  const script = TRAINERS[unitId]?.scripts[procedureId];
  if (!script) throw new Error(`No trainer script for ${unitId}/${procedureId}`);
  return script;
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
  const script = scriptFor(unitId, procedureId);
  if (!procedure) throw new Error(`No guide procedure ${unitId}/${procedureId}`);
  return {
    procedure,
    steps: procedure.steps.map((guide, i) => {
      const override = script.steps?.[i];
      if (override?.ack) return { guide, actions: [], ack: override.ack };
      return { guide, actions: override?.keys ?? (guide.keys ?? []).map((key) => ({ key })) };
    }),
  };
}

/* ---------------------------------------------------------------- session */

export interface Feedback {
  kind: 'error' | 'info';
  text: string;
}

export interface Session<S = any> {
  unitId: string;
  runs: BuiltProcedure[];
  procIndex: number;
  stepIndex: number;
  actionIndex: number;
  sim: S;
  /** Wrong presses across the whole session. */
  mistakes: number;
  /** Wrong presses on the current action, for revealing hints. */
  missesHere: number;
  /**
   * What the scratchpad held after the last accepted key in this step. A key
   * that copies something there (a waypoint, a position) makes it fair game
   * for the next key in the same step.
   */
  carry?: string;
  feedback?: Feedback;
  finished: boolean;
}

/** The unit as it would be after the procedures a script requires, in its phase. */
export function initialSim(unitId: string, procedureIds: string[]): any {
  const trainer = TRAINERS[unitId];
  const first = scriptFor(unitId, procedureIds[0]);
  let sim = trainer.sim.initial;
  for (const id of first.requires) sim = autoplay(unitId, id, sim);
  return trainer.sim.enterPhase(sim, first.phase, first.activeLeg, first.continues);
}

function newSession(unitId: string, procedureIds: string[], sim: unknown): Session {
  return {
    unitId,
    runs: procedureIds.map((id) => buildProcedure(unitId, id)),
    procIndex: 0,
    stepIndex: 0,
    actionIndex: 0,
    sim,
    mistakes: 0,
    missesHere: 0,
    finished: false,
  };
}

export function createSession(unitId: string, procedureIds: string[]): Session {
  return newSession(unitId, procedureIds, initialSim(unitId, procedureIds));
}

export function currentStep(session: Session): BuiltStep | undefined {
  return session.runs[session.procIndex]?.steps[session.stepIndex];
}

export function screenOf(session: Session): any {
  return TRAINERS[session.unitId].sim.render(session.sim);
}

export function litKeys(session: Session): string[] {
  return TRAINERS[session.unitId].sim.lit?.(session.sim) ?? [];
}

/** Words in some screen text, for matching `beside` targets whole-word. */
function words(text: string | undefined): string {
  return ` ${(text ?? '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean).join(' ')} `;
}

function contains(text: string | undefined, target: string): boolean {
  const wanted = words(target).trim();
  return wanted.length > 0 && words(text).includes(` ${wanted} `);
}

/**
 * The line select key beside some text on the screen, or undefined if it is
 * not showing (scrolled off, or on another page). Values are searched before
 * labels, so a label only decides when no value matches.
 */
export function lskBeside(screen: McduScreen, target: string, only?: 'label'): string | undefined {
  if (only !== 'label') {
    for (let i = 0; i < 6; i += 1) {
      const line = screen.lines[i];
      if (contains(line.valueL?.text, target) || contains(line.valueC?.text, target)) return `LSK ${i + 1}L`;
      if (contains(line.valueR?.text, target)) return `LSK ${i + 1}R`;
    }
  }
  for (let i = 0; i < 6; i += 1) {
    const line = screen.lines[i];
    if (contains(line.labelL?.text, target) || contains(line.labelC?.text, target)) return `LSK ${i + 1}L`;
    if (contains(line.labelR?.text, target)) return `LSK ${i + 1}R`;
  }
  return undefined;
}

function resolve(session: Session, action: TrainerAction): string | undefined {
  if ('key' in action) return action.key;
  if ('beside' in action) return lskBeside(screenOf(session), action.beside, action.in);
  const { sim } = TRAINERS[session.unitId];
  const where = sim.pick?.(session.sim, action.pick);
  if (!where) return undefined;
  if (!where.onTarget) return where.toward;
  return action.confirm === false ? undefined : sim.confirmKey;
}

const isCommit = (unitId: string, key: string) =>
  TRAINERS[unitId].sim.isCommitKey?.(key) ?? key.startsWith('LSK ');

/** Whether an action is a cursor move that is already done: the item is highlighted. */
function pickSatisfied(session: Session, action: TrainerAction | undefined): boolean {
  if (!action || !('pick' in action) || action.confirm !== false) return false;
  return !!TRAINERS[session.unitId].sim.pick?.(session.sim, action.pick).onTarget;
}

/** The key the current action wants, resolved against the screen. */
export function expectedKey(session: Session): string | undefined {
  const action = currentStep(session)?.actions[session.actionIndex];
  return action ? resolve(session, action) : undefined;
}

/** Whether the step wants its entry in the scratchpad when this action's key is pressed. */
function entryDueNow(unitId: string, step: BuiltStep, actionIndex: number, key: string): boolean {
  if (!step.guide.entry || !isCommit(unitId, key)) return false;
  // The entry is consumed by the step's first committing key: a line select key, ENT, or a confirmed pick.
  const first = step.actions.findIndex((a) =>
    'key' in a ? isCommit(unitId, a.key) : 'beside' in a || a.confirm !== false,
  );
  return actionIndex === first;
}

const normalise = (text: string) => text.trim().toUpperCase().replace(/\s+/g, ' ');

/** Move past the current action, then past any cursor moves that are already done. */
function nextAction(session: Session): Session {
  const step = currentStep(session)!;
  let moved: Session = { ...session, actionIndex: session.actionIndex + 1, missesHere: 0 };
  if (moved.actionIndex >= step.actions.length) moved = advance(moved);
  return settle(moved);
}

function settle(session: Session): Session {
  const step = currentStep(session);
  if (!session.finished && step && pickSatisfied(session, step.actions[session.actionIndex])) return nextAction(session);
  return session;
}

function advance(session: Session): Session {
  const run = session.runs[session.procIndex];
  // `carry` survives into the next step: a guide may copy in one step and use it in the next.
  const reset = { actionIndex: 0, missesHere: 0 };
  if (session.stepIndex + 1 < run.steps.length) {
    return { ...session, ...reset, stepIndex: session.stepIndex + 1 };
  }
  if (session.procIndex + 1 < session.runs.length) {
    return { ...session, ...reset, procIndex: session.procIndex + 1, stepIndex: 0 };
  }
  return { ...session, ...reset, finished: true };
}

function wrong(session: Session, text: string): Session {
  return {
    ...session,
    mistakes: session.mistakes + 1,
    missesHere: session.missesHere + 1,
    feedback: { kind: 'error', text },
  };
}

export function press(session: Session, key: string): Session {
  if (session.finished) return session;
  const step = currentStep(session);
  if (!step) return session;
  const { sim } = TRAINERS[session.unitId];
  const action = step.actions[session.actionIndex];
  const alias = sim.keyAlias?.(key) ?? key;

  // Typing, paging and knob turns are never wrong; what they lead to is checked when it is used.
  // `expected` may name a direction (the knob turned back); `want` is the key regardless of direction.
  const expected = expectedKey(session);
  const want = expected === undefined ? undefined : (sim.keyAlias?.(expected) ?? expected);
  const free =
    sim.isTypingKey(key) ||
    (sim.scrollKeys.includes(key) && want !== alias) ||
    (key === 'CLR' && want !== 'CLR') ||
    (!!sim.freeKeys?.includes(key) && want !== alias);
  if (free) return settle({ ...session, sim: sim.press(session.sim, key), feedback: undefined });

  if (!action) {
    return { ...session, feedback: { kind: 'info', text: 'Nothing to press for this step. Tap Continue.' } };
  }

  if (!expected) {
    if ('pick' in action) return wrong(session, `${action.pick} is not on this page.`);
    // A `beside` target that is not on screen: almost always paged or scrolled off.
    const target = 'beside' in action ? action.beside : '';
    const [back, forward] = sim.scrollKeys;
    return wrong(session, `${target} is not on screen. Page through with ${back} and ${forward} until it is.`);
  }

  if (alias !== want) {
    if ('pick' in action && alias === sim.confirmKey) {
      return wrong(session, `Move the cursor to ${action.pick} before pressing ${sim.confirmKey}.`);
    }
    return wrong(session, `That was ${key}.`);
  }

  const scratchpad = normalise(sim.scratchpad(session.sim));
  if (entryDueNow(session.unitId, step, session.actionIndex, key)) {
    const entry = normalise(step.guide.entry!);
    if (scratchpad !== entry) {
      return {
        ...session,
        feedback: {
          kind: 'error',
          text: scratchpad
            ? `The entry reads ${scratchpad}. Correct it to ${entry} first.`
            : `Type ${entry} first. It goes into the scratchpad, then this key moves it into place.`,
        },
      };
    }
  } else if (isCommit(session.unitId, key) && scratchpad && scratchpad !== normalise(session.carry ?? '')) {
    return {
      ...session,
      feedback: { kind: 'error', text: 'Clear the scratchpad with CLR first, or this key will try to enter it.' },
    };
  }

  const next = sim.press(session.sim, key);
  const pressed: Session = { ...session, sim: next, feedback: undefined, missesHere: 0, carry: sim.scratchpad(next) || undefined };
  // A cursor move towards a pick is progress, but the pick is only done once the item is selected (or reached).
  if ('pick' in action && alias !== sim.confirmKey) return settle(pressed);
  return nextAction(pressed);
}

/** Move past a step that has nothing to press. */
export function acknowledge(session: Session): Session {
  const step = currentStep(session);
  if (!step || step.actions.length > 0) return session;
  return advance({ ...session, feedback: undefined });
}

/* --------------------------------------------------------------- autoplay */

/**
 * Plays a procedure's script without a person: types each entry, presses
 * each key, and pages forward to find `beside` targets. Throws if the script
 * cannot be followed or the unit refuses an entry, which is how the tests
 * prove every script works.
 */
export function autoplay(
  unitId: string,
  procedureId: string,
  from: unknown,
  observe?: (screen: any, key: string) => void,
): any {
  const trainer = TRAINERS[unitId];
  const script = scriptFor(unitId, procedureId);
  let session = newSession(unitId, [procedureId], trainer.sim.enterPhase(from, script.phase, script.activeLeg, script.continues));
  const forward = trainer.sim.scrollKeys[1];
  for (let guard = 0; !session.finished; guard += 1) {
    if (guard > 500) throw new Error(`${procedureId}: autoplay did not finish`);
    const step = currentStep(session)!;
    if (step.actions.length === 0) {
      session = acknowledge(session);
      continue;
    }
    if (
      session.actionIndex === 0 &&
      step.guide.entry &&
      normalise(trainer.sim.scratchpad(session.sim)) !== normalise(step.guide.entry)
    ) {
      // Type the entry the way a person would, one key at a time.
      for (const char of step.guide.entry.toUpperCase()) session = press(session, char === ' ' ? 'SP' : char);
    }
    const action = step.actions[session.actionIndex];
    let key = expectedKey(session);
    for (let pages = 0; !key && 'beside' in action && pages < 20; pages += 1) {
      session = press(session, forward);
      key = expectedKey(session);
    }
    if (!key) throw new Error(`${procedureId} step ${session.stepIndex}: cannot find ${JSON.stringify(action)}`);
    observe?.(screenOf(session), key);
    const before = session;
    session = press(session, key);
    if (session.feedback?.kind === 'error' || session.mistakes > before.mistakes || session === before) {
      throw new Error(`${procedureId} step ${before.stepIndex}: ${key} rejected: ${session.feedback?.text ?? 'no change'}`);
    }
    if (isCommit(unitId, key) && JSON.stringify(session.sim) === JSON.stringify(before.sim)) {
      // A committing key the script asks for should always do something; if not, script and sim disagree.
      throw new Error(`${procedureId} step ${before.stepIndex}: ${key} changed nothing`);
    }
    const message = trainer.sim.message(session.sim);
    if (message) {
      // The trainer accepted the key but the unit refused the entry: the script and the sim disagree.
      throw new Error(`${procedureId} step ${before.stepIndex}: unit says ${message} after ${key}`);
    }
  }
  return session.sim;
}
