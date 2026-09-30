import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { ChecklistRow } from '@/components/checklist';
import { SpeedsTable } from '@/components/speeds';
import { useConfirm } from '@/components/confirm';
import { useFlagSheet } from '@/components/flag';
import { useFlags } from '@/state/flags';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import {
  Button,
  Data,
  Label,
  Meter,
  Panel,
  Row,
  SearchField,
  SectionHeader,
  T,
  Tabs,
} from '@/components/ui';
import { getAircraft, getPhase } from '@/data';
import type { ChecklistItem } from '@/data';
import { matchesAll, searchTerms } from '@/utils/search';
import { useProgress } from '@/state/progress';
import { useCustom } from '@/state/custom';
import { useSettings, useTheme } from '@/state/settings';
import { accentFor, PHASE_COLOR, PHASE_LABEL, RADIUS, SPACE } from '@/theme';

const KEEP_AWAKE_TAG = 'checkride-run';

/** Everything on an item that is worth matching a search against. */
const itemHaystack = (item: ChecklistItem) =>
  [item.c, item.r, item.note, item.warn, item.cond].filter(Boolean).join(' ');

export default function ChecklistScreen() {
  const { id, phase: phaseId, q } = useLocalSearchParams<{ id: string; phase: string; q?: string }>();
  const theme = useTheme();
  const { settings } = useSettings();
  const progress = useProgress();
  const custom = useCustom();
  const confirm = useConfirm();
  const flags = useFlags();
  const openFlag = useFlagSheet();
  const { width } = useResponsive();

  const aircraft = getAircraft(id);
  const phase = aircraft ? getPhase(aircraft, phaseId) : undefined;

  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const listTop = useRef(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [searching, setSearching] = useState(!!q);
  const [query, setQuery] = useState(q ?? '');
  const [showSpeeds, setShowSpeeds] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draftChallenge, setDraftChallenge] = useState('');
  const [draftResponse, setDraftResponse] = useState('');

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
    const builtIn = phase.items.reduce(
      (sum, _, i) => sum + (progress.isChecked(aircraft.id, phase.id, i) ? 1 : 0),
      0,
    );
    return builtIn + progress.customCheckedCount(aircraft.id, phase.id);
  }, [aircraft, phase, progress]);

  /** The list this phase belongs to: normal procedures, or the emergency set. */
  const siblings = useMemo(() => {
    if (!aircraft || !phase) return [];
    const normal = aircraft.phases;
    return normal.some((p) => p.id === phase.id) ? normal : (aircraft.emergency ?? []);
  }, [aircraft, phase]);

  const terms = useMemo(() => searchTerms(query), [query]);

  // Filtering keeps each item's original index, so its number still reads true and
  // ticking still writes to the right place in saved progress.
  const visibleItems = useMemo(() => {
    const numbered = (phase?.items ?? []).map((item, index) => ({ item, index }));
    if (terms.length === 0) return numbered;
    return numbered.filter(({ item }) => matchesAll(itemHaystack(item), terms));
  }, [phase?.items, terms]);

  // A stretched full-width row puts the challenge and its response too far apart
  // to pair by eye, so wide screens get two narrower columns instead. A short list
  // of search results reads better in one.
  const columnCount = terms.length > 0 ? 1 : width >= 900 ? 2 : 1;

  const itemColumnGroups = useMemo(() => {
    if (columnCount === 1) return [visibleItems];
    const perColumn = Math.ceil(visibleItems.length / columnCount);
    return Array.from({ length: columnCount }, (_, column) =>
      visibleItems.slice(column * perColumn, (column + 1) * perColumn),
    );
  }, [visibleItems, columnCount]);

  /** Where else in this aircraft the same search hits, for when this list has nothing. */
  const matchesElsewhere = useMemo(() => {
    if (terms.length === 0) return [];
    return siblings
      .filter((p) => p.id !== phase?.id)
      .map((p) => ({
        phase: p,
        count: p.items.filter((item) => matchesAll(itemHaystack(item), terms)).length,
      }))
      .filter((entry) => entry.count > 0);
  }, [siblings, phase?.id, terms]);

  const position = siblings.findIndex((p) => p.id === phase?.id);
  const nextPhase = position >= 0 ? siblings[position + 1] : undefined;
  /** The last normal checklist: finishing it ends the flight rather than the list. */
  const isLastOfFlight =
    !nextPhase && position >= 0 && phase?.kind !== 'emergency' && siblings === aircraft?.phases;

  const scrollToItem = useCallback((index: number) => {
    const y = offsets.current[index];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
  }, []);

  const onToggleCustom = useCallback(
    (itemId: string) => {
      if (!aircraft || !phase) return;
      const wasChecked = progress.isCustomChecked(aircraft.id, phase.id, itemId);
      progress.toggleCustomItem(aircraft.id, phase.id, itemId);
      if (settings.haptics && Platform.OS !== 'web') {
        void Haptics.impactAsync(
          wasChecked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
        );
      }
    },
    [aircraft, phase, progress, settings.haptics],
  );

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

      if (!wasChecked && settings.autoAdvance && terms.length === 0) {
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
    [
      aircraft,
      phase,
      progress,
      settings.haptics,
      settings.autoAdvance,
      scrollToItem,
      scrollY,
      scrollHeight,
      terms.length,
    ],
  );

  const finishFlight = useCallback(() => {
    if (!aircraft) return;
    progress.resetAircraft(aircraft.id);
    router.replace(`/aircraft/${aircraft.id}`);
  }, [aircraft, progress]);

  const goToPhase = useCallback(
    /**
     * `carryQuery` is for moving around while searching, such as following a match
     * into another checklist. Advancing through a flight deliberately does not.
     */
    (nextId: string, carryQuery = false) => {
      if (!aircraft || nextId === phase?.id) return;
      offsets.current = [];
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      const trimmed = query.trim();
      const suffix = carryQuery && trimmed !== '' ? `?q=${encodeURIComponent(trimmed)}` : '';
      router.replace(`/aircraft/${aircraft.id}/${nextId}${suffix}`);
    },
    [aircraft, phase?.id, query],
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

  const customItems = custom.itemsFor(aircraft.id, phase.id);
  const visibleCustomItems =
    terms.length === 0
      ? customItems
      : customItems.filter((item) => matchesAll(`${item.c} ${item.r}`, terms));
  const total = phase.items.length + customItems.length;
  const noMatches = terms.length > 0 && visibleItems.length === 0 && visibleCustomItems.length === 0;
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
            <View style={styles.headerActions}>
              {aircraft.speeds?.length ? (
                <Pressable
                  onPress={() => setShowSpeeds(true)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Reference speeds"
                >
                  <Data size={13} color={theme.textDim}>
                    V
                  </Data>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  setSearching((open) => !open);
                  setQuery('');
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityState={{ selected: searching }}
                accessibilityLabel={searching ? 'Close search' : 'Search this checklist'}
              >
                <T size={17} color={searching ? theme.accent : theme.textDim}>
                  {'⌕'}
                </T>
              </Pressable>
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
            </View>
          ),
        }}
      />

      <View style={[styles.chrome, { backgroundColor: theme.chrome, borderBottomColor: theme.border }]}>
        <ContentWidth>
          <Tabs options={tabs} value={phase.id} onChange={(next) => goToPhase(next, true)} />
        </ContentWidth>
        {searching ? (
          <ContentWidth style={styles.searchRow}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={`Find an item in ${phase.name}`}
              autoFocus
            />
          </ContentWidth>
        ) : null}
        <ContentWidth style={styles.status}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.kindDot, { backgroundColor: emergency ? theme.warning : kindColor }]} />
              <Label color={emergency ? theme.warning : theme.textDim} numberOfLines={1}>
                {terms.length > 0
                  ? `${visibleItems.length + visibleCustomItems.length} of ${total} shown`
                  : `${PHASE_LABEL[phase.kind]} · ${aircraft.name}`}
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

          {visibleItems.length === 0 ? null : (
          <View
            style={columnCount > 1 ? styles.itemColumns : undefined}
            onLayout={(e) => {
              listTop.current = e.nativeEvent.layout.y;
            }}
          >
            {itemColumnGroups.map((group, column) => (
              <View key={column} style={columnCount > 1 ? styles.itemColumn : undefined}>
                <Panel>
                  {group.map(({ item, index }, positionInColumn) => (
                    <View
                      key={`${item.c}-${index}`}
                      onLayout={(e) => {
                        // Both columns share a top edge, so the group offset is enough
                        // to turn a column-relative y into a scrollable one.
                        offsets.current[index] = listTop.current + e.nativeEvent.layout.y;
                      }}
                    >
                      <ChecklistRow
                        item={item}
                        index={index}
                        first={positionInColumn === 0}
                        accent={accent}
                        checked={progress.isChecked(aircraft.id, phase.id, index)}
                        onToggle={() => onToggle(index)}
                        onGuide={
                          item.guide && aircraft.avionics
                            ? () => router.push(`/fms/${aircraft.avionics}/${item.guide}`)
                            : undefined
                        }
                        flag={flags.flagFor({ kind: 'item', scope: aircraft.id, section: phase.id, index })}
                        onFlag={() =>
                          openFlag({ kind: 'item', scope: aircraft.id, section: phase.id, index, text: `${item.c}: ${item.r}` })
                        }
                      />
                    </View>
                  ))}
                </Panel>
              </View>
            ))}
          </View>
          )}

          {terms.length > 0 && visibleCustomItems.length === 0 ? null : (
          <View style={styles.customSection}>
            <SectionHeader
              trailing={
                customItems.length > 0 ? (
                  <Data size={12} color={theme.textFaint}>
                    {String(customItems.length).padStart(2, '0')}
                  </Data>
                ) : undefined
              }
            >
              Your items
            </SectionHeader>
            <Panel>
              {visibleCustomItems.map((item, i) => (
                <ChecklistRow
                  key={item.id}
                  item={{ c: item.c, r: item.r }}
                  index={phase.items.length + i}
                  label={'\u270e'}
                  first={i === 0}
                  accent={accent}
                  checked={progress.isCustomChecked(aircraft.id, phase.id, item.id)}
                  onToggle={() => onToggleCustom(item.id)}
                  onDelete={async () => {
                    const confirmed = await confirm({
                      title: 'Delete this item?',
                      message: `"${item.c}" will be removed from ${phase.name}.`,
                      confirmLabel: 'Delete',
                      destructive: true,
                    });
                    if (confirmed) custom.removeItem(aircraft.id, phase.id, item.id);
                  }}
                />
              ))}
              {terms.length === 0 ? (
                <Row first={customItems.length === 0} onPress={() => setAdding(true)}>
                  <T size={14} weight="600" color={theme.accent}>
                    {'+   Add item'}
                  </T>
                </Row>
              ) : null}
            </Panel>
          </View>
          )}

          {terms.length === 0 ? (
            <T size={12} color={theme.textFaint} style={styles.flagHint}>
              Something different in the sim? Long-press the item to flag it.
            </T>
          ) : null}

          {noMatches ? (
            <Panel style={styles.noMatch}>
              <Row first>
                <Label>No match</Label>
                <T size={14} color={theme.textDim} style={{ marginTop: SPACE.sm, lineHeight: 20 }}>
                  Nothing in {phase.name} matches “{query.trim()}”.
                </T>
              </Row>
              {matchesElsewhere.length > 0 ? (
                <Row>
                  <Label color={theme.textFaint}>Found in other checklists</Label>
                </Row>
              ) : null}
              {matchesElsewhere.map((entry) => (
                <Row key={entry.phase.id} onPress={() => goToPhase(entry.phase.id, true)}>
                  <View style={styles.elsewhereRow}>
                    <T size={14} weight="600" color={theme.accent} style={styles.grow} numberOfLines={1}>
                      {entry.phase.name}
                    </T>
                    <Data size={12} color={theme.textFaint}>
                      {String(entry.count).padStart(2, '0')}
                    </Data>
                  </View>
                </Row>
              ))}
            </Panel>
          ) : null}

          {complete && terms.length === 0 ? (
            <View style={[styles.done, { borderColor: theme.ok, backgroundColor: theme.surface }]}>
              <Label color={theme.ok}>{isLastOfFlight ? 'Flight complete' : 'Checklist complete'}</Label>
              <T size={15} weight="700" style={{ marginTop: 4 }}>
                {phase.name}
              </T>
              {nextPhase ? (
                <T size={13} color={theme.textDim} style={{ marginTop: 4 }}>
                  Next: {nextPhase.name}
                </T>
              ) : isLastOfFlight ? (
                <T size={13} color={theme.textDim} style={{ marginTop: 4, textAlign: 'center' }}>
                  That is the last checklist. Finishing clears the aircraft for your next flight.
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
            onPress={() => {
              if (checkedCount > 0) {
                progress.resetPhase(aircraft.id, phase.id);
                return;
              }
              progress.setPhaseChecked(
                aircraft.id,
                phase.id,
                phase.items.map((_, i) => i),
              );
              progress.setPhaseCustomChecked(
                aircraft.id,
                phase.id,
                customItems.map((item) => item.id),
              );
            }}
            style={styles.actionSmall}
          />
          {nextPhase ? (
            <Button
              label={`Next  ·  ${nextPhase.name}`}
              color={accent}
              onPress={() => goToPhase(nextPhase.id)}
              style={styles.actionMain}
            />
          ) : isLastOfFlight && complete ? (
            <Button
              label="Finish flight"
              color={theme.ok}
              onPress={finishFlight}
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
      <Modal
        transparent
        animationType="fade"
        visible={showSpeeds}
        onRequestClose={() => setShowSpeeds(false)}
      >
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <View
            style={[styles.sheet, styles.speedsSheet, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}
          >
            <Label>Reference speeds</Label>
            <T size={17} weight="700" style={{ marginTop: 2 }} numberOfLines={1}>
              {aircraft.name}
            </T>
            <ScrollView style={styles.speedsScroll}>
              <SpeedsTable speeds={aircraft.speeds ?? []} />
            </ScrollView>
            <Button
              label="Close"
              variant="quiet"
              onPress={() => setShowSpeeds(false)}
              style={{ marginTop: SPACE.lg }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={adding}
        onRequestClose={() => setAdding(false)}
      >
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            <Label>Add to {phase.name}</Label>
            <T size={12} color={theme.textFaint} style={{ marginTop: SPACE.sm }}>
              Your items stay on this device and are kept when the built-in checklists change.
            </T>

            <Label style={{ marginTop: SPACE.lg }}>Challenge</Label>
            <TextInput
              value={draftChallenge}
              onChangeText={setDraftChallenge}
              placeholder="Fuel selector"
              placeholderTextColor={theme.textFaint}
              autoFocus
              style={[styles.input, { color: theme.text, borderColor: theme.borderStrong }]}
            />

            <Label style={{ marginTop: SPACE.md }}>Response</Label>
            <TextInput
              value={draftResponse}
              onChangeText={setDraftResponse}
              placeholder="BOTH"
              placeholderTextColor={theme.textFaint}
              autoCapitalize="characters"
              style={[styles.input, { color: theme.text, borderColor: theme.borderStrong }]}
            />

            <View style={styles.sheetActions}>
              <Button
                label="Cancel"
                variant="quiet"
                onPress={() => {
                  setAdding(false);
                  setDraftChallenge('');
                  setDraftResponse('');
                }}
                style={styles.actionMain}
              />
              <Button
                label="Add item"
                color={accent}
                disabled={draftChallenge.trim() === '' || draftResponse.trim() === ''}
                onPress={() => {
                  custom.addItem(aircraft.id, phase.id, draftChallenge, draftResponse);
                  setAdding(false);
                  setDraftChallenge('');
                  setDraftResponse('');
                }}
                style={styles.actionMain}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flagHint: { textAlign: 'center', marginTop: SPACE.md },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  chrome: { borderBottomWidth: StyleSheet.hairlineWidth },
  status: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md, paddingBottom: SPACE.md, gap: SPACE.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, flexShrink: 1 },
  kindDot: { width: 6, height: 6, borderRadius: 3 },
  scroll: { paddingBottom: SPACE.xxl },
  itemColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  itemColumn: { flex: 1 },
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: SPACE.lg },
  searchRow: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md },
  actionSmall: { width: 104 },
  actionMain: { flex: 1 },
  customSection: { marginTop: SPACE.xl },
  noMatch: { marginTop: SPACE.md },
  elsewhereRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.md },
  grow: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  sheet: {
    width: '100%',
    maxWidth: 460,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.xl,
  },
  input: {
    marginTop: SPACE.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.md,
    height: 42,
    fontSize: 15,
  },
  sheetActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xl },
  speedsSheet: { maxHeight: '82%' },
  speedsScroll: { marginTop: SPACE.lg },
});
