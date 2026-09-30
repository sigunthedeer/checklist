import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AircraftRow } from '@/components/rows';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import { Data, Label, Panel, Row, SearchField, SectionHeader, Segmented, T, Tabs } from '@/components/ui';
import {
  AIRCRAFT,
  AVIONICS,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  filterFleet,
  getAircraft,
  groupByCategory,
  normalItemCount,
  type Aircraft,
  type AircraftCategory,
  type SimVersion,
} from '@/data';
import { useFlags } from '@/state/flags';
import { useProgress } from '@/state/progress';
import { useSettings, useTheme } from '@/state/settings';
import { SPACE } from '@/theme';

type SimFilter = SimVersion | 'all';
type CategoryFilter = AircraftCategory | 'all';

const SIM_OPTIONS: { value: SimFilter; label: string }[] = [
  { value: 'all', label: 'All sims' },
  { value: 'msfs2020', label: 'MSFS 2020' },
  { value: 'msfs2024', label: 'MSFS 2024' },
];

export default function FleetScreen() {
  const theme = useTheme();
  const { settings, set } = useSettings();
  const progress = useProgress();
  const flags = useFlags();
  const { columns } = useResponsive();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const results = useMemo(
    () =>
      filterFleet({
        search,
        sim: settings.simFilter,
        category,
        favoritesOnly,
        favorites: progress.favorites,
      }),
    [search, settings.simFilter, category, favoritesOnly, progress.favorites],
  );

  const groups = useMemo(() => {
    const grouped = groupByCategory(results);
    return CATEGORY_ORDER.map((c) => grouped.find((g) => g.category === c)).filter(
      (g): g is { category: AircraftCategory; items: Aircraft[] } => !!g,
    );
  }, [results]);

  const categoryTabs = useMemo(() => {
    const present = new Set(AIRCRAFT.map((a) => a.category));
    return [
      { value: 'all' as CategoryFilter, label: 'All types' },
      ...CATEGORY_ORDER.filter((c) => present.has(c)).map((c) => ({
        value: c as CategoryFilter,
        label: CATEGORY_LABEL[c],
      })),
    ];
  }, []);

  const fractionFor = (aircraft: Aircraft) => {
    const total = normalItemCount(aircraft);
    if (total === 0) return 0;
    const done = aircraft.phases.reduce(
      (sum, p) => sum + progress.checkedCount(aircraft.id, p.id),
      0,
    );
    return done / total;
  };

  const open = (aircraft: Aircraft) => {
    progress.noteVisit(aircraft.id);
    router.push(`/aircraft/${aircraft.id}`);
  };

  const unfiltered = search.trim() === '' && category === 'all' && !favoritesOnly;
  const recents = useMemo(
    () =>
      unfiltered
        ? progress.recents
            .map(getAircraft)
            .filter((a): a is Aircraft => !!a)
            .slice(0, 3)
        : [],
    [progress.recents, unfiltered],
  );

  // On a tablet the category panels are dealt into columns, shortest first, so
  // both sides finish at roughly the same height.
  const dealt = useMemo(() => {
    if (columns === 1) return [groups];
    const buckets: { category: AircraftCategory; items: Aircraft[] }[][] = Array.from(
      { length: columns },
      () => [],
    );
    const heights = new Array(columns).fill(0);
    for (const group of groups) {
      const target = heights.indexOf(Math.min(...heights));
      buckets[target].push(group);
      heights[target] += group.items.length + 2;
    }
    return buckets;
  }, [groups, columns]);

  const renderGroup = (group: { category: AircraftCategory; items: Aircraft[] }) => (
    <View key={group.category} style={styles.section}>
      <SectionHeader
        trailing={
          <Data size={12} color={theme.textFaint}>
            {String(group.items.length).padStart(2, '0')}
          </Data>
        }
      >
        {CATEGORY_LABEL[group.category]}
      </SectionHeader>
      <Panel>
        {group.items.map((aircraft, i) => (
          <AircraftRow
            key={aircraft.id}
            aircraft={aircraft}
            first={i === 0}
            favorite={progress.isFavorite(aircraft.id)}
            onToggleFavorite={() => progress.toggleFavorite(aircraft.id)}
            progress={fractionFor(aircraft)}
            onPress={() => open(aircraft)}
          />
        ))}
      </Panel>
    </View>
  );

  return (
    <Screen>
      <View style={[styles.chrome, { backgroundColor: theme.chrome, borderBottomColor: theme.border }]}>
        <ContentWidth style={styles.chromeInner}>
          <View style={styles.titleRow}>
            <T size={17} weight="700" style={{ letterSpacing: 1.4 }}>
              CHECKRIDE
            </T>
            <View style={styles.titleRight}>
              <Data size={12} color={theme.textFaint}>
                {results.length}/{AIRCRAFT.length}
              </Data>
              <Pressable
                onPress={() => router.push('/settings')}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <T size={17} color={theme.accent}>
                  {'⚙'}
                </T>
              </Pressable>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.flex}>
              <SearchField
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, type code, avionics"
              />
            </View>
            <Pressable
              onPress={() => setFavoritesOnly((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: favoritesOnly }}
              accessibilityLabel="Show favourites only"
              style={({ pressed }) => [
                styles.starButton,
                {
                  backgroundColor: favoritesOnly ? theme.accent : theme.surface,
                  borderColor: favoritesOnly ? theme.accent : theme.borderStrong,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <T size={15} color={favoritesOnly ? (theme.dark ? theme.bg : '#FFF') : theme.textDim}>
                {'★'}
              </T>
            </Pressable>
          </View>

          <Segmented
            options={SIM_OPTIONS}
            value={settings.simFilter}
            onChange={(v) => set('simFilter', v)}
            style={styles.segmented}
          />
        </ContentWidth>

        <ContentWidth>
          <Tabs options={categoryTabs} value={category} onChange={setCategory} />
        </ContentWidth>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ContentWidth style={styles.body}>
          {recents.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader>Recent</SectionHeader>
              <Panel>
                {recents.map((aircraft, i) => (
                  <AircraftRow
                    key={aircraft.id}
                    aircraft={aircraft}
                    first={i === 0}
                    favorite={progress.isFavorite(aircraft.id)}
                    onToggleFavorite={() => progress.toggleFavorite(aircraft.id)}
                    progress={fractionFor(aircraft)}
                    onPress={() => open(aircraft)}
                  />
                ))}
              </Panel>
            </View>
          ) : null}

          {unfiltered ? (
            <View style={styles.section}>
              <SectionHeader>Guides</SectionHeader>
              <Panel>
                <Row
                  first
                  onPress={() => router.push('/fms')}
                  style={styles.guideRow}
                  accessibilityLabel="FMS guides"
                >
                  <View style={styles.flex}>
                    <T size={16} weight="700">
                      FMS guides
                    </T>
                    <T size={12} color={theme.textDim} style={{ marginTop: 3 }}>
                      {AVIONICS.map((unit) => unit.short).join('  ·  ')}
                    </T>
                  </View>
                  <T size={15} color={theme.textFaint}>
                    {'›'}
                  </T>
                </Row>
                {flags.all.length > 0 ? (
                  <Row onPress={() => router.push('/flags')} style={styles.guideRow} accessibilityLabel="Flags to send">
                    <View style={styles.flex}>
                      <T size={16} weight="700" color={theme.caution}>
                        ⚑ {flags.all.length} flag{flags.all.length === 1 ? '' : 's'} to send
                      </T>
                      <T size={12} color={theme.textDim} style={{ marginTop: 3 }}>
                        Things you marked as wrong in the sim
                      </T>
                    </View>
                    <T size={15} color={theme.textFaint}>
                      {'›'}
                    </T>
                  </Row>
                ) : null}
              </Panel>
            </View>
          ) : null}

          {results.length === 0 ? (
            <View style={styles.empty}>
              <Label>No match</Label>
              <T size={14} color={theme.textDim} style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
                Nothing in the fleet matches that. Try a different search, or widen the sim and type
                filters.
              </T>
            </View>
          ) : columns === 1 ? (
            groups.map(renderGroup)
          ) : (
            <View style={styles.columns}>
              {dealt.map((bucket, i) => (
                <View key={i} style={styles.column}>
                  {bucket.map(renderGroup)}
                </View>
              ))}
            </View>
          )}

          <T size={11} color={theme.textFaint} style={styles.footer}>
            Simulator use only. Not for real-world flight.
          </T>
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chrome: { borderBottomWidth: StyleSheet.hairlineWidth },
  chromeInner: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, gap: SPACE.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRight: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  starButton: {
    width: 40,
    height: 40,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: { marginBottom: SPACE.sm },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  section: { marginBottom: SPACE.xl },
  columns: { flexDirection: 'row', gap: SPACE.lg },
  column: { flex: 1 },
  empty: { paddingVertical: SPACE.xxl * 2, alignItems: 'center', paddingHorizontal: SPACE.xl },
  footer: { textAlign: 'center', marginTop: SPACE.sm },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
});
