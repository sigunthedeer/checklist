import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { mockAsyncStorage } from '@/test/asyncStorage';
import { CustomProvider, useCustom } from './custom';
import { ProgressProvider, useProgress } from './progress';

const KEY = 'checkride.custom.v1';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProgressProvider>
    <CustomProvider>{children}</CustomProvider>
  </ProgressProvider>
);

/** Both stores together, since a user item's text and its tick live in different ones. */
const useBoth = () => ({ custom: useCustom(), progress: useProgress() });

async function mountBoth() {
  const view = await renderHook(useBoth, { wrapper });
  await waitFor(() => expect(view.result.current.custom.ready).toBe(true));
  await waitFor(() => expect(view.result.current.progress.ready).toBe(true));
  return view;
}

const persisted = async () => {
  await waitFor(() => expect(mockAsyncStorage.__read(KEY)).not.toBeNull());
  return JSON.parse(mockAsyncStorage.__read(KEY) as string);
};

describe('custom items and notes', () => {
  beforeEach(() => mockAsyncStorage.__reset());

  it('starts with nothing of the user\'s own', async () => {
    const { result } = await mountBoth();
    expect(result.current.custom.itemsFor('cessna-152', 'preflight')).toEqual([]);
    expect(result.current.custom.noteFor('cessna-152')).toBe('');
  });

  it('adds an item and gives it a unique id', async () => {
    const { result } = await mountBoth();
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', 'EFB', 'SET'));
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', 'Tablet', 'MOUNTED'));

    const items = result.current.custom.itemsFor('cessna-152', 'preflight');
    expect(items.map((i) => [i.c, i.r])).toEqual([
      ['EFB', 'SET'],
      ['Tablet', 'MOUNTED'],
    ]);
    expect(items[0].id).not.toBe(items[1].id);
  });

  it('trims whitespace and refuses a blank item', async () => {
    const { result } = await mountBoth();
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', '  EFB  ', '  SET '));
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', '   ', 'SET'));
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', 'EFB', '  '));

    const items = result.current.custom.itemsFor('cessna-152', 'preflight');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ c: 'EFB', r: 'SET' });
  });

  /**
   * The reason ticks are keyed by id. If they were keyed by position, deleting an
   * earlier item would silently shift every tick after it onto the wrong row.
   */
  it('keeps ticks on the right items when an earlier one is deleted', async () => {
    const { result } = await mountBoth();
    for (const name of ['Alpha', 'Bravo', 'Charlie']) {
      await act(() => result.current.custom.addItem('cessna-152', 'preflight', name, 'DONE'));
    }
    const [alpha, bravo, charlie] = result.current.custom.itemsFor('cessna-152', 'preflight');

    await act(() => result.current.progress.toggleCustomItem('cessna-152', 'preflight', bravo.id));
    await act(() => result.current.progress.toggleCustomItem('cessna-152', 'preflight', charlie.id));

    await act(() => result.current.custom.removeItem('cessna-152', 'preflight', alpha.id));

    const remaining = result.current.custom.itemsFor('cessna-152', 'preflight');
    expect(remaining.map((i) => i.c)).toEqual(['Bravo', 'Charlie']);
    expect(result.current.progress.isCustomChecked('cessna-152', 'preflight', bravo.id)).toBe(true);
    expect(result.current.progress.isCustomChecked('cessna-152', 'preflight', charlie.id)).toBe(true);
    expect(result.current.progress.isCustomChecked('cessna-152', 'preflight', alpha.id)).toBe(false);
  });

  it('drops the checklist entry entirely once its last item goes', async () => {
    const { result } = await mountBoth();
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', 'EFB', 'SET'));
    const [only] = result.current.custom.itemsFor('cessna-152', 'preflight');

    await act(() => result.current.custom.removeItem('cessna-152', 'preflight', only.id));

    expect(result.current.custom.itemsFor('cessna-152', 'preflight')).toEqual([]);
    const stored = await persisted();
    expect(stored.items['cessna-152/preflight']).toBeUndefined();
  });

  it('keeps items and notes across a restart', async () => {
    const first = await mountBoth();
    await act(() => first.result.current.custom.addItem('daher-tbm-930', 'start', 'Inertial sep', 'BYPASS'));
    await act(() => first.result.current.custom.setNote('daher-tbm-930', 'Low idle gate needs a keybind.'));
    await persisted();
    await first.unmount();

    const second = await mountBoth();
    expect(second.result.current.custom.itemsFor('daher-tbm-930', 'start')).toHaveLength(1);
    expect(second.result.current.custom.noteFor('daher-tbm-930')).toBe('Low idle gate needs a keybind.');
  });

  it('clears a note when it is emptied', async () => {
    const { result } = await mountBoth();
    await act(() => result.current.custom.setNote('cessna-152', 'something'));
    expect(result.current.custom.noteFor('cessna-152')).toBe('something');

    await act(() => result.current.custom.setNote('cessna-152', '   '));
    expect(result.current.custom.noteFor('cessna-152')).toBe('');
    const stored = await persisted();
    expect(stored.notes['cessna-152']).toBeUndefined();
  });

  // "cessna-152" is a prefix of "cessna-152-aerobat" and both are real fleet ids.
  it('counts only the aircraft asked for, not one whose id extends it', async () => {
    const { result } = await mountBoth();
    await act(() => result.current.custom.addItem('cessna-152', 'preflight', 'One', 'A'));
    await act(() => result.current.custom.addItem('cessna-152', 'runup', 'Two', 'B'));
    await act(() => result.current.custom.addItem('cessna-152-aerobat', 'preflight', 'Three', 'C'));

    expect(result.current.custom.countForAircraft('cessna-152')).toBe(2);
    expect(result.current.custom.countForAircraft('cessna-152-aerobat')).toBe(1);
  });

  it('starts clean when the stored file is corrupt', async () => {
    mockAsyncStorage.__seed(KEY, 'not json at all');
    const { result } = await mountBoth();
    expect(result.current.custom.itemsFor('cessna-152', 'preflight')).toEqual([]);
    expect(result.current.custom.noteFor('cessna-152')).toBe('');
  });
});
