import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import { Button, Data, Label, Panel, Row, SectionHeader, T } from '@/components/ui';
import { aircraftUsing, getAvionics } from '@/data';
import { useTheme } from '@/state/settings';
import { accentFor, PHASE_COLOR, PHASE_LABEL, SPACE } from '@/theme';

export default function AvionicsScreen() {
  const { unit: unitId } = useLocalSearchParams<{ unit: string }>();
  const theme = useTheme();
  const { isWide } = useResponsive();
  const unit = getAvionics(unitId);

  if (!unit) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Label>Not found</Label>
          <T size={15} color={theme.textDim} style={{ marginTop: SPACE.sm }}>
            No FMS guide with that id.
          </T>
          <Button label="All guides" onPress={() => router.replace('/fms')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const fleet = aircraftUsing(unit.id);

  const procedures = (
    <View style={styles.section}>
      <SectionHeader
        trailing={
          <Data size={12} color={theme.textFaint}>
            {String(unit.procedures.length).padStart(2, '0')}
          </Data>
        }
      >
        Procedures
      </SectionHeader>
      <Panel>
        {unit.procedures.map((procedure, i) => {
          const kindColor = accentFor(theme, PHASE_COLOR[procedure.kind]);
          return (
            <Row
              key={procedure.id}
              first={i === 0}
              onPress={() => router.push(`/fms/${unit.id}/${procedure.id}`)}
              style={styles.procRow}
              accessibilityLabel={procedure.name}
            >
              <View style={styles.indexGutter}>
                <Data size={12} color={theme.textFaint} align="left">
                  {String(i + 1).padStart(2, '0')}
                </Data>
              </View>
              <View style={styles.grow}>
                <View style={styles.procTop}>
                  <T size={15} weight="600" numberOfLines={1} style={styles.grow}>
                    {procedure.name}
                  </T>
                  <Data size={12} color={theme.textDim}>
                    {procedure.steps.length} steps
                  </Data>
                </View>
                <View style={styles.procMeta}>
                  <View style={[styles.kindDot, { backgroundColor: kindColor }]} />
                  <Label>{PHASE_LABEL[procedure.kind]}</Label>
                </View>
              </View>
            </Row>
          );
        })}
      </Panel>
    </View>
  );

  const reference = (
    <View>
      <View style={styles.section}>
        <SectionHeader
          trailing={
            <Data size={12} color={theme.textFaint}>
              {String(fleet.length).padStart(2, '0')}
            </Data>
          }
        >
          Fitted to
        </SectionHeader>
        <Panel>
          {fleet.map((aircraft, i) => (
            <Row
              key={aircraft.id}
              first={i === 0}
              onPress={() => router.push(`/aircraft/${aircraft.id}`)}
              style={styles.fleetRow}
              accessibilityLabel={aircraft.name}
            >
              <T size={14} numberOfLines={1} style={styles.grow}>
                {aircraft.name}
              </T>
              {aircraft.icao ? (
                <Data size={12} color={theme.textFaint}>
                  {aircraft.icao}
                </Data>
              ) : null}
            </Row>
          ))}
        </Panel>
      </View>

      {unit.glossary?.length ? (
        <View style={styles.section}>
          <SectionHeader>On the screen</SectionHeader>
          <Panel>
            {unit.glossary.map((entry, i) => (
              <Row key={entry.term} first={i === 0}>
                <T size={13} weight="700" color={theme.accent} mono>
                  {entry.term}
                </T>
                <T size={13} color={theme.textDim} style={styles.meaning}>
                  {entry.meaning}
                </T>
              </Row>
            ))}
          </Panel>
        </View>
      ) : null}

      {unit.notes?.length ? (
        <View style={styles.section}>
          <SectionHeader>Notes for the sim</SectionHeader>
          <Panel>
            {unit.notes.map((note, i) => (
              <Row key={i} first={i === 0}>
                <View style={styles.noteRow}>
                  <T size={13} color={theme.accent}>
                    {'▸'}
                  </T>
                  <T size={13} color={theme.textDim} style={styles.noteText}>
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
      <Stack.Screen options={{ title: unit.short.toUpperCase() }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.hero}>
            <T size={22} weight="700">
              {unit.name}
            </T>
            <T size={14} color={theme.textDim} style={styles.summary}>
              {unit.summary}
            </T>
          </View>

          {isWide ? (
            <View style={styles.twoPane}>
              <View style={styles.pane}>{procedures}</View>
              <View style={styles.pane}>{reference}</View>
            </View>
          ) : (
            <>
              {procedures}
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
  hero: { marginBottom: SPACE.xl },
  summary: { marginTop: SPACE.sm, lineHeight: 20 },
  section: { marginBottom: SPACE.xl },
  twoPane: { flexDirection: 'row', gap: SPACE.xl },
  pane: { flex: 1 },
  procRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACE.md },
  indexGutter: { width: 26, paddingTop: 2 },
  procTop: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm },
  procMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: 5 },
  kindDot: { width: 6, height: 6, borderRadius: 3 },
  fleetRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  meaning: { marginTop: 3, lineHeight: 18 },
  noteRow: { flexDirection: 'row', gap: SPACE.sm },
  noteText: { flex: 1, lineHeight: 19 },
});
