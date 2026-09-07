import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Text as RNText,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSettings, useTheme } from '@/state/settings';
import { MONO, RADIUS, SPACE, TYPE } from '@/theme';

/* ------------------------------------------------------------------ text */

/** Base text. Applies the app's own scale on top of the OS text-size setting. */
export function T({
  children,
  size = TYPE.body.size,
  weight = TYPE.body.weight,
  color,
  style,
  numberOfLines,
  mono,
  align,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  mono?: boolean;
  align?: TextStyle['textAlign'];
}) {
  const theme = useTheme();
  const { settings } = useSettings();
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: size * settings.textScale,
          fontWeight: weight,
          color: color ?? theme.text,
          textAlign: align,
          ...(mono ? { fontFamily: MONO } : null),
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

/** Small-caps header text. Sits above every value and section in the app. */
export function Label({
  children,
  color,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  return (
    <T
      size={TYPE.label.size}
      weight={TYPE.label.weight}
      color={color ?? theme.textFaint}
      numberOfLines={numberOfLines}
      style={[{ letterSpacing: TYPE.label.letterSpacing, textTransform: 'uppercase' }, style]}
    >
      {children}
    </T>
  );
}

/** Tabular value: type codes, speeds, counts. Always monospaced. */
export function Data({
  children,
  size = TYPE.data.size,
  color,
  align = 'right',
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}) {
  return (
    <T size={size} weight={TYPE.data.weight} color={color} mono align={align} style={style}>
      {children}
    </T>
  );
}

/* --------------------------------------------------------------- surfaces */

/**
 * A bordered panel. Rows go inside it and separate themselves with hairlines,
 * so the panel itself has no padding.
 */
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: theme.surface, borderColor: theme.borderStrong },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A row inside a Panel. `first` drops the top hairline. */
export function Row({
  children,
  onPress,
  first,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  first?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        {
          backgroundColor: pressed ? theme.surfacePress : 'transparent',
          borderTopColor: theme.border,
          borderTopWidth: first ? 0 : StyleSheet.hairlineWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content(false);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

/** Section heading: small-caps label, a rule across the remaining width, and an optional trailing node. */
export function SectionHeader({
  children,
  trailing,
  style,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Label>{children}</Label>
      <View style={[styles.rule, { backgroundColor: theme.border }]} />
      {trailing}
    </View>
  );
}

/** Label above a value. The building block of the EFB data strips. */
export function Stat({
  label,
  value,
  color,
  style,
}: {
  label: string;
  value: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Label numberOfLines={1}>{label}</Label>
      <Data size={15} color={color} align="left" style={{ marginTop: 3 }}>
        {value}
      </Data>
    </View>
  );
}

/* ---------------------------------------------------------------- controls */

/** One connected control, the way an EFB does mode selection. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.segmented, { borderColor: theme.borderStrong, backgroundColor: theme.surface }, style]}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: active ? theme.accent : pressed ? theme.surfacePress : 'transparent',
                borderLeftWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                borderLeftColor: theme.borderStrong,
              },
            ]}
          >
            <T
              size={12}
              weight="700"
              color={active ? (theme.dark ? theme.bg : '#FFFFFF') : theme.textDim}
              numberOfLines={1}
            >
              {option.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Scrollable underlined tabs. Used for categories and for phase navigation. */
export function Tabs<V extends string>({
  options,
  value,
  onChange,
  contentInset = SPACE.lg,
}: {
  options: { value: V; label: string; badge?: string; dot?: string }[];
  value: V;
  onChange: (v: V) => void;
  contentInset?: number;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: contentInset }}
      style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tab,
              {
                borderBottomColor: active ? theme.accent : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {option.dot ? <View style={[styles.tabDot, { backgroundColor: option.dot }]} /> : null}
            <T size={13} weight="700" color={active ? theme.accent : theme.textDim} numberOfLines={1}>
              {option.label}
            </T>
            {option.badge ? (
              <Data size={11} color={active ? theme.accent : theme.textFaint}>
                {option.badge}
              </Data>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
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
    <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
      <T size={14} color={theme.textFaint}>
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
        <Pressable onPress={() => onChangeText('')} hitSlop={12} accessibilityLabel="Clear search">
          <T size={15} color={theme.textFaint}>
            {'×'}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Thin progress bar. Squared off, not rounded. */
export function Meter({
  value,
  total,
  color,
  height = 3,
  track,
}: {
  value: number;
  total: number;
  color?: string;
  height?: number;
  track?: string;
}) {
  const theme = useTheme();
  const fraction = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <View style={{ height, backgroundColor: track ?? theme.border, width: '100%' }}>
      <View style={{ width: `${fraction * 100}%`, height: '100%', backgroundColor: color ?? theme.ok }} />
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
  variant?: 'primary' | 'outline' | 'quiet';
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
          backgroundColor: filled ? tint : variant === 'quiet' ? theme.surface : 'transparent',
          borderColor: variant === 'quiet' ? theme.borderStrong : tint,
          opacity: disabled ? 0.4 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      <T
        size={13}
        weight="700"
        color={filled ? (theme.dark ? theme.bg : '#FFFFFF') : variant === 'quiet' ? theme.textDim : tint}
        numberOfLines={1}
        style={{ letterSpacing: 0.3 }}
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
    Animated.timing(slide, { toValue: value ? 1 : 0, duration: 140, useNativeDriver: true }).start();
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

/** Small outlined tag for sim versions and similar metadata. */
export function Tag({ label, color }: { label: string; color?: string }) {
  const theme = useTheme();
  const tint = color ?? theme.textFaint;
  return (
    <View style={[styles.tag, { borderColor: tint }]}>
      <T size={10} weight="700" color={tint} mono style={{ letterSpacing: 0.4 }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    marginBottom: SPACE.sm,
  },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  segmented: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: SPACE.sm + 1,
    paddingHorizontal: SPACE.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md - 2,
    borderBottomWidth: 2,
  },
  tabDot: { width: 6, height: 6, borderRadius: 3 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 15, height: '100%', paddingVertical: 0 },
  button: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md - 1,
    borderRadius: RADIUS.sm,
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
  toggleThumb: { width: 22, height: 22, borderRadius: RADIUS.pill },
  tag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
