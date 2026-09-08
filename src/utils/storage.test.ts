import { mockAsyncStorage } from '@/test/asyncStorage';
import { loadJSON, removeKey, saveJSON } from './storage';

describe('storage', () => {
  beforeEach(() => mockAsyncStorage.__reset());

  it('round-trips a value', async () => {
    await saveJSON('k', { a: 1, nested: [1, 2] });
    expect(await loadJSON('k', null)).toEqual({ a: 1, nested: [1, 2] });
  });

  it('returns the fallback when the key was never written', async () => {
    expect(await loadJSON('missing', { fallback: true })).toEqual({ fallback: true });
  });

  it('returns the fallback rather than throwing on corrupt JSON', async () => {
    mockAsyncStorage.__seed('k', '{ this is not json');
    expect(await loadJSON('k', { fallback: true })).toEqual({ fallback: true });
  });

  it('returns the fallback when the storage layer itself fails', async () => {
    mockAsyncStorage.__fail('read-fails');
    expect(await loadJSON('k', { fallback: true })).toEqual({ fallback: true });
  });

  // Progress is a convenience, not something worth crashing a checklist over.
  it('swallows a failed write', async () => {
    mockAsyncStorage.__fail('write-fails');
    await expect(saveJSON('k', { a: 1 })).resolves.toBeUndefined();
  });

  it('removes a key', async () => {
    await saveJSON('k', 1);
    await removeKey('k');
    expect(mockAsyncStorage.__read('k')).toBeNull();
  });
});
