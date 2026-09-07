import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { engineSummary, PhaseCard } from '@/components/cards';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import { Badge, Button, Card, SectionTitle, T } from '@/components/ui';
import { getAircraft, normalItemCount, SIM_LABEL } from '@/data';
import { useProgress } from '@/state/progress';
import { useTheme } from '@/state/settings';
import { accentFor, RADIUS, SPACE } from '@/theme';

export default function AircraftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const progress = useProgress();
  const { isWide } = useResponsive();
  const aircraft = getAircraft(id);

  const totals = useMemo(() => {
    if (!aircraft) return { done: 0, total: 0, nextPhaseId: undefined as string | undefined };
    const total = normalItemCount(aircraft);
    let done = 0;
    let nextPhaseId: string | undefined;
    for (const p of aircraft.phases) {
      const count = progress.checkedCount(aircraft.id, p.id);
      done += count;
      if (!nextPhaseId && count < p.items.length) nextPhaseId = p.id;
    }
    return { done, total, nextPhaseId };
  }, [aircraft, progress]);

  if (!aircraft) {
    return (
      <Screen>
        <View style={styles.missing}>
          <T size={16} weight="700">
            Aircraft not found
          </T>
          <Button label="Back to fleet" onPress={() => router.replace('/')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const accent = accentFor(theme, aircraft.accent);
  const favorite = progress.isFavorite(aircraft.id);

  const confirmReset = () => {
    Alert.alert(
      'Reset progress',
      `Clear every ticked item for the ${aircraft.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => progress.resetAircraft(aircraft.id) },
      ],
      { cancelable: true },
    );
  };

  const checklists = (
    <View style={styles.column}>
      <SectionTitle
        right={
          totals.done > 0 ? (
            <Pressable onPress={confirmReset} hitSlop={8}>
              <T size={12} weight="600" color={theme.textDim}>
                Reset
              </T>
            </Pressable>
          ) : undefined
        }
      >
        Normal procedures
      </SectionTitle>
      {aircraft.phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          phase={phase}
          accent={accent}
          checked={progress.checkedCount(aircraft.id, phase.id)}
          onPress={() => router.push(`/aircraft/${aircraft.id}/${phase.id}`)}
        />
      ))}

      {aircraft.emergency?.length ? (
        <View style={{ marginTop: SPACE.lg }}>
          <SectionTitle>Non-normal and emergency</SectionTitle>
          {aircraft.emergency.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              accent={theme.warning}
              checked={progress.checkedCount(aircraft.id, phase.id)}
              onPress={() => router.push(`/aircraft/${aircraft.id}/${phase.id}`)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  const reference = (
    <View style={styles.column}>
      {aircraft.speeds?.length ? (
        <View style={{ marginBottom: SPACE.lg }}>
          <SectionTitle>Reference speeds</SectionTitle>
          <Card>
            {aircraft.speeds.map((s, i) => (
              <View
                key={`${s.label}-${i}`}
                style={[
                  styles.specRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <T size={14} weight="600">
                    {s.label}
                  </T>
                  {s.note ? (
                    <T size={11} color={theme.textFaint} style={{ marginTop: 2 }}>
                      {s.note}
                    </T>
                  ) : null}
                </View>
                <T size={15} weight="700" color={accent} mono>
                  {s.value}
                  {s.unit ? ` ${s.unit}` : ''}
                </T>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {aircraft.specs?.length ? (
        <View style={{ marginBottom: SPACE.lg }}>
          <SectionTitle>Type data</SectionTitle>
          <Card>
            {aircraft.specs.map((s, i) => (
              <View
                key={`${s.label}-${i}`}
                style={[
                  styles.specRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}
              >
                <T size={14} color={theme.textDim} style={{ flex: 1 }}>
                  {s.label}
                </T>
                <T size={14} weight="600" style={{ textAlign: 'right', flexShrink: 1 }}>
                  {s.value}
                </T>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {aircraft.notes?.length ? (
        <View>
          <SectionTitle>Notes for the sim</SectionTitle>
          <Card>
            {aircraft.notes.map((n, i) => (
              <View key={i} style={styles.noteRow}>
                <T size={14} color={accent}>
                  {'▸'}
                </T>
                <T size={13} color={theme.textDim} style={{ flex: 1, lineHeight: 19 }}>
                  {n}
                </T>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: aircraft.manufacturer,
          headerRight: () => (
            <Pressable
              onPress={() => progress.toggleFavorite(aircraft.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <T size={18} color={favorite ? theme.caution : theme.textFaint}>
                {favorite ? '★' : '☆'}
              </T>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.inner}>
          <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.bgElevated }]}>
            <View style={[styles.heroStrip, { backgroundColor: accent }]} />
            <View style={styles.heroBody}>
              <T size={22} weight="800">
                {aircraft.name}
              </T>
              <T size={13} color={theme.textDim} style={{ marginTop: 4 }}>
                {aircraft.model} · {engineSummary(aircraft)}
                {aircraft.engines.name ? `\n${aircraft.engines.name}` : ''}
              </T>
              <View style={styles.badgeRow}>
                {aircraft.sims.map((s) => (
                  <Badge key={s} label={SIM_LABEL[s]} color={theme.textFaint} />
                ))}
                {aircraft.icao ? <Badge label={aircraft.icao} color={accent} /> : null}
                {aircraft.seats ? <Badge label={`${aircraft.seats} seats`} color={theme.textFaint} /> : null}
              </View>
              <View style={styles.actionRow}>
                <Button
                  label={totals.done === 0 ? 'Start first checklist' : 'Continue'}
                  color={accent}
                  onPress={() =>
                    router.push(
                      `/aircraft/${aircraft.id}/${totals.nextPhaseId ?? aircraft.phases[0].id}`,
                    )
                  }
                  style={{ flex: 1 }}
                />
              </View>
              <T size={11} color={theme.textFaint} style={{ marginTop: SPACE.sm }}>
                {totals.done} of {totals.total} items ticked across {aircraft.phases.length} checklists
              </T>
            </View>
          </View>

          {isWide ? (
            <View style={styles.twoPane}>
              <View style={styles.pane}>{checklists}</View>
              <View style={styles.pane}>{reference}</View>
            </View>
          ) : (
            <>
              {checklists}
              <View style={{ height: SPACE.xl }} />
              {reference}
            </>
          )}
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxl },
  inner: { padding: SPACE.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  hero: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: SPACE.xl,
  },
  heroStrip: { width: 5 },
  heroBody: { flex: 1, padding: SPACE.lg },
  badgeRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md, flexWrap: 'wrap' },
  actionRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg, maxWidth: 360 },
  twoPane: { flexDirection: 'row', gap: SPACE.xl },
  pane: { flex: 1 },
  column: { width: '100%' },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingVertical: SPACE.md - 2,
  },
  noteRow: { flexDirection: 'row', gap: SPACE.sm, paddingVertical: SPACE.sm },
});
