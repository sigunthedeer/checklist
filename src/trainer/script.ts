import type { FlightPhase } from './screen';

/**
 * A key the script wants pressed: either a named key from the guide, or the
 * line select key beside some text on the screen. `in: 'label'` restricts the
 * match to the small labels, for fields whose value is still empty boxes.
 */
export type TrainerAction = { key: string } | { beside: string; in?: 'label' };

export interface StepScript {
  /** Replaces the guide's keys, for picks whose line depends on the page. */
  keys?: TrainerAction[];
  /** Nothing to press in this scenario, and why. */
  ack?: string;
}

export interface ProcedureScript {
  /** Procedures played automatically first, to set the scene. */
  requires: string[];
  phase: FlightPhase;
  /** Ident of the leg being flown to, once airborne. */
  activeLeg?: string;
  /**
   * Starts on the page the required procedures left the unit on, rather than
   * the menu, for a procedure that picks up where the one before it stopped.
   */
  continues?: boolean;
  /** Keyed by the step's index in the guide procedure. */
  steps?: Record<number, StepScript>;
}

export const k = (key: string): TrainerAction => ({ key });
export const beside = (text: string): TrainerAction => ({ beside: text });
export const besideLabel = (text: string): TrainerAction => ({ beside: text, in: 'label' });

export interface Chain {
  id: string;
  name: string;
  summary: string;
  procedures: string[];
}

/** Everything the trainer needs for one avionics unit. */
export interface TrainerUnit<S = any> {
  /** The avionics id from the FMS guides; the guide is the script. */
  unitId: string;
  sim: import('./screen').TrainerSim<S>;
  keyboard: import('./screen').KeyboardLayout;
  /** Keyed by guide procedure id. A procedure without one is not trainable. */
  scripts: Record<string, ProcedureScript>;
  /** One paragraph on the training flight and which of its data is invented. */
  scenario: string;
  chains: Chain[];
}
