/**
 * Sanity check for the aircraft dataset.
 *
 * The data is hand-written and large, so this catches the mistakes that
 * TypeScript cannot: duplicate ids (which would silently share saved progress),
 * empty checklists, blank challenges, and emergency lists filed under normal
 * procedures. Run it with `npm run validate:data`.
 */
import { AIRCRAFT, AVIONICS, CATEGORY_LABEL, getAvionics, getProcedure, isKnownKey } from '../src/data';

const problems: string[] = [];
const seenIds = new Set<string>();
let totalPhases = 0;
let totalItems = 0;

for (const aircraft of AIRCRAFT) {
  if (seenIds.has(aircraft.id)) problems.push(`duplicate aircraft id: ${aircraft.id}`);
  seenIds.add(aircraft.id);

  if (!aircraft.name.trim()) problems.push(`${aircraft.id}: blank name`);
  if (!aircraft.manufacturer.trim()) problems.push(`${aircraft.id}: blank manufacturer`);
  if (aircraft.sims.length === 0) problems.push(`${aircraft.id}: no sim versions`);
  if (aircraft.phases.length === 0) problems.push(`${aircraft.id}: no checklists`);

  const phaseIds = new Set<string>();
  for (const phase of [...aircraft.phases, ...(aircraft.emergency ?? [])]) {
    if (phaseIds.has(phase.id)) problems.push(`${aircraft.id}: duplicate phase id ${phase.id}`);
    phaseIds.add(phase.id);
    if (phase.items.length === 0) problems.push(`${aircraft.id}/${phase.id}: no items`);
    totalPhases += 1;

    phase.items.forEach((item, i) => {
      if (!item.c.trim()) problems.push(`${aircraft.id}/${phase.id}[${i}]: blank challenge`);
      if (!item.r.trim()) problems.push(`${aircraft.id}/${phase.id}[${i}]: blank response`);
      if (item.guide) {
        const unit = getAvionics(aircraft.avionics);
        if (!unit) {
          problems.push(`${aircraft.id}/${phase.id}[${i}]: links a guide but the aircraft has no avionics`);
        } else if (!getProcedure(unit, item.guide)) {
          problems.push(`${aircraft.id}/${phase.id}[${i}]: no procedure "${item.guide}" in ${unit.id}`);
        }
      }
      totalItems += 1;
    });
  }

  if (aircraft.avionics && !getAvionics(aircraft.avionics)) {
    problems.push(`${aircraft.id}: unknown avionics "${aircraft.avionics}"`);
  }

  for (const phase of aircraft.phases) {
    if (phase.kind === 'emergency') {
      problems.push(`${aircraft.id}/${phase.id}: emergency phase listed under normal procedures`);
    }
  }
  for (const phase of aircraft.emergency ?? []) {
    if (phase.kind !== 'emergency') {
      problems.push(`${aircraft.id}/${phase.id}: emergency list is not kind "emergency"`);
    }
  }
}

/*
 * FMS guides. Key tokens are checked against each unit's key list because the
 * planned trainer replays steps key by key: a typo here would be a key that
 * does not exist on the panel it draws.
 */
const unitIds = new Set<string>();
let totalProcedures = 0;
let totalSteps = 0;

for (const unit of AVIONICS) {
  if (unitIds.has(unit.id)) problems.push(`duplicate avionics id: ${unit.id}`);
  unitIds.add(unit.id);
  if (unit.procedures.length === 0) problems.push(`${unit.id}: no procedures`);
  if (new Set(unit.keys).size !== unit.keys.length) problems.push(`${unit.id}: duplicate key in key list`);
  if (!AIRCRAFT.some((a) => a.avionics === unit.id)) {
    problems.push(`${unit.id}: no aircraft uses it, so no aircraft page links to it`);
  }

  const procedureIds = new Set<string>();
  for (const procedure of unit.procedures) {
    const where = `${unit.id}/${procedure.id}`;
    if (procedureIds.has(procedure.id)) problems.push(`${unit.id}: duplicate procedure id ${procedure.id}`);
    procedureIds.add(procedure.id);
    if (procedure.kind === 'emergency') problems.push(`${where}: FMS procedures are never emergency lists`);
    if (procedure.steps.length === 0) problems.push(`${where}: no steps`);
    totalProcedures += 1;

    procedure.steps.forEach((step, i) => {
      if (!step.do.trim()) problems.push(`${where}[${i}]: blank instruction`);
      if (step.entry !== undefined && !step.entry.trim()) problems.push(`${where}[${i}]: blank entry`);
      for (const key of step.keys ?? []) {
        if (!isKnownKey(unit, key)) problems.push(`${where}[${i}]: "${key}" is not a key on ${unit.id}`);
      }
      totalSteps += 1;
    });
  }
}

const byCategory = new Map<string, number>();
for (const aircraft of AIRCRAFT) {
  byCategory.set(aircraft.category, (byCategory.get(aircraft.category) ?? 0) + 1);
}

console.log(`${AIRCRAFT.length} aircraft, ${totalPhases} checklists, ${totalItems} items`);
for (const [category, count] of byCategory) {
  console.log(`  ${String(count).padStart(3)}  ${CATEGORY_LABEL[category as never]}`);
}
console.log(
  `  MSFS 2020: ${AIRCRAFT.filter((a) => a.sims.includes('msfs2020')).length}` +
    `   MSFS 2024: ${AIRCRAFT.filter((a) => a.sims.includes('msfs2024')).length}`,
);

console.log(
  `  ${AVIONICS.length} FMS guides, ${totalProcedures} procedures, ${totalSteps} steps, ` +
    `used by ${AIRCRAFT.filter((a) => a.avionics).length} aircraft`,
);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nDataset looks good.');
