/**
 * Data model for aircraft checklists.
 *
 * Checklist items use short keys because the dataset is large and hand-written:
 *   c    challenge  - the item being checked, e.g. "FUEL SELECTOR"
 *   r    response   - the required state, e.g. "BOTH"
 *   note extra guidance shown under the item in smaller text
 *   warn caution / warning, shown in the caution colour
 *   cond condition prefix for a conditional item, e.g. "IF ICING IS PRESENT"
 *
 * `where` and `why` are the beginner layer, hidden unless beginner mode is on.
 * They are written only where they genuinely help; padding every item with
 * filler would bury the ones that matter.
 */
export interface ChecklistItem {
  c: string;
  r: string;
  note?: string;
  warn?: string;
  cond?: string;
  /** Where the control physically sits in the cockpit. */
  where?: string;
  /** What the thing is, and why the step exists at all. */
  why?: string;
  /**
   * Id of the procedure in this aircraft's FMS guide that explains how to do
   * the item. Only valid when the aircraft names its `avionics`.
   */
  guide?: string;
}

/** Broad phase grouping. Drives ordering, icon and accent colour. */
export type PhaseKind =
  | 'preflight'
  | 'start'
  | 'taxi'
  | 'takeoff'
  | 'climb'
  | 'cruise'
  | 'descent'
  | 'approach'
  | 'landing'
  | 'shutdown'
  | 'emergency';

export interface ChecklistPhase {
  /** Stable slug, unique within an aircraft. Used in the route and in saved progress. */
  id: string;
  name: string;
  kind: PhaseKind;
  /** Shown at the top of the phase before the first item. */
  note?: string;
  items: ChecklistItem[];
}

export type SimVersion = 'msfs2020' | 'msfs2024';

export type AircraftCategory =
  | 'airliner'
  | 'jet'
  | 'turboprop'
  | 'piston-twin'
  | 'piston-single'
  | 'lightsport'
  | 'aerobatic'
  | 'helicopter'
  | 'glider'
  | 'military'
  | 'vintage';

export type EngineType =
  | 'piston'
  | 'turboprop'
  | 'turbofan'
  | 'turboshaft'
  | 'electric'
  | 'none';

export interface Spec {
  label: string;
  value: string;
}

/** A reference speed, e.g. { label: 'Vr', value: '55', unit: 'KIAS' } */
export interface Speed {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}

export interface Aircraft {
  /** Stable slug used in routes and saved progress. Never renumber these. */
  id: string;
  /** Display name as it appears in the sim's aircraft selection screen. */
  name: string;
  manufacturer: string;
  model: string;
  /** ICAO type designator, where the type has one. */
  icao?: string;
  category: AircraftCategory;
  /** Which sims ship this aircraft as a default (non-marketplace) aircraft. */
  sims: SimVersion[];
  engines: { count: number; type: EngineType; name?: string };
  seats?: number;
  /** Extra words matched by search: avionics, nicknames, roles. */
  tags?: string[];
  specs?: Spec[];
  speeds?: Speed[];
  /** Normal procedures, in the order they are flown. */
  phases: ChecklistPhase[];
  /** Non-normal / emergency procedures. Kept separate so they are never "run" by accident. */
  emergency?: ChecklistPhase[];
  /** Sim-specific tips: quirks of the model, keybinds, known bugs. */
  notes?: string[];
  /** How the cockpit is laid out, for someone new to the type. Beginner mode only. */
  orientation?: string[];
  /** Id of the avionics unit whose FMS guide applies to this aircraft. */
  avionics?: string;
}

export const PHASE_ORDER: PhaseKind[] = [
  'preflight',
  'start',
  'taxi',
  'takeoff',
  'climb',
  'cruise',
  'descent',
  'approach',
  'landing',
  'shutdown',
  'emergency',
];

export const CATEGORY_LABEL: Record<AircraftCategory, string> = {
  airliner: 'Airliners',
  jet: 'Business jets',
  turboprop: 'Turboprops',
  'piston-twin': 'Piston twins',
  'piston-single': 'Piston singles',
  lightsport: 'Light sport',
  aerobatic: 'Aerobatic',
  helicopter: 'Helicopters',
  glider: 'Gliders',
  military: 'Military',
  vintage: 'Vintage',
};

export const CATEGORY_ORDER: AircraftCategory[] = [
  'airliner',
  'jet',
  'turboprop',
  'piston-twin',
  'piston-single',
  'lightsport',
  'aerobatic',
  'helicopter',
  'glider',
  'military',
  'vintage',
];

export const SIM_LABEL: Record<SimVersion, string> = {
  msfs2020: 'MSFS 2020',
  msfs2024: 'MSFS 2024',
};

/* ---------------------------------------------------------------- FMS guides */

/**
 * One step of an FMS procedure: an instruction plus the exact entry and keys.
 *
 * Order within a step is fixed: type `entry` first, then press `keys` in
 * order. That is how a CDU works (scratchpad, then line select key), and it
 * lets the planned trainer replay a procedure without parsing prose. When a
 * key has to come before typing, it goes in the previous step.
 */
export interface FmsStep {
  /** The instruction. Always names the on-screen label, so it can be found without the key. */
  do: string;
  /**
   * Keys pressed in order. Line select keys are written 'LSK 1L' to 'LSK 6R';
   * everything else must appear in the unit's `keys`. Left out where the key
   * position depends on the page contents, such as picking a runway from a list.
   */
  keys?: string[];
  /** Text typed into the scratchpad or entry field before the keys. Example values are marked in `note`. */
  entry?: string;
  /** What the screen should show afterwards. */
  expect?: string;
  note?: string;
  warn?: string;
  /** Condition prefix, e.g. "IF ALIGN IRS IS SHOWN". */
  cond?: string;
  /** The beginner layer: what this step does and why it is needed. */
  why?: string;
}

export interface FmsProcedure {
  /** Stable slug, unique within the unit. Checklist items point at it. */
  id: string;
  name: string;
  /** When in the flight it is done. Drives the colour and the label. */
  kind: PhaseKind;
  summary?: string;
  steps: FmsStep[];
}

export interface Avionics {
  /** Stable slug used in routes and by `Aircraft.avionics`. */
  id: string;
  /** Full name, e.g. "Airbus A320 MCDU". */
  name: string;
  /** Short form for headers and chips, e.g. "MCDU". */
  short: string;
  /** What it is and where it sits in the cockpit. */
  summary: string;
  /** Whether the unit has line select keys beside the screen. */
  lsk?: boolean;
  /**
   * Every hardware key, knob and touch button a step may reference. The data
   * check rejects a step that names a key not listed here, which keeps typos
   * out of the guides and gives the trainer its keyboard.
   */
  keys: string[];
  /** Terms a newcomer meets on the screen. */
  glossary?: { term: string; meaning: string }[];
  procedures: FmsProcedure[];
  /** How the unit behaves in the sim: automation, known gaps, shortcuts. */
  notes?: string[];
  /**
   * The guide this one is derived from, for a unit shared between aircraft:
   * same keys and procedures, that aircraft's numbers and page names.
   */
  basedOn?: string;
}
