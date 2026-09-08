import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { mockAsyncStorage } from '@/test/asyncStorage';
import { SettingsProvider, useSettings } from './settings';

const KEY = 'checkride.settings.v1';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SettingsProvider>{children}</SettingsProvider>
);

async function mountSettings() {
  const view = await renderHook(() => useSettings(), { wrapper });
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

const flushed = () => waitFor(() => expect(mockAsyncStorage.__read(KEY)).not.toBeNull());

describe('settings', () => {
  beforeEach(() => mockAsyncStorage.__reset());

  it('starts on the defaults', async () => {
    const { result } = await mountSettings();
    expect(result.current.settings).toMatchObject({
      theme: 'slate',
      simFilter: 'all',
      keepAwake: true,
      haptics: true,
      autoAdvance: true,
      textScale: 1,
      disclaimerAccepted: false,
    });
    expect(result.current.theme.name).toBe('slate');
  });

  it('keeps a change across a restart', async () => {
    const first = await mountSettings();
    await act(() => first.result.current.set('theme', 'night'));
    await act(() => first.result.current.set('textScale', 1.3));
    await flushed();
    await first.unmount();

    const second = await mountSettings();
    expect(second.result.current.settings.theme).toBe('night');
    expect(second.result.current.settings.textScale).toBe(1.3);
    expect(second.result.current.theme.name).toBe('night');
  });

  // A stored file from an older build only carries the keys that existed then.
  it('fills in defaults for anything the stored file does not mention', async () => {
    mockAsyncStorage.__seed(KEY, JSON.stringify({ simFilter: 'msfs2024' }));
    const { result } = await mountSettings();
    expect(result.current.settings.simFilter).toBe('msfs2024');
    expect(result.current.settings.theme).toBe('slate');
    expect(result.current.settings.keepAwake).toBe(true);
  });

  /**
   * The default theme was renamed from "cockpit" to "slate" in the redesign, so
   * anyone who used the app before that has a name in storage that no longer maps
   * to a palette. It has to fall back rather than hand the app an undefined theme.
   */
  it('falls back to a real palette when the stored theme no longer exists', async () => {
    mockAsyncStorage.__seed(KEY, JSON.stringify({ theme: 'cockpit' }));
    const { result } = await mountSettings();
    expect(result.current.theme).toBeDefined();
    expect(result.current.theme.name).toBe('slate');
    expect(result.current.theme.bg).toBeTruthy();
  });

  it('starts on the defaults when the stored file is corrupt', async () => {
    mockAsyncStorage.__seed(KEY, '{{{');
    const { result } = await mountSettings();
    expect(result.current.settings.theme).toBe('slate');
    expect(result.current.settings.disclaimerAccepted).toBe(false);
  });

  it('remembers that the disclaimer was accepted', async () => {
    const first = await mountSettings();
    await act(() => first.result.current.set('disclaimerAccepted', true));
    await flushed();
    await first.unmount();

    const second = await mountSettings();
    expect(second.result.current.settings.disclaimerAccepted).toBe(true);
  });

  it('keeps working in memory when the write fails', async () => {
    mockAsyncStorage.__fail('write-fails');
    const { result } = await mountSettings();
    await act(() => result.current.set('haptics', false));
    expect(result.current.settings.haptics).toBe(false);
  });
});
