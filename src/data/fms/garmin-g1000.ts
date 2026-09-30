import type { Avionics } from '../types';

export const garminG1000: Avionics = {
  id: 'garmin-g1000',
  name: 'Garmin G1000 NXi',
  short: 'G1000',
  summary:
    'Two large screens: the PFD in front of you shows the flight instruments, the MFD in the middle shows the map, engine and flight plan. Each has the same keys and knobs round its edge. Everything here is done on the MFD, with the FMS knob at its bottom right.',
  keys: [
    'FPL',
    'PROC',
    'D→',
    'MENU',
    'CLR',
    'ENT',
    'PUSH CRSR',
    'FMS inner',
    'FMS outer',
    'CDI',
    'HDG',
    'NAV',
    'APR',
  ],
  glossary: [
    { term: 'PFD', meaning: 'Primary flight display. The screen in front of the pilot: attitude, speed, altitude, heading.' },
    { term: 'MFD', meaning: 'Multi-function display. The centre screen: map, engine and flight plan pages.' },
    { term: 'FMS knob', meaning: 'The double knob at the bottom right of each screen. Push it for the cursor; the inner ring picks letters and pages, the outer ring moves around.' },
    { term: 'Softkeys', meaning: 'The row of keys along the bottom of each screen. Their labels change with the page.' },
    { term: 'CDI', meaning: 'The course needle on the PFD, and the softkey that picks its source: GPS, VOR or LOC.' },
    { term: 'Magenta', meaning: 'The active leg: the one the autopilot flies in NAV mode.' },
    { term: 'D→', meaning: 'Direct-to. Draws a straight line from the aircraft to a waypoint.' },
    { term: 'Vectors to final', meaning: 'Makes the final approach course the active leg, so NAV or APR intercepts it from any heading.' },
  ],
  notes: [
    'A flight plan made on the world map loads into the G1000 when the flight starts. This guide is for building one in the cockpit or changing it in the air.',
    'The Cirrus SR22 has Garmin Perspective+, which is built on the G1000. The keys and pages are the same.',
  ],
  procedures: [
    {
      id: 'flight-plan',
      name: 'Build a flight plan',
      kind: 'preflight',
      steps: [
        {
          do: 'Press FPL on the MFD.',
          keys: ['FPL'],
          expect: 'The ACTIVE FLIGHT PLAN page.',
          why: 'The MFD has room to see and edit the whole route. The PFD then shows the result on its course needle and inset map.',
        },
        { do: 'Push the FMS knob to show the cursor.', keys: ['PUSH CRSR'] },
        {
          do: 'Turn the inner FMS knob one click to open the waypoint entry box.',
          keys: ['FMS inner'],
        },
        {
          do: 'Spell the departure airport: turn the inner knob to pick each letter and the outer knob to move to the next. Then press ENT.',
          entry: 'KSEA',
          keys: ['ENT'],
          note: 'Example. If a list of matching waypoints appears, pick the right one and press ENT again.',
        },
        { do: 'Turn the inner FMS knob again to open the entry box for the next waypoint.', keys: ['FMS inner'] },
        {
          do: 'Spell it and press ENT. Repeat for each waypoint along the route, finishing with the destination airport.',
          entry: 'KPAE',
          keys: ['ENT'],
          note: 'Example: Paine Field, a short hop north of Seattle.',
        },
        {
          do: 'Push the FMS knob to remove the cursor.',
          keys: ['PUSH CRSR'],
          expect: 'The route drawn on the map, with the active leg in magenta.',
        },
      ],
    },
    {
      id: 'departure',
      name: 'Load a departure',
      kind: 'preflight',
      steps: [
        { do: 'Press PROC.', keys: ['PROC'], expect: 'The PROCEDURES menu.' },
        { do: 'Highlight SELECT DEPARTURE with the outer FMS knob and press ENT.', keys: ['FMS outer', 'ENT'] },
        {
          do: 'Choose the departure, then the runway, then the transition. Turn the inner knob to open each list and press ENT to choose.',
          why: 'A departure (SID) is a published route out of the airport. Loading it brings its altitude restrictions with it.',
        },
        {
          do: 'With LOAD? highlighted, press ENT.',
          keys: ['ENT'],
          expect: 'The departure at the top of the flight plan.',
        },
      ],
    },
    {
      id: 'arrival',
      name: 'Load an arrival',
      kind: 'descent',
      steps: [
        { do: 'Press PROC.', keys: ['PROC'] },
        { do: 'Highlight SELECT ARRIVAL with the outer FMS knob and press ENT.', keys: ['FMS outer', 'ENT'] },
        { do: 'Choose the arrival, then the transition, then the runway.' },
        { do: 'With LOAD? highlighted, press ENT.', keys: ['ENT'] },
      ],
    },
    {
      id: 'approach',
      name: 'Load an approach',
      kind: 'approach',
      steps: [
        { do: 'Press PROC.', keys: ['PROC'] },
        { do: 'Highlight SELECT APPROACH with the outer FMS knob and press ENT.', keys: ['FMS outer', 'ENT'] },
        {
          do: 'Choose the approach, then the transition. Choose VECTORS if ATC will vector you onto final.',
        },
        {
          do: 'Press ENT on LOAD? to add it to the plan for later, or on ACTIVATE? to fly it now.',
          keys: ['ENT'],
        },
        {
          cond: 'If being vectored',
          do: 'Press PROC, highlight ACTIVATE VECTOR-TO-FINAL and press ENT.',
          keys: ['PROC', 'FMS outer', 'ENT'],
          why: 'This skips the waypoints before final, so the autopilot will intercept the final course from whatever heading you are flying.',
        },
        {
          cond: 'For an ILS',
          do: 'Check the localiser frequency is the active NAV1 frequency, top left of the PFD. The NXi normally tunes it when the approach is loaded; if it is in the standby box, swap it across.',
        },
      ],
    },
    {
      id: 'fly-approach',
      name: 'Fly the approach on autopilot',
      kind: 'approach',
      summary: 'With the approach loaded and the autopilot on.',
      steps: [
        { do: 'Fly the headings ATC gives you in HDG mode.', keys: ['HDG'] },
        {
          cond: 'For an ILS',
          do: 'Check the CDI shows LOC1. It switches from GPS by itself as you near the final course; press the CDI softkey if it has not.',
          keys: ['CDI'],
          why: 'GPS steers the needle by GPS; LOC steers it by the ILS radio. An ILS must be flown on LOC.',
        },
        {
          cond: 'For an RNAV (GPS) approach',
          do: 'Leave the CDI on GPS.',
        },
        {
          do: 'When heading to intercept the final course, press APR.',
          keys: ['APR'],
          expect: 'LOC and GS (or GPS and GP) in white at the top of the PFD, turning green as each one captures.',
          why: 'APR arms both the course and the glidepath. NAV alone would follow the course but hold your altitude.',
        },
        {
          do: 'Once the glidepath is captured, set the missed approach altitude on the ALT knob.',
          why: 'After capture the autopilot ignores the altitude preselect, so it is safe to set now and ready if you go around.',
        },
      ],
    },
    {
      id: 'direct',
      name: 'Direct to',
      kind: 'cruise',
      steps: [
        { do: 'Press D→.', keys: ['D→'], expect: 'The DIRECT TO window, with the cursor in the waypoint field.' },
        {
          do: 'Spell the waypoint with the FMS knobs and press ENT.',
          entry: 'KBFI',
          keys: ['ENT'],
          note: 'Example. To go direct to a waypoint already in the plan, highlight it on the FPL page with the cursor before pressing D→.',
        },
        {
          do: 'With ACTIVATE? highlighted, press ENT.',
          keys: ['ENT'],
          expect: 'A magenta line from the aircraft to the waypoint.',
        },
        { do: 'Press NAV on the autopilot if it is not already following the magenta line.', keys: ['NAV'] },
      ],
    },
    {
      id: 'activate-leg',
      name: 'Activate a leg',
      kind: 'cruise',
      summary: 'Fixes a flight plan that has skipped ahead or fallen behind.',
      steps: [
        { do: 'Press FPL and push the FMS knob for the cursor.', keys: ['FPL', 'PUSH CRSR'] },
        {
          do: 'Turn the outer FMS knob to highlight the waypoint you want to fly to next.',
          keys: ['FMS outer'],
        },
        {
          do: 'Press MENU, highlight ACTIVATE LEG and press ENT. Press ENT again if it asks you to confirm.',
          keys: ['MENU', 'ENT'],
          expect: 'The leg into that waypoint turns magenta.',
          why: 'The magenta leg is the one the autopilot flies, so this is how you tell it where to go next.',
        },
      ],
    },
  ],
};
