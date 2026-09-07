import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ChecklistItem } from '@/data/types';
import { useSettings, useTheme } from '@/state/settings';
import { RADIUS, SPACE } from '@/theme';
import { T } from './ui';

/** Long enough to span the widest tablet; clipped by the container. */
const LEADER = '· '.repeat(90);

export const ChecklistRow = memo(function ChecklistRow({
  item,
  index,
  checked,
  onToggle,
  accent,
}: {
  item: ChecklistItem;
  index: number;
  checked: boolean;
  onToggle: () => void;
  accent: string;
}) {
  const theme = useTheme();
  const { settings } = useSettings();
  const scale = settings.textScale;

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${item.c}, ${item.r}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? theme.cardPressed : 'transparent',
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? theme.ok : theme.borderStrong,
            backgroundColor: checked ? theme.ok : 'transparent',
            width: 24 * scale,
            height: 24 * scale,
          },
        ]}
      >
        {checked ? (
          <T size={13} weight="900" color={theme.dark ? '#06080C' : '#FFFFFF'}>
            {'✓'}
          </T>
        ) : (
          <T size={11} weight="700" color={theme.textFaint}>
            {index + 1}
          </T>
        )}
      </View>

      <View style={styles.body}>
        {item.cond ? (
          <T size={11} weight="700" color={theme.caution} style={styles.cond} uppercase>
            {item.cond}
          </T>
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
          <T size={13} color={theme.leader} numberOfLines={1} style={styles.leader}>
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
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.md,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  box: {
    borderRadius: RADIUS.sm - 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'flex-end' },
  challenge: { flexShrink: 1 },
  struck: { textDecorationLine: 'line-through' },
  // flexBasis 0 keeps the dots out of the shrink calculation, so the challenge and
  // response keep their natural width and the leader simply fills whatever is left.
  leader: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 8, marginHorizontal: 4, overflow: 'hidden' },
  response: { flexShrink: 0, maxWidth: '52%', textAlign: 'right' },
  cond: { marginBottom: 2, letterSpacing: 0.5 },
  note: { marginTop: 4 },
  warn: {
    marginTop: 6,
    paddingLeft: SPACE.sm,
    borderLeftWidth: 2,
  },
});
