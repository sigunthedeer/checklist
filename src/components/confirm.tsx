import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useTheme } from '@/state/settings';
import { RADIUS, SPACE } from '@/theme';
import { Button, Label, T } from './ui';

/**
 * Confirmation dialog.
 *
 * React Native's Alert is a no-op on react-native-web, so every confirm built on
 * it silently did nothing in the browser. This draws its own, which works on
 * every platform and matches the rest of the app rather than looking like an OS
 * dialog dropped into an EFB.
 */
export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tints the confirm control as a warning, for anything that discards data. */
  destructive?: boolean;
}

type PendingRequest = Required<Omit<ConfirmOptions, 'message' | 'destructive'>> &
  Pick<ConfirmOptions, 'message' | 'destructive'> & { resolve: (confirmed: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [request, setRequest] = useState<PendingRequest | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          ...options,
          resolve,
        });
      }),
    [],
  );

  const settle = useCallback(
    (confirmed: boolean) => {
      setRequest((current) => {
        current?.resolve(confirmed);
        return null;
      });
    },
    [],
  );

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={request !== null}
        onRequestClose={() => settle(false)}
      >
        <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            <Label color={request?.destructive ? theme.warning : theme.textFaint}>
              {request?.destructive ? 'Confirm' : 'Check'}
            </Label>
            <T size={18} weight="700" style={{ marginTop: SPACE.sm }}>
              {request?.title}
            </T>
            {request?.message ? (
              <T size={14} color={theme.textDim} style={styles.message}>
                {request.message}
              </T>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={request?.cancelLabel ?? 'Cancel'}
                variant="quiet"
                onPress={() => settle(false)}
                style={styles.action}
              />
              <Button
                label={request?.confirmLabel ?? 'Confirm'}
                color={request?.destructive ? theme.warning : theme.accent}
                onPress={() => settle(true)}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  sheet: {
    width: '100%',
    maxWidth: 440,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.xl,
  },
  message: { marginTop: SPACE.sm, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xl },
  action: { flex: 1 },
});
