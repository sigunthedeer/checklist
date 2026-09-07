import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Data, Label, Panel, Row, SectionHeader, Segmented, T, Toggle } from '@/components/ui';
import { AIRCRAFT, SIM_LABEL } from '@/data';
import { useProgress } from '@/state/progress';
import { useSettings, useTheme } from '@/state/settings';
import { SPACE, THEME_HINT, THEME_LABEL, THEMES, type ThemeName } from '@/theme';

const TEXT_SCALES = [
  { value: '0.9', label: 'S' },
  { value: '1', label: 'M' },
  { value: '1.15', label: 'L' },
  { value: '1.3', label: 'XL' },
];

const THEME_OPTIONS = (Object.keys(THEMES) as ThemeName[]).map((name) => ({
  value: name,
  label: THEME_LABEL[name],
}));

const SIM_OPTIONS = (['all', 'msfs2020', 'msfs2024'] as const).map((value) => ({
  value,
  label: value === 'all' ? 'All sims' : SIM_LABEL[value],
}));

export default function SettingsScreen() {
  const theme = useTheme();
  const { settings, set } = useSettings();
  const progress = useProgress();

  const confirmResetAll = () =>
    Alert.alert(
      'Reset all progress',
      'Clear every ticked item for every aircraft? Favourites are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset everything', style: 'destructive', onPress: () => progress.resetAll() },
      ],
      { cancelable: true },
    );

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.section}>
            <SectionHeader>Display</SectionHeader>
            <Panel>
              <Row first>
                <Segmented options={THEME_OPTIONS} value={settings.theme} onChange={(v) => set('theme', v)} />
                <T size={12} color={theme.textFaint} style={{ marginTop: SPACE.sm }}>
                  {THEME_HINT[settings.theme]}
                </T>
              </Row>
              <Row>
                <View style={styles.inlineRow}>
                  <Label>Text size</Label>
                  <View style={styles.scalePicker}>
                    <Segmented
                      options={TEXT_SCALES}
                      value={String(settings.textScale)}
                      onChange={(v) => set('textScale', Number(v))}
                    />
                  </View>
                </View>
                <View style={[styles.preview, { borderColor: theme.border }]}>
                  <T size={15 * settings.textScale} weight="600">
                    Fuel selector
                  </T>
                  <T size={12 * settings.textScale} color={theme.leader}>
                    {' · · · · · · · '}
                  </T>
                  <T size={15 * settings.textScale} weight="700" color={theme.accent}>
                    BOTH
                  </T>
                </View>
              </Row>
            </Panel>
          </View>

          <View style={styles.section}>
            <SectionHeader>Default sim filter</SectionHeader>
            <Panel>
              <Row first>
                <Segmented
                  options={SIM_OPTIONS}
                  value={settings.simFilter}
                  onChange={(v) => set('simFilter', v)}
                />
              </Row>
            </Panel>
          </View>

          <View style={styles.section}>
            <SectionHeader>While running a checklist</SectionHeader>
            <Panel>
              <ToggleRow
                first
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
              />
            </Panel>
          </View>

          <View style={styles.section}>
            <SectionHeader>Progress</SectionHeader>
            <Panel>
              <Row first style={styles.statRow}>
                <T size={14} color={theme.textDim}>
                  Aircraft in the fleet
                </T>
                <Data size={14}>{AIRCRAFT.length}</Data>
              </Row>
              <Row style={styles.statRow}>
                <T size={14} color={theme.textDim}>
                  Favourites
                </T>
                <Data size={14}>{progress.favorites.length}</Data>
              </Row>
              <Row>
                <Button
                  label="Reset all checklist progress"
                  variant="outline"
                  color={theme.warning}
                  onPress={confirmResetAll}
                />
              </Row>
            </Panel>
          </View>

          <View style={styles.section}>
            <SectionHeader>About</SectionHeader>
            <Panel>
              <Row first>
                <T size={13} color={theme.textDim} style={styles.para}>
                  Checkride is a checklist reference for the default aircraft in Microsoft Flight
                  Simulator, laid out the way a real challenge-and-response checklist reads.
                </T>
                <T size={13} weight="600" color={theme.warning} style={styles.para}>
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
              </Row>
            </Panel>
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
  first,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row first={first} style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <T size={14} weight="600">
          {label}
        </T>
        <T size={12} color={theme.textFaint} style={{ marginTop: 2 }}>
          {hint}
        </T>
      </View>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </Row>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  section: { marginBottom: SPACE.xl },
  inlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md },
  scalePicker: { width: 168 },
  preview: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACE.md,
    paddingTop: SPACE.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  toggleText: { flex: 1 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  para: { marginBottom: SPACE.md, lineHeight: 19 },
});
