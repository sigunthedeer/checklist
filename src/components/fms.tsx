import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { FmsStep } from '@/data/types';
import { useSettings, useTheme } from '@/state/settings';
import { RADIUS, SPACE } from '@/theme';
import { Data, Label, T } from './ui';

/** A hardware key, drawn as a keycap so it reads as something to press rather than text. */
export function KeyCap({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.cap, { backgroundColor: theme.bg, borderColor: theme.borderStrong }]}>
      <T size={12} weight="700" color={theme.text} mono style={styles.capText}>
        {label}
      </T>
    </View>
  );
}

/** Text to type, drawn like the scratchpad line it lands on. */
export function Entry({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.entry, { backgroundColor: theme.bg, borderColor: theme.accentSoft }]}>
      <T size={13} weight="700" color={theme.accent} mono>
        {text}
      </T>
    </View>
  );
}

/** What the hands do, in order: type the entry, then press each key. */
export function StepSequence({ step }: { step: FmsStep }) {
  const theme = useTheme();
  const keys = step.keys ?? [];
  if (!step.entry && keys.length === 0) return null;
  return (
    <View style={styles.sequence}>
      {step.entry ? <Entry text={step.entry} /> : null}
      {step.entry && keys.length > 0 ? (
        <T size={13} color={theme.textFaint}>
          {'→'}
        </T>
      ) : null}
      {keys.map((key, i) => (
        <KeyCap key={`${key}-${i}`} label={key} />
      ))}
    </View>
  );
}

export const FmsStepRow = memo(function FmsStepRow({
  step,
  index,
  checked,
  onToggle,
  first,
}: {
  step: FmsStep;
  index: number;
  checked: boolean;
  onToggle: () => void;
  first?: boolean;
}) {
  const theme = useTheme();
  const { settings } = useSettings();
  const box = 20 * settings.textScale;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      aria-checked={checked}
      accessibilityLabel={[step.cond, step.do, step.entry && `Type ${step.entry}`, step.keys?.join(', ')]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.surfacePress : 'transparent',
          borderTopColor: theme.border,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.indexGutter}>
        <Data size={11} color={checked ? theme.ok : theme.textFaint} align="left">
          {String(index + 1).padStart(2, '0')}
        </Data>
      </View>

      <View
        style={[
          styles.box,
          {
            width: box,
            height: box,
            borderColor: checked ? theme.ok : theme.borderStrong,
            backgroundColor: checked ? theme.ok : 'transparent',
          },
        ]}
      >
        {checked ? (
          <T size={11 * settings.textScale} weight="900" color={theme.dark ? theme.bg : '#FFFFFF'}>
            {'✓'}
          </T>
        ) : null}
      </View>

      <View style={styles.body}>
        {step.cond ? (
          <Label color={theme.caution} style={styles.cond}>
            {step.cond}
          </Label>
        ) : null}

        <T
          size={15}
          weight="600"
          color={checked ? theme.textFaint : theme.text}
          style={[styles.instruction, checked && styles.struck]}
        >
          {step.do}
        </T>

        <StepSequence step={step} />

        {step.expect ? (
          <View style={styles.expect}>
            <Label color={theme.textFaint}>Expect</Label>
            <T size={12} color={theme.textDim} style={styles.expectText}>
              {step.expect}
            </T>
          </View>
        ) : null}

        {step.note ? (
          <T size={12} color={theme.textDim} style={styles.note}>
            {step.note}
          </T>
        ) : null}

        {step.warn ? (
          <View style={[styles.warn, { borderLeftColor: theme.warning }]}>
            <T size={12} weight="600" color={theme.warning}>
              {step.warn}
            </T>
          </View>
        ) : null}

        {settings.beginnerMode && step.why ? (
          <View style={[styles.learn, { borderLeftColor: theme.accentSoft }]}>
            <Label color={theme.textFaint}>Why</Label>
            <T size={12} color={theme.textDim} style={styles.expectText}>
              {step.why}
            </T>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cap: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    // A heavier bottom edge is what makes it read as a key rather than a tag.
    borderBottomWidth: 2.5,
  },
  capText: { letterSpacing: 0.3 },
  entry: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  sequence: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACE.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md - 2,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
  },
  indexGutter: { width: 18, paddingTop: 3 },
  box: {
    borderRadius: RADIUS.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  body: { flex: 1 },
  cond: { marginBottom: 3 },
  instruction: { lineHeight: 21 },
  struck: { textDecorationLine: 'line-through' },
  expect: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm, marginTop: SPACE.sm },
  expectText: { flex: 1, lineHeight: 17 },
  note: { marginTop: 6, lineHeight: 17 },
  warn: { marginTop: 6, paddingLeft: SPACE.sm, borderLeftWidth: 2 },
  learn: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACE.sm,
    marginTop: 8,
    paddingLeft: SPACE.sm,
    borderLeftWidth: 2,
  },
});
