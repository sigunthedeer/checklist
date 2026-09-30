/** CJ4 specifics. The contract every unit meets is in session.test.ts. */
import { grossWeight, INITIAL_STATE, LANDING_SPEEDS, pressKey, render, TAKEOFF_SPEEDS } from './cj4/fms';
import { AIRCRAFT } from '../data';
import { createSession, expectedKey, initialSim, litKeys, press, screenOf, trainerChains } from './session';
import { playThrough, textBeside } from './testing';

const UNIT = 'cj4-fms';
const typeInto = (s: ReturnType<typeof createSession>, text: string) => [...text].reduce((acc, c) => press(acc, c), s);

describe('the full preflight chain', () => {
  const chain = trainerChains(UNIT).find((c) => c.id === 'preflight')!;
  const end = playThrough(createSession(UNIT, chain.procedures)).sim;

  it('ends with the plan built, activated and executed', () => {
    expect(end.plan.map((leg: { ident: string }) => leg.ident || 'DISCO')).toEqual(['KTEB', 'DUNNE', 'GON', 'DISCO', 'KBOS']);
    expect([end.posLoaded, end.activated, end.pending, end.runway, end.sid]).toEqual([true, true, false, '24', 'DUNNE2']);
  });

  it('ends with the takeoff speeds sent to the PFD', () => {
    expect([end.pax, end.cargo, grossWeight(end), end.flaps]).toEqual([4, 200, 15060, '15']);
    expect(end.takeoff).toEqual({ wind: '240/08', oat: '15', qnh: '29.92', sent: true });
  });
});

describe('speeds', () => {
  const cj4 = AIRCRAFT.find((a) => a.id === 'cessna-citation-cj4')!;
  const published = (label: string) => cj4.speeds!.find((sp) => sp.label === label)!.value;

  it('match the speeds on the CJ4 aircraft page', () => {
    expect(published('V1')).toBe(`~${TAKEOFF_SPEEDS.V1}`);
    expect(published('Vr')).toBe(`~${TAKEOFF_SPEEDS.VR}`);
    expect(published('V2')).toBe(`~${TAKEOFF_SPEEDS.V2}`);
    expect(published('Venr')).toBe(`~${TAKEOFF_SPEEDS.VT}`);
    const [lo, hi] = published('Vref').replace('~', '').split('-').map(Number);
    expect(Number(LANDING_SPEEDS.VREF)).toBeGreaterThanOrEqual(lo);
    expect(Number(LANDING_SPEEDS.VREF)).toBeLessThanOrEqual(hi);
  });

  it('only offers SEND once everything the speeds depend on is in', () => {
    const sim = initialSim(UNIT, ['takeoff']);
    let s = pressKey(pressKey(pressKey(sim, 'PERF'), 'LSK 1R'), 'NEXT');
    s = pressKey(s, 'NEXT');
    expect(render(s).lines[5].valueR).toBeUndefined();
    expect(render(s).lines[0].valueL?.text).toBe('---');
  });
});

describe('FMS', () => {
  it('activates the flight plan with the first EXEC, no ACTIVATE prompt', () => {
    let s = createSession(UNIT, ['init']);
    // IDX, POS INIT, LOAD, FPLN.
    for (let i = 0; i < 4; i += 1) s = press(s, expectedKey(s)!);
    expect(screenOf(s).title.text).toBe('FPLN');
    s = typeInto(s, 'KTEB');
    s = press(s, 'LSK 1L');
    expect([screenOf(s).title.text, litKeys(s)]).toEqual(['MOD FPLN', ['EXEC']]);
  });

  it('loads the position from the GNSS with LOAD', () => {
    let s = createSession(UNIT, ['init']);
    s = press(s, 'IDX');
    s = press(s, expectedKey(s)!);
    const load = expectedKey(s)!;
    expect(textBeside(screenOf(s), load)).toContain('LOAD');
    s = press(s, load);
    expect(s.sim.posLoaded).toBe(true);
  });

  it('works out runway wind components from the wind entered', () => {
    const sim = initialSim(UNIT, ['takeoff']);
    let s = pressKey(pressKey(sim, 'PERF'), 'LSK 1R');
    for (const c of '240/08') s = pressKey(s, c === '/' ? '/' : c);
    s = pressKey(s, 'LSK 1R');
    expect(render(s).lines[2].valueL?.text).toBe('8H 0R');
  });

  it('refuses flaps the CJ4 does not take off with', () => {
    let s = pressKey(pressKey(pressKey(initialSim(UNIT, ['takeoff']), 'PERF'), 'LSK 1R'), 'NEXT');
    for (const c of '35') s = pressKey(s, c);
    s = pressKey(s, 'LSK 2L');
    expect([s.flaps, render(s).scratchpad.text]).toEqual([undefined, 'INVALID ENTRY']);
  });

  it('goes direct from the list without typing', () => {
    const s = pressKey(pressKey(initialSim(UNIT, ['direct']), 'DIR'), 'LSK 3L');
    expect(s.plan[s.active!].ident).toBe('BOSOX');
    expect(render(s).title.text).toBe('MOD LEGS');
  });

  it('starts cold on the STATUS page', () => {
    expect(render(INITIAL_STATE).title.text).toBe('STATUS');
  });
});
