import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Entry, KeyCap } from '@/components/fms';
import { ContentWidth, Screen, useResponsive } from '@/components/layout';
import { McduKeyboard, McduScreenView, useFlash } from '@/components/mcdu';
import { Button, Data, Label, Meter, Panel, Row, Segmented, T } from '@/components/ui';
import { useSettings, useTheme } from '@/state/settings';
import { getAvionics } from '@/data';
import { keyFromKeyboard, keysOf } from '@/trainer/screen';
import {
  acknowledge,
  createSession,
  getTrainer,
  litKeys,
  trainerChains,
  currentStep,
  expectedKey,
  press,
  screenOf,
  trainerProcedures,
  type Session,
} from '@/trainer/session';
import { SPACE } from '@/theme';

type Mode = 'guided' | 'test';

const MODES: { value: Mode; label: string }[] = [
  { value: 'guided', label: 'Guided' },
  { value: 'test', label: 'Test yourself' },
];

/** Wrong presses on one action before test mode shows the key. */
const HINT_AFTER = 2;

export default function TrainerRunScreen() {
  const { unit: unitId, run } = useLocalSearchParams<{ unit: string; run: string }>();
  const theme = useTheme();
  const { settings } = useSettings();
  const { isWide } = useResponsive();

  const trainer = getTrainer(unitId);
  const unit = getAvionics(unitId);
  const plan = useMemo(() => {
    const chain = trainerChains(unitId ?? '').find((c) => c.id === run);
    if (chain) return { name: chain.name, procedures: chain.procedures };
    const procedure = trainerProcedures(unitId ?? '').find((p) => p.id === run);
    return procedure ? { name: procedure.name, procedures: [procedure.id] } : undefined;
  }, [unitId, run]);

  const [session, setSession] = useState<Session | undefined>(() =>
    plan ? createSession(unitId!, plan.procedures) : undefined,
  );
  const [mode, setMode] = useState<Mode>('guided');
  const [flash, triggerFlash] = useFlash();


  // Presses are worked out against a ref rather than inside a state updater, so the
  // wrong-key flash is not a side effect of rendering and fast taps never see stale state.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const update = useCallback((next: Session | undefined) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const onKey = useCallback(
    (key: string) => {
      const current = sessionRef.current;
      if (!current) return;
      const next = press(current, key);
      update(next);
      if (next.mistakes > current.mistakes) triggerFlash(key);
      if (settings.haptics && Platform.OS !== 'web') {
        void (next.mistakes > current.mistakes
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          : Haptics.selectionAsync());
      }
    },
    [settings.haptics, triggerFlash, update],
  );

  // A different run in the same screen instance starts afresh.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    update(plan ? createSession(unitId!, plan.procedures) : undefined);
  }, [plan, unitId, update]);

  // A hardware keyboard types into the scratchpad on the web and on tablets with one attached.
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;
  const keysRef = useRef<Set<string>>(new Set());
  keysRef.current = trainer ? keysOf(trainer.keyboard) : new Set();
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = keyFromKeyboard(e.key);
      // Arrow keys mean nothing on a Boeing CDU, and so on: only keys this unit has.
      if (!key || !keysRef.current.has(key)) return;
      e.preventDefault();
      onKeyRef.current(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!plan || !session || !trainer || !unit) {
    return (
      <Screen>
        <View style={styles.missing}>
          <Label>Not found</Label>
          <T size={15} color={theme.textDim} style={{ marginTop: SPACE.sm }}>
            No trainer run with that id.
          </T>
          <Button label="FMS guides" onPress={() => router.replace('/fms')} style={{ marginTop: SPACE.lg }} />
        </View>
      </Screen>
    );
  }

  const screen = screenOf(session);
  const step = currentStep(session);
  const expected = expectedKey(session);
  const showKeys = mode === 'guided' || session.missesHere >= HINT_AFTER;
  const highlight = !session.finished && showKeys ? expected : undefined;
  const runIndex = session.procIndex;
  const current = session.runs[runIndex];
  const totalSteps = session.runs.reduce((n, r) => n + r.steps.length, 0);
  const stepsDone =
    session.runs.slice(0, runIndex).reduce((n, r) => n + r.steps.length, 0) + (session.finished ? current.steps.length : session.stepIndex);

  const restart = () => update(createSession(unitId!, plan.procedures));

  const all = trainerProcedures(unitId!);
  const nextProcedure = plan.procedures.length === 1 ? all[all.findIndex((p) => p.id === plan.procedures[0]) + 1] : undefined;

  const card = session.finished ? (
    <Panel style={styles.card}>
      <View style={styles.cardBody}>
        <Label color={theme.ok}>Complete</Label>
        <T size={20} weight="700" style={styles.cardTitle}>
          {plan.name}
        </T>
        <T size={14} color={theme.textDim} style={styles.cardText}>
          {session.mistakes === 0
            ? 'No wrong presses. Try it in Test yourself mode, where the keys are hidden.'
            : `${session.mistakes} wrong ${session.mistakes === 1 ? 'press' : 'presses'}. Run it again until it is clean.`}
        </T>
        <View style={styles.cardActions}>
          <Button label="Again" variant="quiet" onPress={restart} style={styles.flex} />
          {nextProcedure ? (
            <Button
              label={`${nextProcedure.name}  ›`}
              onPress={() => router.replace(`/trainer/${unitId}/${nextProcedure.id}`)}
              style={styles.flex}
            />
          ) : (
            <Button label="All runs" onPress={() => router.back()} style={styles.flex} />
          )}
        </View>
      </View>
    </Panel>
  ) : step ? (
    <Panel style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.cardHead}>
          <Label numberOfLines={1} style={styles.flex}>
            {plan.procedures.length > 1 ? `${current.procedure.name}  ·  ` : ''}Step {session.stepIndex + 1} of{' '}
            {current.steps.length}
          </Label>
          <Data size={12} color={session.mistakes ? theme.warning : theme.textFaint}>
            {session.mistakes ? `${session.mistakes} ✕` : ''}
          </Data>
        </View>

        {step.guide.cond ? (
          <Label color={theme.caution} style={styles.cond}>
            {step.guide.cond}
          </Label>
        ) : null}
        <T size={16} weight="600" style={styles.instruction}>
          {step.guide.do}
        </T>

        {step.ack ? (
          <>
            <T size={14} color={theme.textDim} style={styles.cardText}>
              {step.ack}
            </T>
            <Button label="Continue" onPress={() => update(acknowledge(session))} style={styles.continue} />
          </>
        ) : step.actions.length === 0 ? (
          <>
            {step.guide.expect ? (
              <T size={14} color={theme.textDim} style={styles.cardText}>
                {step.guide.expect}
              </T>
            ) : null}
            <Button label="Continue" onPress={() => update(acknowledge(session))} style={styles.continue} />
          </>
        ) : (
          <View style={styles.sequence}>
            {step.guide.entry ? <Entry text={step.guide.entry} /> : null}
            {showKeys
              ? step.actions.map((action, i) => {
                  const done = i < session.actionIndex;
                  const label =
                    'key' in action ? action.key : i === session.actionIndex && expected ? expected : `Key beside ${action.beside}`;
                  return (
                    <View key={i} style={[styles.sequenceItem, done && styles.done]}>
                      {i > 0 || step.guide.entry ? (
                        <T size={13} color={theme.textFaint}>
                          {'→'}
                        </T>
                      ) : null}
                      <KeyCap label={label} />
                    </View>
                  );
                })
              : null}
          </View>
        )}

        {session.feedback ? (
          <T
            size={13}
            weight="600"
            color={session.feedback.kind === 'error' ? theme.warning : theme.textDim}
            style={styles.feedback}
          >
            {session.feedback.text}
            {mode === 'test' && session.feedback.kind === 'error' && session.missesHere >= HINT_AFTER && expected
              ? ` Hint: ${expected}.`
              : ''}
          </T>
        ) : null}
      </View>
    </Panel>
  ) : null;

  const steps = (
    <Panel>
      {current.steps.map((s, i) => {
        const done = session.finished || i < session.stepIndex;
        const now = !session.finished && i === session.stepIndex;
        return (
          <Row key={i} first={i === 0} style={styles.stepRow}>
            <Data size={11} color={done ? theme.ok : now ? theme.accent : theme.textFaint} align="left" style={styles.stepIndex}>
              {done ? '✓' : String(i + 1).padStart(2, '0')}
            </Data>
            <T size={13} color={now ? theme.text : theme.textDim} weight={now ? '600' : '400'} style={styles.flex}>
              {s.guide.do}
            </T>
          </Row>
        );
      })}
    </Panel>
  );

  const mcdu = (
    <View style={styles.mcdu}>
      <McduScreenView screen={screen} onKey={onKey} highlight={highlight} flash={flash} />
      <McduKeyboard layout={trainer.keyboard} onKey={onKey} highlight={highlight} flash={flash} lit={litKeys(session)} />
    </View>
  );

  const controls = (
    <View style={styles.top}>
      <Segmented options={MODES} value={mode} onChange={setMode} />
      <View style={styles.progress}>
        <View style={styles.flex}>
          <Meter value={stepsDone} total={totalSteps} color={session.finished ? theme.ok : theme.accent} height={3} />
        </View>
        <Data size={12} color={theme.textFaint}>
          {stepsDone}/{totalSteps}
        </Data>
      </View>
    </View>
  );

  const footer = (
    <T size={11} color={theme.textFaint} style={styles.footer}>
      Training data only. The route, procedures and several waypoints are made up, and only the pages these
      procedures use are simulated.
    </T>
  );

  if (isWide) {
    // Controls and instructions on the left, so the MCDU gets the full height on the right.
    return (
      <Screen>
        <Stack.Screen options={{ title: `${unit.short.toUpperCase()} TRAINER` }} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ContentWidth style={styles.body}>
            <View style={styles.twoPane}>
              <View style={styles.flex}>
                {controls}
                {card}
                <View style={styles.stepList}>{steps}</View>
                {footer}
              </View>
              <View style={styles.mcduPane}>{mcdu}</View>
            </View>
          </ContentWidth>
        </ScrollView>
      </Screen>
    );
  }

  // On a phone the MCDU is taller than the screen, so the instruction card sticks to
  // the top while the keyboard scrolls beneath it.
  return (
    <Screen>
      <Stack.Screen options={{ title: `${unit.short.toUpperCase()} TRAINER` }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" stickyHeaderIndices={[1]}>
        <ContentWidth style={styles.body}>{controls}</ContentWidth>
        <View style={[styles.sticky, { backgroundColor: theme.bg }]}>
          <ContentWidth style={styles.stickyInner}>{card}</ContentWidth>
        </View>
        <ContentWidth style={styles.phoneBody}>
          {mcdu}
          {footer}
        </ContentWidth>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACE.xxl },
  body: { paddingHorizontal: SPACE.lg, paddingTop: SPACE.md },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.xl },
  top: { gap: SPACE.sm, marginBottom: SPACE.md },
  sticky: { paddingTop: SPACE.xs },
  stickyInner: { paddingHorizontal: SPACE.lg },
  phoneBody: { paddingHorizontal: SPACE.lg },
  progress: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  card: { marginBottom: SPACE.sm },
  cardBody: { padding: SPACE.md + 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  cardTitle: { marginTop: SPACE.xs },
  cardText: { marginTop: SPACE.sm, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.lg },
  cond: { marginTop: SPACE.sm },
  instruction: { marginTop: SPACE.xs + 2, lineHeight: 22 },
  continue: { marginTop: SPACE.md },
  sequence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: SPACE.sm },
  sequenceItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  done: { opacity: 0.35 },
  feedback: { marginTop: SPACE.sm, lineHeight: 18 },
  mcdu: { marginBottom: SPACE.md },
  twoPane: { flexDirection: 'row', gap: SPACE.xl, alignItems: 'flex-start' },
  mcduPane: { width: 460 },
  stepList: { marginBottom: SPACE.md },
  stepRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm, paddingVertical: SPACE.sm },
  stepIndex: { width: 22 },
  footer: { textAlign: 'center', marginTop: SPACE.sm, lineHeight: 16 },
});
