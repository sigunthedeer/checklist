import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { ContentWidth, Screen } from '@/components/layout';
import { Data, Label, Panel, Row, SectionHeader, T } from '@/components/ui';
import { AVIONICS, aircraftUsing } from '@/data';
import { useTheme } from '@/state/settings';
import { SPACE } from '@/theme';

export default function FmsIndexScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'FMS GUIDES' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.hero}>
            <T size={22} weight="700">
              Flight management
            </T>
            <T size={14} color={theme.textDim} style={styles.intro}>
              Step by step, key by key: how to put a route, the weights and the speeds into each
              aircraft’s flight computer. Checklists tell you what to set; these show you how.
            </T>
          </View>

          <SectionHeader
            trailing={
              <Data size={12} color={theme.textFaint}>
                {String(AVIONICS.length).padStart(2, '0')}
              </Data>
            }
          >
            Units
          </SectionHeader>
          <Panel>
            {AVIONICS.map((unit, i) => {
              const fleet = aircraftUsing(unit.id);
              return (
                <Row
                  key={unit.id}
                  first={i === 0}
                  onPress={() => router.push(`/fms/${unit.id}`)}
                  style={styles.unitRow}
                  accessibilityLabel={unit.name}
                >
                  <View style={styles.grow}>
                    <View style={styles.unitTop}>
                      <T size={16} weight="700" numberOfLines={1} style={styles.grow}>
                        {unit.name}
                      </T>
                      <Data size={12} color={theme.textFaint}>
                        {unit.procedures.length} procs
                      </Data>
                    </View>
                    <T size={12} color={theme.textDim} numberOfLines={2} style={styles.fleet}>
                      {fleet.map((a) => a.name).join('  ·  ')}
                    </T>
                  </View>
                  <T size={15} color={theme.textFaint}>
                    {'›'}
                  </T>
                </Row>
              );
            })}
          </Panel>

          <Label style={styles.footer}>Simulator use only</Label>
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  hero: { marginBottom: SPACE.xl },
  intro: { marginTop: SPACE.sm, lineHeight: 20 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  unitTop: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm },
  fleet: { marginTop: 3, lineHeight: 17 },
  footer: { textAlign: 'center', marginTop: SPACE.xl },
});
