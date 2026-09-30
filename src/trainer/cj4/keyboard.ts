import type { KeyboardLayout } from '../screen';

/** The CJ4 FMS keyboard, row by row. */
export const CJ4_KEYBOARD: KeyboardLayout = {
  functionRows: [
    ['IDX', 'FPLN', 'LEGS', 'DEP ARR', 'PERF', 'DIR'],
    ['TUN', 'MFD MENU', 'MFD ADV', 'MFD DATA', 'PREV', 'NEXT'],
    ['EXEC', '', '', '', '', ''],
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
    ['Z', 'SP', 'DEL', '/', 'CLR'],
  ],
};
