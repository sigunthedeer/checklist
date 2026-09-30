import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GarminRow, GarminScreen, KeyboardLayout, McduCell } from '@/trainer/screen';
import { MONO } from '@/theme';
import { HW, usePalette } from './mcdu';

/* ---------------------------------------------------------------- display */

function CellText({ cell, size }: { cell?: McduCell; size: number }) {
  const palette = usePalette();
  if (!cell || !cell.text) return null;
  const colour = palette.text(cell.color);
  return (
    <Text
      numberOfLines={1}
      style={[
        styles.mono,
        { fontSize: cell.small ? size * 0.82 : size, color: cell.cursor ? HW.glass : colour },
        // The G1000 shows the field under the cursor in reverse video.
        cell.cursor && { backgroundColor: palette.night ? palette.highlight : HW.screen.cyan },
      ]}
    >
      {cell.text}
    </Text>
  );
}

function Row({ row, size }: { row: GarminRow; size: number }) {
  if (row.cells) {
    return (
      <View style={[styles.row, { height: size * 1.45 }]}>
        {row.cells.map((c, i) => (
          <CellText key={i} cell={c} size={size} />
        ))}
      </View>
    );
  }
  return (
    <View style={[styles.row, { height: size * (row.header ? 1.25 : 1.45) }, row.header && styles.header]}>
      <CellText cell={row.left} size={size} />
      <View style={styles.flex} />
      <CellText cell={row.centre} size={size} />
      <CellText cell={row.right} size={size} />
    </View>
  );
}

function Pfd({ pfd }: { pfd: GarminScreen['pfd'] }) {
  const palette = usePalette();
  const c = (colour: keyof typeof HW.screen) => ({ color: palette.text(colour) });
  return (
    <View style={[styles.pfd, { backgroundColor: HW.glass }]}>
      <View style={styles.pfdCell}>
        <Text style={[styles.mono, styles.tiny, c('white')]}>NAV1</Text>
        <Text style={[styles.mono, styles.small, c('green')]}>
          {pfd.nav1Active}
          <Text style={c('white')}>{`  ⇆ ${pfd.nav1Standby}`}</Text>
        </Text>
      </View>
      <View style={[styles.pfdCell, styles.modes]}>
        <Text style={[styles.mono, styles.small, c('green')]}>{pfd.lateral}</Text>
        <Text style={[styles.mono, styles.small, c('white')]}>{pfd.armed || ' '}</Text>
        <Text style={[styles.mono, styles.small, c('green')]}>{pfd.vertical}</Text>
      </View>
      <View style={[styles.pfdCell, styles.cdi]}>
        <Text style={[styles.mono, styles.tiny, c('white')]}>CDI</Text>
        <Text style={[styles.mono, styles.small, c(pfd.cdi === 'GPS' ? 'magenta' : 'green')]}>{pfd.cdi}</Text>
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- controls */

function Key({
  id,
  label,
  onKey,
  highlight,
  flash,
  round,
  height = 34,
}: {
  id: string;
  label: string;
  onKey: (key: string) => void;
  highlight?: string;
  flash?: string;
  round?: boolean;
  height?: number;
}) {
  const palette = usePalette();
  const on = highlight === id;
  const wrong = flash === id;
  return (
    <Pressable
      onPress={() => onKey(id)}
      accessibilityRole="button"
      accessibilityLabel={id}
      style={({ pressed }) => [
        styles.key,
        // Only the keys in a row stretch. On the web `flex: 1` means a zero flex-basis, which
        // would beat a round key's fixed width and squash it to a sliver.
        round ? styles.round : styles.grow,
        {
          height,
          width: round ? height : undefined,
          backgroundColor: pressed ? HW.keyPress : HW.key,
          borderColor: wrong ? palette.wrong : on ? palette.highlight : HW.keyEdge,
          borderWidth: wrong || on ? 2 : 1,
        },
      ]}
    >
      {/* Single characters print large, like keycaps; named keys all print at one smaller size. */}
      <Text numberOfLines={2} style={[styles.keyText, { color: palette.keyText, fontSize: label.length === 1 ? 15 : 10.5 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The dual concentric FMS knob, drawn as its four turns and the push in the middle. */
function Knob({ onKey, highlight, flash }: { onKey: (key: string) => void; highlight?: string; flash?: string }) {
  const palette = usePalette();
  const props = { onKey, highlight, flash, round: true, height: 40 };
  return (
    <View style={styles.knob}>
      <View style={styles.knobRow}>
        <Key id="FMS outer ↺" label="↺" {...props} />
        <Text style={[styles.knobLabel, { color: palette.keyText }]}>OUTER</Text>
        <Key id="FMS outer" label="↻" {...props} />
      </View>
      <View style={styles.knobRow}>
        <Key id="FMS inner ↺" label="↺" {...props} />
        <Key id="PUSH CRSR" label="PUSH CRSR" {...props} height={48} />
        <Key id="FMS inner" label="↻" {...props} />
      </View>
      <Text style={[styles.knobLabel, { color: palette.keyText }]}>INNER · FMS</Text>
    </View>
  );
}

export const GarminPanel = memo(function GarminPanel({
  screen,
  layout,
  onKey,
  highlight,
  flash,
}: {
  screen: GarminScreen;
  layout: KeyboardLayout;
  onKey: (key: string) => void;
  highlight?: string;
  flash?: string;
}) {
  const palette = usePalette();
  const [autopilot, hard, , softkeys] = layout.functionRows;
  const size = 13;
  const keyProps = { onKey, highlight, flash };
  return (
    <View style={[styles.bezel, { backgroundColor: HW.bezel }]}>
      <Pfd pfd={screen.pfd} />

      <View style={[styles.mfd, { backgroundColor: HW.glass }]}>
        <Text style={[styles.mono, styles.title, { color: palette.text('white') }]} numberOfLines={1}>
          {screen.mfd.title}
        </Text>
        <View style={styles.content}>
          {screen.mfd.rows.map((row, i) => (
            <Row key={i} row={row} size={size} />
          ))}
          {screen.mfd.window ? (
            <View style={[styles.window, { backgroundColor: HW.glass, borderColor: palette.text('cyan') }]}>
              <Text style={[styles.mono, styles.windowTitle, { color: palette.text('cyan') }]}>{screen.mfd.window.title}</Text>
              {screen.mfd.window.rows.map((row, i) => (
                <Row key={i} row={row} size={size} />
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.keyRow}>
        {softkeys.map((key) => (
          <Key key={key} id={key} label={key} {...keyProps} height={28} />
        ))}
      </View>

      <View style={styles.keyRow}>
        {hard.map((key) => (
          <Key key={key} id={key} label={key} {...keyProps} />
        ))}
      </View>

      <View style={styles.controls}>
        <View style={styles.autopilot}>
          {[0, 3, 6].map((start) => (
            <View key={start} style={styles.keyRow}>
              {autopilot.slice(start, start + 3).map((key) => (
                <Key key={key} id={key} label={key} {...keyProps} />
              ))}
            </View>
          ))}
        </View>
        <Knob {...keyProps} />
      </View>

      <Text style={[styles.shortcutLabel, { color: palette.keyText }]}>
        SPELLING SHORTCUT · stands in for turning the inner knob to each letter
      </Text>
      {[...layout.numberRows, ...layout.letterRows].map((row, i) => (
        <View key={i} style={styles.keyRow}>
          {row.map((key) => (
            <Key key={key} id={key} label={key} {...keyProps} height={30} />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bezel: { borderRadius: 10, padding: 8, gap: 6 },
  mono: { fontFamily: MONO, fontWeight: '700', includeFontPadding: false },
  tiny: { fontSize: 9 },
  small: { fontSize: 12 },
  pfd: { flexDirection: 'row', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5, gap: 10 },
  pfdCell: { justifyContent: 'center' },
  modes: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  cdi: { alignItems: 'flex-end' },
  mfd: { borderRadius: 4, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 6 },
  title: { fontSize: 11, textAlign: 'center', marginBottom: 4 },
  content: { minHeight: 9 * 13 * 1.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  header: { opacity: 0.75 },
  window: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '72%',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  windowTitle: { fontSize: 10, textAlign: 'center', marginBottom: 4 },
  keyRow: { flexDirection: 'row', gap: 5 },
  key: {
    borderRadius: 4,
    borderBottomWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  grow: { flex: 1 },
  round: { flexGrow: 0, flexShrink: 0, borderRadius: 999 },
  keyText: { fontFamily: MONO, fontWeight: '700', textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  autopilot: { flex: 1, gap: 5 },
  knob: { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  knobRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  knobLabel: { fontFamily: MONO, fontSize: 9, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  shortcutLabel: { fontFamily: MONO, fontSize: 9, fontWeight: '700', marginTop: 4, opacity: 0.8 },
});
