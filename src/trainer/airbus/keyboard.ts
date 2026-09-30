import type { KeyboardLayout } from '../screen';

/** The A320 MCDU keyboard, row by row. */
export const AIRBUS_KEYBOARD: KeyboardLayout = {
  functionRows: [
    ['DIR', 'PROG', 'PERF', 'INIT', 'DATA', ''],
    ['F-PLN', 'RAD NAV', 'FUEL PRED', 'SEC F-PLN', 'ATC COMM', 'MCDU MENU'],
    ['AIRPORT', '', '←', '↑', '→', '↓'],
  ],
  numberRows: [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '+/-'],
  ],
  letterRows: [
    ['A', 'B', 'C', 'D', 'E'],
    ['F', 'G', 'H', 'I', 'J'],
    ['K', 'L', 'M', 'N', 'O'],
    ['P', 'Q', 'R', 'S', 'T'],
    ['U', 'V', 'W', 'X', 'Y'],
    ['Z', '/', 'SP', 'OVFY', 'CLR'],
  ],
};
