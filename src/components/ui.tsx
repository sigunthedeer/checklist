import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSettings, useTheme } from '@/state/settings';
import { RADIUS, SPACE } from '@/theme';

/** Text that respects the app's own text-scale setting on top of the OS setting. */
export function T({
  children,
  size = 15,
  weight = '400',
  color,
  style,
  numberOfLines,
  mono,
  uppercase,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  mono?: boolean;
  uppercase?: boolean;
}) {
  const theme = useTheme();
  const { settings } = useSettings();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: size * settings.textScale,
          fontWeight: weight,
          color: color ?? theme.text,
          ...(mono
            ? { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) }
            : null),
          ...(uppercase ? { textTransform: 'uppercase' as const } : null),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  onPress,
  accent,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Draws a 4 px colour strip down the leading edge. */
  accent?: string;
}) {
  const theme = useTheme();
  const body = (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      {accent ? <View style={[styles.accentStrip, { backgroundColor: accent }]} /> : null}
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      {body}
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const theme = useTheme();
  const tint = color ?? theme.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? tint : theme.card,
          borderColor: active ? tint : theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <T size={13} weight="600" color={active ? (theme.dark ? '#0A0E14' : '#FFFFFF') : theme.textDim}>
        {label}
      </T>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  const tint = color ?? theme.textFaint;
  return (
    <View style={[styles.badge, { borderColor: tint }]}>
      <T size={10} weight="700" color={tint} style={{ letterSpacing: 0.6 }}>
        {label}
      </T>
    </View>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <T size={15} color={theme.textFaint}>
        {'⌕'}
      </T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textFaint}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[styles.searchInput, { color: theme.text }]}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={12}>
          <T size={16} color={theme.textFaint}>
            {'×'}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  total,
  color,
  height = 4,
}: {
  value: number;
  total: number;
  color?: string;
  height?: number;
}) {
  const theme = useTheme();
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={[styles.track, { backgroundColor: theme.border, height, borderRadius: height }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height: '100%',
          borderRadius: height,
          backgroundColor: color ?? theme.ok,
        }}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  color,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const tint = color ?? theme.accent;
  const filled = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: filled ? tint : variant === 'outline' ? 'transparent' : theme.card,
          borderColor: variant === 'ghost' ? theme.border : tint,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <T
        size={14}
        weight="700"
        color={filled ? (theme.dark ? '#0A0E14' : '#FFFFFF') : variant === 'ghost' ? theme.textDim : tint}
      >
        {label}
      </T>
    </Pressable>
  );
}

/**
 * Themed switch. The platform Switch ignores most colour props on iOS and web,
 * which breaks night mode, so this draws its own track and thumb.
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const slide = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: value ? 1 : 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [value, slide]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.toggleTrack,
        {
          backgroundColor: value ? theme.accent : theme.border,
          borderColor: value ? theme.accent : theme.borderStrong,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: value ? (theme.dark ? theme.bg : '#FFFFFF') : theme.textFaint,
            transform: [{ translateX }],
          },
        ]}
      />
    </Pressable>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <T size={12} weight="700" color={theme.textFaint} style={{ letterSpacing: 1.2 }} uppercase>
        {children}
      </T>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardInner: { flex: 1, padding: SPACE.lg },
  accentStrip: { width: 4 },
  pressed: { opacity: 0.75 },
  chip: {
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm - 1,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm - 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%', paddingVertical: 0 },
  track: { width: '100%', overflow: 'hidden' },
  button: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md - 2,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.pill,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACE.sm,
  },
});
