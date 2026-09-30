/** Helpers for the trainer tests. Not imported by the app. */
import type { McduScreen } from './screen';
import { acknowledge, currentStep, expectedKey, press, screenOf, TRAINERS, type Session } from './session';

/** Text on the side of a line that a line select key points at. */
export function textBeside(screen: McduScreen, key: string): string {
  const [, n, side] = /^LSK (\d)([LR])$/.exec(key)!;
  const line = screen.lines[Number(n) - 1];
  const cells = side === 'L' ? [line.labelL, line.valueL, line.valueC, line.labelC] : [line.labelR, line.valueR];
  return cells.map((c) => c?.text ?? '').join(' ').trim();
}

/** Plays a session to the end by pressing whatever it expects. */
export function playThrough(session: Session): Session {
  const forward = TRAINERS[session.unitId].sim.scrollKeys[1];
  let s = session;
  for (let guard = 0; !s.finished; guard += 1) {
    if (guard > 1000) throw new Error('did not finish');
    const step = currentStep(s)!;
    if (step.actions.length === 0) {
      s = acknowledge(s);
      continue;
    }
    if (s.actionIndex === 0 && step.guide.entry) {
      for (const char of step.guide.entry) s = press(s, char);
    }
    let key = expectedKey(s);
    for (let pages = 0; !key && pages < 20; pages += 1) {
      s = press(s, forward);
      key = expectedKey(s);
    }
    if (!key) throw new Error(`step ${s.stepIndex}: nothing to press on "${screenOf(s).title.text}"`);
    s = press(s, key);
  }
  return s;
}
