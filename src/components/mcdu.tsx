import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { McduCell, McduColor, McduLine, McduScreen } from '@/trainer/mcdu';
import { FUNCTION_ROWS, LETTER_ROWS, NUMBER_ROWS } from '@/trainer/keyboard';
import { useTheme } from '@/state/settings';
import { MONO } from '@/theme';

/** The panel is hardware, so it keeps its own colours in every theme except night. */
const HW = {
  bezel: '#23272C',
  key: '#353B42',
  keyPress: '#4A525B',
  keyText: '#E6EAEE',
  keyEdge: '#15181B',
  glass: '#040506',
  screen: {
    white: '#E8ECEF',
    cyan: '#3FCDEF',
    green: '#3DDC84',
    amber: '#F5A623',
    yellow: '#F0DC4A',
  } satisfies Record<McduColor, string>,
};

const COLUMNS = 24;
const MAX_FONT = 15;
/** Row height as a multiple of the font size. */
const ROW = 1.2;
const GUTTER = 36;

function usePalette() {
  const theme = useTheme();
  const night = theme.monochrome;
  return {
    night,
    text: (color: McduColor) => (night ? theme.accent : HW.screen[color]),
    keyText: night ? theme.accent : HW.keyText,
    highlight: theme.accent,
    wrong: theme.warning,
  };
}

/* ----------------------------------------------------------------- screen */

function Cell({ cell, size, align }: { cell?: McduCell; size: number; align: 'left' | 'center' | 'right' }) {
  const palette = usePalette();
  if (!cell || !cell.text) return null;
  const fontSize = cell.small ? size * 0.8 : size;
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.cell,
        align === 'center' && styles.cellCentre,
        { fontSize, lineHeight: size * ROW, color: palette.text(cell.color), textAlign: align },
      ]}
    >
      {cell.text}
    </Text>
  );
}

function TextRow({ left, centre, right, size }: { left?: McduCell; centre?: McduCell; right?: McduCell; size: number }) {
  return (
    <View style={[styles.textRow, { height: size * ROW }]}>
      <Cell cell={centre} size={size} align="center" />
      <Cell cell={left} size={size} align="left" />
      <View style={styles.flex} />
      <Cell cell={right} size={size} align="right" />
    </View>
  );
}

function LineSelectKey({
  id,
  height,
  onPress,
  highlighted,
  flashing,
}: {
  id: string;
  height: number;
  onPress: (key: string) => void;
  highlighted: boolean;
  flashing: boolean;
}) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={() => onPress(id)}
      accessibilityRole="button"
      accessibilityLabel={id}
      hitSlop={4}
      style={({ pressed }) => [
        styles.lsk,
        {
          height: Math.max(20, height * 0.62),
          backgroundColor: pressed ? HW.keyPress : HW.key,
          borderColor: flashing ? palette.wrong : highlighted ? palette.highlight : HW.keyEdge,
          borderWidth: flashing || highlighted ? 2 : 1,
        },
      ]}
    >
      <View style={[styles.lskBar, { backgroundColor: palette.keyText }]} />
    </Pressable>
  );
}

export const McduScreenView = memo(function McduScreenView({
  screen,
  onKey,
  highlight,
  flash,
}: {
  screen: McduScreen;
  onKey: (key: string) => void;
  highlight?: string;
  flash?: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  // 24 monospaced columns across the glass at about 0.6 em each, capped so the
  // whole unit still fits a landscape tablet without scrolling.
  const glassWidth = Math.max(0, width - 2 * GUTTER);
  const size = Math.max(9, Math.min(MAX_FONT, Math.floor(glassWidth / (COLUMNS * 0.62))));
  const lineHeight = size * ROW * 2;

  const side = (line: number, s: 'L' | 'R') => {
    const id = `LSK ${line}${s}`;
    return (
      <View style={styles.lskGutter}>
        <LineSelectKey id={id} height={lineHeight} onPress={onKey} highlighted={highlight === id} flashing={flash === id} />
      </View>
    );
  };

  return (
    <View onLayout={onLayout} style={[styles.screenBlock, { backgroundColor: HW.bezel }]}>
      {width > 0 ? (
        <>
          <View style={styles.lineRow}>
            <View style={styles.lskGutter} />
            <View style={[styles.glass, styles.glassTop]}>
              <TextRow left={screen.titleL} centre={screen.title} right={screen.titleR} size={size} />
            </View>
            <View style={styles.lskGutter} />
          </View>
          {screen.lines.map((line: McduLine, i) => (
            <View key={i} style={styles.lineRow}>
              {side(i + 1, 'L')}
              <View style={styles.glass}>
                <TextRow left={line.labelL} centre={line.labelC} right={line.labelR} size={size} />
                <TextRow left={line.valueL} centre={line.valueC} right={line.valueR} size={size} />
              </View>
              {side(i + 1, 'R')}
            </View>
          ))}
          <View style={styles.lineRow}>
            <View style={styles.lskGutter} />
            <View style={[styles.glass, styles.glassBottom]}>
              <TextRow left={screen.scratchpad} size={size} />
            </View>
            <View style={styles.lskGutter} />
          </View>
        </>
      ) : null}
    </View>
  );
});

/* --------------------------------------------------------------- keyboard */

function Key({
  label,
  onPress,
  highlighted,
  flashing,
  height,
}: {
  label: string;
  onPress: (key: string) => void;
  highlighted: boolean;
  flashing: boolean;
  height: number;
}) {
  const palette = usePalette();
  if (!label) return <View style={[styles.key, styles.keySpacer, { height }]} />;
  // Single characters print large, like the real keycaps; named keys print small, split over two lines.
  const word = label.length > 1 && label !== '+/-';
  return (
    <Pressable
      onPress={() => onPress(label)}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.key,
        {
          height,
          backgroundColor: pressed ? HW.keyPress : HW.key,
          borderColor: flashing ? palette.wrong : highlighted ? palette.highlight : HW.keyEdge,
          borderWidth: flashing || highlighted ? 2 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={2}
        style={[styles.keyText, { color: palette.keyText, fontSize: word ? 9.5 : 15, lineHeight: word ? 11 : 17 }]}
      >
        {word ? label.replace(' ', '\n') : label}
      </Text>
    </Pressable>
  );
}

export const McduKeyboard = memo(function McduKeyboard({
  onKey,
  highlight,
  flash,
}: {
  onKey: (key: string) => void;
  highlight?: string;
  flash?: string;
}) {
  const [width, setWidth] = useState(0);
  const height = Math.max(30, Math.min(36, Math.round(width / 11)));
  const row = (keys: string[], i: number) => (
    <View key={i} style={styles.keyRow}>
      {keys.map((key, j) => (
        <Key
          key={`${key}-${j}`}
          label={key}
          onPress={onKey}
          highlighted={highlight === key}
          flashing={flash === key}
          height={height}
        />
      ))}
    </View>
  );
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[styles.keyboard, { backgroundColor: HW.bezel }]}>
      {FUNCTION_ROWS.map(row)}
      <View style={styles.pads}>
        <View style={[styles.pad, { flex: 3 }]}>{NUMBER_ROWS.map(row)}</View>
        <View style={[styles.pad, { flex: 5 }]}>{LETTER_ROWS.map(row)}</View>
      </View>
    </View>
  );
});

/** Remembers the last wrongly pressed key for a moment, so it can flash red. */
export function useFlash(): [string | undefined, (key: string) => void] {
  const [flash, setFlash] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const trigger = useCallback((key: string) => {
    clearTimeout(timer.current);
    setFlash(key);
    timer.current = setTimeout(() => setFlash(undefined), 450);
  }, []);
  return [flash, trigger];
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenBlock: { borderTopLeftRadius: 10, borderTopRightRadius: 10, paddingTop: 8, paddingBottom: 6 },
  lineRow: { flexDirection: 'row', alignItems: 'stretch' },
  lskGutter: { width: GUTTER, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 1 },
  glass: { flex: 1, backgroundColor: HW.glass, paddingHorizontal: 6 },
  glassTop: { borderTopLeftRadius: 4, borderTopRightRadius: 4, paddingTop: 4 },
  glassBottom: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4, paddingBottom: 4 },
  textRow: { flexDirection: 'row', alignItems: 'center' },
  cell: { fontFamily: MONO, fontWeight: '700', includeFontPadding: false },
  cellCentre: { position: 'absolute', left: 0, right: 0 },
  lsk: { width: 26, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  lskBar: { width: 12, height: 2, borderRadius: 1 },
  keyboard: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 2,
    gap: 5,
  },
  keyRow: { flexDirection: 'row', gap: 5 },
  key: {
    flex: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    paddingHorizontal: 2,
  },
  keySpacer: { backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 0 },
  keyText: { fontWeight: '700', textAlign: 'center', fontFamily: MONO },
  pads: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pad: { gap: 5 },
});
