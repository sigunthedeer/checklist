import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Screen } from '@/components/layout';
import { Button, T } from '@/components/ui';
import { useTheme } from '@/state/settings';
import { SPACE } from '@/theme';

export default function NotFound() {
  const theme = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.wrap}>
        <T size={18} weight="800">
          Off the airway
        </T>
        <T size={14} color={theme.textDim} style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
          That screen does not exist.
        </T>
        <Button label="Back to fleet" onPress={() => router.replace('/')} style={{ marginTop: SPACE.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
});
