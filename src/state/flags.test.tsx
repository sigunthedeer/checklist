import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { mockAsyncStorage } from '@/test/asyncStorage';
import { FlagsProvider, flagKey, useFlags, type FlagTarget } from './flags';

const KEY = 'checkride.flags.v1';
const wrapper = ({ children }: { children: React.ReactNode }) => <FlagsProvider>{children}</FlagsProvider>;

async function mount() {
  const view = await renderHook(useFlags, { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

const initB: FlagTarget = { kind: 'item', scope: 'airbus-a320neo', section: 'fms-setup', index: 5, text: 'INIT B: ZFW, ZFWCG, BLOCK FUEL ENTERED' };
const lsk: FlagTarget = { kind: 'guide', scope: 'airbus-mcdu', section: 'fuel', index: 1, text: 'Enter ZFW/ZFWCG' };

const persisted = async () => {
  await waitFor(() => expect(mockAsyncStorage.__read(KEY)).not.toBeNull());
  return JSON.parse(mockAsyncStorage.__read(KEY) as string);
};

describe('flags', () => {
  beforeEach(() => mockAsyncStorage.__reset());

  it('flags an item with a trimmed note and finds it again by position', async () => {
    const { result } = await mount();
    await act(() => result.current.setFlag(initB, '  sim calls it FUEL & LOAD  '));
    const flag = result.current.flagFor({ kind: 'item', scope: 'airbus-a320neo', section: 'fms-setup', index: 5 });
    expect(flag).toMatchObject({ ...initB, note: 'sim calls it FUEL & LOAD', key: flagKey(initB) });
    expect(result.current.flagFor({ ...initB, index: 4 })).toBeUndefined();
  });

  it('keeps an item, a guide step and a trainer step at the same position apart', async () => {
    const { result } = await mount();
    const same = { scope: 'x', section: 'y', index: 0, text: 't' };
    await act(() => result.current.setFlag({ ...same, kind: 'item' }, 'a'));
    await act(() => result.current.setFlag({ ...same, kind: 'guide' }, 'b'));
    await act(() => result.current.setFlag({ ...same, kind: 'trainer' }, 'c'));
    expect(result.current.all.map((f) => f.note).sort()).toEqual(['a', 'b', 'c']);
  });

  it('updates a flag in place rather than adding a second one', async () => {
    const { result } = await mount();
    await act(() => result.current.setFlag(lsk, 'first'));
    await act(() => result.current.setFlag(lsk, 'second'));
    expect(result.current.all).toHaveLength(1);
    expect(result.current.all[0].note).toBe('second');
  });

  it('saves to storage and comes back after a reload', async () => {
    const first = await mount();
    await act(() => first.result.current.setFlag(initB, 'note'));
    await act(() => first.result.current.setFlag(lsk, ''));
    const stored = await persisted();
    expect(Object.keys(stored).sort()).toEqual([flagKey(initB), flagKey(lsk)].sort());
    await first.unmount();

    const second = await mount();
    expect(second.result.current.all.map((f) => f.key).sort()).toEqual([flagKey(initB), flagKey(lsk)].sort());
  });

  it('removes one flag, or all of them', async () => {
    const { result } = await mount();
    await act(() => result.current.setFlag(initB, ''));
    await act(() => result.current.setFlag(lsk, ''));
    await act(() => result.current.removeFlag(flagKey(initB)));
    expect(result.current.all.map((f) => f.key)).toEqual([flagKey(lsk)]);
    await act(() => result.current.clearAll());
    expect(result.current.all).toEqual([]);
    expect(await persisted()).toEqual({});
  });

  it('lists flags oldest first', async () => {
    const { result } = await mount();
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(2000);
    await act(() => result.current.setFlag(lsk, ''));
    now.mockReturnValue(1000);
    await act(() => result.current.setFlag(initB, ''));
    now.mockRestore();
    expect(result.current.all.map((f) => f.kind)).toEqual(['item', 'guide']);
  });

  it('survives corrupt storage', async () => {
    mockAsyncStorage.__seed(KEY, '{not json');
    const { result } = await mount();
    expect(result.current.all).toEqual([]);
  });
});
