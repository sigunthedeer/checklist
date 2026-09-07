import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '@/utils/storage';

const KEY = 'checkride.progress.v1';

/** `${aircraftId}/${phaseId}` -> indexes of ticked items. */
type CheckedMap = Record<string, number[]>;

interface PersistedState {
  checked: CheckedMap;
  /**
   * `${aircraftId}/${phaseId}` -> ids of ticked user items. Kept separate from
   * `checked` because user items are addressed by id, not position.
   */
  customChecked: Record<string, string[]>;
  favorites: string[];
  /** Aircraft ids, most recently opened first. */
  recents: string[];
}

const EMPTY: PersistedState = { checked: {}, customChecked: {}, favorites: [], recents: [] };
const MAX_RECENTS = 12;

export const phaseKey = (aircraftId: string, phaseId: string) => `${aircraftId}/${phaseId}`;

interface ProgressContextValue {
  ready: boolean;
  isChecked: (aircraftId: string, phaseId: string, index: number) => boolean;
  checkedCount: (aircraftId: string, phaseId: string) => number;
  toggleItem: (aircraftId: string, phaseId: string, index: number) => void;
  setPhaseChecked: (aircraftId: string, phaseId: string, indexes: number[]) => void;
  isCustomChecked: (aircraftId: string, phaseId: string, itemId: string) => boolean;
  customCheckedCount: (aircraftId: string, phaseId: string) => number;
  toggleCustomItem: (aircraftId: string, phaseId: string, itemId: string) => void;
  setPhaseCustomChecked: (aircraftId: string, phaseId: string, itemIds: string[]) => void;
  resetPhase: (aircraftId: string, phaseId: string) => void;
  resetAircraft: (aircraftId: string) => void;
  resetAll: () => void;
  favorites: string[];
  isFavorite: (aircraftId: string) => boolean;
  toggleFavorite: (aircraftId: string) => void;
  recents: string[];
  noteVisit: (aircraftId: string) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(EMPTY);
  const [ready, setReady] = useState(false);
  // Writes are debounced: ticking through a 40-item checklist should not mean
  // 40 round trips to disk.
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<PersistedState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    loadJSON<PersistedState>(KEY, EMPTY).then((stored) => {
      if (cancelled) return;
      const merged: PersistedState = {
        checked: stored.checked ?? {},
        customChecked: stored.customChecked ?? {},
        favorites: stored.favorites ?? [],
        recents: stored.recents ?? [],
      };
      latest.current = merged;
      setState(merged);
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  const update = useCallback((fn: (prev: PersistedState) => PersistedState) => {
    setState((prev) => {
      const next = fn(prev);
      latest.current = next;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => {
        void saveJSON(KEY, latest.current);
      }, 250);
      return next;
    });
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const checkedFor = (aircraftId: string, phaseId: string) =>
      state.checked[phaseKey(aircraftId, phaseId)] ?? [];
    const customCheckedFor = (aircraftId: string, phaseId: string) =>
      state.customChecked[phaseKey(aircraftId, phaseId)] ?? [];

    return {
      ready,
      isChecked: (a, p, i) => checkedFor(a, p).includes(i),
      checkedCount: (a, p) => checkedFor(a, p).length,
      toggleItem: (a, p, i) =>
        update((prev) => {
          const key = phaseKey(a, p);
          const current = prev.checked[key] ?? [];
          const next = current.includes(i)
            ? current.filter((n) => n !== i)
            : [...current, i].sort((x, y) => x - y);
          const checked = { ...prev.checked };
          if (next.length === 0) delete checked[key];
          else checked[key] = next;
          return { ...prev, checked };
        }),
      isCustomChecked: (a, p, itemId) => customCheckedFor(a, p).includes(itemId),
      customCheckedCount: (a, p) => customCheckedFor(a, p).length,
      toggleCustomItem: (a, p, itemId) =>
        update((prev) => {
          const key = phaseKey(a, p);
          const current = prev.customChecked[key] ?? [];
          const next = current.includes(itemId)
            ? current.filter((id) => id !== itemId)
            : [...current, itemId];
          const customChecked = { ...prev.customChecked };
          if (next.length === 0) delete customChecked[key];
          else customChecked[key] = next;
          return { ...prev, customChecked };
        }),
      setPhaseCustomChecked: (a, p, itemIds) =>
        update((prev) => {
          const key = phaseKey(a, p);
          const customChecked = { ...prev.customChecked };
          if (itemIds.length === 0) delete customChecked[key];
          else customChecked[key] = [...itemIds];
          return { ...prev, customChecked };
        }),
      setPhaseChecked: (a, p, indexes) =>
        update((prev) => {
          const key = phaseKey(a, p);
          const checked = { ...prev.checked };
          if (indexes.length === 0) delete checked[key];
          else checked[key] = [...indexes].sort((x, y) => x - y);
          return { ...prev, checked };
        }),
      resetPhase: (a, p) =>
        update((prev) => {
          const key = phaseKey(a, p);
          const checked = { ...prev.checked };
          const customChecked = { ...prev.customChecked };
          delete checked[key];
          delete customChecked[key];
          return { ...prev, checked, customChecked };
        }),
      resetAircraft: (a) =>
        update((prev) => {
          const prefix = `${a}/`;
          const keep = ([k]: [string, unknown]) => !k.startsWith(prefix);
          return {
            ...prev,
            checked: Object.fromEntries(Object.entries(prev.checked).filter(keep)),
            customChecked: Object.fromEntries(Object.entries(prev.customChecked).filter(keep)),
          };
        }),
      resetAll: () => update((prev) => ({ ...prev, checked: {}, customChecked: {} })),
      favorites: state.favorites,
      isFavorite: (a) => state.favorites.includes(a),
      toggleFavorite: (a) =>
        update((prev) => ({
          ...prev,
          favorites: prev.favorites.includes(a)
            ? prev.favorites.filter((x) => x !== a)
            : [a, ...prev.favorites],
        })),
      recents: state.recents,
      noteVisit: (a) =>
        update((prev) =>
          prev.recents[0] === a
            ? prev
            : { ...prev, recents: [a, ...prev.recents.filter((x) => x !== a)].slice(0, MAX_RECENTS) },
        ),
    };
  }, [state, ready, update]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
