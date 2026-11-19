import { router, useLocalSearchParams } from 'expo-router';
import { GitCompareArrows, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type FormState, initialState, stateFromEvent, toDraft } from '@/components/activity/formState';
import { BottleForm, DiaperForm, NursingForm, OtherForm, PumpingForm, SleepForm, SolidsForm } from '@/components/activity/forms';
import { ConfirmDialog, useToast } from '@/components/ui/overlays';
import { ActivityBadge, Button, EmptyState, IconButton, Notice } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { ACTIVITY_TYPES, type ActivityType } from '@/domain/activity';
import { useActiveChild, useActiveSleep, useEvent, useEventMutations, useFoodHistory, useLastBottle } from '@/hooks/data';
import { activityLabel, errorMessage } from '@/i18n/he';
import { useServices } from '@/state/services';

const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

export default function ActivityScreen() {
  const params = useLocalSearchParams<{ type: string; id?: string }>();
  const type = (ACTIVITY_TYPES as readonly string[]).includes(params.type) ? (params.type as ActivityType) : null;
  const { child } = useActiveChild();
  const { kv, syncEngine, requestSync } = useServices();
  const toast = useToast((s) => s.show);
  const { create, update, remove } = useEventMutations();

  const activeSleep = useActiveSleep(type === 'sleep' && !params.id ? child?.id : undefined);
  // Opening "sleep" while a timer is running edits that timer instead of starting a second one.
  const editId = params.id ?? (type === 'sleep' ? activeSleep.data?.id : undefined);
  const existing = useEvent(editId);
  const lastBottle = useLastBottle(type === 'bottle' ? child?.id : undefined);
  const foods = useFoodHistory(type === 'solids' ? child?.id : undefined);

  const [state, setState] = useState<FormState | null>(null);
  const [sleepMode, setSleepMode] = useState<'timer' | 'manual'>('timer');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const initialised = useRef(false);
  const nursingKey = child ? `nursing_timer:${child.id}` : null;

  const waiting = !type || !child || (editId ? existing.isLoading : false)
    || (type === 'bottle' && !editId && lastBottle.isLoading) || (type === 'sleep' && !params.id && activeSleep.isLoading);

  useEffect(() => {
    if (initialised.current || waiting || !type) return;
    if (editId) {
      if (existing.data && !existing.data.deletedAt) {
        initialised.current = true;
        setState(stateFromEvent(existing.data));
      }
      return;
    }
    initialised.current = true;
    const fresh = initialState(type, { bottleMl: lastBottle.data?.payload.amountMl, milkType: lastBottle.data?.payload.milkType });
    setState(fresh);
    // A nursing timer that was running when the app closed picks up where it left off.
    if (type === 'nursing' && nursingKey) {
      void kv.get(nursingKey).then((raw) => {
        if (!raw) return;
        try {
          const saved = JSON.parse(raw) as { at: string; leftSec: number; rightSec: number; running: { side: 'left' | 'right'; since: number } | null; lastSide?: 'left' | 'right' };
          setState({ type: 'nursing', at: new Date(saved.at), leftSec: saved.leftSec, rightSec: saved.rightSec, running: saved.running, lastSide: saved.lastSide, notes: '' });
        } catch { /* ignore a corrupt draft */ }
      });
    }
  }, [waiting, type, editId, existing.data, lastBottle.data, kv, nursingKey]);

  if (!type) {
    return <SafeAreaView style={styles.root}><EmptyState icon={X} title="הפעילות לא נמצאה" actionLabel="חזרה" onAction={close} /></SafeAreaView>;
  }
  if (editId && !existing.isLoading && (!existing.data || existing.data.deletedAt)) {
    return <SafeAreaView style={styles.root}><EmptyState icon={X} title="הרשומה לא נמצאה" body="ייתכן שהיא נמחקה." actionLabel="חזרה" onAction={close} /></SafeAreaView>;
  }

  const isEdit = !!editId;
  const isRunningSleep = isEdit && existing.data?.type === 'sleep' && existing.data.endedAt === null;
  const conflict = isEdit && existing.data?.syncStatus === 'conflict';
  const busy = create.isPending || update.isPending || remove.isPending;

  const set = (patch: Partial<FormState>) => {
    setFormError(null);
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as FormState;
      if (next.type === 'nursing' && !isEdit && nursingKey) {
        void kv.set(nursingKey, JSON.stringify({ at: next.at.toISOString(), leftSec: next.leftSec, rightSec: next.rightSec, running: next.running, lastSide: next.lastSide }));
      }
      return next;
    });
  };

  const fail = (err: unknown) => {
    const message = errorMessage(err);
    setFormError(message);
    toast(message, { tone: 'error' });
  };

  const save = (override?: Partial<FormState>) => {
    if (!state || !child) return;
    let current = { ...state, ...override } as FormState;
    if (current.type === 'sleep' && !isEdit) {
      // New sleep: the timer starts now; a retroactive entry needs both ends.
      current = sleepMode === 'timer' ? { ...current, start: new Date(), end: null } : { ...current, end: current.end ?? new Date() };
    }
    const draft = toDraft(current);
    const done = (message: string) => {
      if (current.type === 'nursing' && nursingKey) void kv.remove(nursingKey);
      toast(message);
      close();
    };
    if (isEdit && editId) {
      update.mutate({ id: editId, draft }, { onSuccess: () => done('השינויים נשמרו'), onError: fail });
    } else {
      const startedTimer = current.type === 'sleep' && current.end === null;
      create.mutate({ childId: child.id, draft }, { onSuccess: () => done(startedTimer ? 'השינה התחילה' : `${activityLabel[type]} נשמר`), onError: fail });
    }
  };

  const discard = () => {
    if (state?.type === 'nursing' && !isEdit && nursingKey) void kv.remove(nursingKey);
    close();
  };

  const resolve = async (choice: 'mine' | 'theirs') => {
    if (!syncEngine || !editId) return;
    await syncEngine.resolveConflict('activity_events', editId, choice);
    requestSync();
    toast(choice === 'mine' ? 'נשמרה הגרסה שלך' : 'נשמרה הגרסה מהמכשיר השני');
    close();
  };

  const primaryLabel = type === 'sleep' && !isEdit && sleepMode === 'timer' ? 'התחלת שינה'
    : isRunningSleep && state?.type === 'sleep' && !state.end ? 'סיום שינה עכשיו'
    : isEdit ? 'שמירת שינויים' : 'שמירה';
  const onPrimary = () => (isRunningSleep && state?.type === 'sleep' && !state.end ? save({ end: new Date() }) : save());

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon={X} label="סגירה בלי לשמור" tone="surface" onPress={discard} />
        <View style={styles.headerTitle}>
          <ActivityBadge type={type} size={36} />
          <Text variant="heading" accessibilityRole="header">{isEdit ? `עריכת ${activityLabel[type]}` : activityLabel[type]}</Text>
        </View>
        {isEdit ? <IconButton icon={Trash2} label="מחיקת הרשומה" tone="surface" onPress={() => setConfirmDelete(true)} /> : <View style={{ width: 44 }} />}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!state ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {conflict ? (
              <View style={styles.conflict}>
                <Notice tone="warning" icon={GitCompareArrows} text="הרשומה הזו שונתה גם במכשיר אחר. שום דבר לא נדרס – צריך לבחור איזו גרסה להשאיר." />
                <Button label="להשאיר את הגרסה שמוצגת כאן" size="md" onPress={() => void resolve('mine')} />
                <Button label="לקחת את הגרסה מהמכשיר השני" size="md" variant="secondary" onPress={() => void resolve('theirs')} />
              </View>
            ) : null}
            {state.type === 'bottle' ? <BottleForm state={state} set={set} lastAmount={isEdit ? null : lastBottle.data?.payload.amountMl ?? null} /> : null}
            {state.type === 'nursing' ? <NursingForm state={state} set={set} /> : null}
            {state.type === 'pumping' ? <PumpingForm state={state} set={set} /> : null}
            {state.type === 'sleep' ? <SleepForm state={state} set={set} isRunning={!!isRunningSleep} isNew={!isEdit} mode={sleepMode}
              onMode={(m) => { setSleepMode(m); set(m === 'manual' ? { start: new Date(Date.now() - 60 * 60_000), end: new Date() } : { start: new Date(), end: null }); }} /> : null}
            {state.type === 'diaper' ? <DiaperForm state={state} set={set} /> : null}
            {state.type === 'solids' ? <SolidsForm state={state} set={set} history={foods.data ?? []} /> : null}
            {state.type === 'other' ? <OtherForm state={state} set={set} /> : null}
            {formError ? <Notice tone="danger" text={formError} /> : null}
          </ScrollView>
        )}
        <View style={styles.footer}>
          <Button label={primaryLabel} onPress={onPrimary} loading={busy} disabled={!state || conflict} />
          {isRunningSleep && state?.type === 'sleep' && !state.end ? (
            <Button label="שמירת שינויים בלי לסיים" variant="ghost" size="md" onPress={() => save()} disabled={busy} />
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog visible={confirmDelete} destructive title="למחוק את הרשומה?" body="היא תוסר מהיומן ומכל הסיכומים."
        confirmLabel="מחיקה" loading={remove.isPending} onCancel={() => setConfirmDelete(false)}
        onConfirm={() => editId && remove.mutate(editId, {
          onSuccess: () => { setConfirmDelete(false); toast('הרשומה נמחקה'); close(); },
          onError: (err) => { setConfirmDelete(false); fail(err); },
        })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.xs, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  conflict: { gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
});
