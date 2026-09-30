import type { KeyboardLayout } from '../screen';

/**
 * The G1000 controls, grouped the way the panel draws them: autopilot keys,
 * the MFD hard keys, the FMS knob, the PFD softkeys. The letters and digits
 * are the spelling shortcut; the real unit has no keyboard.
 */
export const G1000_CONTROLS: KeyboardLayout = {
  functionRows: [
    ['AP', 'FD', 'HDG', 'ALT', 'NAV', 'VNV', 'APR', 'VS', 'FLC'],
    ['D→', 'MENU', 'FPL', 'PROC', 'CLR', 'ENT'],
    ['FMS outer ↺', 'FMS outer', 'FMS inner ↺', 'FMS inner', 'PUSH CRSR'],
    ['INSET', 'PFD', 'OBS', 'CDI', 'DME', 'XPDR'],
  ],
  numberRows: [['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']],
  letterRows: [
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
    ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
    ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  ],
};
