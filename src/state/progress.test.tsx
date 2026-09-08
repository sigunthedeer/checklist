import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { mockAsyncStorage } from '@/test/asyncStorage';
import { ProgressProvider, useProgress } from './progress';

const KEY = 'checkride.progress.v1';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressProvider>{children}</ProgressProvider>
);

async function mountProgress() {
  // In testing-library v14 renderHook, act and unmount are all async.
  const view = await renderHook(() => useProgress(), { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

/** Writes are debounced, so persistence assertions have to wait for the flush. */
const persisted = async () => {
  await waitFor(() => expect(mockAsyncStorage.__read(KEY)).not.toBeNull());
  return JSON.parse(mockAsyncStorage.__read(KEY) as string);
};

describe('progress', () => {
  beforeEach(() => mockAsyncStorage.__reset());

  it('starts with nothing ticked', async () => {
    const { result } = await mountProgress();
    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.favorites).toEqual([]);
  });

  it('keeps a ticked item across a restart', async () => {
    const first = await mountProgress();
    await act(() => first.result.current.toggleItem('cessna-152', 'preflight', 3));
    await persisted();
    await first.unmount();

    const second = await mountProgress();
    expect(second.result.current.isChecked('cessna-152', 'preflight', 3)).toBe(true);
    expect(second.result.current.isChecked('cessna-152', 'preflight', 4)).toBe(false);
  });

  it('unticks an item that was already ticked', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 1));
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 1));
    expect(result.current.isChecked('cessna-152', 'preflight', 1)).toBe(false);
    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
  });

  it('tracks user items by id rather than position', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.toggleCustomItem('cessna-152', 'preflight', 'item-b'));
    await act(() => result.current.toggleCustomItem('cessna-152', 'preflight', 'item-c'));

    expect(result.current.isCustomChecked('cessna-152', 'preflight', 'item-b')).toBe(true);
    expect(result.current.isCustomChecked('cessna-152', 'preflight', 'item-c')).toBe(true);
    expect(result.current.isCustomChecked('cessna-152', 'preflight', 'item-a')).toBe(false);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(2);

    const stored = await persisted();
    expect(stored.customChecked['cessna-152/preflight']).toEqual(['item-b', 'item-c']);
  });

  it('counts built-in and user ticks separately', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 0));
    await act(() => result.current.toggleCustomItem('cessna-152', 'preflight', 'mine'));

    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(1);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(1);
  });

  it('resets one checklist without touching its neighbours', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 0));
    await act(() => result.current.toggleCustomItem('cessna-152', 'preflight', 'mine'));
    await act(() => result.current.toggleItem('cessna-152', 'runup', 0));

    await act(() => result.current.resetPhase('cessna-152', 'preflight'));

    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.checkedCount('cessna-152', 'runup')).toBe(1);
  });

  // "cessna-152" is a prefix of "cessna-152-aerobat", and both are real ids in the
  // fleet. Resetting one must not wipe the other.
  it('resets one aircraft without touching a similarly named one', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 0));
    await act(() => result.current.toggleItem('cessna-152-aerobat', 'preflight', 0));
    await act(() => result.current.toggleCustomItem('cessna-152-aerobat', 'preflight', 'mine'));

    await act(() => result.current.resetAircraft('cessna-152'));

    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.checkedCount('cessna-152-aerobat', 'preflight')).toBe(1);
    expect(result.current.customCheckedCount('cessna-152-aerobat', 'preflight')).toBe(1);
  });

  it('clears every tick but keeps favourites and recents', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 0));
    await act(() => result.current.toggleCustomItem('cessna-152', 'preflight', 'mine'));
    await act(() => result.current.toggleFavorite('cessna-152'));
    await act(() => result.current.noteVisit('cessna-152'));

    await act(() => result.current.resetAll());

    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.favorites).toEqual(['cessna-152']);
    expect(result.current.recents).toEqual(['cessna-152']);
  });

  it('sets and clears a whole checklist at once', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.setPhaseChecked('cessna-152', 'preflight', [0, 1, 2]));
    await act(() => result.current.setPhaseCustomChecked('cessna-152', 'preflight', ['a', 'b']));
    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(3);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(2);

    await act(() => result.current.setPhaseChecked('cessna-152', 'preflight', []));
    await act(() => result.current.setPhaseCustomChecked('cessna-152', 'preflight', []));
    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(0);
  });

  it('toggles favourites and keeps them across a restart', async () => {
    const first = await mountProgress();
    await act(() => first.result.current.toggleFavorite('daher-tbm-930'));
    await persisted();
    await first.unmount();

    const second = await mountProgress();
    expect(second.result.current.isFavorite('daher-tbm-930')).toBe(true);
    await act(() => second.result.current.toggleFavorite('daher-tbm-930'));
    expect(second.result.current.isFavorite('daher-tbm-930')).toBe(false);
  });

  it('orders recents most recent first, without duplicates', async () => {
    const { result } = await mountProgress();
    await act(() => result.current.noteVisit('a'));
    await act(() => result.current.noteVisit('b'));
    await act(() => result.current.noteVisit('a'));
    expect(result.current.recents).toEqual(['a', 'b']);
  });

  it('caps recents at twelve aircraft', async () => {
    const { result } = await mountProgress();
    for (let i = 0; i < 20; i += 1) {
      await act(() => result.current.noteVisit(`aircraft-${i}`));
    }
    expect(result.current.recents).toHaveLength(12);
    expect(result.current.recents[0]).toBe('aircraft-19');
  });

  it('starts clean when stored progress is corrupt', async () => {
    mockAsyncStorage.__seed(KEY, 'half a json file {');
    const { result } = await mountProgress();
    expect(result.current.checkedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.favorites).toEqual([]);
  });

  it('tolerates an older saved shape with no user ticks in it', async () => {
    mockAsyncStorage.__seed(
      KEY,
      JSON.stringify({ checked: { 'cessna-152/preflight': [1] }, favorites: ['x'], recents: [] }),
    );
    const { result } = await mountProgress();
    expect(result.current.isChecked('cessna-152', 'preflight', 1)).toBe(true);
    expect(result.current.customCheckedCount('cessna-152', 'preflight')).toBe(0);
    expect(result.current.favorites).toEqual(['x']);
  });

  it('keeps working in memory when the write fails', async () => {
    mockAsyncStorage.__fail('write-fails');
    const { result } = await mountProgress();
    await act(() => result.current.toggleItem('cessna-152', 'preflight', 2));
    expect(result.current.isChecked('cessna-152', 'preflight', 2)).toBe(true);
  });
});
