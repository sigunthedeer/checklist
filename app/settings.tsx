import React, { useState } from 'react';
import { Modal, Platform, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Data, Label, Panel, Row, SectionHeader, Segmented, T, Toggle } from '@/components/ui';
import { AIRCRAFT, SIM_LABEL } from '@/data';
import { useProgress } from '@/state/progress';
import { useConfirm } from '@/components/confirm';
import { useCustom } from '@/state/custom';
import { useFlags } from '@/state/flags';
import {
  BACKUP_FILENAME,
  BackupError,
  buildBackup,
  describeBackup,
  parseBackup,
} from '@/utils/backup';
import { useSettings, useTheme } from '@/state/settings';
import { RADIUS, SPACE, THEME_HINT, THEME_LABEL, THEMES, type ThemeName } from '@/theme';

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
  const custom = useCustom();
  const flags = useFlags();
  const confirm = useConfirm();
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const exportBackup = async () => {
    const json = buildBackup(progress.exportData(), custom.exportData(), flags.exportData());
    if (Platform.OS === 'web') {
      // A real file download, so it lands somewhere the OS will not evict.
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = BACKUP_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return;
    }
    await Share.share({ message: json, title: 'Checkride backup' });
  };

  const restore = async (text: string) => {
    let backup;
    try {
      backup = parseBackup(text);
    } catch (error) {
      setProblem(error instanceof BackupError ? error.message : 'That backup could not be read.');
      return;
    }
    const confirmed = await confirm({
      title: 'Restore this backup?',
      message: `This replaces everything on this device with ${describeBackup(backup)}.`,
      confirmLabel: 'Restore',
      destructive: true,
    });
    if (!confirmed) return;
    progress.importData(backup.progress);
    custom.importData(backup.custom);
    flags.importData(backup.flags);
    setPasting(false);
    setPasted('');
    setProblem(null);
  };

  const importBackup = () => {
    setProblem(null);
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) await restore(await file.text());
      };
      input.click();
      return;
    }
    setPasting(true);
  };

  const confirmResetAll = async () => {
    const confirmed = await confirm({
      title: 'Reset all progress?',
      message:
        'Clears every ticked item for every aircraft. Your favourites, notes and your own items are kept.',
      confirmLabel: 'Reset everything',
      destructive: true,
    });
    if (confirmed) progress.resetAll();
  };

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
            <SectionHeader>Learning</SectionHeader>
            <Panel>
              <ToggleRow
                first
                label="Beginner mode"
                hint="Shows what each control is and where to find it in the cockpit, on the aircraft that have it written."
                value={settings.beginnerMode}
                onChange={(v) => set('beginnerMode', v)}
              />
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
            <SectionHeader>Your data</SectionHeader>
            <Panel>
              <Row first onPress={() => router.push('/flags')} style={styles.flagsRow} accessibilityLabel="Flags">
                <View style={{ flex: 1 }}>
                  <T size={15} weight="600">
                    Flags
                  </T>
                  <T size={12} color={theme.textDim} style={{ marginTop: 3 }}>
                    Things you marked as wrong in the sim, ready to send
                  </T>
                </View>
                <Data size={13} color={flags.all.length ? theme.caution : theme.textFaint}>
                  {flags.all.length}
                </Data>
                <T size={15} color={theme.textFaint}>
                  {'›'}
                </T>
              </Row>
              <Row>
                <T size={13} color={theme.textDim} style={{ lineHeight: 19 }}>
                  Your own items, notes, favourites and progress live only on this device, and the
                  browser can clear that storage without warning. A backup file is the only way to
                  move them to another device or get them back afterwards.
                </T>
              </Row>
              <Row>
                <View style={styles.dataActions}>
                  <Button
                    label="Export a backup"
                    variant="outline"
                    onPress={exportBackup}
                    style={styles.dataAction}
                  />
                  <Button
                    label="Restore"
                    variant="quiet"
                    onPress={importBackup}
                    style={styles.dataAction}
                  />
                </View>
                {problem ? (
                  <T size={12} color={theme.warning} style={{ marginTop: SPACE.md }}>
                    {problem}
                  </T>
                ) : null}
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

      <Modal transparent animationType="fade" visible={pasting} onRequestClose={() => setPasting(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            <Label>Restore a backup</Label>
            <T size={13} color={theme.textDim} style={{ marginTop: SPACE.sm, lineHeight: 19 }}>
              Paste the contents of a Checkride backup file.
            </T>
            <TextInput
              value={pasted}
              onChangeText={setPasted}
              placeholder="{ &quot;app&quot;: &quot;checkride&quot;, … }"
              placeholderTextColor={theme.textFaint}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.pasteBox, { color: theme.text, borderColor: theme.borderStrong }]}
            />
            {problem ? (
              <T size={12} color={theme.warning} style={{ marginTop: SPACE.sm }}>
                {problem}
              </T>
            ) : null}
            <View style={styles.dataActions}>
              <Button
                label="Cancel"
                variant="quiet"
                onPress={() => {
                  setPasting(false);
                  setProblem(null);
                }}
                style={styles.dataAction}
              />
              <Button
                label="Restore"
                disabled={pasted.trim() === ''}
                onPress={() => restore(pasted)}
                style={styles.dataAction}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  flagsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
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
  dataActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
  dataAction: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  sheet: {
    width: '100%',
    maxWidth: 460,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.xl,
  },
  pasteBox: {
    marginTop: SPACE.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.sm,
    padding: SPACE.md,
    minHeight: 120,
    fontSize: 13,
    textAlignVertical: 'top',
  },
});
