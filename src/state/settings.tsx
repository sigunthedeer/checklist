import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SimVersion } from '@/data/types';
import { THEMES, type Theme, type ThemeName } from '@/theme';
import { loadJSON, saveJSON } from '@/utils/storage';

const KEY = 'checkride.settings.v1';

export type SimFilter = SimVersion | 'all';

export interface Settings {
  theme: ThemeName;
  simFilter: SimFilter;
  /** Keep the screen on while a checklist is open. */
  keepAwake: boolean;
  haptics: boolean;
  /** Scroll to the next unchecked item after ticking one. */
  autoAdvance: boolean;
  /** Larger text for tablets clamped to a yoke mount or a phone across the room. */
  textScale: number;
  /** Tapping a checked item clears it instead of doing nothing. */
  disclaimerAccepted: boolean;
}

const DEFAULTS: Settings = {
  theme: 'cockpit',
  simFilter: 'all',
  keepAwake: true,
  haptics: true,
  autoAdvance: true,
  textScale: 1,
  disclaimerAccepted: false,
};

interface SettingsContextValue {
  settings: Settings;
  theme: Theme;
  ready: boolean;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadJSON<Partial<Settings>>(KEY, {}).then((stored) => {
      if (cancelled) return;
      setSettings({ ...DEFAULTS, ...stored });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      void saveJSON(KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, theme: THEMES[settings.theme] ?? THEMES.cockpit, ready, set }),
    [settings, ready, set],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

export function useTheme(): Theme {
  return useSettings().theme;
}
