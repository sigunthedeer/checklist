/**
 * What every simulated flight management unit shares: the shape of its
 * screen, its keyboard, and the functions the trainer drives it through.
 */

export type McduColor = 'white' | 'cyan' | 'green' | 'amber' | 'yellow' | 'magenta';

export interface McduCell {
  text: string;
  color: McduColor;
  /** Small font, as the units use for labels and default values. */
  small?: boolean;
}

/** One of the six data lines: a small label row above a value row. */
export interface McduLine {
  labelL?: McduCell;
  labelC?: McduCell;
  labelR?: McduCell;
  valueL?: McduCell;
  valueC?: McduCell;
  valueR?: McduCell;
}

export interface McduScreen {
  titleL?: McduCell;
  title: McduCell;
  titleR?: McduCell;
  /** Always six. */
  lines: McduLine[];
  scratchpad: McduCell;
}

export type FlightPhase = 'preflight' | 'cruise' | 'descent';

export interface KeyboardLayout {
  /** Named keys, row by row. Blank strings are unlabelled keys, drawn as spacers. */
  functionRows: string[][];
  numberRows: string[][];
  letterRows: string[][];
}

/** A simulated unit, as pure functions over its own immutable state. */
export interface TrainerSim<S> {
  initial: S;
  press(state: S, key: string): S;
  render(state: S): McduScreen;
  /** Keys that only type into the scratchpad. The trainer never judges these. */
  isTypingKey(key: string): boolean;
  /** Keys that page or scroll without changing anything, [back, forward]. */
  scrollKeys: [string, string];
  scratchpad(state: S): string;
  /** A message the unit is showing in place of the scratchpad, if any. */
  message(state: S): string | undefined;
  /**
   * Put the unit in a flight phase, as if flown there, on a sensible starting
   * page, or on the page it was already showing when `keepPage` is set.
   */
  enterPhase(state: S, phase: FlightPhase, activeLeg?: string, keepPage?: boolean): S;
  /** Keys whose annunciator light is on, such as EXEC. */
  lit?(state: S): string[];
}

export function keysOf(layout: KeyboardLayout): Set<string> {
  const lsk = [1, 2, 3, 4, 5, 6].flatMap((n) => [`LSK ${n}L`, `LSK ${n}R`]);
  return new Set([...layout.functionRows, ...layout.numberRows, ...layout.letterRows].flat().filter(Boolean).concat(lsk));
}

/** A physical keyboard key (from a web keydown event) to the unit key it stands for. */
export function keyFromKeyboard(key: string): string | undefined {
  if (/^[a-z0-9]$/i.test(key)) return key.toUpperCase();
  const map: Record<string, string> = {
    '/': '/',
    '.': '.',
    ' ': 'SP',
    '-': '+/-',
    Backspace: 'CLR',
    Delete: 'CLR',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    PageUp: 'PREV PAGE',
    PageDown: 'NEXT PAGE',
  };
  return map[key];
}
