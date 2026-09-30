import React, { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useFlagSheet } from '@/components/flag';
import { FmsStepRow } from '@/components/fms';
import { useFlags } from '@/state/flags';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Data, Label, Meter, Panel, T } from '@/components/ui';
import { getAvionics, getProcedure } from '@/data';
import { trainerProcedures } from '@/trainer/session';
import { useSettings, useTheme } from '@/state/settings';
import { accentFor, PHASE_COLOR, PHASE_LABEL, SPACE } from '@/theme';

/**
 * One FMS procedure, step by step. Ticks are kept for this visit only: a
 * procedure is done in one sitting at the gate, and saving them would leave
 * stale ticks the next time the page is opened for a different flight.
 */
export default function ProcedureScreen() {
  const { unit: unitId, proc } = useLocalSearchParams<{ unit: string; proc: string }>();
  const theme = useTheme();
  const { settings } = useSettings();
  const flags = useFlags();
  const openFlag = useFlagSheet();
  const unit = getAvionics(unitId);
  const procedure = unit ? getProcedure(unit, proc) : undefined;

  // Keyed by procedure so moving to the next one starts clean even when the screen is reused.
  const [ticks, setTicks] = useState<Record<string, number[]>>({});
  const key = `${unitId}/${proc}`;
  const done = ticks[key] ?? [];

  const toggle = useCallback(
    (index: number) => {
      setTicks((all) => {
        const current = all[key] ?? [];
        const wasChecked = current.includes(index);
        if (settings.haptics && Platform.OS !== 'web') {
          void Haptics.impactAsync(
            wasChecked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
          );
        }
        return {
          ...all,
          [key]: wasChecked ? current.filter((i) => i !== index) : [...current, index],
        };
      });
    },
    [key, settings.haptics],
  );

  if (!unit || !procedure) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Label>Not found</Label>
          <T size={15} color={theme.textDim} style={{ marginTop: SPACE.sm }}>
            No procedure with that id.
          </T>
          <Button label="All guides" onPress={() => router.replace('/fms')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const position = unit.procedures.indexOf(procedure);
  const previous = unit.procedures[position - 1];
  const next = unit.procedures[position + 1];
  const kindColor = accentFor(theme, PHASE_COLOR[procedure.kind]);
  const complete = done.length >= procedure.steps.length;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: unit.short.toUpperCase(),
          headerRight: () =>
            done.length > 0 ? (
              <Pressable
                onPress={() => setTicks((all) => ({ ...all, [key]: [] }))}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear ticks"
              >
                <T size={16} color={theme.textDim}>
                  {'↺'}
                </T>
              </Pressable>
            ) : null,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.hero}>
            <View style={styles.kind}>
              <View style={[styles.kindDot, { backgroundColor: kindColor }]} />
              <Label>
                {PHASE_LABEL[procedure.kind]}  ·  {String(position + 1).padStart(2, '0')} of{' '}
                {String(unit.procedures.length).padStart(2, '0')}
              </Label>
            </View>
            <T size={22} weight="700" style={styles.title}>
              {procedure.name}
            </T>
            {procedure.summary ? (
              <T size={14} color={theme.textDim} style={styles.summary}>
                {procedure.summary}
              </T>
            ) : null}
          </View>

          <View style={styles.progress}>
            <View style={styles.meter}>
              <Meter
                value={done.length}
                total={procedure.steps.length}
                color={complete ? theme.ok : kindColor}
                height={3}
              />
            </View>
            <Data size={12} color={complete ? theme.ok : theme.textFaint}>
              {complete ? 'DONE' : `${done.length}/${procedure.steps.length}`}
            </Data>
          </View>

          <Panel>
            {procedure.steps.map((step, i) => (
              <FmsStepRow
                key={i}
                step={step}
                index={i}
                first={i === 0}
                checked={done.includes(i)}
                onToggle={() => toggle(i)}
                flag={flags.flagFor({ kind: 'guide', scope: unit.id, section: procedure.id, index: i })}
                onFlag={() =>
                  openFlag({
                    kind: 'guide',
                    scope: unit.id,
                    section: procedure.id,
                    index: i,
                    text: [step.do, step.entry, ...(step.keys ?? [])].filter(Boolean).join(' · '),
                  })
                }
              />
            ))}
          </Panel>

          {trainerProcedures(unit.id).some((p) => p.id === procedure.id) ? (
            <Button
              label="Practise on the trainer"
              variant="outline"
              onPress={() => router.push(`/trainer/${unit.id}/${procedure.id}`)}
              style={styles.practise}
            />
          ) : null}

          <View style={styles.nav}>
            {previous ? (
              <Button
                label={`‹  ${previous.name}`}
                variant="quiet"
                onPress={() => router.replace(`/fms/${unit.id}/${previous.id}`)}
                style={styles.navButton}
              />
            ) : (
              <View style={styles.navButton} />
            )}
            {next ? (
              <Button
                label={`${next.name}  ›`}
                variant={complete ? 'primary' : 'quiet'}
                onPress={() => router.replace(`/fms/${unit.id}/${next.id}`)}
                style={styles.navButton}
              />
            ) : (
              <Button
                label="All procedures"
                variant={complete ? 'primary' : 'quiet'}
                onPress={() => router.back()}
                style={styles.navButton}
              />
            )}
          </View>

          <T size={11} color={theme.textFaint} style={styles.footer}>
            Simulator use only. Values marked as examples are placeholders, not data for your flight. Something
            different in the sim? Long-press the step to flag it.
          </T>
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  hero: { marginBottom: SPACE.lg },
  kind: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  kindDot: { width: 6, height: 6, borderRadius: 3 },
  title: { marginTop: SPACE.sm },
  summary: { marginTop: SPACE.xs, lineHeight: 20 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  meter: { flex: 1 },
  practise: { marginTop: SPACE.lg },
  nav: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm },
  navButton: { flex: 1 },
  footer: { textAlign: 'center', marginTop: SPACE.xl },
});
