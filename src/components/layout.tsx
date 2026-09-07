import React from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/state/settings';

/**
 * Breakpoints. Phones are single column, small tablets two, large tablets and
 * landscape iPads get a master/detail split.
 */
export interface Responsive {
  width: number;
  height: number;
  landscape: boolean;
  isTablet: boolean;
  isWide: boolean;
  columns: number;
  /** Content is centred and capped so text lines stay readable on a 13 inch tablet. */
  maxContentWidth: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const isTablet = Math.min(width, height) >= 600;
  const isWide = width >= 900;
  const columns = width >= 1280 ? 3 : width >= 760 ? 2 : 1;
  return {
    width,
    height,
    landscape,
    isTablet,
    isWide,
    columns,
    maxContentWidth: isWide ? 1200 : 760,
  };
}

export function Screen({
  children,
  edges = ['top', 'left', 'right'],
  style,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: theme.bg }, style]}>
      {children}
    </SafeAreaView>
  );
}

/** Centres and width-caps its children so wide tablets do not get 1,300 px text lines. */
export function ContentWidth({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { maxContentWidth } = useResponsive();
  return <View style={[styles.content, { maxWidth: maxContentWidth }, style]}>{children}</View>;
}

export function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', alignSelf: 'center' },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
});
