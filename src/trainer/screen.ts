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
  /** Under the cursor: drawn in reverse, as Garmin displays show the selected field. */
  cursor?: boolean;
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

/**
 * A simulated unit, as pure functions over its own immutable state. `Screen`
 * is what `render` draws: an MCDU-style text page for the units with line
 * select keys, or the unit's own picture for the rest.
 */
export interface TrainerSim<S, Screen = McduScreen> {
  initial: S;
  press(state: S, key: string): S;
  render(state: S): Screen;
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
  /**
   * Keys that are never wrong in themselves, such as a knob turned while
   * looking for something. They are applied, and only count as progress when
   * the script wants exactly that key.
   */
  freeKeys?: string[];
  /** The key a pressed key counts as: a knob turned either way is the same knob. */
  keyAlias?(key: string): string;
  /** Keys that consume a typed entry. Without this, the line select keys do. */
  isCommitKey?(key: string): boolean;
  /**
   * For a `pick` action: whether the item is highlighted now, and if not, the
   * key that moves the cursor towards it. `confirmKey` then selects it.
   */
  pick?(state: S, text: string): { onTarget: boolean; toward?: string };
  confirmKey?: string;
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
    Enter: 'ENT',
    PageUp: 'PREV PAGE',
    PageDown: 'NEXT PAGE',
  };
  return map[key];
}

/** A row on a Garmin display: text at the left, centre and right, or a run of cells. */
export interface GarminRow {
  left?: McduCell;
  centre?: McduCell;
  right?: McduCell;
  /** Drawn left to right instead of left/centre/right, e.g. an ident being spelled. */
  cells?: McduCell[];
  /** A section heading, drawn smaller and dimmer. */
  header?: boolean;
}

/** What a Garmin G1000 trainer draws: a strip of the PFD and the MFD with any open window. */
export interface GarminScreen {
  pfd: {
    nav1Active: string;
    nav1Standby: string;
    cdi: string;
    /** Autopilot modes: active lateral and vertical in green, armed in white. */
    lateral: string;
    vertical: string;
    armed: string;
  };
  softkeys: string[];
  mfd: {
    title: string;
    rows: GarminRow[];
    window?: { title: string; rows: GarminRow[] };
  };
}
