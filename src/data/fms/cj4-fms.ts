import type { Avionics } from '../types';

export const cj4Fms: Avionics = {
  id: 'cj4-fms',
  name: 'Citation CJ4 FMS',
  short: 'CJ4 FMS',
  summary:
    'The keyboard and screen on the centre pedestal, laid out like a Collins unit. It works much like a Boeing CDU: type into the scratchpad, press the key beside the field, and confirm route changes with EXEC.',
  lsk: true,
  keys: ['IDX', 'FPLN', 'LEGS', 'DEP ARR', 'PERF', 'DIR', 'PREV', 'NEXT', 'EXEC'],
  glossary: [
    { term: 'FMS', meaning: 'Flight management system. It flies the route when the autopilot is in NAV.' },
    { term: 'LSK', meaning: 'Line select key. Six either side of the screen, counted from the top: 1L is top left.' },
    { term: 'Scratchpad', meaning: 'The bottom line of the screen. Typing lands here; a line select key moves it into that field.' },
    { term: 'EXEC', meaning: 'Lights up when a route change is waiting. Pressing it makes the change live.' },
    { term: 'MOD', meaning: 'Shown in the page title while a change is waiting for EXEC.' },
    { term: 'Discontinuity', meaning: 'A gap in the route, shown as boxes. NAV mode will not fly across it.' },
    { term: 'VT', meaning: 'Takeoff speed for the clean climb: the speed to hold once the flaps are up.' },
  ],
  notes: [
    'Written against the Working Title CJ4 in MSFS, which is updated often. If a prompt has moved, look for the same label on a neighbouring line.',
    'Enter the flight plan here rather than on the world map for LNAV and VNAV to behave.',
  ],
  procedures: [
    {
      id: 'init',
      name: 'Position and route',
      kind: 'preflight',
      steps: [
        { do: 'Press IDX and open POS INIT.', keys: ['IDX'] },
        {
          do: 'Load the current position into the FMS with the LOAD prompt beside the GPS position.',
          why: 'The FMS needs to know where it starts before it can draw the route from the aircraft.',
        },
        { do: 'Press FPLN.', keys: ['FPLN'] },
        {
          do: 'Enter ORIGIN at the top left.',
          entry: 'KTEB',
          keys: ['LSK 1L'],
          note: 'Example values here and below: Teterboro to Boston.',
        },
        { do: 'Enter DEST at the top right.', entry: 'KBOS', keys: ['LSK 1R'] },
        {
          do: 'Go to the next page and enter the route: the airway in VIA on the left, the exit waypoint in TO on the right.',
          keys: ['NEXT'],
          note: 'For a direct leg, type the waypoint straight into TO.',
        },
        { do: 'Press EXEC.', keys: ['EXEC'], expect: 'The route drawn on the MFD.' },
      ],
    },
    {
      id: 'departure',
      name: 'Departure runway and SID',
      kind: 'preflight',
      steps: [
        { do: 'Press DEP ARR, then DEP beside the origin.', keys: ['DEP ARR', 'LSK 1L'] },
        { do: 'Pick the runway from the right-hand column.' },
        { do: 'Pick the SID from the left-hand column, then its transition.' },
        { do: 'Press EXEC.', keys: ['EXEC'] },
        { do: 'Check LEGS for a discontinuity after the SID.', keys: ['LEGS'] },
      ],
    },
    {
      id: 'discontinuity',
      name: 'Clear a discontinuity',
      kind: 'preflight',
      steps: [
        { do: 'On LEGS, find the discontinuity: a row of boxes.', keys: ['LEGS'], note: 'Use NEXT to page down.' },
        { do: 'Press the key beside the waypoint just after the gap. It is copied to the scratchpad.' },
        {
          do: 'Press the key beside the boxes.',
          expect: 'The waypoint moves up and the gap closes.',
          why: 'The FMS will not join two parts of a route on its own, and NAV mode stops at the gap.',
        },
        { do: 'Press EXEC.', keys: ['EXEC'] },
      ],
    },
    {
      id: 'takeoff',
      name: 'Takeoff speeds',
      kind: 'takeoff',
      steps: [
        { do: 'Press PERF and open PERF INIT.', keys: ['PERF'] },
        {
          do: 'Enter the passenger count and cargo weight. The fuel is read from the tanks.',
          why: 'The takeoff speeds depend on weight, and this is where the FMS gets it.',
        },
        { do: 'Go back to the PERF menu and open TAKEOFF.', keys: ['PERF'] },
        { do: 'On page 1, check the runway, and enter the wind, temperature and QNH from the ATIS.' },
        { do: 'On page 2, enter the takeoff flaps (0 or 15) and the anti-ice setting.', keys: ['NEXT'] },
        {
          do: 'On page 3, check V1, VR, V2 and VT and send them to the PFD.',
          keys: ['NEXT'],
          expect: 'The speed bugs on the PFD speed tape.',
        },
      ],
    },
    {
      id: 'arrival',
      name: 'Arrival and approach',
      kind: 'descent',
      steps: [
        { do: 'Press DEP ARR, then ARR beside the destination.', keys: ['DEP ARR'] },
        { do: 'Pick the approach from the right-hand column, then its transition.' },
        { do: 'Pick the STAR from the left-hand column, then its transition.' },
        { do: 'Press EXEC.', keys: ['EXEC'] },
        { do: 'Check LEGS for discontinuities where the STAR joins the route.', keys: ['LEGS'] },
      ],
    },
    {
      id: 'approach-ref',
      name: 'Landing speeds',
      kind: 'descent',
      steps: [
        { do: 'Press PERF and open APPROACH.', keys: ['PERF'] },
        { do: 'Enter the destination wind, temperature and QNH.' },
        {
          do: 'Page on to check VREF and VAPP, and send them to the PFD.',
          keys: ['NEXT'],
          why: 'VREF is the speed over the threshold; VAPP adds a margin for the approach.',
        },
      ],
    },
    {
      id: 'direct',
      name: 'Direct to',
      kind: 'cruise',
      steps: [
        { do: 'Press DIR.', keys: ['DIR'] },
        {
          do: 'Press the key beside a waypoint in the list, or type one and press the top left key.',
          entry: 'BOSOX',
          keys: ['LSK 1L'],
          note: 'Example waypoint.',
        },
        { do: 'Press EXEC.', keys: ['EXEC'] },
        { do: 'Make sure the autopilot is in NAV.' },
      ],
    },
  ],
};
