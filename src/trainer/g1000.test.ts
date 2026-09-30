/** G1000 specifics. The contract every unit meets is in session.test.ts. */
import { INITIAL_STATE, legs, pressKey, render, type G1000State } from './garmin/g1000';
import { createSession, expectedKey, initialSim, press, trainerChains } from './session';
import { playThrough } from './testing';

const UNIT = 'garmin-g1000';
const chain = (id: string) => trainerChains(UNIT).find((c) => c.id === id)!.procedures;
const idents = (s: G1000State) => legs(s).map((leg) => leg.ident);

describe('the chains', () => {
  it('builds the route and loads the departure', () => {
    const end = playThrough(createSession(UNIT, chain('preflight')));
    expect(end.mistakes).toBe(0);
    expect(idents(end.sim)).toEqual(['KSEA', 'ELMAA', 'KPAE']);
    expect([end.sim.sid, end.sim.depRunway]).toEqual(['ELMAA3', '16L']);
  });

  it('ends established on the ILS with the approach armed', () => {
    const end = playThrough(createSession(UNIT, chain('approach')));
    const s: G1000State = end.sim;
    expect(end.mistakes).toBe(0);
    expect(idents(s)).toEqual(['KSEA', 'ELMAA', 'GLASR', 'PAE', 'FF16R', 'RW16R', 'KPAE']);
    expect([s.star, s.arrRunway, s.appr, s.apprTransition]).toEqual(['GLASR1', '16R', 'ILS 16R', 'VECTORS']);
    expect(legs(s)[s.active!].ident).toBe('FF16R');
    expect([s.nav1Active, s.cdi, s.lateral, s.armed]).toEqual(['109.30', 'LOC1', 'HDG', 'LOC GS']);
  });
});

describe('the cursor', () => {
  it('counts ENT in the wrong place as a mistake and leaves the unit alone', () => {
    let s = createSession(UNIT, ['departure']);
    s = press(s, 'PROC');
    const before = s.sim;
    s = press(s, 'ENT');
    expect(s.mistakes).toBe(1);
    expect(s.feedback?.text).toBe('Move the cursor to SELECT DEPARTURE before pressing ENT.');
    expect(s.sim).toEqual(before);
  });

  it('accepts the knob turned either way, as long as it gets there', () => {
    let s = createSession(UNIT, ['departure']);
    s = press(s, 'PROC');
    // SELECT DEPARTURE is at the bottom; going up first is allowed, just slower.
    s = press(s, 'FMS outer ↺');
    for (let i = 0; i < 5; i += 1) s = press(s, 'FMS outer');
    expect(s.mistakes).toBe(0);
    expect(expectedKey(s)).toBe('ENT');
  });

  it('points the shorter way round a list', () => {
    let s = createSession(UNIT, ['departure']);
    s = press(s, 'PROC');
    while (expectedKey(s) !== 'ENT') s = press(s, expectedKey(s)!);
    s = press(s, 'ENT');
    // ELMAA3 is third of three: one turn back beats two forward.
    expect(expectedKey(s)).toBe('FMS inner ↺');
  });

  it('does not trip over a transition list reached by the outer knob', () => {
    let sim = pressKey(initialSim(UNIT, ['approach']), 'PROC');
    sim = pressKey(sim, 'ENT');
    sim = pressKey(pressKey(sim, 'FMS outer'), 'FMS inner');
    expect(render(sim).mfd.window?.title).toBe('APPROACH LOADING');
    // The list follows the approach still showing, RNAV 34L, rather than being empty.
    expect(sim.window && sim.window.kind === 'proc' && sim.window.fields[1].options).toEqual(['VECTORS']);
  });
});

describe('spelling', () => {
  it('works with the knobs alone, as on the real unit', () => {
    let s = pressKey(pressKey(pressKey(INITIAL_STATE, 'FPL'), 'PUSH CRSR'), 'FMS inner');
    let turns = 0;
    for (const letter of 'KSEA') {
      while (s.window?.kind === 'entry' && s.window.chars[s.window.cursor] !== letter) {
        s = pressKey(s, 'FMS inner');
        turns += 1;
      }
      s = pressKey(s, 'FMS outer');
    }
    s = pressKey(s, 'ENT');
    expect(s.enroute).toEqual(['KSEA']);
    expect(turns).toBe(11 + 19 + 5 + 1);
  });

  it('refuses an ident that is not in the database', () => {
    let s = pressKey(INITIAL_STATE, 'D→');
    for (const c of 'KXYZ') s = pressKey(s, c);
    s = pressKey(s, 'ENT');
    expect(render(s).mfd.window?.rows[0].left?.text).toBe('WAYPOINT NOT FOUND');
  });
});

describe('flying', () => {
  it('shows a direct-to on the map', () => {
    const end = playThrough(createSession(UNIT, ['direct']));
    expect(render(end.sim).mfd.rows[1].left?.text).toBe('DIRECT TO KBFI');
    expect(end.sim.lateral).toBe('GPS');
  });

  it('activates the leg under the cursor', () => {
    const end = playThrough(createSession(UNIT, ['activate-leg']));
    expect(legs(end.sim)[end.sim.active!].ident).toBe('GLASR');
    expect(end.mistakes).toBe(0);
  });
});
