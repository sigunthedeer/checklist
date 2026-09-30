import type { CustomData } from '@/state/custom';
import type { FlagsData } from '@/state/flags';
import type { ProgressData } from '@/state/progress';

/**
 * Backup file for everything the user has authored or accumulated.
 *
 * The app keeps all of this in browser or device storage, which is scoped to one
 * origin and can be evicted by the OS. This is the only way to move it between
 * devices or get it back afterwards.
 */
export interface Backup {
  app: 'checkride';
  version: 1;
  exportedAt: string;
  progress: ProgressData;
  custom: CustomData;
  /** Things flagged as wrong in the sim. Absent from backups made before flags existed. */
  flags: FlagsData;
}

export const BACKUP_FILENAME = 'checkride-backup.json';

export function buildBackup(progress: ProgressData, custom: CustomData, flags: FlagsData = {}): string {
  const backup: Backup = {
    app: 'checkride',
    version: 1,
    exportedAt: new Date().toISOString(),
    progress,
    custom,
    flags,
  };
  return JSON.stringify(backup, null, 2);
}

export class BackupError extends Error {}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Parses a backup, rejecting anything that is not one.
 *
 * Restoring replaces the user's data outright, so this is deliberately strict:
 * a half-understood file would quietly destroy the thing it was meant to protect.
 */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not valid JSON.');
  }

  if (!isObject(raw)) throw new BackupError('That file is not a Checkride backup.');
  if (raw.app !== 'checkride') throw new BackupError('That file is not a Checkride backup.');
  if (raw.version !== 1) {
    throw new BackupError(`That backup is version ${String(raw.version)}, which this app cannot read.`);
  }

  const progress = raw.progress;
  const custom = raw.custom;
  if (!isObject(progress) || !isObject(custom)) {
    throw new BackupError('That backup is missing its contents.');
  }

  // Fill in anything an older or partial file omits, so a restore cannot leave
  // the app holding undefined where it expects a map.
  return {
    app: 'checkride',
    version: 1,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : new Date().toISOString(),
    progress: {
      checked: isObject(progress.checked) ? (progress.checked as ProgressData['checked']) : {},
      customChecked: isObject(progress.customChecked)
        ? (progress.customChecked as ProgressData['customChecked'])
        : {},
      favorites: Array.isArray(progress.favorites) ? (progress.favorites as string[]) : [],
      recents: Array.isArray(progress.recents) ? (progress.recents as string[]) : [],
    },
    custom: {
      items: isObject(custom.items) ? (custom.items as CustomData['items']) : {},
      notes: isObject(custom.notes) ? (custom.notes as CustomData['notes']) : {},
    },
    flags: parseFlags(raw.flags),
  };
}

/** Keeps only entries that look like flags, so a hand-edited file cannot put junk in the list. */
function parseFlags(raw: unknown): FlagsData {
  if (!isObject(raw)) return {};
  const out: FlagsData = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      isObject(value) &&
      (value.kind === 'item' || value.kind === 'guide' || value.kind === 'trainer') &&
      typeof value.scope === 'string' &&
      typeof value.section === 'string' &&
      typeof value.index === 'number' &&
      typeof value.text === 'string'
    ) {
      out[key] = {
        key,
        kind: value.kind,
        scope: value.scope,
        section: value.section,
        index: value.index,
        text: value.text,
        note: typeof value.note === 'string' ? value.note : '',
        at: typeof value.at === 'number' ? value.at : 0,
      };
    }
  }
  return out;
}

/** Short human summary of what a backup holds, shown before restoring it. */
export function describeBackup(backup: Backup): string {
  const items = Object.values(backup.custom.items).reduce((sum, list) => sum + list.length, 0);
  const notes = Object.keys(backup.custom.notes).length;
  const ticked =
    Object.values(backup.progress.checked).reduce((sum, list) => sum + list.length, 0) +
    Object.values(backup.progress.customChecked).reduce((sum, list) => sum + list.length, 0);
  const parts = [
    `${items} of your own item${items === 1 ? '' : 's'}`,
    `${notes} aircraft note${notes === 1 ? '' : 's'}`,
    `${backup.progress.favorites.length} favourite${backup.progress.favorites.length === 1 ? '' : 's'}`,
    `${ticked} ticked item${ticked === 1 ? '' : 's'}`,
  ];
  const flags = Object.keys(backup.flags).length;
  if (flags > 0) parts.push(`${flags} flag${flags === 1 ? '' : 's'}`);
  return parts.join(', ');
}
