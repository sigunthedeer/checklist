import type { Avionics } from '../types';

export const garminTouch: Avionics = {
  id: 'garmin-touch',
  name: 'Garmin G3000 and G5000',
  short: 'G3000 / G5000',
  summary:
    'Large displays driven from touchscreen controllers on the pedestal. Everything here is done on a controller, from its MFD home page.',
  keys: ['Home', 'Back', 'Flight Plan', 'PROC', 'Direct To', 'Enter'],
  glossary: [
    { term: 'Touch controller', meaning: 'The touchscreen on the pedestal (Garmin calls it a GTC). It drives the big displays.' },
    { term: 'PFD', meaning: 'Primary flight display: attitude, speed, altitude and heading.' },
    { term: 'MFD', meaning: 'Multi-function display: map, flight plan, engine and systems pages.' },
    { term: 'Magenta', meaning: 'The active leg: the one the autopilot flies in NAV mode.' },
    { term: 'Vectors to final', meaning: 'Makes the final approach course the active leg, so the autopilot intercepts it from any heading.' },
  ],
  notes: [
    'Written against the Working Title G3000 in the TBM 930 and G5000 in the Citation Longitude. Button names on the touch controllers can change slightly between sim updates; the flow stays the same.',
    'A flight plan made on the world map loads when the flight starts. This guide is for building one in the cockpit or changing it in the air.',
  ],
  procedures: [
    {
      id: 'flight-plan',
      name: 'Build a flight plan',
      kind: 'preflight',
      steps: [
        {
          do: 'On a touch controller, go to the MFD home page and tap Flight Plan.',
          keys: ['Home', 'Flight Plan'],
          note: 'If the controller is showing PFD pages, switch it to MFD first.',
        },
        {
          do: 'Tap the origin field, type the departure airport and tap Enter.',
          entry: 'KAUS',
          keys: ['Enter'],
          note: 'Example values here and below.',
        },
        { do: 'Tap the destination field and enter it the same way.', entry: 'KDAL', keys: ['Enter'] },
        { do: 'Tap Add Enroute Waypoint for each waypoint between them.' },
        {
          do: 'To follow an airway, tap the waypoint where you join it and choose to load an airway.',
        },
      ],
    },
    {
      id: 'departure',
      name: 'Load a departure',
      kind: 'preflight',
      steps: [
        { do: 'From the MFD home page, tap PROC, then Departure.', keys: ['Home', 'PROC'] },
        { do: 'Choose the departure, the runway and the transition.' },
        { do: 'Tap Load.', expect: 'The departure at the start of the flight plan.' },
      ],
    },
    {
      id: 'approach',
      name: 'Load an approach',
      kind: 'approach',
      steps: [
        { do: 'From the MFD home page, tap PROC, then Approach.', keys: ['Home', 'PROC'] },
        { do: 'Choose the approach, then the transition. Choose vectors if ATC will vector you onto final.' },
        { do: 'Load it to add it to the plan for later, or activate it to fly it now.' },
        {
          cond: 'If being vectored',
          do: 'From PROC, choose the vectors-to-final option.',
          keys: ['PROC'],
          why: 'This skips the waypoints before final, so the autopilot will intercept the final course from whatever heading you are flying.',
        },
      ],
    },
    {
      id: 'direct',
      name: 'Direct to',
      kind: 'cruise',
      steps: [
        { do: 'From the MFD home page, tap Direct To.', keys: ['Home', 'Direct To'] },
        { do: 'Tap the waypoint field, type the ident and tap Enter.', entry: 'KDAL', keys: ['Enter'] },
        { do: 'Tap Activate.', expect: 'A magenta line from the aircraft to the waypoint.' },
        { do: 'Put the autopilot in NAV if it is not already following the magenta line.' },
      ],
    },
    {
      id: 'takeoff-data',
      name: 'Takeoff and landing speeds',
      kind: 'takeoff',
      summary: 'G5000 in the Citation Longitude only. The TBM uses fixed speeds.',
      steps: [
        { do: 'From the MFD home page, open the performance pages and choose takeoff data.', keys: ['Home'] },
        {
          do: 'Enter the runway, wind, temperature and altimeter setting from the ATIS, and check the takeoff weight.',
          why: 'The G5000 works out V1, VR and V2 from these. The autothrottle then uses them.',
        },
        { do: 'Confirm the data.', expect: 'V1, VR and V2 bugs on the PFD speed tape.' },
        { do: 'Before descent, do the same on the landing data page to get VREF.' },
      ],
    },
  ],
};
