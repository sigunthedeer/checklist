import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '@/utils/storage';

const KEY = 'checkride.custom.v1';

/**
 * An item the user added themselves, for a mod-specific step or a personal flow.
 *
 * These carry a stable id rather than living at a position, so ticking, deleting
 * and any future change to the built-in checklists can never make a saved tick
 * point at the wrong item.
 */
export interface CustomItem {
  id: string;
  c: string;
  r: string;
}

interface PersistedState {
  /** `${aircraftId}/${phaseId}` -> the user's extra items for that checklist. */
  items: Record<string, CustomItem[]>;
  /** `${aircraftId}` -> free text notes. */
  notes: Record<string, string>;
}

const EMPTY: PersistedState = { items: {}, notes: {} };

export const customKey = (aircraftId: string, phaseId: string) => `${aircraftId}/${phaseId}`;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface CustomContextValue {
  ready: boolean;
  itemsFor: (aircraftId: string, phaseId: string) => CustomItem[];
  addItem: (aircraftId: string, phaseId: string, challenge: string, response: string) => void;
  removeItem: (aircraftId: string, phaseId: string, id: string) => void;
  noteFor: (aircraftId: string) => string;
  setNote: (aircraftId: string, text: string) => void;
  /** Number of user items across an aircraft, for the "yours" count on its page. */
  countForAircraft: (aircraftId: string) => number;
}

const CustomContext = createContext<CustomContextValue | null>(null);

const NO_ITEMS: CustomItem[] = [];

export function CustomProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [ready, setReady] = useState(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<PersistedState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    loadJSON<PersistedState>(KEY, EMPTY).then((stored) => {
      if (cancelled) return;
      const merged: PersistedState = { items: stored.items ?? {}, notes: stored.notes ?? {} };
      latest.current = merged;
      setState(merged);
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  // Typing in the notes field would otherwise write on every keystroke.
  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = fn(prev);
      latest.current = next;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void saveJSON(KEY, latest.current), 350);
      return next;
    });
  }, []);

  const value = useMemo<CustomContextValue>(
    () => ({
      ready,
      itemsFor: (aircraftId, phaseId) => state.items[customKey(aircraftId, phaseId)] ?? NO_ITEMS,
      addItem: (aircraftId, phaseId, challenge, response) => {
        const c = challenge.trim();
        const r = response.trim();
        if (!c || !r) return;
        update((prev) => {
          const key = customKey(aircraftId, phaseId);
          return {
            ...prev,
            items: { ...prev.items, [key]: [...(prev.items[key] ?? []), { id: newId(), c, r }] },
          };
        });
      },
      removeItem: (aircraftId, phaseId, id) =>
        update((prev) => {
          const key = customKey(aircraftId, phaseId);
          const remaining = (prev.items[key] ?? []).filter((item) => item.id !== id);
          const items = { ...prev.items };
          if (remaining.length === 0) delete items[key];
          else items[key] = remaining;
          return { ...prev, items };
        }),
      noteFor: (aircraftId) => state.notes[aircraftId] ?? '',
      setNote: (aircraftId, text) =>
        update((prev) => {
          const notes = { ...prev.notes };
          if (text.trim() === '') delete notes[aircraftId];
          else notes[aircraftId] = text;
          return { ...prev, notes };
        }),
      countForAircraft: (aircraftId) => {
        const prefix = `${aircraftId}/`;
        return Object.entries(state.items).reduce(
          (sum, [key, items]) => (key.startsWith(prefix) ? sum + items.length : sum),
          0,
        );
      },
    }),
    [state, ready, update],
  );

  return <CustomContext.Provider value={value}>{children}</CustomContext.Provider>;
}

export function useCustom(): CustomContextValue {
  const ctx = useContext(CustomContext);
  if (!ctx) throw new Error('useCustom must be used inside <CustomProvider>');
  return ctx;
}
