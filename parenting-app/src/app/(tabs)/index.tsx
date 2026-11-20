import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ChevronDown, Moon, Palette, Plus } from 'lucide-react-native';
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
import { BottleIcon, DiaperIcon } from '@/components/ui/Icons';
import { Float, PressScale, Rise } from '@/components/ui/motion';
import { useToast } from '@/components/ui/overlays';
import { ActivityBadge, Button, Card, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, shadow, spacing } from '@/design/tokens';
import type { ActivityType, FilterKey } from '@/domain/activity';
import { formatAgeWithSex } from '@/domain/age';
import { stageLabel } from '@/domain/avatar';
import { buildInsights, daysUntilInsights } from '@/domain/insights';
import { babyMood } from '@/domain/mood';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventMutations, useEventsBetween, useLastBottle, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
import { diaperKindLabel, errorMessage, milkTypeLabel, sleepingWord } from '@/i18n/he';
import { addDays, formatClock, formatDateLong, formatDuration, formatRelative, formatTime, greetingForHour, ltr } from '@/lib/time';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

function TrackerCard({ type, title, metric, detail, onPress, onAdd, addLabel }: {
  type: ActivityType; title: string; metric: string; detail: string; onPress: () => void; onAdd: () => void; addLabel: string;
}) {
  const tone = activityTones[type];
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}: ${metric}. ${detail}`} style={styles.tracker}>
      {/* A soft colour bloom in the corner ties the white card to its activity. */}
      <View style={[styles.bloom, { backgroundColor: tone.bg }]} pointerEvents="none" />
      <View style={styles.trackerTop}>
        <ActivityBadge type={type} size={42} />
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={addLabel} hitSlop={10}
          style={({ pressed }) => [styles.trackerAdd, { backgroundColor: tone.bg }, pressed && { opacity: 0.6 }]}>
          <Plus size={18} color={tone.ink} strokeWidth={2.6} />
        </Pressable>
      </View>
      <Text variant="label" color={colors.textSecondary} numberOfLines={1}>{title}</Text>
      <Text variant="metric" numberOfLines={1} adjustsFontSizeToFit style={metric.length > 8 ? { fontSize: 21, letterSpacing: -0.3 } : null}>{metric}</Text>
      <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{detail}</Text>
    </PressScale>
  );
}

function QuickAction({ label, onPress, children, tone }: { label: string; onPress: () => void; children: React.ReactNode; tone: { bg: string; ink: string } }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={[styles.quick, { backgroundColor: tone.bg }]}>
      {children}
      <Text variant="label" color={tone.ink} style={{ fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{label}</Text>
    </PressScale>
  );
}

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
  const lastBottle = useLastBottle(child?.id);
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

  const f = summary.feeding;
  const feedingDetail = f.last
    ? [f.totalMl > 0 ? `${f.totalMl} מ״ל בבקבוק` : null, `אחרונה ${formatRelative(new Date(f.last.occurredAt), now)}`].filter(Boolean).join(' · ')
    : 'עוד לא תועדה האכלה היום';
  const s = summary.sleep;
  const sleepDetail = activeSleep
    ? `${sleepingWord(child.sex)} מאז ${formatTime(new Date(activeSleep.startedAt ?? activeSleep.occurredAt))}`
    : s.last
      ? `אחרונה ${ltr(`${formatTime(new Date(s.last.startedAt ?? s.last.occurredAt))}${s.last.endedAt ? `–${formatTime(new Date(s.last.endedAt))}` : ''}`)}`
      : 'עוד לא תועדה שינה היום';
  const d = summary.diaper;
  const diaperDetail = d.last ? `${diaperKindLabel[d.last.payload.kind]} · ${formatRelative(new Date(d.last.occurredAt), now)}` : 'עוד לא תועדה החלפה היום';
  const so = summary.solids;
  const solidsDetail = so.last ? `${so.last.payload.foods.map((x) => x.name).join(', ')} · ${formatTime(new Date(so.last.occurredAt))}` : 'עוד לא תועדה ארוחה היום';

  const isBrandNew = recent.data !== undefined && recent.data.length === 0;

  const look = useBabyLook(child, now);
  // While the character is shown as video, the pose and outfit of the still pictures do not apply.
  const onClip = clipsFor(look.stage, child.sex) !== null;
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
            {mood.reason ?? (onClip ? 'הקישו על הדמות לנפנוף' : 'גררו כדי לסובב')}
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

      {/* Running sleep */}
      {activeSleep ? (
        <LinearGradient colors={activityTones.sleep.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sleepBanner} accessibilityRole="timer">
          <View style={styles.sleepIcon}><Moon size={22} color={colors.white} strokeWidth={2} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="label" color="#EDEBFF">{child.name} {sleepingWord(child.sex)}</Text>
            <Text variant="title" color={colors.white} style={{ writingDirection: 'ltr' }}>
              {formatClock((tick.getTime() - Date.parse(activeSleep.startedAt ?? activeSleep.occurredAt)) / 1000)}
            </Text>
          </View>
          <Button label="סיום שינה" size="md" variant="secondary" onPress={stopSleep} loading={endSleep.isPending} style={{ backgroundColor: colors.white }} />
        </LinearGradient>
      ) : null}

      {/* One-tap actions */}
      <Rise index={2} style={styles.quickRow}>
        <QuickAction label="חיתול רטוב" tone={activityTones.diaper}
          onPress={() => quickSave({ type: 'diaper', occurredAt: new Date().toISOString(), payload: { kind: 'wet' } }, 'חיתול רטוב נשמר')}>
          <DiaperIcon size={20} color={activityTones.diaper.ink} />
        </QuickAction>
        {activeSleep ? null : (
          <QuickAction label="התחלת שינה" tone={activityTones.sleep} onPress={startSleep}>
            <Moon size={20} color={activityTones.sleep.ink} strokeWidth={1.75} />
          </QuickAction>
        )}
        {lastBottle.data ? (
          <QuickAction label={`בקבוק ${lastBottle.data.payload.amountMl} מ״ל`} tone={activityTones.bottle}
            onPress={() => quickSave(
              { type: 'bottle', occurredAt: new Date().toISOString(), payload: { milkType: lastBottle.data!.payload.milkType, amountMl: lastBottle.data!.payload.amountMl } },
              `בקבוק ${lastBottle.data!.payload.amountMl} מ״ל (${milkTypeLabel[lastBottle.data!.payload.milkType]}) נשמר`)}>
            <BottleIcon size={20} color={activityTones.bottle.ink} />
          </QuickAction>
        ) : null}
      </Rise>

      {/* Trackers */}
      <Rise index={3} style={styles.grid}>
        <TrackerCard type="bottle" title="האכלות" metric={f.count === 1 ? 'האכלה אחת' : `${f.count} האכלות`} detail={feedingDetail}
          onPress={() => goJournal('feeding')} onAdd={() => openActivityForm('bottle')} addLabel="הוספת האכלה" />
        <TrackerCard type="sleep" title="שינה" metric={s.minutes > 0 ? formatDuration(s.minutes) : '0 ד׳'} detail={sleepDetail}
          onPress={() => goJournal('sleep')} onAdd={() => openActivityForm('sleep', activeSleep?.id)} addLabel="הוספת שינה" />
        <TrackerCard type="diaper" title="חיתולים" metric={d.count === 1 ? 'החלפה אחת' : `${d.count} החלפות`} detail={diaperDetail}
          onPress={() => goJournal('diaper')} onAdd={() => openActivityForm('diaper')} addLabel="הוספת חיתול" />
        <TrackerCard type="solids" title="מוצקים" metric={so.count === 1 ? 'ארוחה אחת' : `${so.count} ארוחות`} detail={solidsDetail}
          onPress={() => goJournal('solids')} onAdd={() => openActivityForm('solids')} addLabel="הוספת ארוחה" />
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

      <BabyCustomizeSheet child={child} now={now} open={lookOpen} onClose={() => setLookOpen(false)} />
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
  sleepBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, padding: spacing.lg },
  sleepIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tracker: { flexBasis: '47%', flexGrow: 1, gap: 2, minHeight: 158, borderRadius: 26, padding: spacing.lg, overflow: 'hidden', backgroundColor: colors.surface, ...shadow.card },
  bloom: { position: 'absolute', width: 150, height: 150, borderRadius: 75, top: -62, start: -52, opacity: 0.75 },
  trackerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  trackerAdd: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quick: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.lg, borderRadius: radius.pill, flexGrow: 1, justifyContent: 'center' },
  firstRun: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
