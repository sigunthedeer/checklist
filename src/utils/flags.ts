import { getAircraft, getAvionics, getPhase, getProcedure } from '../data';
import type { Flag } from '../state/flags';

/** Where a flag lives, in words: aircraft and checklist, or unit and procedure. */
export function flagPlace(flag: Flag): { title: string; position: string } {
  const n = flag.index + 1;
  if (flag.kind === 'item') {
    const aircraft = getAircraft(flag.scope);
    const phase = aircraft ? getPhase(aircraft, flag.section) : undefined;
    return {
      title: `${aircraft?.name ?? flag.scope} · ${phase?.name ?? flag.section}`,
      position: `item ${n}`,
    };
  }
  const unit = getAvionics(flag.scope);
  const procedure = unit ? getProcedure(unit, flag.section) : undefined;
  const where = flag.kind === 'trainer' ? `${unit?.short ?? flag.scope} trainer` : `${unit?.name ?? flag.scope} guide`;
  return { title: `${where} · ${procedure?.name ?? flag.section}`, position: `step ${n}` };
}

/** The route that opens the flagged checklist or procedure. */
export function flagRoute(flag: Flag): string {
  if (flag.kind === 'item') return `/aircraft/${flag.scope}/${flag.section}`;
  if (flag.kind === 'guide') return `/fms/${flag.scope}/${flag.section}`;
  return `/trainer/${flag.scope}/${flag.section}`;
}

/**
 * A plain-text report of every flag, for pasting into a message. Each entry
 * carries its raw location in brackets so it can be found in the data exactly,
 * whatever the names say.
 */
export function flagReport(flags: Flag[], now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const header = `Checkride flags: ${flags.length}, ${date}`;
  if (flags.length === 0) return `${header}\n\nNo flags.`;
  const entries = flags.map((flag) => {
    const { title, position } = flagPlace(flag);
    return [
      `${title} · ${position}`,
      flag.text,
      flag.note ? `Note: ${flag.note}` : 'Note: (none)',
      `[${flag.kind} ${flag.scope}/${flag.section}/${flag.index}]`,
    ].join('\n');
  });
  return [header, ...entries].join('\n\n');
}
