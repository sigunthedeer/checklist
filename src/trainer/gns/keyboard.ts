import type { KeyboardLayout } from '../screen';

/**
 * The GNS controls, grouped the way the panel draws them: the keys along the
 * bottom of the screen, the keys down the right, the right-hand knob, and the
 * radio flip-flops on the left. The letters and digits are the spelling
 * shortcut; the real unit has no keyboard.
 */
export const GNS_CONTROLS: KeyboardLayout = {
  functionRows: [
    ['CDI', 'OBS', 'MSG', 'FPL', 'VNAV', 'PROC'],
    ['D→', 'MENU', 'CLR', 'ENT'],
    ['Right outer ↺', 'Right outer', 'Right inner ↺', 'Right inner', 'PUSH CRSR'],
    ['COM ⇆', 'NAV ⇆'],
  ],
  numberRows: [['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
  letterRows: [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  ],
};
