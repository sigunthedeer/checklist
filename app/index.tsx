import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { AircraftCard } from '@/components/cards';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import { Chip, SearchField, SectionTitle, T } from '@/components/ui';
import {
  AIRCRAFT,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  filterFleet,
  getAircraft,
  groupByCategory,
  normalItemCount,
  SIM_LABEL,
  type AircraftCategory,
  type SimVersion,
} from '@/data';
import { useProgress } from '@/state/progress';
import { useSettings, useTheme } from '@/state/settings';
import { SPACE } from '@/theme';

type SimFilter = SimVersion | 'all';

export default function FleetScreen() {
  const theme = useTheme();
  const { settings, set } = useSettings();
  const progress = useProgress();
  const { columns } = useResponsive();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AircraftCategory | 'all'>('all');
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
      (g): g is { category: AircraftCategory; items: typeof AIRCRAFT } => !!g,
    );
  }, [results]);

  // Only categories that actually have aircraft get a filter chip.
  const availableCategories = useMemo(() => {
    const present = new Set(AIRCRAFT.map((a) => a.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, []);

  const recents = useMemo(
    () => progress.recents.map(getAircraft).filter((a): a is NonNullable<typeof a> => !!a).slice(0, 6),
    [progress.recents],
  );

  const fractionFor = (aircraftId: string) => {
    const aircraft = getAircraft(aircraftId);
    if (!aircraft) return 0;
    const total = normalItemCount(aircraft);
    if (total === 0) return 0;
    const done = aircraft.phases.reduce(
      (sum, p) => sum + progress.checkedCount(aircraftId, p.id),
      0,
    );
    return done / total;
  };

  const showGroupHeaders = category === 'all' && search.trim() === '';

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <T size={18} color={theme.accent}>
                {'⚙'}
              </T>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ContentWidth style={styles.inner}>
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search aircraft, type code, avionics"
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {(['all', 'msfs2020', 'msfs2024'] as SimFilter[]).map((s) => (
              <Chip
                key={s}
                label={s === 'all' ? 'All sims' : SIM_LABEL[s]}
                active={settings.simFilter === s}
                onPress={() => set('simFilter', s)}
              />
            ))}
            <Chip
              label="★ Favourites"
              active={favoritesOnly}
              onPress={() => setFavoritesOnly((v) => !v)}
              color={theme.caution}
            />
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            <Chip label="All types" active={category === 'all'} onPress={() => setCategory('all')} />
            {availableCategories.map((c) => (
              <Chip
                key={c}
                label={CATEGORY_LABEL[c]}
                active={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </ScrollView>

          {recents.length > 0 && search.trim() === '' && !favoritesOnly ? (
            <View style={styles.section}>
              <SectionTitle>Recently opened</SectionTitle>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {recents.map((a) => (
                  <Chip
                    key={a.id}
                    label={a.name}
                    onPress={() => router.push(`/aircraft/${a.id}`)}
                    color={a.accent}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {results.length === 0 ? (
            <View style={styles.empty}>
              <T size={16} weight="700" color={theme.textDim}>
                Nothing matches
              </T>
              <T size={13} color={theme.textFaint} style={{ marginTop: 6, textAlign: 'center' }}>
                Try a different search, or clear the sim and type filters.
              </T>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.category} style={styles.section}>
                {showGroupHeaders ? (
                  <SectionTitle
                    right={
                      <T size={12} color={theme.textFaint}>
                        {group.items.length}
                      </T>
                    }
                  >
                    {CATEGORY_LABEL[group.category]}
                  </SectionTitle>
                ) : null}
                <View style={styles.grid}>
                  {group.items.map((a) => (
                    <View
                      key={a.id}
                      style={[styles.gridCell, { width: `${100 / columns}%` }]}
                    >
                      <AircraftCard
                        aircraft={a}
                        favorite={progress.isFavorite(a.id)}
                        onToggleFavorite={() => progress.toggleFavorite(a.id)}
                        progress={fractionFor(a.id)}
                        onPress={() => {
                          progress.noteVisit(a.id);
                          router.push(`/aircraft/${a.id}`);
                        }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}

          <T size={11} color={theme.textFaint} style={styles.footer}>
            {AIRCRAFT.length} aircraft · simulator use only, not for real-world flight
          </T>
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxl },
  inner: { padding: SPACE.lg, gap: SPACE.md },
  chipRow: { gap: SPACE.sm, paddingVertical: 2, paddingRight: SPACE.lg },
  section: { marginTop: SPACE.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SPACE.sm / 2 },
  gridCell: { paddingHorizontal: SPACE.sm / 2 },
  empty: { paddingVertical: SPACE.xxl * 2, alignItems: 'center' },
  footer: { textAlign: 'center', marginTop: SPACE.xl },
});
