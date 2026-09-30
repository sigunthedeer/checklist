import type { KeyboardLayout } from '../screen';

/** The Boeing CDU keyboard, row by row. */
export const BOEING_KEYBOARD: KeyboardLayout = {
  functionRows: [
    ['INIT REF', 'RTE', 'DEP ARR', 'ALTN', 'VNAV', ''],
    ['FIX', 'LEGS', 'HOLD', 'FMC COMM', 'PROG', 'EXEC'],
    ['MENU', 'NAV RAD', 'PREV PAGE', 'NEXT PAGE', '', ''],
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
