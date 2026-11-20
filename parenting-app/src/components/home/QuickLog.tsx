import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { Stepper } from '@/components/ui/inputs';
import { Sheet, useToast } from '@/components/ui/overlays';
import { Button, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing } from '@/design/tokens';
import { type ActivityDraft, type EventOf, LIMITS } from '@/domain/activity';
import type { Routine } from '@/domain/routine';
import { useEventMutations } from '@/hooks/data';
import { diaperKindLabel, errorMessage, milkTypeLabel } from '@/i18n/he';
import { formatDuration, formatTime, ltr } from '@/lib/time';

export type QuickKind = 'feed' | 'sleep' | 'diaper';

const AGO = [0, 5, 10, 15, 30, 45, 60] as const;
const agoLabel = (m: number) => (m === 0 ? 'עכשיו' : m === 60 ? 'לפני שעה' : `לפני ${m} ד׳`);

/** "When did it happen": now, or a few minutes ago. Anything else goes through the full form. */
function When({ value, onChange, tone, notBefore }: { value: number; onChange: (m: number) => void; tone: { bg: string; ink: string }; notBefore?: number }) {
  const now = Date.now();
  const options = AGO.filter((m) => notBefore === undefined || now - m * 60_000 > notBefore);
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((m) => {
        const selected = m === value;
        return (
          <Pressable key={m} onPress={() => onChange(m)} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={agoLabel(m)}
            style={[styles.chip, selected && { backgroundColor: tone.bg, borderColor: tone.ink }]}>
            <Text variant="label" color={selected ? tone.ink : colors.textSecondary} style={selected ? { fontWeight: '700' } : null}>{agoLabel(m)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Logging without leaving the home screen: the family's usual choice is already selected, the
 * time can be moved a few minutes back, and the save button spells out what will be saved.
 */
export function QuickLog({ kind, onClose, childId, routine, activeSleep }: {
  kind: QuickKind | null; onClose: () => void; childId: string; routine: Routine; activeSleep: EventOf<'sleep'> | null;
}) {
  const toast = useToast((s) => s.show);
  const { create, update, remove } = useEventMutations();
  const [ago, setAgo] = useState(0);
  const [feedKind, setFeedKind] = useState<'bottle' | 'nursing'>('bottle');
  const [amount, setAmount] = useState(120);
  const [milk, setMilk] = useState<'formula' | 'breast_milk'>('formula');

  // Each time the sheet opens it starts from the family's usual choices.
  useEffect(() => {
    if (!kind) return;
    setAgo(0);
    setFeedKind(routine.feed.usual ?? 'bottle');
    if (routine.feed.bottleMl) setAmount(routine.feed.bottleMl);
    if (routine.feed.milkType) setMilk(routine.feed.milkType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const at = new Date(Date.now() - ago * 60_000);
  const iso = at.toISOString();
  const timeText = ago === 0 ? 'עכשיו' : ltr(formatTime(at));
  const fail = (err: unknown) => toast(errorMessage(err), { tone: 'error' });
  const save = (draft: ActivityDraft, message: string) => {
    create.mutate({ childId, draft }, {
      onSuccess: (event) => { onClose(); toast(message, { actionLabel: 'ביטול', onAction: () => remove.mutate(event.id) }); },
      onError: fail,
    });
  };
  const toForm = (type: 'bottle' | 'nursing' | 'sleep' | 'diaper') => { onClose(); openActivityForm(type); };
  const more = (label: string, type: Parameters<typeof toForm>[0]) => (
    <Pressable onPress={() => toForm(type)} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={styles.more}>
      <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );

  const title = kind === 'feed' ? 'תיעוד האכלה' : kind === 'diaper' ? 'תיעוד חיתול' : activeSleep ? 'סיום שינה' : 'תיעוד שינה';
  const tone = activityTones[kind === 'feed' ? 'bottle' : kind === 'diaper' ? 'diaper' : 'sleep'];

  return (
    <Sheet visible={kind !== null} onClose={onClose} title={title}>
      {kind === 'feed' ? (
        <>
          <Segmented options={[{ value: 'bottle', label: 'בקבוק' }, { value: 'nursing', label: 'הנקה' }]} value={feedKind} onChange={setFeedKind} />
          {feedKind === 'bottle' ? (
            <>
              <View style={{ gap: spacing.sm }}>
                <Text variant="label" color={colors.textSecondary}>כמה?</Text>
                {routine.feed.bottleAmounts.length > 0 ? (
                  <View style={styles.chips}>
                    {routine.feed.bottleAmounts.map((ml) => {
                      const selected = ml === amount;
                      return (
                        <Pressable key={ml} onPress={() => setAmount(ml)} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${ml} מ״ל`}
                          style={[styles.amount, selected && { backgroundColor: tone.bg, borderColor: tone.ink }]}>
                          <Text variant="heading" color={selected ? tone.ink : colors.textPrimary}>{ml}</Text>
                          <Text variant="caption" color={selected ? tone.ink : colors.textSecondary}>מ״ל</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <Stepper label="כמות" unit="מ״ל" value={amount} onChange={setAmount} step={10} min={10} max={LIMITS.bottleMaxMl} large />
                {routine.feed.bottleAmounts.length > 0 ? <Text variant="caption" color={colors.textSecondary}>הכמויות למעלה הן אלה שתיעדתם הכי הרבה.</Text> : null}
              </View>
              <Segmented options={[{ value: 'formula', label: milkTypeLabel.formula }, { value: 'breast_milk', label: milkTypeLabel.breast_milk }]} value={milk} onChange={setMilk} />
              <View style={{ gap: spacing.sm }}>
                <Text variant="label" color={colors.textSecondary}>מתי?</Text>
                <When value={ago} onChange={setAgo} tone={tone} />
              </View>
              <Button label={`שמירה: בקבוק ${amount} מ״ל · ${timeText}`} loading={create.isPending}
                onPress={() => save({ type: 'bottle', occurredAt: iso, payload: { milkType: milk, amountMl: amount } }, `בקבוק ${amount} מ״ל (${milkTypeLabel[milk]}) נשמר`)} />
              {more('שעה אחרת או הערה', 'bottle')}
            </>
          ) : (
            <>
              <Text color={colors.textSecondary}>בהנקה מודדים זמן לכל צד. הטיימר נפתח במסך מלא, ואפשר גם להזין משך בדיעבד.</Text>
              <Button label="פתיחת טיימר הנקה" onPress={() => toForm('nursing')} />
            </>
          )}
        </>
      ) : null}

      {kind === 'diaper' ? (
        <>
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.textSecondary}>מתי?</Text>
            <When value={ago} onChange={setAgo} tone={tone} />
          </View>
          <View style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.textSecondary}>מה היה בחיתול? לחיצה שומרת.</Text>
            <View style={styles.tiles}>
              {(['wet', 'dirty', 'both'] as const).map((k) => (
                <Pressable key={k} accessibilityRole="button" accessibilityLabel={`חיתול ${diaperKindLabel[k]}`} disabled={create.isPending}
                  onPress={() => save({ type: 'diaper', occurredAt: iso, payload: { kind: k } }, `חיתול ${diaperKindLabel[k]} נשמר`)}
                  style={({ pressed }) => [styles.tile, { backgroundColor: tone.ink }, pressed && { opacity: 0.8 }]}>
                  <Text variant="heading" color={colors.white} center>{diaperKindLabel[k]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {more('הוספת צבע, מרקם או הערה', 'diaper')}
        </>
      ) : null}

      {kind === 'sleep' ? (
        activeSleep ? (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" color={colors.textSecondary}>מתי השינה נגמרה?</Text>
              <When value={ago} onChange={setAgo} tone={tone} notBefore={Date.parse(activeSleep.startedAt ?? activeSleep.occurredAt)} />
            </View>
            <Button loading={update.isPending}
              label={`סיום שינה · ${formatDuration((at.getTime() - Date.parse(activeSleep.startedAt ?? activeSleep.occurredAt)) / 60_000)}`}
              onPress={() => update.mutate({ id: activeSleep.id, draft: { type: 'sleep', occurredAt: activeSleep.occurredAt, startedAt: activeSleep.startedAt ?? activeSleep.occurredAt, endedAt: iso, notes: activeSleep.notes, payload: {} } },
                { onSuccess: () => { onClose(); toast('השינה נשמרה'); }, onError: fail })} />
          </>
        ) : (
          <>
            <View style={{ gap: spacing.sm }}>
              <Text variant="label" color={colors.textSecondary}>מתי השינה התחילה?</Text>
              <When value={ago} onChange={setAgo} tone={tone} />
            </View>
            <Button label={`התחלת שינה · ${timeText}`} loading={create.isPending}
              onPress={() => create.mutate({ childId, draft: { type: 'sleep', occurredAt: iso, startedAt: iso, endedAt: null, payload: {} } },
                { onSuccess: () => { onClose(); toast('השינה התחילה'); }, onError: fail })} />
            {more('תיעוד שינה שכבר נגמרה', 'sleep')}
          </>
        )
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  amount: { flex: 1, minWidth: 64, minHeight: 64, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, minHeight: 84, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  more: { alignSelf: 'center', minHeight: 44, justifyContent: 'center' },
});
