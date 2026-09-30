/** GNS specifics. The contract every unit meets is in session.test.ts. */
import { pressKey as g1000Key, render as g1000Render } from './garmin/g1000';
import { INITIAL_STATE, legs, pressKey, render, type GnsState } from './gns/gns';
import { createSession, expectedKey, initialSim, press, trainerChains } from './session';
import { playThrough } from './testing';

const UNIT = 'garmin-gns';
const chain = (id: string) => trainerChains(UNIT).find((c) => c.id === id)!.procedures;
const idents = (s: GnsState) => legs(s).map((leg) => leg.ident);
const spell = (s: GnsState, text: string) => [...text].reduce(pressKey, s);

describe('the chains', () => {
  it('builds the route and loads the departure with its transition', () => {
    const end = playThrough(createSession(UNIT, chain('preflight')));
    expect(end.mistakes).toBe(0);
    expect(idents(end.sim)).toEqual(['KPAE', 'SNOHO', 'ELMAA', 'KSEA']);
    expect([end.sim.sid, end.sim.depRunway, end.sim.depTransition]).toEqual(['SNOHO1', '16R', 'ELMAA']);
  });

  it('ends with the localiser swapped into NAV active and the CDI on VLOC', () => {
    const end = playThrough(createSession(UNIT, chain('approach')));
    const s: GnsState = end.sim;
    expect(end.mistakes).toBe(0);
    expect([s.appr, s.apprTransition, idents(s)[s.active!]]).toEqual(['ILS 16R', 'VECTORS', 'FF16R']);
    expect([s.nav1Active, s.nav1Standby, s.cdi]).toEqual(['111.70', '116.80', 'VLOC']);
  });
});

describe('the GNS way', () => {
  it('shows a waypoint for checking and needs a second ENT to add it', () => {
    let s = pressKey(pressKey(pressKey(INITIAL_STATE, 'FPL'), 'PUSH CRSR'), 'Right inner');
    s = pressKey(spell(s, 'KPAE'), 'ENT');
    expect(render(s).page.window?.title).toBe('WAYPOINT INFORMATION');
    expect(s.enroute).toEqual([]);
    s = pressKey(s, 'ENT');
    expect(s.enroute).toEqual(['KPAE']);
  });

  it('puts an ILS frequency in NAV standby, not active', () => {
    const sim = initialSim(UNIT, ['fly-ils']);
    expect([sim.nav1Active, sim.nav1Standby]).toEqual(['116.80', '111.70']);
  });

  it('scripts the second ENT, so one is not enough to move on', () => {
    let s = createSession(UNIT, ['flight-plan']);
    for (const key of ['FPL', 'PUSH CRSR', 'Right inner']) s = press(s, key);
    for (const c of 'KPAE') s = press(s, c);
    s = press(s, 'ENT');
    expect([s.stepIndex, s.actionIndex, expectedKey(s)]).toEqual([3, 1, 'ENT']);
  });

  it('lists transitions for the departure chosen, and none for one without', () => {
    let s = pressKey(initialSim(UNIT, ['departure']), 'PROC');
    while (s.window?.kind === 'menu' && s.window.items[s.window.focus] !== 'Select Departure?') s = pressKey(s, 'Right outer');
    s = pressKey(s, 'ENT');
    const transitions = () => render(s).page.window!.rows[5].left?.text;
    expect(transitions()).toBe('-----');
    s = pressKey(pressKey(s, 'Right inner ↺'), 'ENT');
    s = pressKey(s, 'ENT');
    expect(transitions()).toBe('HAROB');
  });
});

describe('the shared core', () => {
  it('leaves the G1000 departure window without a transition field', () => {
    let s = g1000Key(initialSim('garmin-g1000', ['departure']), 'PROC');
    for (let i = 0; i < 5; i += 1) s = g1000Key(s, 'FMS outer');
    s = g1000Key(s, 'ENT');
    const names = g1000Render(s).mfd.window!.rows.filter((r) => r.header).map((r) => r.left?.text);
    expect(names).toEqual(['DEPARTURE', 'RUNWAY']);
  });
});
