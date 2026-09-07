import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Card, Chip, SectionTitle, T } from '@/components/ui';
import { AIRCRAFT, SIM_LABEL } from '@/data';
import { useProgress } from '@/state/progress';
import { useSettings, useTheme } from '@/state/settings';
import { SPACE, THEME_LABEL, THEMES, type ThemeName } from '@/theme';

const TEXT_SCALES: { label: string; value: number }[] = [
  { label: 'Small', value: 0.9 },
  { label: 'Normal', value: 1 },
  { label: 'Large', value: 1.15 },
  { label: 'Huge', value: 1.3 },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, set } = useSettings();
  const progress = useProgress();

  const confirmResetAll = () => {
    Alert.alert(
      'Reset all progress',
      'Clear every ticked item for every aircraft? Favourites are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset everything', style: 'destructive', onPress: () => progress.resetAll() },
      ],
      { cancelable: true },
    );
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.inner}>
          <View style={styles.group}>
            <SectionTitle>Appearance</SectionTitle>
            <Card>
              <T size={13} color={theme.textDim} style={{ marginBottom: SPACE.md }}>
                Night mode drops everything to red on black so a bright tablet does not wreck your
                dark adaptation on a night flight.
              </T>
              <View style={styles.chipRow}>
                {(Object.keys(THEMES) as ThemeName[]).map((name) => (
                  <Chip
                    key={name}
                    label={THEME_LABEL[name]}
                    active={settings.theme === name}
                    onPress={() => set('theme', name)}
                  />
                ))}
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionTitle>Text size</SectionTitle>
            <Card>
              <View style={styles.chipRow}>
                {TEXT_SCALES.map((s) => (
                  <Chip
                    key={s.label}
                    label={s.label}
                    active={Math.abs(settings.textScale - s.value) < 0.01}
                    onPress={() => set('textScale', s.value)}
                  />
                ))}
              </View>
              <T size={15 * settings.textScale} weight="600" style={{ marginTop: SPACE.md }}>
                FUEL SELECTOR
                <T size={15 * settings.textScale} weight="700" color={theme.accent}>
                  {'  ·  BOTH'}
                </T>
              </T>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionTitle>Default sim filter</SectionTitle>
            <Card>
              <View style={styles.chipRow}>
                {(['all', 'msfs2020', 'msfs2024'] as const).map((s) => (
                  <Chip
                    key={s}
                    label={s === 'all' ? 'All sims' : SIM_LABEL[s]}
                    active={settings.simFilter === s}
                    onPress={() => set('simFilter', s)}
                  />
                ))}
              </View>
            </Card>
          </View>

          <View style={styles.group}>
            <SectionTitle>While running a checklist</SectionTitle>
            <Card>
              <ToggleRow
                label="Keep the screen on"
                hint="Stops the phone or tablet sleeping mid-checklist."
                value={settings.keepAwake}
                onChange={(v) => set('keepAwake', v)}
              />
              <ToggleRow
                label="Scroll to the next item"
                hint="After ticking an item, bring the next open one into view."
                value={settings.autoAdvance}
                onChange={(v) => set('autoAdvance', v)}
              />
              <ToggleRow
                label="Haptic feedback"
                hint="A short tap when you tick an item."
                value={settings.haptics}
                onChange={(v) => set('haptics', v)}
                last
              />
            </Card>
          </View>

          <View style={styles.group}>
            <SectionTitle>Progress</SectionTitle>
            <Card>
              <T size={13} color={theme.textDim}>
                {progress.favorites.length} favourite
                {progress.favorites.length === 1 ? '' : 's'} · {AIRCRAFT.length} aircraft in the fleet
              </T>
              <Button
                label="Reset all checklist progress"
                variant="outline"
                color={theme.warning}
                onPress={confirmResetAll}
                style={{ marginTop: SPACE.md }}
              />
            </Card>
          </View>

          <View style={styles.group}>
            <SectionTitle>About</SectionTitle>
            <Card>
              <T size={13} color={theme.textDim} style={styles.para}>
                Checkride is a checklist reference for the default aircraft in Microsoft Flight
                Simulator, laid out the way a real challenge-and-response checklist reads.
              </T>
              <T size={13} weight="700" color={theme.warning} style={styles.para}>
                Simulator use only. These are not approved procedures and must never be used to
                operate a real aircraft.
              </T>
              <T size={12} color={theme.textFaint} style={styles.para}>
                Speeds and limits are typical published figures for each type. Your loaded weight,
                configuration, and the sim's own flight model can all differ. Cross-check anything
                that matters.
              </T>
              <T size={12} color={theme.textFaint}>
                Not affiliated with or endorsed by Microsoft, Asobo Studio, or any aircraft
                manufacturer. Aircraft names identify the type each checklist belongs to.
              </T>
            </Card>
          </View>
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  last,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.toggleRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
      ]}
    >
      <View style={{ flex: 1, paddingRight: SPACE.md }}>
        <T size={14} weight="600">
          {label}
        </T>
        <T size={12} color={theme.textFaint} style={{ marginTop: 2 }}>
          {hint}
        </T>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.accent, false: theme.border }}
        thumbColor={theme.dark ? theme.text : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxl },
  inner: { padding: SPACE.lg },
  group: { marginBottom: SPACE.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACE.md },
  para: { marginBottom: SPACE.md, lineHeight: 19 },
});
