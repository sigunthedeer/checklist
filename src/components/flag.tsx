import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFlags, type FlagTarget } from '@/state/flags';
import { useSettings, useTheme } from '@/state/settings';
import { RADIUS, SPACE } from '@/theme';
import { Button, Label, T } from './ui';

/**
 * The "this is wrong in the sim" dialog. Opened from anywhere with
 * `useFlagSheet()(target)`, usually on a long press, so flagging mid-flight
 * is one gesture, an optional note, and Save.
 */
const FlagSheetContext = createContext<((target: FlagTarget) => void) | null>(null);

export function FlagSheetProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { settings } = useSettings();
  const flags = useFlags();
  const [target, setTarget] = useState<FlagTarget | null>(null);
  const [note, setNote] = useState('');

  const open = useCallback(
    (next: FlagTarget) => {
      setNote(flags.flagFor(next)?.note ?? '');
      setTarget(next);
      if (settings.haptics && Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },
    [flags, settings.haptics],
  );

  const existing = target ? flags.flagFor(target) : undefined;
  const close = () => setTarget(null);
  const save = () => {
    if (target) flags.setFlag(target, note);
    close();
  };
  const remove = () => {
    if (existing) flags.removeFlag(existing.key);
    close();
  };

  const value = useMemo(() => open, [open]);
  const what = target?.kind === 'item' ? 'item' : 'step';

  return (
    <FlagSheetContext.Provider value={value}>
      {children}
      <Modal transparent animationType="fade" visible={target !== null} onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
        >
          <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.borderStrong }]}>
            <Label color={theme.caution}>{existing ? 'Flagged' : 'Flag'} · wrong in the sim</Label>
            <T size={16} weight="700" style={styles.text}>
              {target?.text}
            </T>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={`What is different in the sim? For example, "the key is 4R, not 3R".`}
              placeholderTextColor={theme.textFaint}
              multiline
              autoFocus
              accessibilityLabel="What is different in the sim"
              style={[styles.note, { color: theme.text, borderColor: theme.borderStrong, backgroundColor: theme.bg }]}
            />
            <T size={12} color={theme.textFaint} style={styles.hint}>
              A note helps, but you can save without one and keep flying. Flags are listed in Settings, ready to send.
            </T>
            <View style={styles.actions}>
              {existing ? (
                <Button label="Remove flag" variant="quiet" color={theme.warning} onPress={remove} style={styles.action} />
              ) : (
                <Button label="Cancel" variant="quiet" onPress={close} style={styles.action} />
              )}
              <Button label={existing ? `Update ${what}` : `Flag ${what}`} color={theme.caution} onPress={save} style={styles.action} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </FlagSheetContext.Provider>
  );
}

export function useFlagSheet() {
  const ctx = useContext(FlagSheetContext);
  if (!ctx) throw new Error('useFlagSheet must be used inside <FlagSheetProvider>');
  return ctx;
}

/** A flag's note shown under the thing it is about, so you see it next time you get there. */
export function FlagNote({ note }: { note: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.flagNote, { borderLeftColor: theme.caution }]}>
      <T size={12} weight="600" color={theme.caution}>
        {note ? `⚑ ${note}` : '⚑ Flagged as wrong in the sim'}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.xl,
  },
  text: { marginTop: SPACE.sm, lineHeight: 22 },
  note: {
    marginTop: SPACE.lg,
    minHeight: 84,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACE.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  hint: { marginTop: SPACE.sm, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },
  action: { flex: 1 },
  flagNote: { marginTop: 6, paddingLeft: SPACE.sm, borderLeftWidth: 2 },
});
