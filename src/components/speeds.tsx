import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Speed } from '@/data/types';
import { useTheme } from '@/state/settings';
import { SPACE } from '@/theme';
import { Data, Label, Panel, Row, T } from './ui';

/**
 * Reference speeds. Used on the aircraft page and again in the sheet the
 * checklist runner opens, so the two can never drift apart.
 */
export function SpeedsTable({ speeds }: { speeds: Speed[] }) {
  const theme = useTheme();
  return (
    <Panel>
      {speeds.map((speed, i) => (
        <Row key={`${speed.label}-${i}`} first={i === 0} style={styles.row}>
          <View style={styles.grow}>
            <T size={14} weight="600">
              {speed.label}
            </T>
            {speed.note ? (
              <T size={11} color={theme.textFaint} style={{ marginTop: 2 }}>
                {speed.note}
              </T>
            ) : null}
          </View>
          <View style={styles.value}>
            <Data size={15} color={theme.accent}>
              {speed.value}
            </Data>
            {speed.unit ? <Label color={theme.textFaint}>{speed.unit}</Label> : null}
          </View>
        </Row>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  grow: { flex: 1 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
});
