import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ChecklistRow } from '@/components/checklist';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Data, Label, Meter, Panel, T, Tabs } from '@/components/ui';
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

    // Both calls can reject: browsers deny the wake lock unless the page has been
    // interacted with, and releasing a lock that never activated throws. Neither is
    // worth surfacing, but the release still has to wait for the request to settle
    // so a fast unmount does not leave the screen pinned on.
    let cancelled = false;
    let held = false;
    const release = () => deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => undefined);

    activateKeepAwakeAsync(KEEP_AWAKE_TAG)
      .then(() => {
        held = true;
        if (cancelled) void release();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (held) void release();
    };
  }, [settings.keepAwake]);

  const checkedCount = useMemo(() => {
    if (!aircraft || !phase) return 0;
    return phase.items.reduce(
      (sum, _, i) => sum + (progress.isChecked(aircraft.id, phase.id, i) ? 1 : 0),
      0,
    );
  }, [aircraft, phase, progress]);

  /** The list this phase belongs to: normal procedures, or the emergency set. */
  const siblings = useMemo(() => {
    if (!aircraft || !phase) return [];
    const normal = aircraft.phases;
    return normal.some((p) => p.id === phase.id) ? normal : (aircraft.emergency ?? []);
  }, [aircraft, phase]);

  const position = siblings.findIndex((p) => p.id === phase?.id);
  const nextPhase = position >= 0 ? siblings[position + 1] : undefined;

  const scrollToItem = useCallback((index: number) => {
    const y = offsets.current[index];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
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

  const goToPhase = useCallback(
    (nextId: string) => {
      if (!aircraft || nextId === phase?.id) return;
      offsets.current = [];
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      router.replace(`/aircraft/${aircraft.id}/${nextId}`);
    },
    [aircraft, phase?.id],
  );

  if (!aircraft || !phase) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Label>Not found</Label>
          <T size={15} color={theme.textDim} style={{ marginTop: SPACE.sm }}>
            No checklist with that id.
          </T>
          <Button label="Back to fleet" onPress={() => router.replace('/')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const total = phase.items.length;
  const complete = total > 0 && checkedCount >= total;
  const emergency = phase.kind === 'emergency';
  const accent = emergency ? theme.warning : theme.accent;
  const kindColor = accentFor(theme, PHASE_COLOR[phase.kind]);

  const tabs = siblings.map((p) => {
    const done = progress.checkedCount(aircraft.id, p.id);
    return {
      value: p.id,
      label: p.name,
      dot:
        done >= p.items.length
          ? theme.ok
          : done > 0
            ? accentFor(theme, PHASE_COLOR[p.kind])
            : theme.borderStrong,
    };
  });

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

      <View style={[styles.chrome, { backgroundColor: theme.chrome, borderBottomColor: theme.border }]}>
        <ContentWidth>
          <Tabs options={tabs} value={phase.id} onChange={goToPhase} />
        </ContentWidth>
        <ContentWidth style={styles.status}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.kindDot, { backgroundColor: emergency ? theme.warning : kindColor }]} />
              <Label color={emergency ? theme.warning : theme.textDim} numberOfLines={1}>
                {PHASE_LABEL[phase.kind]} · {aircraft.name}
              </Label>
            </View>
            <Data size={13} color={complete ? theme.ok : theme.textDim}>
              {String(checkedCount).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </Data>
          </View>
          <Meter
            value={checkedCount}
            total={total}
            color={complete ? theme.ok : accent}
            height={3}
          />
        </ContentWidth>
      </View>

      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={64}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        onLayout={(e) => setScrollHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.scroll}
      >
        <ContentWidth style={styles.body}>
          {emergency ? (
            <View style={[styles.banner, { borderColor: theme.warning, backgroundColor: theme.surface }]}>
              <Label color={theme.warning}>Non-normal procedure</Label>
              <T size={13} color={theme.textDim} style={{ marginTop: 4, lineHeight: 19 }}>
                Fly the aircraft first, then work the list. Memory items come before anything you
                read.
              </T>
            </View>
          ) : null}

          {phase.note ? (
            <View style={[styles.banner, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <T size={13} color={theme.textDim} style={{ lineHeight: 19 }}>
                {phase.note}
              </T>
            </View>
          ) : null}

          <Panel>
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
                  first={index === 0}
                  accent={accent}
                  checked={progress.isChecked(aircraft.id, phase.id, index)}
                  onToggle={() => onToggle(index)}
                />
              </View>
            ))}
          </Panel>

          {complete ? (
            <View style={[styles.done, { borderColor: theme.ok, backgroundColor: theme.surface }]}>
              <Label color={theme.ok}>Checklist complete</Label>
              <T size={15} weight="700" style={{ marginTop: 4 }}>
                {phase.name}
              </T>
              {nextPhase ? (
                <T size={13} color={theme.textDim} style={{ marginTop: 4 }}>
                  Next: {nextPhase.name}
                </T>
              ) : null}
            </View>
          ) : null}
        </ContentWidth>
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: theme.chrome, borderTopColor: theme.border }]}>
        <ContentWidth style={styles.actionsInner}>
          <Button
            label={checkedCount === 0 ? 'Check all' : 'Reset'}
            variant="quiet"
            onPress={() =>
              checkedCount === 0
                ? progress.setPhaseChecked(
                    aircraft.id,
                    phase.id,
                    phase.items.map((_, i) => i),
                  )
                : progress.resetPhase(aircraft.id, phase.id)
            }
            style={styles.actionSmall}
          />
          {nextPhase ? (
            <Button
              label={`Next  ·  ${nextPhase.name}`}
              color={accent}
              onPress={() => goToPhase(nextPhase.id)}
              style={styles.actionMain}
            />
          ) : (
            <Button
              label="Back to aircraft"
              color={accent}
              onPress={() => router.replace(`/aircraft/${aircraft.id}`)}
              style={styles.actionMain}
            />
          )}
        </ContentWidth>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  chrome: { borderBottomWidth: StyleSheet.hairlineWidth },
  status: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md, gap: SPACE.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexShrink: 1 },
  kindDot: { width: 6, height: 6, borderRadius: 3 },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  banner: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.md,
    marginBottom: SPACE.md,
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
  actionSmall: { width: 104 },
  actionMain: { flex: 1 },
});
