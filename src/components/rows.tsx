import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Aircraft, AircraftCategory, ChecklistPhase } from '@/data/types';
import { useTheme } from '@/state/settings';
import { accentFor, PHASE_COLOR, PHASE_LABEL, SPACE } from '@/theme';
import { Data, Label, Meter, Row, T } from './ui';

const CATEGORY_GLYPH: Record<AircraftCategory, string> = {
  airliner: '✈',
  jet: '✈',
  turboprop: '✦',
  'piston-twin': '✚',
  'piston-single': '✜',
  lightsport: '❖',
  aerobatic: '⟳',
  helicopter: '⊹',
  glider: '◺',
  military: '⬢',
  vintage: '☸',
};

const COUNT_WORD: Record<number, string> = { 1: 'Single', 2: 'Twin', 3: 'Three', 4: 'Four' };

export function engineSummary(a: Aircraft): string {
  if (a.engines.type === 'none') return 'Unpowered';
  const word = COUNT_WORD[a.engines.count];
  if (!word) return `${a.engines.count} × ${a.engines.type}`;
  const plural = a.engines.count > 2 ? `${a.engines.type}s` : a.engines.type;
  return `${word} ${plural}`;
}

export const AircraftRow = memo(function AircraftRow({
  aircraft,
  onPress,
  favorite,
  onToggleFavorite,
  progress,
  first,
}: {
  aircraft: Aircraft;
  onPress: () => void;
  favorite: boolean;
  onToggleFavorite: () => void;
  /** Fraction 0-1 of normal-procedure items ticked. */
  progress: number;
  first?: boolean;
}) {
  const theme = useTheme();
  const started = progress > 0;

  const meta = [
    aircraft.manufacturer,
    engineSummary(aircraft),
    `${aircraft.phases.length} lists`,
    aircraft.emergency?.length ? `${aircraft.emergency.length} emergency` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <Row onPress={onPress} first={first} style={styles.aircraftRow}>
      <View style={styles.glyphGutter}>
        <T size={15} color={started ? theme.accent : theme.textFaint}>
          {CATEGORY_GLYPH[aircraft.category]}
        </T>
      </View>

      <View style={styles.aircraftBody}>
        <View style={styles.aircraftTop}>
          <T size={16} weight="700" numberOfLines={1} style={styles.grow}>
            {aircraft.name}
          </T>
          {aircraft.icao ? (
            <Data size={12} color={theme.textFaint}>
              {aircraft.icao}
            </Data>
          ) : null}
        </View>

        <View style={styles.aircraftMeta}>
          <T size={12} color={theme.textDim} numberOfLines={1} style={styles.grow}>
            {meta}
          </T>
          {started ? (
            <Data size={11} color={theme.ok}>
              {Math.round(progress * 100)}%
            </Data>
          ) : null}
        </View>

        {started ? (
          <View style={styles.aircraftMeter}>
            <Meter value={progress} total={1} color={theme.ok} height={2} />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onToggleFavorite}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
        style={styles.starGutter}
      >
        <T size={15} color={favorite ? theme.caution : theme.textFaint}>
          {favorite ? '★' : '☆'}
        </T>
      </Pressable>
    </Row>
  );
});

export function PhaseRow({
  phase,
  index,
  checked,
  onPress,
  first,
}: {
  phase: ChecklistPhase;
  /** 1-based position in the aircraft's normal procedures. */
  index: number;
  checked: number;
  onPress: () => void;
  first?: boolean;
}) {
  const theme = useTheme();
  const total = phase.items.length;
  const complete = total > 0 && checked >= total;
  const kindColor = accentFor(theme, PHASE_COLOR[phase.kind]);

  return (
    <Row onPress={onPress} first={first} style={styles.phaseRow}>
      <View style={styles.indexGutter}>
        <Data size={12} color={complete ? theme.ok : theme.textFaint} align="left">
          {String(index).padStart(2, '0')}
        </Data>
      </View>

      <View style={styles.phaseBody}>
        <View style={styles.phaseTop}>
          <T size={15} weight="600" numberOfLines={1} style={styles.grow}>
            {phase.name}
          </T>
          <Data size={12} color={complete ? theme.ok : theme.textDim}>
            {complete ? '✓' : `${checked}/${total}`}
          </Data>
        </View>

        <View style={styles.phaseMeta}>
          <View style={[styles.kindDot, { backgroundColor: kindColor }]} />
          <Label color={theme.textFaint}>{PHASE_LABEL[phase.kind]}</Label>
          <View style={styles.phaseMeter}>
            <Meter
              value={checked}
              total={total}
              color={complete ? theme.ok : kindColor}
              height={2}
            />
          </View>
        </View>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  aircraftRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACE.md },
  glyphGutter: { width: 24, paddingTop: 1 },
  starGutter: { width: 26, alignItems: 'flex-end', paddingTop: 1 },
  aircraftBody: { flex: 1 },
  aircraftTop: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm },
  aircraftMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACE.sm,
    marginTop: 3,
  },
  aircraftMeter: { marginTop: SPACE.sm, marginRight: SPACE.sm },
  phaseRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: SPACE.md },
  indexGutter: { width: 26, paddingTop: 2 },
  phaseBody: { flex: 1 },
  phaseTop: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm },
  phaseMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: 5 },
  kindDot: { width: 6, height: 6, borderRadius: 3 },
  phaseMeter: { flex: 1, marginLeft: SPACE.xs },
});
