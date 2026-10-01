import type { Avionics, FmsStep } from '../types';

/**
 * Changes to one step of the base guide. A field set to `null` is removed,
 * for a step whose key or entry does not exist on this aircraft.
 */
export type StepPatch = { [K in keyof FmsStep]?: FmsStep[K] | null };

export interface VariantSpec {
  id: string;
  name: string;
  short?: string;
  summary?: string;
  /** Replace the base notes: they usually name the base aircraft. */
  notes: string[];
  /** Keyed `procedureId/stepIndex`, the index counting from 0 in the base guide. */
  steps: Record<string, StepPatch>;
}

/**
 * A guide for another aircraft sharing the same unit. Procedures, keys and
 * glossary come from the base; the patches give the aircraft its own numbers
 * and page names. Throws on a patch for a step that does not exist, so a
 * change to the base guide cannot silently leave a variant patching the
 * wrong step.
 */
export function deriveAvionics(base: Avionics, spec: VariantSpec): Avionics {
  const used = new Set<string>();
  const procedures = base.procedures.map((procedure) => ({
    ...procedure,
    steps: procedure.steps.map((step, i) => {
      const key = `${procedure.id}/${i}`;
      const patch = spec.steps[key];
      if (!patch) return step;
      used.add(key);
      const next: Record<string, unknown> = { ...step };
      for (const [field, value] of Object.entries(patch)) {
        if (value === null) delete next[field];
        else next[field] = value;
      }
      return next as unknown as FmsStep;
    }),
  }));
  const unknown = Object.keys(spec.steps).filter((key) => !used.has(key));
  if (unknown.length > 0) throw new Error(`${spec.id}: no step ${unknown.join(', ')} in ${base.id}`);
  return {
    ...base,
    id: spec.id,
    name: spec.name,
    short: spec.short ?? base.short,
    summary: spec.summary ?? base.summary,
    notes: spec.notes,
    procedures,
    basedOn: base.id,
  };
}
