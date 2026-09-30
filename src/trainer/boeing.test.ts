/** Boeing CDU specifics. The contract every unit meets is in session.test.ts. */
import { grossWeight, INITIAL_STATE, pressKey, render } from './boeing/cdu';
import { GPS_POSITION } from './boeing/navdata';
import { createSession, currentStep, expectedKey, initialSim, litKeys, press, screenOf, trainerChains } from './session';
import { playThrough, textBeside } from './testing';

const UNIT = 'boeing-cdu';
const typeInto = (s: ReturnType<typeof createSession>, text: string) => [...text].reduce((acc, c) => press(acc, c), s);

describe('the full preflight chain', () => {
  const chain = trainerChains(UNIT).find((c) => c.id === 'preflight')!;
  const end = playThrough(createSession(UNIT, chain.procedures)).sim;

  it('ends with the route built, activated and executed', () => {
    expect(end.plan.map((leg: { ident: string }) => leg.ident || 'DISCO')).toEqual(['KSEA', 'SUMMA', 'BTG', 'DISCO', 'KSFO']);
    expect([end.activated, end.pending, end.irsSet, end.refAirport]).toEqual([true, false, true, 'KSEA']);
    expect([end.runway, end.sid, end.rows]).toEqual(['16L', 'SUMMA2', [{ via: 'J589', to: 'BTG' }]]);
  });

  it('ends with performance and takeoff data in', () => {
    expect([end.zfw, end.reserves, end.costIndex, end.crzAlt]).toEqual(['180.0', '5.0', '80', 'FL380']);
    expect([end.sel, end.rating, end.flaps, end.accepted]).toEqual(['50', 'TO 1', '10', { v1: true, vr: true, v2: true }]);
    expect(grossWeight(end)).toBe('204.6');
  });
});

describe('EXEC', () => {
  it('lights for a route change and goes out when pressed', () => {
    let s = createSession(UNIT, ['route']);
    expect(litKeys(s)).toEqual([]);
    s = typeInto(s, 'KSEA');
    s = press(s, 'LSK 1L');
    expect(litKeys(s)).toEqual(['EXEC']);
  });

  it('turns RTE 1 into ACT RTE 1 after ACTIVATE and EXEC', () => {
    const before = initialSim(UNIT, ['departure']);
    expect(render(before).title.text).toBe('MENU');
    expect(before.activated).toBe(true);
    const onRte = pressKey(before, 'RTE');
    expect(render(onRte).title.text).toBe('ACT RTE 1');
    expect(render(onRte).lines[5].valueR?.text).toBe('PERF INIT>');
  });
});

describe('copy and use', () => {
  it('copies the GPS position with one key and sets the IRS with the next', () => {
    let s = createSession(UNIT, ['init']);
    s = press(press(s, 'INIT REF'), 'LSK 6R');
    expect(screenOf(s).scratchpad.text).toBe('ENTER IRS POSITION');
    s = typeInto(s, 'KSEA');
    s = press(s, expectedKey(s)!);
    const copy = expectedKey(s)!;
    expect(textBeside(screenOf(s), copy)).toContain('GPS POS');
    s = press(s, copy);
    expect(s.sim.scratchpad).toBe(GPS_POSITION);
    s = press(s, expectedKey(s)!);
    expect([s.mistakes, s.sim.irsSet]).toEqual([0, true]);
  });

  it('refuses the copied text once you have typed over it', () => {
    let s = createSession(UNIT, ['approach-ref']);
    s = press(s, 'INIT REF');
    s = press(s, expectedKey(s)!);
    expect(s.sim.scratchpad).toBe('30/138');
    s = press(s, 'X');
    s = press(s, expectedKey(s)!);
    expect(s.feedback?.text).toMatch(/Clear the scratchpad/);
  });

  it('closes a discontinuity by copying the next waypoint onto the boxes', () => {
    let s = createSession(UNIT, ['discontinuity']);
    s = press(s, 'LEGS');
    s = press(s, expectedKey(s)!);
    expect(s.sim.scratchpad).toBe('BTG');
    const boxes = expectedKey(s)!;
    expect(textBeside(screenOf(s), boxes)).toContain('ROUTE DISCONTINUITY');
    s = press(s, boxes);
    expect(s.sim.plan.map((leg: { ident: string }) => leg.ident || 'DISCO')).toEqual(['KSEA', 'SUMMA', 'BTG', 'DISCO', 'KSFO']);
    expect(litKeys(s)).toEqual(['EXEC']);
  });
});

describe('CDU', () => {
  it('works CLR the Boeing way: one character at a time, nothing when empty', () => {
    let s = pressKey(pressKey(INITIAL_STATE, 'A'), 'B');
    s = pressKey(s, 'CLR');
    expect(s.scratchpad).toBe('A');
    s = pressKey(pressKey(s, 'CLR'), 'CLR');
    expect(s.scratchpad).toBe('');
  });

  it('puts DELETE in the scratchpad for DEL', () => {
    expect(pressKey(INITIAL_STATE, 'DEL').scratchpad).toBe('DELETE');
  });

  it('refuses a runway the airport does not have', () => {
    let s = pressKey(INITIAL_STATE, 'RTE');
    for (const c of 'KSEA') s = pressKey(s, c);
    s = pressKey(s, 'LSK 1L');
    for (const c of 'RW99') s = pressKey(s, c);
    s = pressKey(s, 'LSK 2L');
    expect([s.runway, render(s).scratchpad.text]).toEqual([undefined, 'INVALID ENTRY']);
  });

  it('flies direct to a waypoint ahead by dropping the legs before it', () => {
    const sim = initialSim(UNIT, ['direct']);
    let s = createSession(UNIT, ['direct']);
    expect(sim.plan[sim.active].ident).toBe('BTG');
    s = press(s, 'LEGS');
    s = typeInto(s, 'OED');
    s = press(s, 'LSK 1L');
    expect(s.sim.plan[s.sim.active].ident).toBe('OED');
    expect(screenOf(s).title.text).toBe('MOD RTE 1 LEGS');
    expect(currentStep(s)?.guide.keys).toEqual(['EXEC']);
  });
});
