/**
 * The contract every trainer unit must meet, run against each one. This is
 * what makes the guide a trustworthy script: every procedure plays start to
 * finish, every key it asks for exists, and every line select key it presses
 * sits beside something on the screen.
 */
import { AVIONICS } from '../data/fms';
import { isKnownKey } from '../data';
import { keysOf } from './screen';
import { playThrough, textBeside } from './testing';
import {
  autoplay,
  buildProcedure,
  createSession,
  expectedKey,
  initialSim,
  press,
  TRAINERS,
  trainerProcedures,
} from './session';

describe.each(Object.keys(TRAINERS))('%s trainer', (unitId) => {
  const trainer = TRAINERS[unitId];
  const unit = AVIONICS.find((u) => u.id === unitId)!;
  const keyboard = keysOf(trainer.keyboard);
  const ids = unit.procedures.map((p) => p.id);

  it('covers every procedure in the guide', () => {
    expect(trainerProcedures(unitId).map((p) => p.id)).toEqual(ids);
  });

  it.each(ids)('plays %s from start to finish', (id) => {
    expect(() => autoplay(unitId, id, initialSim(unitId, [id]))).not.toThrow();
  });

  it.each(ids)('only presses line select keys beside something on the screen in %s', (id) => {
    const empty: string[] = [];
    autoplay(unitId, id, initialSim(unitId, [id]), (screen, key) => {
      if (key.startsWith('LSK ') && !textBeside(screen, key)) empty.push(`${key} on "${screen.title.text}"`);
    });
    expect(empty).toEqual([]);
  });

  it('only scripts keys that are on its keyboard and on the unit', () => {
    const missing = ids.flatMap((id) =>
      buildProcedure(unitId, id).steps.flatMap((step) =>
        step.actions
          .filter((a) => 'key' in a && !(keyboard.has(a.key) && isKnownKey(unit, a.key)))
          .map((a) => `${id}: ${'key' in a ? a.key : ''}`),
      ),
    );
    expect(missing).toEqual([]);
  });

  it('has every key the guide names on its keyboard', () => {
    expect(unit.keys.filter((key) => !keyboard.has(key))).toEqual([]);
  });

  it('never leaves a guide entry with no key to put it anywhere', () => {
    const stranded = ids.flatMap((id) =>
      buildProcedure(unitId, id)
        .steps.filter((s) => s.guide.entry && !s.ack && s.actions.length === 0)
        .map((s) => `${id}: ${s.guide.do}`),
    );
    expect(stranded).toEqual([]);
  });

  it('scrolls with keys that are on its keyboard', () => {
    expect(trainer.sim.scrollKeys.filter((key) => !keyboard.has(key))).toEqual([]);
  });

  it.each(trainer.chains.map((c) => [c.id, c.procedures] as const))('plays the %s chain on one unit without a mistake', (_, procedures) => {
    expect(playThrough(createSession(unitId, [...procedures])).mistakes).toBe(0);
  });

  it('counts a wrong key and leaves the unit alone', () => {
    const start = createSession(unitId, [ids[0]]);
    const wrongKey = [...keyboard].find((key) => !trainer.sim.isTypingKey(key) && key !== expectedKey(start) && key !== 'CLR' && !trainer.sim.scrollKeys.includes(key))!;
    const s = press(start, wrongKey);
    expect(s.mistakes).toBe(1);
    expect(s.sim).toEqual(start.sim);
  });
});
