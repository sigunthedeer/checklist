import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadJSON, saveJSON } from '@/utils/storage';

const KEY = 'checkride.flags.v1';

/**
 * Where a flag points. `item` is a checklist item, `guide` a step in an FMS
 * guide, `trainer` a step in the trainer, where the complaint is usually the
 * simulated screen rather than the words.
 */
export type FlagKind = 'item' | 'guide' | 'trainer';

export interface FlagTarget {
  kind: FlagKind;
  /** Aircraft id for items; avionics unit id for guides and the trainer. */
  scope: string;
  /** Checklist (phase) id, or procedure id. */
  section: string;
  /** Position in that checklist or procedure, from 0. */
  index: number;
  /**
   * What the item said when it was flagged. Kept so the report reads right
   * even if the checklist changes and the position comes to mean something else.
   */
  text: string;
}

export interface Flag extends FlagTarget {
  key: string;
  note: string;
  /** When it was flagged or last edited, ms since epoch. */
  at: number;
}

export type FlagsData = Record<string, Flag>;

export const flagKey = (t: Pick<FlagTarget, 'kind' | 'scope' | 'section' | 'index'>) =>
  `${t.kind}:${t.scope}/${t.section}/${t.index}`;

interface FlagsContextValue {
  ready: boolean;
  flagFor: (target: Pick<FlagTarget, 'kind' | 'scope' | 'section' | 'index'>) => Flag | undefined;
  setFlag: (target: FlagTarget, note: string) => void;
  removeFlag: (key: string) => void;
  clearAll: () => void;
  /** Oldest first, the order they were found in. */
  all: Flag[];
  exportData: () => FlagsData;
  importData: (data: FlagsData) => void;
}

const FlagsContext = createContext<FlagsContextValue | null>(null);

export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FlagsData>({});
  const [ready, setReady] = useState(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<FlagsData>({});

  useEffect(() => {
    let cancelled = false;
    loadJSON<FlagsData>(KEY, {}).then((stored) => {
      if (cancelled) return;
      const clean = stored && typeof stored === 'object' ? stored : {};
      latest.current = clean;
      setState(clean);
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  const update = useCallback((fn: (prev: FlagsData) => FlagsData) => {
    setState((prev) => {
      const next = fn(prev);
      latest.current = next;
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = setTimeout(() => void saveJSON(KEY, latest.current), 250);
      return next;
    });
  }, []);

  const value = useMemo<FlagsContextValue>(
    () => ({
      ready,
      flagFor: (target) => state[flagKey(target)],
      setFlag: (target, note) =>
        update((prev) => {
          const key = flagKey(target);
          return { ...prev, [key]: { ...target, key, note: note.trim(), at: Date.now() } };
        }),
      removeFlag: (key) =>
        update((prev) => {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }),
      clearAll: () => update(() => ({})),
      all: Object.values(state).sort((a, b) => a.at - b.at),
      exportData: () => state,
      importData: (data) => update(() => data),
    }),
    [state, ready, update],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used inside <FlagsProvider>');
  return ctx;
}
