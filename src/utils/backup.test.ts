import { BackupError, buildBackup, describeBackup, parseBackup } from './backup';

const progress = {
  checked: { 'cessna-152/preflight': [0, 1] },
  customChecked: { 'cessna-152/preflight': ['mine'] },
  favorites: ['cessna-152'],
  recents: ['cessna-152'],
};
const custom = {
  items: { 'cessna-152/preflight': [{ id: 'mine', c: 'EFB', r: 'SET' }] },
  notes: { 'cessna-152': 'Carb heat before every descent.' },
};

describe('backup', () => {
  it('round-trips everything the user authored', () => {
    const restored = parseBackup(buildBackup(progress, custom));
    expect(restored.progress).toEqual(progress);
    expect(restored.custom).toEqual(custom);
  });

  it('stamps the file so it can be identified later', () => {
    const backup = parseBackup(buildBackup(progress, custom));
    expect(backup.app).toBe('checkride');
    expect(backup.version).toBe(1);
    expect(Number.isNaN(Date.parse(backup.exportedAt))).toBe(false);
  });

  // Restoring replaces the user's data, so anything unrecognised must be refused
  // rather than half-applied.
  it('refuses a file that is not JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupError);
  });

  it('refuses JSON that is not a Checkride backup', () => {
    expect(() => parseBackup(JSON.stringify({ hello: 'world' }))).toThrow(/not a Checkride backup/);
    expect(() => parseBackup(JSON.stringify([1, 2, 3]))).toThrow(/not a Checkride backup/);
  });

  it('refuses a version it does not understand', () => {
    const future = JSON.stringify({ app: 'checkride', version: 99, progress: {}, custom: {} });
    expect(() => parseBackup(future)).toThrow(/version 99/);
  });

  it('refuses a backup with no contents', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'checkride', version: 1 }))).toThrow(
      /missing its contents/,
    );
  });

  it('fills in maps a partial file leaves out', () => {
    const partial = JSON.stringify({
      app: 'checkride',
      version: 1,
      progress: { checked: { 'a/b': [1] } },
      custom: { notes: { a: 'hi' } },
    });
    const restored = parseBackup(partial);
    expect(restored.progress.customChecked).toEqual({});
    expect(restored.progress.favorites).toEqual([]);
    expect(restored.custom.items).toEqual({});
    expect(restored.custom.notes).toEqual({ a: 'hi' });
  });

  it('summarises what a backup holds', () => {
    const backup = parseBackup(buildBackup(progress, custom));
    expect(describeBackup(backup)).toBe(
      '1 of your own item, 1 aircraft note, 1 favourite, 3 ticked items',
    );
  });

  describe('flags', () => {
    const progress = { checked: {}, customChecked: {}, favorites: [], recents: [] };
    const custom = { items: {}, notes: {} };
    const flag = { key: 'item:a/b/0', kind: 'item' as const, scope: 'a', section: 'b', index: 0, text: 't', note: 'n', at: 5 };

    it('carries flags through a backup', () => {
      const backup = parseBackup(buildBackup(progress, custom, { [flag.key]: flag }));
      expect(backup.flags).toEqual({ [flag.key]: flag });
      expect(describeBackup(backup)).toMatch(/1 flag$/);
    });

    it('reads a backup from before flags existed', () => {
      const old = JSON.stringify({ app: 'checkride', version: 1, exportedAt: 'x', progress, custom });
      expect(parseBackup(old).flags).toEqual({});
    });

    it('drops anything in the flags that is not a flag', () => {
      const junk = JSON.stringify({
        app: 'checkride',
        version: 1,
        progress,
        custom,
        flags: { good: flag, bad: { kind: 'nonsense', scope: 1 }, alsoBad: 'x' },
      });
      expect(Object.keys(parseBackup(junk).flags)).toEqual(['good']);
    });
  });
});
