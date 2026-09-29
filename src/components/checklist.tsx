import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ChecklistItem } from '@/data/types';
import { useSettings, useTheme } from '@/state/settings';
import { RADIUS, SPACE } from '@/theme';
import { Data, Label, T } from './ui';

/** Long enough to span the widest tablet; the container clips the rest. */
const LEADER = '· '.repeat(90);

export const ChecklistRow = memo(function ChecklistRow({
  item,
  index,
  checked,
  onToggle,
  accent,
  first,
  label,
  onGuide,
  onDelete,
}: {
  item: ChecklistItem;
  index: number;
  checked: boolean;
  onToggle: () => void;
  accent: string;
  first?: boolean;
  /** Shown instead of the item number, e.g. a marker for a user's own item. */
  label?: string;
  /** When given, the row links to the FMS procedure that explains the item. */
  onGuide?: () => void;
  /** When given, a delete control appears at the end of the row. */
  onDelete?: () => void;
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
      accessibilityLabel={`${item.c}, ${item.r}`}
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
          {label ?? String(index + 1).padStart(2, '0')}
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
        {item.cond ? (
          <Label color={theme.caution} style={styles.cond}>
            {item.cond}
          </Label>
        ) : null}

        <View style={styles.line}>
          <T
            size={15}
            weight="600"
            color={checked ? theme.textFaint : theme.text}
            style={[styles.challenge, checked && styles.struck]}
          >
            {item.c}
          </T>
          <T size={12} color={theme.leader} numberOfLines={1} style={styles.leader}>
            {LEADER}
          </T>
          <T
            size={15}
            weight="700"
            color={checked ? theme.textFaint : accent}
            style={styles.response}
          >
            {item.r}
          </T>
        </View>

        {item.note ? (
          <T size={12} color={theme.textDim} style={styles.note}>
            {item.note}
          </T>
        ) : null}

        {item.warn ? (
          <View style={[styles.warn, { borderLeftColor: theme.warning }]}>
            <T size={12} weight="600" color={theme.warning}>
              {item.warn}
            </T>
          </View>
        ) : null}

        {onGuide ? (
          <Pressable
            onPress={onGuide}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={`How to: ${item.c}`}
            style={({ pressed }) => [
              styles.guide,
              { borderColor: theme.accentSoft, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Label color={theme.accent}>How to  ›</Label>
          </Pressable>
        ) : null}

        {settings.beginnerMode && (item.where || item.why) ? (
          <View style={[styles.learn, { borderLeftColor: theme.accentSoft }]}>
            {item.where ? (
              <View style={styles.learnLine}>
                <Label color={theme.textFaint}>Where</Label>
                <T size={12} color={theme.textDim} style={styles.learnText}>
                  {item.where}
                </T>
              </View>
            ) : null}
            {item.why ? (
              <View style={[styles.learnLine, item.where ? styles.learnGap : null]}>
                <Label color={theme.textFaint}>Why</Label>
                <T size={12} color={theme.textDim} style={styles.learnText}>
                  {item.why}
                </T>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {onDelete ? (
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.c}`}
          style={styles.delete}
        >
          <T size={15} color={theme.textFaint}>
            {'\u00d7'}
          </T>
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
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
  // Baseline alignment keeps the challenge and the dots on the first line when a
  // long response wraps, the way a printed checklist reads.
  line: { flexDirection: 'row', alignItems: 'baseline' },
  challenge: { flexShrink: 1 },
  struck: { textDecorationLine: 'line-through' },
  // flexBasis 0 keeps the dots out of the shrink calculation, so the challenge and
  // response keep their natural width and the leader simply fills what is left.
  leader: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 8, marginHorizontal: 5, overflow: 'hidden' },
  response: { flexShrink: 0, maxWidth: '52%', textAlign: 'right' },
  cond: { marginBottom: 3 },
  note: { marginTop: 4 },
  warn: { marginTop: 6, paddingLeft: SPACE.sm, borderLeftWidth: 2 },
  guide: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  learn: { marginTop: 8, paddingLeft: SPACE.sm, borderLeftWidth: 2 },
  learnLine: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm },
  learnGap: { marginTop: 3 },
  learnText: { flex: 1, lineHeight: 17 },
  delete: { width: 22, alignItems: 'flex-end', paddingTop: 2 },
});
