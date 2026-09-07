import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { Button, T } from '@/components/ui';
import { SettingsProvider, useSettings, useTheme } from '@/state/settings';
import { ProgressProvider } from '@/state/progress';
import { SPACE } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ProgressProvider>
            <Shell />
          </ProgressProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const theme = useTheme();
  const { settings, ready, set } = useSettings();

  // Paint the window background so the gap behind the navigator matches the theme.
  React.useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.bg);
  }, [theme.bg]);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bgElevated },
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Checkride' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', presentation: 'modal' }} />
      </Stack>
      {ready && !settings.disclaimerAccepted ? (
        <DisclaimerGate onAccept={() => set('disclaimerAccepted', true)} />
      ) : null}
    </>
  );
}

function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  const theme = useTheme();
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onAccept}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}>
          <T size={20} weight="800">
            Simulator use only
          </T>
          <ScrollView style={styles.sheetScroll}>
            <T size={14} color={theme.textDim} style={styles.para}>
              Checkride is a study and reference aid for flight simulation. The checklists here are
              written for the default aircraft in Microsoft Flight Simulator and are simplified for
              use in the sim.
            </T>
            <T size={14} color={theme.textDim} style={styles.para}>
              They are not approved procedures and must never be used to operate a real aircraft.
              For real flying, use the manufacturer's AFM or POH and your operator's approved
              checklist.
            </T>
            <T size={14} color={theme.textDim} style={styles.para}>
              Speeds and limits shown are typical published figures for the type and can differ from
              your loaded weight, configuration, and the aircraft as modelled in the sim. Cross-check
              anything that matters.
            </T>
            <T size={13} color={theme.textFaint} style={styles.para}>
              This app is not affiliated with, endorsed by, or connected to Microsoft, Asobo Studio,
              or any aircraft manufacturer. Aircraft names are used only to identify the type each
              checklist belongs to.
            </T>
          </ScrollView>
          <Button label="I understand" onPress={onAccept} style={{ marginTop: SPACE.lg }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '86%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.xl,
  },
  sheetScroll: { marginTop: SPACE.md },
  para: { marginBottom: SPACE.md, lineHeight: 20 },
});
