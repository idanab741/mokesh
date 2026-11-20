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
import { QuickLog, type QuickKind } from '@/components/home/QuickLog';
import { type Learned, TrackCard } from '@/components/home/TrackCards';
import { Float, PressScale, Rise } from '@/components/ui/motion';
import { Button, Card, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, shadow, spacing } from '@/design/tokens';
import type { FilterKey } from '@/domain/activity';
import { formatAgeWithSex } from '@/domain/age';
import { stageLabel } from '@/domain/avatar';
import { buildInsights, daysUntilInsights } from '@/domain/insights';
import { babyMood } from '@/domain/mood';
import { learnRoutine, predictNext } from '@/domain/routine';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventsBetween, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
import { diaperKindLabel, sleepingWord } from '@/i18n/he';
import { addDays, formatClock, formatDateLong, formatDuration, formatTime, greetingForHour } from '@/lib/time';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

export default function HomeScreen() {
  const { child, children } = useActiveChild();
  const openChildSheet = useUi((s) => s.openChildSheet);
  const openAddSheet = useUi((s) => s.openAddSheet);
  const user = useSession((s) => s.user);
  const now = useNow(30_000);
  const today = useEventsBetween(child?.id, now, now);
  // A month back: one week for the baseline, the rest to know which foods are new.
  const month = useEventsBetween(child?.id, addDays(now, -30), now);
  const recent = useRecentEvents(child?.id, 6);
  const unsynced = useUnsynced();
  const [lookOpen, setLookOpen] = useState(false);
  const [quick, setQuick] = useState<QuickKind | null>(null);
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

  const byKind = Object.fromEntries(predictions.map((p) => [p.kind, p]));
  const learnedFor = (kind: 'feed' | 'sleep' | 'wake' | 'diaper', samples: number, basis: (usual: string) => string, nextLabel: string): Learned => {
    const p = byKind[kind];
    if (p) return { state: 'predicted', prediction: p, basis: basis(formatDuration(p.usualMin)), nextLabel };
    return kind === 'wake' ? { state: 'none' } : { state: 'learning', samples };
  };
  const sinceText = (d: Date | null) => {
    if (!d) return null;
    const min = (now.getTime() - d.getTime()) / 60_000;
    return min > 24 * 60 ? null : min < 1 ? 'עכשיו' : formatDuration(min);
  };

  const f = summary.feeding;
  const s = summary.sleep;
  const d = summary.diaper;
  const so = summary.solids;
  const feedToday = `היום: ${f.count === 1 ? 'האכלה אחת' : `${f.count} האכלות`}${f.totalMl > 0 ? ` · ${f.totalMl} מ״ל בבקבוק` : ''}`;
  const sleepToday = `היום: ${s.minutes > 0 ? formatDuration(s.minutes) : '0 ד׳'} שינה`;
  const diaperToday = `היום: ${d.count === 1 ? 'החלפה אחת' : `${d.count} החלפות`}${d.last ? ` · ${diaperKindLabel[d.last.payload.kind]}` : ''}`;
  const solidsToday = so.last ? so.last.payload.foods.map((x) => x.name).join(', ') : 'אין עדיין ארוחה היום';
  const sleepStart = activeSleep ? new Date(activeSleep.startedAt ?? activeSleep.occurredAt) : null;

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

      {/* The stage: the greeting beside the child's baby character, so tracking stays on the first screen. */}
      <Rise index={1}>
        <View style={styles.stage}>
          <View style={styles.stageText}>
            <Text variant="display" accessibilityRole="header">{greetingForHour(now.getHours())}</Text>
            <Text variant="label" color={colors.textSecondary}>{formatDateLong(now)}</Text>
            <PressScale onPress={openChildSheet} accessibilityRole="button"
              accessibilityLabel={`${child.name}, ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}
              accessibilityHint={children.length > 1 ? 'מעבר בין ילדים' : 'ניהול ילדים'} style={styles.childPill}>
              <Avatar name={child.name} uri={child.photoUri} size={36} />
              <View style={{ flexShrink: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{child.name}</Text>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}</Text>
              </View>
              <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2.2} />
            </PressScale>
            <Text variant="caption" color={colors.textSecondary} testID="baby-mood-reason" numberOfLines={2}>
              {mood.reason ?? (clips?.wave ? 'הקישו על הדמות לנפנוף' : onClip ? '' : 'גררו כדי לסובב')}
            </Text>
            {onClip ? null : (
              <PressScale onPress={() => setLookOpen(true)} accessibilityRole="button" accessibilityLabel="התאמת המראה של הדמות" style={styles.lookBtn}>
                <Palette size={18} color={colors.primaryStrong} strokeWidth={2} />
              </PressScale>
            )}
          </View>
          <View style={styles.stageBaby}>
            <BabyFigure active={focused && !lookOpen && quick === null} mood={mood.mood} stage={look.stage} config={look.config} sex={child.sex} height={230} label={onClip ? `הדמות של ${child.name}` : `הדמות של ${child.name}, ${stageLabel[look.stage]}`} />
          </View>
        </View>
      </Rise>

      {/* Tracking: how long since each thing, where that stands in the family's own rhythm, and one clear button. */}
      <Rise index={2} style={styles.grid}>
        <TrackCard type="bottle" title="האכלה" sinceLabel="מאז ההאכלה האחרונה" since={sinceText(routine.feed.lastAt)}
          learned={learnedFor('feed', routine.feed.samples, (u) => `אצלכם כל ${u}`, 'הבאה')}
          today={feedToday} action="תיעוד האכלה" onAction={() => setQuick('feed')} onOpen={() => goJournal('feeding')} />
        {activeSleep && sleepStart ? (
          <TrackCard type="sleep" running title={`${child.name} ${sleepingWord(child.sex)}`} sinceLabel={`מאז ${formatTime(sleepStart)}`}
            since={formatClock((tick.getTime() - sleepStart.getTime()) / 1000)}
            learned={learnedFor('wake', 0, (u) => `שנת יום אצלכם: ${u}`, 'התעוררות')}
            today={sleepToday} action="סיום שינה" actionIcon={<Square size={16} color="#4740C2" strokeWidth={2.8} />}
            onAction={() => setQuick('sleep')} onOpen={() => goJournal('sleep')} />
        ) : (
          <TrackCard type="sleep" title="שינה" sinceLabel="זמן ערות" since={sinceText(routine.sleep.lastWakeAt)}
            learned={learnedFor('sleep', routine.sleep.awakeSamples, (u) => `אצלכם אחרי ${u} ערות`, 'שינה')}
            today={sleepToday} action="התחלת שינה" actionIcon={<Moon size={18} color={colors.white} strokeWidth={2.2} />}
            onAction={() => setQuick('sleep')} onOpen={() => goJournal('sleep')} />
        )}
        <TrackCard type="diaper" title="חיתול" sinceLabel="מאז ההחלפה האחרונה" since={sinceText(routine.diaper.lastAt)}
          learned={learnedFor('diaper', routine.diaper.samples, (u) => `אצלכם כל ${u}`, 'הבאה')}
          today={diaperToday} action="תיעוד חיתול" onAction={() => setQuick('diaper')} onOpen={() => goJournal('diaper')} />
        <TrackCard type="solids" title="מוצקים" sinceLabel="היום" since={so.count === 1 ? 'ארוחה אחת' : `${so.count} ארוחות`}
          learned={{ state: 'none' }} today={solidsToday} action="תיעוד ארוחה" onAction={() => openActivityForm('solids')} onOpen={() => goJournal('solids')} />
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

      <QuickLog kind={quick} onClose={() => setQuick(null)} childId={child.id} routine={routine} activeSleep={activeSleep ?? null} />
      {onClip ? null : <BabyCustomizeSheet child={child} now={now} open={lookOpen} onClose={() => setLookOpen(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  bellDot: { position: 'absolute', top: 10, end: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white },
  stage: { flexDirection: 'row', alignItems: 'center' },
  stageText: { flex: 1, gap: spacing.xs, zIndex: 1, alignItems: 'flex-start' },
  stageBaby: { width: 190, height: 230, alignItems: 'center', justifyContent: 'flex-end', marginEnd: -spacing.md },
  childPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 22, padding: 6, paddingEnd: spacing.md, marginTop: spacing.sm, maxWidth: '100%', ...shadow.card },
  lookBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  firstRun: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
