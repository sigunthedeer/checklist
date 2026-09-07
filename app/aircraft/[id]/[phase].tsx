import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ChecklistRow } from '@/components/checklist';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, ProgressBar, T } from '@/components/ui';
import { getAircraft, getPhase } from '@/data';
import { useProgress } from '@/state/progress';
import { useSettings, useTheme } from '@/state/settings';
import { accentFor, PHASE_COLOR, PHASE_LABEL, RADIUS, SPACE } from '@/theme';

const KEEP_AWAKE_TAG = 'checkride-run';

export default function ChecklistScreen() {
  const { id, phase: phaseId } = useLocalSearchParams<{ id: string; phase: string }>();
  const theme = useTheme();
  const { settings } = useSettings();
  const progress = useProgress();

  const aircraft = getAircraft(id);
  const phase = aircraft ? getPhase(aircraft, phaseId) : undefined;

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!settings.keepAwake) return;
    // Web denies the wake lock when the page is not user-activated; that is fine.
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      // deactivateKeepAwake rejects if the tag was never active; ignore that.
      try {
        void deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        /* no-op */
      }
    };
  }, [settings.keepAwake]);

  const checkedIndexes = useMemo(() => {
    if (!aircraft || !phase) return [] as number[];
    return phase.items.map((_, i) => i).filter((i) => progress.isChecked(aircraft.id, phase.id, i));
  }, [aircraft, phase, progress]);

  const checkedCount = checkedIndexes.length;
  const total = phase?.items.length ?? 0;
  const complete = total > 0 && checkedCount >= total;

  const nextPhase = useMemo(() => {
    if (!aircraft || !phase) return undefined;
    const idx = aircraft.phases.findIndex((p) => p.id === phase.id);
    if (idx < 0) return undefined; // emergency lists have no "next"
    return aircraft.phases[idx + 1];
  }, [aircraft, phase]);

  const scrollToItem = useCallback((index: number) => {
    const y = offsets.current[index];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
  }, []);

  const onToggle = useCallback(
    (index: number) => {
      if (!aircraft || !phase) return;
      const wasChecked = progress.isChecked(aircraft.id, phase.id, index);
      progress.toggleItem(aircraft.id, phase.id, index);

      if (settings.haptics && Platform.OS !== 'web') {
        void Haptics.impactAsync(
          wasChecked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
        );
      }

      if (!wasChecked && settings.autoAdvance) {
        // Find the next item that is still open and bring it into view.
        const next = phase.items.findIndex(
          (_, i) => i !== index && !progress.isChecked(aircraft.id, phase.id, i),
        );
        if (next >= 0) {
          const y = offsets.current[next];
          const visible = y != null && y >= scrollY && y <= scrollY + scrollHeight - 120;
          if (!visible) requestAnimationFrame(() => scrollToItem(next));
        }
      }
    },
    [aircraft, phase, progress, settings.haptics, settings.autoAdvance, scrollToItem, scrollY, scrollHeight],
  );

  if (!aircraft || !phase) {
    return (
      <Screen>
        <View style={styles.missing}>
          <T size={16} weight="700">
            Checklist not found
          </T>
          <Button label="Back to fleet" onPress={() => router.replace('/')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const emergency = phase.kind === 'emergency';
  const accent = emergency ? theme.warning : accentFor(theme, aircraft.accent);
  const kindColor = theme.monochrome ? theme.accent : PHASE_COLOR[phase.kind];

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: phase.name,
          headerRight: () => (
            <Pressable
              onPress={() => progress.resetPhase(aircraft.id, phase.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Reset this checklist"
            >
              <T size={16} color={theme.textDim}>
                {'↺'}
              </T>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.statusBar, { backgroundColor: theme.bgElevated, borderBottomColor: theme.border }]}>
        <ContentWidth style={styles.statusInner}>
          <View style={styles.statusText}>
            <T size={11} weight="700" color={kindColor} uppercase style={{ letterSpacing: 1 }}>
              {PHASE_LABEL[phase.kind]} · {aircraft.name}
            </T>
            <T size={13} weight="700" color={complete ? theme.ok : theme.textDim} style={{ marginTop: 2 }}>
              {complete ? 'Checklist complete' : `${checkedCount} of ${total} complete`}
            </T>
          </View>
          <ProgressBar value={checkedCount} total={total} color={complete ? theme.ok : accent} height={4} />
        </ContentWidth>
      </View>

      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={64}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        onLayout={(e) => setScrollHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.scroll}
      >
        <ContentWidth>
          {emergency ? (
            <View style={[styles.banner, { borderColor: theme.warning, backgroundColor: theme.card }]}>
              <T size={12} weight="800" color={theme.warning} uppercase style={{ letterSpacing: 1 }}>
                Non-normal procedure
              </T>
              <T size={13} color={theme.textDim} style={{ marginTop: 4, lineHeight: 19 }}>
                Fly the aircraft first, then work the list. Memory items come before anything you read.
              </T>
            </View>
          ) : null}

          {phase.note ? (
            <View style={[styles.banner, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <T size={13} color={theme.textDim} style={{ lineHeight: 19 }}>
                {phase.note}
              </T>
            </View>
          ) : null}

          <View style={[styles.list, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
            {phase.items.map((item, index) => (
              <View
                key={`${item.c}-${index}`}
                onLayout={(e) => {
                  offsets.current[index] = e.nativeEvent.layout.y;
                }}
              >
                <ChecklistRow
                  item={item}
                  index={index}
                  accent={accent}
                  checked={progress.isChecked(aircraft.id, phase.id, index)}
                  onToggle={() => onToggle(index)}
                />
              </View>
            ))}
          </View>

          {complete ? (
            <View style={[styles.done, { borderColor: theme.ok, backgroundColor: theme.card }]}>
              <T size={15} weight="800" color={theme.ok}>
                {phase.name} checklist complete
              </T>
              {nextPhase ? (
                <T size={13} color={theme.textDim} style={{ marginTop: 4 }}>
                  Next up: {nextPhase.name}
                </T>
              ) : null}
            </View>
          ) : null}
        </ContentWidth>
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: theme.bgElevated, borderTopColor: theme.border }]}>
        <ContentWidth style={styles.actionsInner}>
          <Button
            label={checkedCount === 0 ? 'Check all' : 'Reset'}
            variant="ghost"
            onPress={() =>
              checkedCount === 0
                ? progress.setPhaseChecked(
                    aircraft.id,
                    phase.id,
                    phase.items.map((_, i) => i),
                  )
                : progress.resetPhase(aircraft.id, phase.id)
            }
            style={{ flex: 1 }}
          />
          {nextPhase ? (
            <Button
              label={`Next: ${nextPhase.name}`}
              color={accent}
              onPress={() => {
                offsets.current = [];
                scrollRef.current?.scrollTo({ y: 0, animated: false });
                router.replace(`/aircraft/${aircraft.id}/${nextPhase.id}`);
              }}
              style={{ flex: 1.4 }}
            />
          ) : (
            <Button
              label="Back to aircraft"
              color={accent}
              onPress={() => router.replace(`/aircraft/${aircraft.id}`)}
              style={{ flex: 1.4 }}
            />
          )}
        </ContentWidth>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  statusBar: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: SPACE.md },
  statusInner: { paddingHorizontal: SPACE.lg, gap: SPACE.sm },
  statusText: { flexDirection: 'column' },
  scroll: { padding: SPACE.lg, paddingBottom: SPACE.xxl },
  banner: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.md,
    marginBottom: SPACE.md,
  },
  list: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  done: {
    marginTop: SPACE.lg,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.lg,
    alignItems: 'center',
  },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: SPACE.md },
  actionsInner: { flexDirection: 'row', gap: SPACE.sm, paddingHorizontal: SPACE.lg },
});
