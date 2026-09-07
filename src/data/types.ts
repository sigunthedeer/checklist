/**
 * Data model for aircraft checklists.
 *
 * Checklist items use short keys because the dataset is large and hand-written:
 *   c    challenge  - the item being checked, e.g. "FUEL SELECTOR"
 *   r    response   - the required state, e.g. "BOTH"
 *   note extra guidance shown under the item in smaller text
 *   warn caution / warning, shown in the caution colour
 *   cond condition prefix for a conditional item, e.g. "IF ICING IS PRESENT"
 */
export interface ChecklistItem {
  c: string;
  r: string;
  note?: string;
  warn?: string;
  cond?: string;
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
  /** Hex colour used for the aircraft's accent in lists and headers. */
  accent: string;
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
  'vintage',
];

export const SIM_LABEL: Record<SimVersion, string> = {
  msfs2020: 'MSFS 2020',
  msfs2024: 'MSFS 2024',
};
