import type { Avionics } from '../types';

export const garminGns: Avionics = {
  id: 'garmin-gns',
  name: 'Garmin GNS 530 and 430',
  short: 'GNS',
  summary:
    'The GPS and radio boxes in the middle of the panel. Radios are tuned with the knobs on the left, and the GPS is driven by the keys along the bottom and the double knob on the right. The 430 is the smaller one and works the same way.',
  keys: ['FPL', 'PROC', 'D→', 'MENU', 'CLR', 'ENT', 'PUSH CRSR', 'Right inner', 'Right outer', 'CDI', 'NAV ⇆'],
  glossary: [
    { term: 'Right knob', meaning: 'The double knob at the bottom right. Push it for the cursor; the inner ring picks letters, the outer ring moves along.' },
    { term: 'CDI key', meaning: 'Picks what drives the course needle: GPS, or VLOC for a VOR or ILS radio signal.' },
    { term: 'VLOC', meaning: 'VOR or localiser. The needle follows the NAV radio instead of the GPS.' },
    { term: 'Magenta', meaning: 'The active leg: the one the autopilot flies in NAV mode.' },
    { term: 'D→', meaning: 'Direct-to. Draws a straight line from the aircraft to a waypoint.' },
    { term: 'Vectors to final', meaning: 'Makes the final approach course the active leg, so the autopilot intercepts it from any heading.' },
  ],
  notes: [
    'A flight plan made on the world map loads into the GNS when the flight starts. This guide is for building one in the cockpit or changing it in the air.',
  ],
  procedures: [
    {
      id: 'flight-plan',
      name: 'Build a flight plan',
      kind: 'preflight',
      steps: [
        { do: 'Press FPL.', keys: ['FPL'], expect: 'The ACTIVE FLIGHT PLAN page.' },
        { do: 'Push the right knob to show the cursor.', keys: ['PUSH CRSR'] },
        { do: 'Turn the right inner knob to open the entry.', keys: ['Right inner'] },
        {
          do: 'Spell the departure airport: the inner knob picks each letter, the outer knob moves to the next. Press ENT, then ENT again on the waypoint page to add it.',
          entry: 'KPAE',
          keys: ['ENT', 'ENT'],
          note: 'Example.',
          why: 'The GNS shows the waypoint first so you can check it is the one you meant: several places share some idents.',
        },
        { do: 'Turn the right inner knob again to open the entry for the next waypoint.', keys: ['Right inner'] },
        {
          do: 'Spell it and press ENT twice. Repeat for each waypoint along the route, finishing with the destination airport.',
          entry: 'KSEA',
          keys: ['ENT', 'ENT'],
          note: 'Example: Seattle-Tacoma, a short hop south.',
        },
        {
          do: 'Push the right knob to remove the cursor.',
          keys: ['PUSH CRSR'],
          expect: 'The route on the map, with the active leg in magenta.',
        },
      ],
    },
    {
      id: 'departure',
      name: 'Load a departure',
      kind: 'preflight',
      steps: [
        { do: 'Press PROC.', keys: ['PROC'] },
        { do: 'Highlight Select Departure? with the right outer knob and press ENT.', keys: ['Right outer', 'ENT'] },
        { do: 'Choose the departure, then the runway, then the transition, pressing ENT after each.' },
        { do: 'With LOAD? highlighted, press ENT.', keys: ['ENT'] },
      ],
    },
    {
      id: 'approach',
      name: 'Load an approach',
      kind: 'approach',
      steps: [
        { do: 'Press PROC.', keys: ['PROC'] },
        { do: 'Highlight Select Approach? with the right outer knob and press ENT.', keys: ['Right outer', 'ENT'] },
        { do: 'Choose the approach, then the transition. Choose VECTORS if ATC will vector you onto final.' },
        { do: 'Press ENT on LOAD? to add it for later, or on ACTIVATE? to fly it now.', keys: ['ENT'] },
        {
          cond: 'If being vectored',
          do: 'Press PROC, highlight Activate Vector-To-Final? and press ENT.',
          keys: ['PROC', 'Right outer', 'ENT'],
          why: 'This skips the waypoints before final, so the autopilot will intercept the final course from whatever heading you are flying.',
        },
      ],
    },
    {
      id: 'fly-ils',
      name: 'Fly an ILS',
      kind: 'approach',
      summary: 'With the ILS approach loaded.',
      steps: [
        {
          do: 'Check the localiser frequency is in the NAV standby box. The GNS puts it there when you load an ILS.',
        },
        { do: 'Swap it into the active box.', keys: ['NAV ⇆'] },
        {
          do: 'Press CDI until VLOC shows above the key.',
          keys: ['CDI'],
          why: 'In GPS the needle follows the GPS; in VLOC it follows the ILS radio. An ILS must be flown on VLOC.',
        },
        {
          do: 'When heading to intercept the final course, press APR on the autopilot.',
          why: 'APR arms both the localiser and the glideslope. NAV alone would follow the course but hold your altitude.',
        },
      ],
    },
    {
      id: 'direct',
      name: 'Direct to',
      kind: 'cruise',
      steps: [
        { do: 'Press D→.', keys: ['D→'] },
        {
          do: 'Spell the waypoint with the right knobs and press ENT.',
          entry: 'KBFI',
          keys: ['ENT'],
          note: 'Example. To go direct to a waypoint in the plan, highlight it on the FPL page with the cursor before pressing D→.',
        },
        {
          do: 'With ACTIVATE? highlighted, press ENT.',
          keys: ['ENT'],
          expect: 'A magenta line from the aircraft to the waypoint.',
        },
        { do: 'Put the autopilot in NAV if it is not already following the magenta line.' },
      ],
    },
  ],
};
