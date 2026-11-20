import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronDown, Moon, Palette, Square } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { EventRow } from '@/components/activity/EventRow';
import { Avatar } from '@/components/Avatar';
import { BabyCustomizeSheet, useBabyLook } from '@/components/baby/BabyCard';
import { BabyFigure, clipsFor } from '@/components/baby/BabyFigure';
import { MobileIllustration } from '@/components/brand/Illustrations';
import { Logo } from '@/components/brand/Logo';
import { DayStrip } from '@/components/home/DayStrip';
import { InsightsRow } from '@/components/home/InsightsRow';
import { ActionButton, NextUp, TrackRow } from '@/components/home/TrackingBoard';
import { Float, PressScale, Rise } from '@/components/ui/motion';
import { useToast } from '@/components/ui/overlays';
import { Button, Card, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, shadow, spacing } from '@/design/tokens';
import type { FilterKey } from '@/domain/activity';
import { formatAgeWithSex } from '@/domain/age';
import { stageLabel } from '@/domain/avatar';
import { buildInsights, daysUntilInsights } from '@/domain/insights';
import { babyMood } from '@/domain/mood';
import { learnRoutine, predictNext, type Prediction } from '@/domain/routine';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventMutations, useEventsBetween, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
import { diaperKindLabel, errorMessage, milkTypeLabel, sleepingWord } from '@/i18n/he';
import { addDays, formatClock, formatDateLong, formatDuration, formatRelative, formatTime, greetingForHour, ltr } from '@/lib/time';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

export default function HomeScreen() {
  const { child, children } = useActiveChild();
  const openChildSheet = useUi((s) => s.openChildSheet);
  const openAddSheet = useUi((s) => s.openAddSheet);
  const user = useSession((s) => s.user);
  const toast = useToast((s) => s.show);
  const now = useNow(30_000);
  const today = useEventsBetween(child?.id, now, now);
  // A month back: one week for the baseline, the rest to know which foods are new.
  const month = useEventsBetween(child?.id, addDays(now, -30), now);
  const recent = useRecentEvents(child?.id, 6);
  const unsynced = useUnsynced();
  const { create, remove, endSleep } = useEventMutations();
  const [lookOpen, setLookOpen] = useState(false);
  // The baby only turns while Home is actually on screen.
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));

  const summary = summarizeDay(today.data ?? [], now, now);
  const insights = useMemo(() => buildInsights(month.data ?? [], now), [month.data, now]);
  const daysMissing = useMemo(() => daysUntilInsights(month.data ?? [], now), [month.data, now]);
  const activeSleep = summary.sleep.active;
  // What the diary of the last two weeks says about this family's own rhythm.
  const routine = useMemo(() => learnRoutine(month.data ?? [], now), [month.data, now]);
  const predictions = useMemo(
    () => predictNext(routine, now, activeSleep ? new Date(activeSleep.startedAt ?? activeSleep.occurredAt) : null),
    [routine, now, activeSleep]);
  const tick = useNow(1000, !!activeSleep);
  if (!child) return <Screen><View /></Screen>;

  const hasConflicts = (unsynced.data?.conflicts ?? 0) > 0;
  const goJournal = (filter: FilterKey) => router.push({ pathname: '/(tabs)/journal', params: { filter } });

  const quickSave = (draft: Parameters<typeof create.mutate>[0]['draft'], message: string) => {
    create.mutate({ childId: child.id, draft }, {
      onSuccess: (event) => toast(message, { actionLabel: 'ביטול', onAction: () => remove.mutate(event.id) }),
      onError: (err) => toast(errorMessage(err), { tone: 'error' }),
    });
  };
  const startSleep = () => {
    const iso = new Date().toISOString();
    create.mutate({ childId: child.id, draft: { type: 'sleep', occurredAt: iso, startedAt: iso, endedAt: null, payload: {} } }, {
      onSuccess: () => toast('השינה התחילה'),
      onError: (err) => toast(errorMessage(err), { tone: 'error' }),
    });
  };
  const stopSleep = () => {
    if (!activeSleep) return;
    endSleep.mutate(activeSleep.id, {
      onSuccess: () => toast('השינה נשמרה'),
      onError: (err) => toast(errorMessage(err), { tone: 'error' }),
    });
  };

  // The one-tap bottle is the family's usual one; before there is a usual, the last one logged.
  const usualBottle = routine.feed.bottleMl && routine.feed.milkType ? { milkType: routine.feed.milkType, amountMl: routine.feed.bottleMl } : null;
  const actOnPrediction = (kind: Prediction['kind']) => {
    if (kind === 'wake') stopSleep();
    else if (kind === 'sleep') startSleep();
    else if (kind === 'diaper') openActivityForm('diaper');
    else openActivityForm(routine.feed.usual === 'nursing' ? 'nursing' : 'bottle');
  };

  const f = summary.feeding;
  const feedingDetail = f.last
    ? [f.totalMl > 0 ? `${f.totalMl} מ״ל בבקבוק` : null, `אחרונה ${formatRelative(new Date(f.last.occurredAt), now)}`].filter(Boolean).join(' · ')
    : 'אין עדיין האכלה היום';
  const s = summary.sleep;
  const sleepDetail = activeSleep
    ? `${sleepingWord(child.sex)} מאז ${formatTime(new Date(activeSleep.startedAt ?? activeSleep.occurredAt))}`
    : s.last
      ? `אחרונה ${ltr(`${formatTime(new Date(s.last.startedAt ?? s.last.occurredAt))}${s.last.endedAt ? `–${formatTime(new Date(s.last.endedAt))}` : ''}`)}`
      : 'אין עדיין שינה היום';
  const d = summary.diaper;
  const diaperDetail = d.last ? `${diaperKindLabel[d.last.payload.kind]} · ${formatRelative(new Date(d.last.occurredAt), now)}` : 'אין עדיין החלפה היום';
  const so = summary.solids;
  const solidsDetail = so.last ? `${so.last.payload.foods.map((x) => x.name).join(', ')} · ${formatTime(new Date(so.last.occurredAt))}` : 'אין עדיין ארוחה היום';

  const isBrandNew = recent.data !== undefined && recent.data.length === 0;

  const look = useBabyLook(child, now);
  // While the character is shown as video, the pose and outfit of the still pictures do not apply.
  const clips = clipsFor(look.stage, child.sex);
  const onClip = clips !== null;
  // The baby's expression mirrors the diary: asleep, just fed, or waiting longer than usual.
  const mood = babyMood(month.data ?? [], now, child.sex);

  return (
    <Screen scroll>
      <Rise index={0} style={styles.topBar}>
        <Logo size={28} />
        <PressScale onPress={() => router.push('/updates')} accessibilityRole="button"
          accessibilityLabel={hasConflicts ? 'עדכונים, יש פריטים שדורשים תשומת לב' : 'עדכונים'} style={styles.bell}>
          <Bell size={20} color={colors.textPrimary} strokeWidth={2} />
          {hasConflicts ? <View style={styles.bellDot} /> : null}
        </PressScale>
      </Rise>

      {/* The stage: the greeting and the child's baby character, standing on the screen itself. */}
      <Rise index={1}>
        <View style={styles.stage}>
          <View style={styles.stageText}>
            <Text variant="display" accessibilityRole="header">{greetingForHour(now.getHours())}</Text>
            <Text variant="label" color={colors.textSecondary}>{formatDateLong(now)}</Text>
          </View>
          <View style={styles.stageBaby}>
            <BabyFigure active={focused && !lookOpen} mood={mood.mood} stage={look.stage} config={look.config} sex={child.sex} height={320} label={onClip ? `הדמות של ${child.name}` : `הדמות של ${child.name}, ${stageLabel[look.stage]}`} />
          </View>
          <Text variant="caption" color={colors.textSecondary} style={styles.dragHint} testID="baby-mood-reason">
            {mood.reason ?? (clips?.wave ? 'הקישו על הדמות לנפנוף' : onClip ? '' : 'גררו כדי לסובב')}
          </Text>
          <View style={styles.stageBottom}>
            <PressScale onPress={openChildSheet} accessibilityRole="button"
              accessibilityLabel={`${child.name}, ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}
              accessibilityHint={children.length > 1 ? 'מעבר בין ילדים' : 'ניהול ילדים'} style={styles.childPill}>
              <Avatar name={child.name} uri={child.photoUri} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="heading" numberOfLines={1}>{child.name}</Text>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{onClip ? formatAgeWithSex(child.birthDate, child.sex, now) ?? '' : `${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''} · ${stageLabel[look.stage]}`}</Text>
              </View>
              <ChevronDown size={20} color={colors.textSecondary} strokeWidth={2.2} />
            </PressScale>
            {onClip ? null : (
              <PressScale onPress={() => setLookOpen(true)} accessibilityRole="button" accessibilityLabel="התאמת המראה של הדמות" style={styles.lookBtn}>
                <Palette size={20} color={colors.primaryStrong} strokeWidth={2} />
              </PressScale>
            )}
          </View>
        </View>
      </Rise>

      {/* What usually comes next, by the family's own routine */}
      <Rise index={2}>
        <NextUp predictions={predictions} routine={routine} onAct={actOnPrediction} />
      </Rise>

      {/* Tracking: one card per activity. Filled buttons save on the spot, outlined ones open a form. */}
      <Rise index={3} style={{ gap: spacing.md }}>
        <View>
          <Text variant="title" accessibilityRole="header">מעקב</Text>
          <Text variant="label" color={colors.textSecondary}>כפתור מלא שומר מיד · כפתור עם חץ פותח טופס</Text>
        </View>

        <TrackRow type="bottle" title="האכלה" status={f.count === 1 ? 'האכלה אחת היום' : `${f.count} האכלות היום`} detail={feedingDetail} onOpen={() => goJournal('feeding')}>
          {usualBottle ? (
            <ActionButton type="bottle" wide label={`בקבוק ${usualBottle.amountMl} מ״ל`} onPress={() => quickSave(
              { type: 'bottle', occurredAt: new Date().toISOString(), payload: usualBottle },
              `בקבוק ${usualBottle.amountMl} מ״ל (${milkTypeLabel[usualBottle.milkType]}) נשמר`)} />
          ) : null}
          <ActionButton type="bottle" kind="open" label={usualBottle ? 'כמות אחרת' : 'בקבוק'} a11yLabel={usualBottle ? 'בקבוק בכמות אחרת' : 'תיעוד בקבוק'} onPress={() => openActivityForm('bottle')} />
          <ActionButton type="nursing" kind="open" label="הנקה" a11yLabel="תיעוד הנקה" onPress={() => openActivityForm('nursing')} />
        </TrackRow>

        <TrackRow type="sleep" title="שינה" status={`${s.minutes > 0 ? formatDuration(s.minutes) : '0 ד׳'} היום`} detail={sleepDetail} onOpen={() => goJournal('sleep')}
          active={activeSleep ? { label: `${child.name} ${sleepingWord(child.sex)}`, clock: formatClock((tick.getTime() - Date.parse(activeSleep.startedAt ?? activeSleep.occurredAt)) / 1000) } : undefined}>
          {activeSleep ? (
            <Button label="סיום שינה" size="md" variant="secondary" icon={Square} onPress={stopSleep} loading={endSleep.isPending} style={{ flex: 1, backgroundColor: colors.white }} />
          ) : (
            <>
              <ActionButton type="sleep" wide label="התחלת שינה עכשיו" a11yLabel="התחלת שינה" onPress={startSleep} icon={<Moon size={18} color={colors.white} strokeWidth={2.2} />} />
              <ActionButton type="sleep" kind="open" label="שינה שכבר נגמרה" a11yLabel="תיעוד שינה שנגמרה" onPress={() => openActivityForm('sleep')} />
            </>
          )}
        </TrackRow>

        <TrackRow type="diaper" title="חיתול" status={d.count === 1 ? 'החלפה אחת היום' : `${d.count} החלפות היום`} detail={diaperDetail} onOpen={() => goJournal('diaper')}>
          {(['wet', 'dirty', 'both'] as const).map((kind) => (
            <ActionButton key={kind} type="diaper" label={kind === 'both' ? 'שניהם' : diaperKindLabel[kind]} a11yLabel={`חיתול ${diaperKindLabel[kind]}`}
              onPress={() => quickSave({ type: 'diaper', occurredAt: new Date().toISOString(), payload: { kind } }, `חיתול ${diaperKindLabel[kind]} נשמר`)} />
          ))}
          <ActionButton type="diaper" kind="open" label="חיתול עם פירוט (צבע, מרקם)" a11yLabel="תיעוד חיתול עם פירוט" onPress={() => openActivityForm('diaper')} />
        </TrackRow>

        <TrackRow type="solids" title="מוצקים" status={so.count === 1 ? 'ארוחה אחת היום' : `${so.count} ארוחות היום`} detail={solidsDetail} onOpen={() => goJournal('solids')}>
          <ActionButton type="solids" kind="open" label="תיעוד ארוחה" onPress={() => openActivityForm('solids')} />
        </TrackRow>
      </Rise>

      <Rise index={4} style={{ gap: spacing.md }}>
        <SectionHeader title="תובנות מהשגרה שלכם" />
        <InsightsRow insights={insights} daysMissing={daysMissing} />
      </Rise>

      <Rise index={5}>
        <Card style={{ gap: spacing.sm }}>
          <Text variant="heading" accessibilityRole="header">היום במבט</Text>
          <DayStrip events={today.data ?? []} now={now} />
        </Card>
      </Rise>

      {/* Recent activity */}
      <Rise index={6} style={{ gap: spacing.md }}>
        <SectionHeader title="פעילות אחרונה"
          action={recent.data && recent.data.length > 0 ? (
            <Pressable onPress={() => router.push('/(tabs)/journal')} accessibilityRole="link" hitSlop={12}
              style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
              <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '600' }}>ליומן המלא</Text>
            </Pressable>
          ) : undefined} />
        {isBrandNew ? (
          <Card style={styles.firstRun}>
            <Float><MobileIllustration size={190} /></Float>
            <Text variant="heading" center>{`מתחילים לתעד את ${child.name}`}</Text>
            <Text color={colors.textSecondary} center>בקבוק, חיתול או שינה – כל תיעוד יופיע כאן ויצטרף לסיכום היומי.</Text>
            <Button label="תיעוד ראשון" size="md" onPress={openAddSheet} style={{ alignSelf: 'center', paddingHorizontal: spacing.xxl, marginTop: spacing.xs }} />
          </Card>
        ) : (
          <Card style={{ paddingBottom: 0 }}>
            {(recent.data ?? []).map((event, i, all) => (
              <EventRow key={event.id} event={event} now={now} isLast={i === all.length - 1} showSync={!!user}
                onPress={() => openActivityForm(event.type, event.id)} />
            ))}
          </Card>
        )}
      </Rise>

      {onClip ? null : <BabyCustomizeSheet child={child} now={now} open={lookOpen} onClose={() => setLookOpen(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  bellDot: { position: 'absolute', top: 10, end: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white },
  stage: { gap: spacing.xs },
  stageText: { paddingHorizontal: spacing.xs, zIndex: 1 },
  stageBaby: { marginTop: -spacing.lg, alignItems: 'center', justifyContent: 'flex-end', height: 320 },
  stageBottom: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  childPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 26, padding: spacing.sm, paddingEnd: spacing.lg, ...shadow.card },
  lookBtn: { width: 60, height: 60, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  dragHint: { alignSelf: 'center', marginBottom: spacing.sm },
  firstRun: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
