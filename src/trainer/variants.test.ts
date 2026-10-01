/**
 * Aircraft that share a unit with another: each has its own guide numbers
 * and trainer. These check the numbers agree between the guide, what the
 * trainer tells you to expect, and what the simulated screen shows.
 */
import { getAvionics } from '../data';
import { airbusMcdu } from '../data/fms/airbus-mcdu';
import { deriveAvionics } from '../data/fms/variant';
import { pressKey, render } from './airbus/mcdu';
import { pressKey as cduKey, render as cduRender } from './boeing/cdu';
import { buildProcedure, createSession, initialSim, TRAINERS } from './session';
import { playThrough } from './testing';

const screenText = (screen: ReturnType<typeof render>) =>
  [screen.title, ...screen.lines.flatMap((l) => [l.labelL, l.valueL, l.labelR, l.valueR, l.valueC])]
    .map((c) => c?.text ?? '')
    .join(' ');

const AIRBUS = ['airbus-mcdu', 'airbus-mcdu-a321lr', 'airbus-mcdu-a330', 'airbus-mcdu-belugaxl', 'airbus-mcdu-a310'];

describe.each(AIRBUS)('%s', (unitId) => {
  const guide = getAvionics(unitId)!;
  const step = (proc: string, i: number) => guide.procedures.find((p) => p.id === proc)!.steps[i];

  it('ends the preflight with this aircraft’s weights and speeds in the MCDU', () => {
    const chain = TRAINERS[unitId].chains[0];
    const sim = playThrough(createSession(unitId, chain.procedures)).sim;
    expect(sim.zfw).toBe(step('fuel', 1).entry);
    expect(sim.block).toBe(Number(step('fuel', 2).entry).toFixed(1));
    expect([sim.v1, sim.vr, sim.v2]).toEqual([1, 2, 3].map((i) => step('perf-takeoff', i).entry));
    expect(sim.flex).toBe(step('perf-takeoff', 6).entry);
  });

  it('shows on INIT B the takeoff and landing weights the trainer says to expect', () => {
    const sim = initialSim(unitId, ['perf-takeoff']);
    const text = screenText(render(pressKey(pressKey({ ...sim, page: 'MENU' }, 'INIT'), '→')));
    const ack = buildProcedure(unitId, 'fuel').steps[3].ack!;
    const [tow, lw] = ack.match(/\d+\.\d/g)!;
    expect(text).toContain(tow);
    expect(text).toContain(lw);
  });

  it('shows on PERF APPR the approach speed and landing setting the trainer names', () => {
    const sim = initialSim(unitId, ['perf-approach']);
    const appr = pressKey(pressKey(sim, 'PERF'), 'LSK 6R');
    const text = screenText(render(appr));
    expect(render(appr).title.text).toBe('APPR');
    const steps = buildProcedure(unitId, 'perf-approach').steps;
    expect(text).toContain(steps[6].ack!.match(/\d{3}/)![0]);
    expect(steps[5].ack).toContain(sim.profile.landing.full);
  });
});

const BOEING = ['boeing-cdu', 'boeing-cdu-737', 'boeing-cdu-747'];

describe.each(BOEING)('%s', (unitId) => {
  const guide = getAvionics(unitId)!;
  const profile = TRAINERS[unitId].sim.initial.profile;
  const step = (proc: string, i: number) => guide.procedures.find((p) => p.id === proc)!.steps[i];

  it('names the thrust page the way the simulated CDU titles it', () => {
    const other = profile.thrustPage === 'N1 LIMIT' ? 'THRUST LIM' : 'N1 LIMIT';
    const text = guide.procedures.flatMap((p) => p.steps.map((s) => `${s.do} ${s.note ?? ''}`)).join(' ');
    expect(text).toContain(profile.thrustPage);
    expect(text).not.toContain(other);
    const sim = initialSim(unitId, ['takeoff']);
    expect(cduRender({ ...sim, page: 'THRUST LIM' }).title.text).toBe(profile.thrustPage);
  });

  it('shows this aircraft on IDENT', () => {
    const ident = cduRender(cduKey(cduKey(TRAINERS[unitId].sim.initial, 'MENU'), 'INIT REF'));
    expect(screenText(ident)).toContain(profile.model);
  });

  it('ends the preflight with this aircraft’s flaps, derate and speeds', () => {
    const sim = playThrough(createSession(unitId, TRAINERS[unitId].chains[0].procedures)).sim;
    expect(sim.zfw).toBe(step('perf-init', 1).entry);
    expect(sim.flaps).toBe(step('takeoff', 3).entry);
    expect(profile.takeoffFlaps).toContain(sim.flaps);
    expect(sim.rating).toBe(profile.ratings[1]);
    expect(sim.accepted).toEqual({ v1: true, vr: true, v2: true });
    const takeoff = screenText(cduRender({ ...sim, page: 'TAKEOFF' }));
    for (const v of Object.values(profile.speeds)) expect(takeoff).toContain(v);
    expect(buildProcedure(unitId, 'takeoff').steps[4].ack).toContain(`${profile.trim} units`);
  });

  it('refuses a takeoff flap setting this aircraft does not have', () => {
    const sim = initialSim(unitId, ['takeoff']);
    const wrong = ['1', '5', '10', '15', '20', '25'].filter((f) => !profile.takeoffFlaps.includes(f));
    expect(wrong.length).toBeGreaterThan(0);
    for (const flaps of wrong) {
      let s = { ...sim, page: 'TAKEOFF' as const, scratchpad: flaps };
      s = cduKey(s, 'LSK 1L');
      expect([s.flaps, s.message]).toEqual([undefined, 'INVALID ENTRY']);
    }
  });

  it('sets a landing flap and VREF the APPROACH REF page offers', () => {
    const sim = playThrough(createSession(unitId, ['approach-ref'])).sim;
    expect(profile.vref.map(([f, v]: [string, string]) => `${f}/${v}`)).toContain(sim.flapSpd);
  });
});

describe('deriving a guide', () => {
  it('refuses a patch for a step the base guide does not have', () => {
    expect(() => deriveAvionics(airbusMcdu, { id: 'x', name: 'X', notes: [], steps: { 'fuel/9': { entry: '1' } } })).toThrow(
      /no step fuel\/9/,
    );
  });

  it('removes a field patched to null and leaves the base guide alone', () => {
    const derived = deriveAvionics(airbusMcdu, {
      id: 'x',
      name: 'X',
      notes: [],
      steps: { 'perf-takeoff/5': { keys: null, entry: null, do: 'Set flaps with the lever.' } },
    });
    const patched = derived.procedures.find((p) => p.id === 'perf-takeoff')!.steps[5];
    expect(patched).not.toHaveProperty('keys');
    expect(patched).not.toHaveProperty('entry');
    expect(patched.do).toBe('Set flaps with the lever.');
    expect(airbusMcdu.procedures.find((p) => p.id === 'perf-takeoff')!.steps[5].keys).toEqual(['LSK 3R']);
    expect(derived.basedOn).toBe('airbus-mcdu');
  });
});
