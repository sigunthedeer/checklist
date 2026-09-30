/**
 * The A320 MCDU keyboard, row by row. Blank strings are the unlabelled keys
 * on the real panel, drawn as spacers. Kept apart from the component so the
 * tests can check every key the guide names is actually on it.
 */
export const FUNCTION_ROWS: string[][] = [
  ['DIR', 'PROG', 'PERF', 'INIT', 'DATA', ''],
  ['F-PLN', 'RAD NAV', 'FUEL PRED', 'SEC F-PLN', 'ATC COMM', 'MCDU MENU'],
  ['AIRPORT', '', '←', '↑', '→', '↓'],
];

export const NUMBER_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '+/-'],
];

export const LETTER_ROWS: string[][] = [
  ['A', 'B', 'C', 'D', 'E'],
  ['F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O'],
  ['P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y'],
  ['Z', '/', 'SP', 'OVFY', 'CLR'],
];

export const LINE_SELECT_KEYS = [1, 2, 3, 4, 5, 6].flatMap((n) => [`LSK ${n}L`, `LSK ${n}R`]);

export const ALL_KEYS = new Set(
  [...FUNCTION_ROWS, ...NUMBER_ROWS, ...LETTER_ROWS].flat().filter(Boolean).concat(LINE_SELECT_KEYS),
);

/** A physical keyboard key (from a web keydown event) to the MCDU key it stands for. */
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
  };
  return map[key];
}
