import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Aircraft, AircraftCategory, ChecklistPhase } from '@/data/types';
import { SIM_LABEL } from '@/data/types';
import { useTheme } from '@/state/settings';
import { accentFor, PHASE_COLOR, PHASE_LABEL, RADIUS, SPACE } from '@/theme';
import { Badge, Card, ProgressBar, T } from './ui';

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
  vintage: '☸',
};

export function engineSummary(a: Aircraft): string {
  const label =
    a.engines.type === 'none'
      ? 'unpowered'
      : `${a.engines.type}${a.engines.count > 1 ? 's' : ''}`;
  return a.engines.type === 'none' ? 'Unpowered' : `${a.engines.count} × ${label}`;
}

export const AircraftCard = memo(function AircraftCard({
  aircraft,
  onPress,
  favorite,
  onToggleFavorite,
  progress,
}: {
  aircraft: Aircraft;
  onPress: () => void;
  favorite: boolean;
  onToggleFavorite: () => void;
  /** Fraction 0-1 of normal-procedure items ticked, or 0 when untouched. */
  progress: number;
}) {
  const theme = useTheme();
  const accent = accentFor(theme, aircraft.accent);

  return (
    <Card onPress={onPress} accent={accent} style={styles.aircraftCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <T size={16} weight="700" numberOfLines={2}>
            {aircraft.name}
          </T>
          <T size={12} color={theme.textDim} numberOfLines={1} style={{ marginTop: 2 }}>
            {aircraft.manufacturer} · {engineSummary(aircraft)}
            {aircraft.icao ? ` · ${aircraft.icao}` : ''}
          </T>
        </View>
        <Pressable
          onPress={onToggleFavorite}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <T size={18} color={favorite ? theme.caution : theme.textFaint}>
            {favorite ? '★' : '☆'}
          </T>
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <T size={13} color={accent}>
          {CATEGORY_GLYPH[aircraft.category]}
        </T>
        {aircraft.sims.map((s) => (
          <Badge key={s} label={SIM_LABEL[s].replace('MSFS ', '')} color={theme.textFaint} />
        ))}
        <Badge label={`${aircraft.phases.length} lists`} color={theme.textFaint} />
        {aircraft.emergency?.length ? (
          <Badge label={`${aircraft.emergency.length} emerg`} color={theme.warning} />
        ) : null}
      </View>

      {progress > 0 ? (
        <View style={styles.progressWrap}>
          <ProgressBar value={progress} total={1} color={theme.ok} />
          <T size={11} color={theme.textFaint} style={{ marginTop: 4 }}>
            {Math.round(progress * 100)}% ticked
          </T>
        </View>
      ) : null}
    </Card>
  );
});

export function PhaseCard({
  phase,
  checked,
  onPress,
  accent,
}: {
  phase: ChecklistPhase;
  checked: number;
  onPress: () => void;
  accent: string;
}) {
  const theme = useTheme();
  const total = phase.items.length;
  const complete = total > 0 && checked >= total;
  const kindColor = theme.monochrome ? theme.accent : PHASE_COLOR[phase.kind];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.phase,
        {
          backgroundColor: pressed ? theme.cardPressed : theme.card,
          borderColor: complete ? theme.ok : theme.border,
        },
      ]}
    >
      <View style={[styles.phaseStrip, { backgroundColor: kindColor }]} />
      <View style={styles.phaseBody}>
        <View style={styles.headerRow}>
          <T size={15} weight="700" numberOfLines={2} style={{ flex: 1 }}>
            {phase.name}
          </T>
          <T size={12} weight="700" color={complete ? theme.ok : theme.textFaint}>
            {complete ? '✓ done' : `${checked}/${total}`}
          </T>
        </View>
        <View style={{ marginTop: SPACE.sm }}>
          <ProgressBar value={checked} total={total} color={complete ? theme.ok : accent} height={3} />
        </View>
        <T size={11} color={theme.textFaint} style={{ marginTop: 6 }} uppercase>
          {PHASE_LABEL[phase.kind]}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aircraftCard: { marginBottom: SPACE.md },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  headerText: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md, flexWrap: 'wrap' },
  progressWrap: { marginTop: SPACE.md },
  phase: {
    flexDirection: 'row',
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: SPACE.sm,
  },
  phaseStrip: { width: 4 },
  phaseBody: { flex: 1, padding: SPACE.md },
});
