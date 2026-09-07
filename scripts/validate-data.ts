/**
 * Sanity check for the aircraft dataset.
 *
 * The data is hand-written and large, so this catches the mistakes that
 * TypeScript cannot: duplicate ids (which would silently share saved progress),
 * empty checklists, blank challenges, and emergency lists filed under normal
 * procedures. Run it with `npm run validate:data`.
 */
import { AIRCRAFT, CATEGORY_LABEL } from '../src/data';

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
      totalItems += 1;
    });
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

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nDataset looks good.');
