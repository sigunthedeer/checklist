/** A320 specifics. The contract every unit meets is in session.test.ts. */
import { AIRBUS_KEYBOARD } from './airbus/keyboard';
import { fuelFigures, INITIAL_STATE, pressKey, render } from './airbus/mcdu';
import { keyFromKeyboard, keysOf } from './screen';
import { acknowledge, buildProcedure, createSession, currentStep, expectedKey, initialSim, press, screenOf, trainerChains } from './session';
import { playThrough, textBeside } from './testing';

const UNIT = 'airbus-mcdu';

describe('the full cockpit preparation chain', () => {
  const chain = trainerChains(UNIT).find((c) => c.id === 'preflight')!;

  it('plays through on one MCDU and ends with the whole flight set up', () => {
    const end = playThrough(createSession(UNIT, chain.procedures));
    expect(end.mistakes).toBe(0);
    const sim = end.sim;
    expect(sim.plan.map((leg: { ident: string }) => leg.ident || 'DISCO')).toEqual(['EGLL', 'LON', 'DET', 'DVR', 'NATEB', 'LFPG']);
    expect([sim.fromTo, sim.fltNbr, sim.costIndex, sim.crzFl, sim.irsAligned]).toEqual([
      ['EGLL', 'LFPG'],
      'CKR123',
      '30',
      350,
      true,
    ]);
    expect([sim.runway, sim.sid, sim.zfw, sim.block]).toEqual(['27R', 'DVR5J', '60.0/27.0', '8.5']);
    expect([sim.v1, sim.vr, sim.v2, sim.flapsThs, sim.flex]).toEqual(['142', '144', '147', '1/UP0.5', '55']);
  });

  it('shows the weights the fuel step tells you to expect', () => {
    const sim = initialSim(UNIT, ['perf-takeoff']);
    const fuel = fuelFigures(sim)!;
    expect([fuel.tow.toFixed(1), fuel.lw.toFixed(1)]).toEqual(['68.3', '65.9']);
    const ack = buildProcedure(UNIT, 'fuel').steps[3].ack!;
    expect(ack).toContain('68.3');
    expect(ack).toContain('65.9');
  });
});

describe('judging presses', () => {
  const start = () => createSession(UNIT, ['init']);

  it('never counts typing or scrolling as a mistake', () => {
    let s = start();
    for (const key of ['E', 'G', '/', '↓', '↑', 'CLR']) s = press(s, key);
    expect(s.mistakes).toBe(0);
    expect(s.sim.scratchpad).toBe('EG');
  });

  it('asks for the entry before the key that uses it', () => {
    let s = press(start(), 'INIT');
    s = press(s, 'LSK 1R');
    expect(s.feedback?.text).toMatch(/Type EGLL\/LFPG first/);
    expect(s.stepIndex).toBe(1);
    for (const c of 'EGLL/LFPX') s = press(s, c);
    s = press(s, 'LSK 1R');
    expect(s.feedback?.text).toMatch(/reads EGLL\/LFPX/);
    s = press(s, 'CLR');
    s = press(s, 'G');
    s = press(s, 'LSK 1R');
    expect(s.stepIndex).toBe(2);
    expect(s.sim.fromTo).toEqual(['EGLL', 'LFPG']);
  });

  it('stops a key with no entry from swallowing leftover scratchpad text', () => {
    let s = createSession(UNIT, ['departure']);
    s = press(s, 'F-PLN');
    s = press(s, 'X');
    s = press(s, 'LSK 1L');
    expect(s.feedback?.text).toMatch(/Clear the scratchpad/);
    expect(s.sim.page).toBe('F-PLN');
  });

  it('resolves a pick from a list to the key beside it', () => {
    let s = createSession(UNIT, ['departure']);
    for (const key of ['F-PLN', 'LSK 1L', 'LSK 1L']) s = press(s, key);
    const key = expectedKey(s)!;
    expect(key).toMatch(/^LSK [2-5]L$/);
    expect(textBeside(screenOf(s), key)).toContain('27R');
  });

  it('tells you to scroll when the target is off screen', () => {
    let s = createSession(UNIT, ['discontinuity']);
    s = press(s, 'F-PLN');
    s = press(s, 'CLR');
    expect(expectedKey(s)).toBeUndefined();
    s = press(s, 'LSK 5L');
    expect(s.feedback?.text).toMatch(/not on screen\. Page through with ↑ and ↓/);
  });

  it('waits for Continue on a step with nothing to press', () => {
    let s = createSession(UNIT, ['fuel']);
    for (const key of ['INIT', '→']) s = press(s, key);
    for (const c of '60.0/27.0') s = press(s, c);
    s = press(s, 'LSK 1R');
    for (const c of '8.5') s = press(s, c);
    s = press(s, 'LSK 2R');
    expect(currentStep(s)?.ack).toBeTruthy();
    expect(press(s, 'INIT').mistakes).toBe(0);
    expect(acknowledge(s).finished).toBe(true);
  });
});

describe('MCDU', () => {
  it('works CLR the way the real one does', () => {
    let s = pressKey(INITIAL_STATE, 'CLR');
    expect(s.scratchpad).toBe('CLR');
    s = pressKey(s, 'CLR');
    expect(s.scratchpad).toBe('');
    s = pressKey(pressKey(s, 'A'), 'B');
    expect(pressKey(s, 'CLR').scratchpad).toBe('A');
  });

  it('rejects entries in the wrong format instead of accepting them', () => {
    let s = pressKey(INITIAL_STATE, 'INIT');
    for (const c of 'EGLL-LFPG') s = pressKey(s, c === '-' ? '+/-' : c);
    s = pressKey(s, 'LSK 1R');
    expect(s.fromTo).toBeUndefined();
    expect(render(s).scratchpad.text).toBe('FORMAT ERROR');
  });

  it('draws six lines on every page it simulates', () => {
    const pages = ['MCDU MENU', 'INIT', 'F-PLN', 'PERF', 'DIR', 'DATA'];
    for (const key of pages) expect(render(pressKey(INITIAL_STATE, key)).lines).toHaveLength(6);
  });

  it('maps a hardware keyboard onto MCDU keys', () => {
    const keys = ['a', '7', '/', 'Backspace', 'ArrowDown', 'Tab'].map(keyFromKeyboard);
    expect(keys).toEqual(['A', '7', '/', 'CLR', '↓', undefined]);
    expect(keys.filter((k): k is string => !!k).every((k) => keysOf(AIRBUS_KEYBOARD).has(k))).toBe(true);
  });
});
