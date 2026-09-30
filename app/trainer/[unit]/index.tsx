import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Data, Label, Panel, Row, SectionHeader, T } from '@/components/ui';
import { getAvionics } from '@/data';
import { useTheme } from '@/state/settings';
import { buildProcedure, CHAINS, trainerProcedures } from '@/trainer/session';
import { accentFor, PHASE_COLOR, PHASE_LABEL, SPACE } from '@/theme';

export default function TrainerMenuScreen() {
  const { unit: unitId } = useLocalSearchParams<{ unit: string }>();
  const theme = useTheme();
  const unit = getAvionics(unitId);
  const procedures = trainerProcedures(unitId ?? '');

  if (!unit || procedures.length === 0) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Label>Not found</Label>
          <T size={15} color={theme.textDim} style={{ marginTop: SPACE.sm }}>
            There is no trainer for that unit yet.
          </T>
          <Button label="FMS guides" onPress={() => router.replace('/fms')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const presses = (id: string) =>
    buildProcedure(unit.id, id).steps.reduce((n, s) => n + s.actions.length, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: `${unit.short.toUpperCase()} TRAINER` }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.hero}>
            <T size={22} weight="700">
              {unit.name} trainer
            </T>
            <T size={14} color={theme.textDim} style={styles.intro}>
              Work through the guide on an MCDU you can press. Type into the scratchpad, press the key beside the
              field, and watch the page change. Guided mode shows each key; Test yourself hides them until you
              miss twice.
            </T>
            <T size={13} color={theme.textFaint} style={styles.intro}>
              The flight is London Heathrow to Paris Charles de Gaulle. The airports and runways are real; the
              procedures, airway and several waypoints are made up for training.
            </T>
          </View>

          <SectionHeader>Full runs</SectionHeader>
          <Panel style={styles.section}>
            {(CHAINS[unit.id] ?? []).map((chain, i) => (
              <Row
                key={chain.id}
                first={i === 0}
                onPress={() => router.push(`/trainer/${unit.id}/${chain.id}`)}
                style={styles.row}
                accessibilityLabel={chain.name}
              >
                <View style={styles.flex}>
                  <T size={15} weight="700">
                    {chain.name}
                  </T>
                  <T size={12} color={theme.textDim} style={styles.meta}>
                    {chain.summary}
                  </T>
                </View>
                <T size={15} color={theme.textFaint}>
                  {'›'}
                </T>
              </Row>
            ))}
          </Panel>

          <SectionHeader
            trailing={
              <Data size={12} color={theme.textFaint}>
                {String(procedures.length).padStart(2, '0')}
              </Data>
            }
          >
            One procedure at a time
          </SectionHeader>
          <Panel style={styles.section}>
            {procedures.map((procedure, i) => (
              <Row
                key={procedure.id}
                first={i === 0}
                onPress={() => router.push(`/trainer/${unit.id}/${procedure.id}`)}
                style={styles.row}
                accessibilityLabel={`Train ${procedure.name}`}
              >
                <Data size={12} color={theme.textFaint} align="left" style={styles.index}>
                  {String(i + 1).padStart(2, '0')}
                </Data>
                <View style={styles.flex}>
                  <T size={15} weight="600">
                    {procedure.name}
                  </T>
                  <View style={styles.kind}>
                    <View style={[styles.kindDot, { backgroundColor: accentFor(theme, PHASE_COLOR[procedure.kind]) }]} />
                    <Label>{PHASE_LABEL[procedure.kind]}</Label>
                  </View>
                </View>
                <Data size={12} color={theme.textDim}>
                  {presses(procedure.id)} keys
                </Data>
              </Row>
            ))}
          </Panel>
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  hero: { marginBottom: SPACE.xl },
  intro: { marginTop: SPACE.sm, lineHeight: 20 },
  section: { marginBottom: SPACE.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  meta: { marginTop: 3 },
  index: { width: 22 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: 4 },
  kindDot: { width: 6, height: 6, borderRadius: 3 },
});
