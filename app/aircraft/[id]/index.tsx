import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { engineSummary, PhaseRow } from '@/components/rows';
import { SpeedsTable } from '@/components/speeds';
import { useConfirm } from '@/components/confirm';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import { Button, Data, Label, Meter, Panel, Row, SectionHeader, Stat, T } from '@/components/ui';
import { getAircraft, SIM_LABEL } from '@/data';
import type { ChecklistPhase } from '@/data';
import { useProgress } from '@/state/progress';
import { useCustom } from '@/state/custom';
import { useTheme } from '@/state/settings';
import { SPACE } from '@/theme';

export default function AircraftScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const progress = useProgress();
  const custom = useCustom();
  const confirm = useConfirm();
  const { isWide, isTablet } = useResponsive();
  const aircraft = getAircraft(id);

  // Totals span the built-in items and anything the user added to this aircraft.
  const totals = useMemo(() => {
    if (!aircraft) return { done: 0, total: 0, nextPhaseId: undefined as string | undefined };
    let done = 0;
    let total = 0;
    let nextPhaseId: string | undefined;
    for (const phase of aircraft.phases) {
      const phaseTotal = phase.items.length + custom.itemsFor(aircraft.id, phase.id).length;
      const phaseDone =
        progress.checkedCount(aircraft.id, phase.id) +
        progress.customCheckedCount(aircraft.id, phase.id);
      done += phaseDone;
      total += phaseTotal;
      if (!nextPhaseId && phaseDone < phaseTotal) nextPhaseId = phase.id;
    }
    return { done, total, nextPhaseId };
  }, [aircraft, progress, custom]);

  if (!aircraft) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Label>Not found</Label>
          <T size={15} color={theme.textDim} style={{ marginTop: SPACE.sm }}>
            No aircraft with that id.
          </T>
          <Button label="Back to fleet" onPress={() => router.replace('/')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const favorite = progress.isFavorite(aircraft.id);
  const stripColumns = isTablet ? 4 : 2;

  const phaseCounts = (phase: ChecklistPhase) => ({
    checked:
      progress.checkedCount(aircraft.id, phase.id) +
      progress.customCheckedCount(aircraft.id, phase.id),
    total: phase.items.length + custom.itemsFor(aircraft.id, phase.id).length,
  });

  const startNewFlight = () => {
    progress.resetAircraft(aircraft.id);
    router.push(`/aircraft/${aircraft.id}/${aircraft.phases[0].id}`);
  };

  // Only worth confirming when there is something to lose.
  const newFlight = async () => {
    if (totals.done > 0) {
      const confirmed = await confirm({
        title: 'Start a new flight?',
        message: `This clears every ticked item for the ${aircraft.name} and starts at the first checklist.`,
        confirmLabel: 'New flight',
        destructive: true,
      });
      if (!confirmed) return;
    }
    startNewFlight();
  };

  const checklists = (
    <View>
      <View style={styles.section}>
        <SectionHeader
          trailing={
            <Data size={12} color={theme.textFaint}>
              {String(aircraft.phases.length).padStart(2, '0')}
            </Data>
          }
        >
          Normal procedures
        </SectionHeader>
        <Panel>
          {aircraft.phases.map((phase, i) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              index={i + 1}
              first={i === 0}
              {...phaseCounts(phase)}
              onPress={() => router.push(`/aircraft/${aircraft.id}/${phase.id}`)}
            />
          ))}
        </Panel>
      </View>

      {aircraft.emergency?.length ? (
        <View style={styles.section}>
          <SectionHeader
            trailing={
              <Data size={12} color={theme.warning}>
                {String(aircraft.emergency.length).padStart(2, '0')}
              </Data>
            }
          >
            Non-normal and emergency
          </SectionHeader>
          <Panel style={{ borderColor: theme.warning }}>
            {aircraft.emergency.map((phase, i) => (
              <PhaseRow
                key={phase.id}
                phase={phase}
                index={i + 1}
                first={i === 0}
                {...phaseCounts(phase)}
                onPress={() => router.push(`/aircraft/${aircraft.id}/${phase.id}`)}
              />
            ))}
          </Panel>
        </View>
      ) : null}
    </View>
  );

  const reference = (
    <View>
      <View style={styles.section}>
        <SectionHeader
          trailing={
            custom.countForAircraft(aircraft.id) > 0 ? (
              <Data size={12} color={theme.textFaint}>
                {custom.countForAircraft(aircraft.id)} items
              </Data>
            ) : undefined
          }
        >
          Your notes
        </SectionHeader>
        <Panel>
          <Row first>
            <TextInput
              value={custom.noteFor(aircraft.id)}
              onChangeText={(text) => custom.setNote(aircraft.id, text)}
              placeholder="Mod-specific steps, keybinds, anything you want to remember about this aircraft."
              placeholderTextColor={theme.textFaint}
              multiline
              style={[styles.notes, { color: theme.text }]}
            />
          </Row>
        </Panel>
      </View>

      {aircraft.speeds?.length ? (
        <View style={styles.section}>
          <SectionHeader>Reference speeds</SectionHeader>
          <SpeedsTable speeds={aircraft.speeds} />
        </View>
      ) : null}

      {aircraft.specs?.length ? (
        <View style={styles.section}>
          <SectionHeader>Type data</SectionHeader>
          <Panel>
            {aircraft.specs.map((spec, i) => (
              <Row key={`${spec.label}-${i}`} first={i === 0} style={styles.dataRow}>
                <T size={14} color={theme.textDim} style={styles.grow}>
                  {spec.label}
                </T>
                <T size={14} weight="600" align="right" style={styles.specValue}>
                  {spec.value}
                </T>
              </Row>
            ))}
          </Panel>
        </View>
      ) : null}

      {aircraft.notes?.length ? (
        <View style={styles.section}>
          <SectionHeader>Notes for the sim</SectionHeader>
          <Panel>
            {aircraft.notes.map((note, i) => (
              <Row key={i} first={i === 0}>
                <View style={styles.noteRow}>
                  <T size={13} color={theme.accent}>
                    {'▸'}
                  </T>
                  <T size={13} color={theme.textDim} style={{ flex: 1, lineHeight: 19 }}>
                    {note}
                  </T>
                </View>
              </Row>
            ))}
          </Panel>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: aircraft.manufacturer.toUpperCase(),
          headerRight: () => (
            <Pressable
              onPress={() => progress.toggleFavorite(aircraft.id)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <T size={17} color={favorite ? theme.caution : theme.textFaint}>
                {favorite ? '★' : '☆'}
              </T>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.hero}>
            <T size={22} weight="700">
              {aircraft.name}
            </T>
            <T size={13} color={theme.textDim} style={{ marginTop: 3 }}>
              {aircraft.model}
              {aircraft.engines.name ? `  ·  ${aircraft.engines.name}` : ''}
            </T>
          </View>

          <Panel style={styles.strip}>
            <View style={styles.stripRow}>
              {[
                { label: 'Type', value: aircraft.icao ?? '—', accent: true },
                { label: 'Powerplant', value: engineSummary(aircraft) },
                { label: 'Seats', value: aircraft.seats ? String(aircraft.seats) : '—' },
                {
                  label: 'Sim',
                  value: aircraft.sims.map((s) => SIM_LABEL[s].replace('MSFS ', '')).join(' · '),
                },
              ].map((cell, i) => (
                <Stat
                  key={cell.label}
                  label={cell.label}
                  value={cell.value}
                  color={cell.accent ? theme.accent : undefined}
                  style={[
                    styles.stripCell,
                    {
                      width: stripColumns === 2 ? '50%' : '25%',
                      borderRightWidth:
                        (i + 1) % stripColumns === 0 ? 0 : StyleSheet.hairlineWidth,
                      borderTopWidth: i >= stripColumns ? StyleSheet.hairlineWidth : 0,
                      borderRightColor: theme.border,
                      borderTopColor: theme.border,
                    },
                  ]}
                />
              ))}
            </View>
          </Panel>

          <View style={styles.actionBlock}>
            <View style={styles.progressLine}>
              <Label>Progress</Label>
              <Data size={12} color={totals.done > 0 ? theme.ok : theme.textFaint}>
                {String(totals.done).padStart(3, '0')} / {totals.total} items
              </Data>
            </View>
            <Meter value={totals.done} total={totals.total} color={theme.ok} height={3} />
            <View style={styles.actionRow}>
              {totals.done > 0 ? (
                <Button label="New flight" variant="quiet" onPress={newFlight} style={styles.actionSecondary} />
              ) : null}
              <Button
                label={totals.done === 0 ? 'Start flight' : 'Continue'}
                color={theme.accent}
                onPress={() =>
                  router.push(`/aircraft/${aircraft.id}/${totals.nextPhaseId ?? aircraft.phases[0].id}`)
                }
                style={styles.actionPrimary}
              />
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
              {reference}
            </>
          )}
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  hero: { marginBottom: SPACE.lg },
  strip: { marginBottom: SPACE.lg },
  stripRow: { flexDirection: 'row', flexWrap: 'wrap' },
  stripCell: { paddingVertical: SPACE.md, paddingHorizontal: SPACE.md },
  actionBlock: { marginBottom: SPACE.xl, gap: SPACE.sm },
  progressLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
  actionSecondary: { width: 116 },
  actionPrimary: { flex: 1 },
  section: { marginBottom: SPACE.xl },
  twoPane: { flexDirection: 'row', gap: SPACE.xl },
  pane: { flex: 1 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  specValue: { flexShrink: 1, maxWidth: '58%' },
  noteRow: { flexDirection: 'row', gap: SPACE.sm },
  notes: { minHeight: 84, fontSize: 14, lineHeight: 20, textAlignVertical: 'top', padding: 0 },
});
