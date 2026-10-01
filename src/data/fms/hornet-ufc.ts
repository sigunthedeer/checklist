import type { Avionics } from '../types';

/**
 * The Super Hornet has no FMC. Navigation radios and the autopilot are set on
 * the up-front controller under the glareshield, and steering is chosen on the
 * HSI page of a display. Written for the Asobo F/A-18E as it ships in MSFS,
 * which simplifies the real jet.
 */
export const hornetUfc: Avionics = {
  id: 'hornet-ufc',
  name: 'F/A-18E up-front controller',
  short: 'UFC',
  summary:
    'The keypad and small screens just under the head-up display. The buttons across the top pick a function (A/P, TCN, ILS and so on); the option windows down the side then show that function’s choices, each with a button beside it. Numbers are typed on the keypad and entered with ENT.',
  keys: ['A/P', 'TCN', 'ILS', 'ON/OFF', 'ENT', 'CLR', 'T/R', 'RCV', 'BALT', 'RALT', 'FPAH', 'HSEL', 'ROLL', 'CPL'],
  glossary: [
    { term: 'UFC', meaning: 'Up-front controller: the keypad under the head-up display.' },
    { term: 'Option windows', meaning: 'The small displays beside the UFC screen. Each shows a choice; press the button beside it to select it. A colon appears next to a selected option.' },
    { term: 'DDI', meaning: 'Digital display indicator: the two screens either side of the centre display.' },
    { term: 'HSI page', meaning: 'The navigation page on a DDI: compass rose, heading bug and the selected course.' },
    { term: 'TACAN', meaning: 'Military navigation beacon. Gives bearing and distance, tuned by channel number rather than frequency.' },
    { term: 'BALT', meaning: 'Barometric altitude hold: keeps the altitude you are at when you press it.' },
    { term: 'RALT', meaning: 'Radar altitude hold: keeps a height above the ground.' },
    { term: 'HSEL', meaning: 'Heading select: flies the heading bug on the HSI.' },
    { term: 'CPL', meaning: 'Coupled steering: flies to the selected TACAN or waypoint.' },
  ],
  notes: [
    'Written for the Asobo F/A-18E in MSFS. It is a simplified Hornet: not every UFC page works, and some take a frequency where the real jet takes a channel.',
    'The world map does not list TACAN channels. Take them from a chart or a navigation data site.',
    'Option names come and go with each function. If the one a step names is not showing, press that function’s button at the top of the UFC again.',
  ],
  procedures: [
    {
      id: 'tacan',
      name: 'Tune a TACAN',
      kind: 'cruise',
      summary: 'Bearing and distance to a military beacon or carrier.',
      steps: [
        { do: 'Press TCN on the UFC.', keys: ['TCN'], expect: 'The TACAN options in the option windows.' },
        {
          do: 'Press ON/OFF until the UFC screen reads ON.',
          keys: ['ON/OFF'],
          why: 'The TACAN receiver starts powered off. Nothing tunes until it is on.',
        },
        {
          do: 'Select T/R for bearing and distance, or RCV for bearing only.',
          keys: ['T/R'],
          note: 'T/R is the normal choice.',
        },
        {
          do: 'Type the channel on the keypad and press ENT.',
          entry: '75',
          keys: ['ENT'],
          note: 'Example channel. Channels are X band unless the chart says Y.',
        },
        {
          do: 'On the HSI page of a DDI, select TCN so the needle and distance follow the beacon.',
          expect: 'The beacon’s bearing on the compass rose and its distance in the corner.',
        },
      ],
    },
    {
      id: 'ils',
      name: 'Tune the ILS',
      kind: 'approach',
      steps: [
        { do: 'Press ILS on the UFC.', keys: ['ILS'] },
        {
          do: 'Type the localiser frequency and press ENT.',
          entry: '110.30',
          keys: ['ENT'],
          note: 'Example. The MSFS Hornet takes the frequency from the approach chart.',
        },
        { do: 'Press ON/OFF until the UFC screen reads ON.', keys: ['ON/OFF'] },
        {
          do: 'Fly the approach with the localiser and glideslope bars on the head-up display.',
          why: 'The bars show where the localiser and glideslope are. Hand fly to them on speed AoA, the same as the carrier approach.',
        },
      ],
    },
    {
      id: 'altitude-hold',
      name: 'Autopilot: hold altitude',
      kind: 'cruise',
      summary: 'Pitch relief: lets go of the stick in level flight.',
      steps: [
        { do: 'Level off at the altitude you want, with the aircraft trimmed.' },
        {
          do: 'Press A/P on the UFC.',
          keys: ['A/P'],
          expect: 'Pitch modes in the option windows on the left, roll modes and CPL on the right.',
        },
        {
          do: 'Select BALT.',
          keys: ['BALT'],
          expect: 'The current altitude is held.',
          note: 'RALT holds height above the ground instead, for low level over water or flat ground.',
        },
        {
          do: 'Check the heading mode came on with it.',
          why: 'Engaging a pitch mode on its own also holds the heading, unless a roll mode is already selected.',
        },
        {
          do: 'To disconnect, use the autopilot disconnect, or select the mode again.',
          warn: 'Know how you disconnect before engaging: the disconnect is a control binding in MSFS, so check what yours is.',
        },
      ],
    },
    {
      id: 'heading-select',
      name: 'Autopilot: heading select',
      kind: 'cruise',
      steps: [
        {
          do: 'On the HSI page, set the heading bug to the heading you want with the HDG/TK switch below the fuel display.',
        },
        { do: 'Press A/P on the UFC.', keys: ['A/P'] },
        {
          do: 'Select HSEL.',
          keys: ['HSEL'],
          expect: 'The aircraft turns to the bug and holds it. Move the bug and it follows.',
          why: 'A roll mode on its own also holds the flight path angle, so the aircraft does not climb or sink in the turn.',
        },
      ],
    },
    {
      id: 'coupled',
      name: 'Autopilot: fly to the TACAN or waypoint',
      kind: 'cruise',
      steps: [
        {
          do: 'Tune the TACAN, or select the waypoint on the HSI page, and select TCN or WPT on the HSI so it is the steering source.',
        },
        { do: 'Press A/P on the UFC.', keys: ['A/P'] },
        {
          do: 'Select CPL.',
          keys: ['CPL'],
          expect: 'The autopilot steers to the selected beacon or waypoint.',
        },
        { do: 'Select BALT as well if you also want the altitude held.', keys: ['BALT'] },
      ],
    },
  ],
};
