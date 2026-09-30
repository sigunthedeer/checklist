import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useConfirm } from '@/components/confirm';
import { FlagNote, useFlagSheet } from '@/components/flag';
import { ContentWidth, Screen } from '@/components/layout';
import { Button, Data, Label, Panel, Row, SectionHeader, T } from '@/components/ui';
import { useFlags } from '@/state/flags';
import { useTheme } from '@/state/settings';
import { flagPlace, flagReport, flagRoute } from '@/utils/flags';
import { canCopy, canShare, copyText, shareText, type ShareResult } from '@/utils/share';
import { SPACE } from '@/theme';

const RESULT_TEXT: Record<ShareResult, string> = {
  copied: 'Copied. Paste it into your chat with Claude.',
  shared: 'Sent.',
  cancelled: '',
  unavailable: 'This browser will not share or copy it. Select the report below and copy it by hand.',
};

export default function FlagsScreen() {
  const theme = useTheme();
  const flags = useFlags();
  const confirm = useConfirm();
  const openFlag = useFlagSheet();
  const [result, setResult] = useState<ShareResult | null>(null);
  const report = flagReport(flags.all);

  const clearAll = async () => {
    const confirmed = await confirm({
      title: 'Clear all flags?',
      message: 'Only do this once you have sent the report: the flags cannot be brought back.',
      confirmLabel: 'Clear all',
      destructive: true,
    });
    if (confirmed) flags.clearAll();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'FLAGS' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ContentWidth style={styles.body}>
          <View style={styles.hero}>
            <T size={22} weight="700">
              Flags
            </T>
            <T size={14} color={theme.textDim} style={styles.intro}>
              {flags.all.length === 0
                ? 'Nothing flagged yet. When a checklist item or guide step does not match the sim, long-press it (or use the Flag button in the trainer) and it shows up here.'
                : `${flags.all.length} thing${flags.all.length === 1 ? '' : 's'} that did not match the sim. Send the report and they can be fixed exactly where you found them.`}
            </T>
          </View>

          {flags.all.length > 0 ? (
            <>
              <View style={styles.actions}>
                {canCopy() ? (
                  <Button label="Copy report" onPress={async () => setResult(await copyText(report))} style={styles.action} />
                ) : null}
                {canShare() ? (
                  <Button
                    label="Share…"
                    variant={canCopy() ? 'outline' : 'primary'}
                    onPress={async () => setResult(await shareText('Checkride flags', report))}
                    style={styles.action}
                  />
                ) : null}
              </View>
              {result && RESULT_TEXT[result] ? (
                <T size={13} color={result === 'unavailable' ? theme.warning : theme.ok} style={styles.result}>
                  {RESULT_TEXT[result]}
                </T>
              ) : null}

              <SectionHeader
                style={styles.section}
                trailing={
                  <Data size={12} color={theme.caution}>
                    {String(flags.all.length).padStart(2, '0')}
                  </Data>
                }
              >
                Flagged
              </SectionHeader>
              <Panel>
                {flags.all.map((flag, i) => {
                  const { title, position } = flagPlace(flag);
                  return (
                    <Row key={flag.key} first={i === 0} onPress={() => router.push(flagRoute(flag) as never)} accessibilityLabel={`Open ${title}`}>
                      <View style={styles.flagTop}>
                        <Label style={styles.grow} numberOfLines={1}>
                          {title} · {position}
                        </Label>
                        <Pressable onPress={() => openFlag(flag)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit flag">
                          <T size={12} weight="700" color={theme.accent}>
                            Edit
                          </T>
                        </Pressable>
                      </View>
                      <T size={14} weight="600" style={styles.flagText}>
                        {flag.text}
                      </T>
                      <FlagNote note={flag.note} />
                    </Row>
                  );
                })}
              </Panel>

              <SectionHeader style={styles.section}>Report</SectionHeader>
              <TextInput
                value={report}
                editable={false}
                multiline
                accessibilityLabel="Flag report"
                // Tall enough for the whole report: a read-only box that scrolls inside the page is easy to miss.
                style={[
                  styles.report,
                  { height: report.split('\n').length * 17 + 2 * SPACE.md + 8 },
                  { color: theme.textDim, borderColor: theme.borderStrong, backgroundColor: theme.surface },
                ]}
              />

              <Button label="Clear all flags" variant="quiet" color={theme.warning} onPress={clearAll} style={styles.clear} />
            </>
          ) : null}
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg },
  hero: { marginBottom: SPACE.lg },
  intro: { marginTop: SPACE.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: SPACE.sm },
  action: { flex: 1 },
  result: { marginTop: SPACE.sm, lineHeight: 18 },
  section: { marginTop: SPACE.xl },
  flagTop: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  flagText: { marginTop: 4, lineHeight: 20 },
  report: {
    minHeight: 160,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.md,
    fontSize: 12,
    lineHeight: 17,
    textAlignVertical: 'top',
  },
  clear: { marginTop: SPACE.xl },
});
