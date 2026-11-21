import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CalendarClock, ChevronDown, ChevronLeft, ClipboardList, HeartPulse, type LucideIcon, Moon, Palette, Pill, Sparkles, Square, Users, Utensils } from 'lucide-react-native';
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
import { Ring } from '@/components/home/Ring';
import { activityIcons } from '@/components/ui/Icons';
import { Float, PressScale, Rise } from '@/components/ui/motion';
import { ActivityBadge, Button, Card, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, gradients, shadow, spacing, themed } from '@/design/tokens';
import type { ActivityType, FilterKey } from '@/domain/activity';
import { formatAgeWithSex } from '@/domain/age';
import { stageLabel } from '@/domain/avatar';
import { buildInsights, daysUntilInsights } from '@/domain/insights';
import { babyMood } from '@/domain/mood';
import { learnRoutine, predictNext } from '@/domain/routine';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventsBetween, useAppTheme, useHealth, useMilestones, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
import { diaperKindLabel, sleepingWord } from '@/i18n/he';
import { formatDateShort, formatRelative, addDays, formatClock, formatDateLong, formatDuration, formatTime, greetingForHour } from '@/lib/time';
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
  const theme = useAppTheme();
  const health = useHealth(child?.id);
  const moments = useMilestones(child?.id);
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

  const sinceText = (d: Date | null) => {
    if (!d) return null;
    const min = (now.getTime() - d.getTime()) / 60_000;
    return min > 24 * 60 ? null : min < 1 ? 'עכשיו' : formatDuration(min);
  };

  const f = summary.feeding;
  const s = summary.sleep;
  const d = summary.diaper;
  const so = summary.solids;
  const sleepStart = activeSleep ? new Date(activeSleep.startedAt ?? activeSleep.occurredAt) : null;
  const todayStats: { type: ActivityType; filter: FilterKey; main: string; sub: string }[] = [
    { type: 'bottle', filter: 'feeding', main: f.count === 1 ? 'האכלה אחת' : `${f.count} האכלות`, sub: f.totalMl > 0 ? `${f.totalMl} מ״ל בבקבוק` : 'היום' },
    { type: 'sleep', filter: 'sleep', main: s.minutes > 0 ? formatDuration(s.minutes) : '0 ד׳', sub: 'שינה היום' },
    { type: 'diaper', filter: 'diaper', main: d.count === 1 ? 'החלפה אחת' : `${d.count} החלפות`, sub: d.last ? `אחרון: ${diaperKindLabel[d.last.payload.kind]}` : 'היום' },
    { type: 'solids', filter: 'solids', main: so.count === 1 ? 'ארוחה אחת' : `${so.count} ארוחות`, sub: so.last ? so.last.payload.foods.map((x) => x.name).join(', ') : 'היום' },
  ];
  // What is going on beyond the daily tracking: the next visit, a medicine given in the last day, the latest moment.
  const nextVisit = (health.visits.data ?? []).filter((v) => new Date(v.at).getTime() >= now.getTime()).slice(-1)[0];
  const lastMed = (health.given.data ?? [])[0];
  const recentMed = lastMed && now.getTime() - new Date(lastMed.at).getTime() < 24 * 60 * 60_000 ? lastMed : null;
  const lastMoment = (moments.data ?? [])[0];
  const highlights: { key: string; icon: LucideIcon; title: string; detail: string; href: '/health' | '/milestones' }[] = [
    ...(recentMed ? [{ key: 'med', icon: Pill, title: `${recentMed.name} ניתן ${formatRelative(new Date(recentMed.at), now)}`, detail: 'חום ותרופות', href: '/health' as const }] : []),
    ...(nextVisit ? [{ key: 'visit', icon: CalendarClock, title: `${nextVisit.title} · ${formatDateShort(new Date(nextVisit.at))} ${formatTime(new Date(nextVisit.at))}`, detail: 'הביקור הקרוב', href: '/health' as const }] : []),
    ...(lastMoment ? [{ key: 'moment', icon: Sparkles, title: lastMoment.title, detail: 'הרגע האחרון שסימנתם', href: '/milestones' as const }] : []),
  ];
  // The soonest thing the family's own routine expects.
  const next = predictions[0];
  const nextTitle = { feed: 'ההאכלה הבאה', sleep: 'השינה הבאה', wake: 'התעוררות', diaper: 'ההחלפה הבאה' } as const;
  const nextBasis = (kind: keyof typeof nextTitle, usual: string) =>
    kind === 'sleep' ? `אצלכם אחרי ${usual} ערות` : kind === 'wake' ? `שנת יום אצלכם: ${usual}` : `אצלכם כל ${usual}`;
  const nextType: ActivityType = !next ? 'bottle' : next.kind === 'feed' ? 'bottle' : next.kind === 'diaper' ? 'diaper' : 'sleep';
  const bubbles: { type: ActivityType; filter: FilterKey; label: string; value: string | null }[] = [
    { type: 'bottle', filter: 'feeding', label: 'מאז האכלה', value: sinceText(routine.feed.lastAt) },
    activeSleep && sleepStart
      ? { type: 'sleep', filter: 'sleep', label: `${child.name} ${sleepingWord(child.sex)}`, value: formatClock((tick.getTime() - sleepStart.getTime()) / 1000) }
      : { type: 'sleep', filter: 'sleep', label: 'זמן ערות', value: sinceText(routine.sleep.lastWakeAt) },
    { type: 'diaper', filter: 'diaper', label: 'מאז חיתול', value: sinceText(routine.diaper.lastAt) },
  ];
  const dock: { type: ActivityType; label: string; a11y: string; onPress: () => void }[] = [
    { type: 'bottle', label: 'האכלה', a11y: 'תיעוד האכלה', onPress: () => setQuick('feed') },
    { type: 'sleep', label: activeSleep ? 'סיום שינה' : 'שינה', a11y: activeSleep ? 'סיום שינה' : 'התחלת שינה', onPress: () => setQuick('sleep') },
    { type: 'diaper', label: 'חיתול', a11y: 'תיעוד חיתול', onPress: () => setQuick('diaper') },
    { type: 'solids', label: 'ארוחה', a11y: 'תיעוד ארוחה', onPress: () => openActivityForm('solids') },
  ];

  // One sentence that says what is going on, and one that says what the family's routine expects next.
  const awakeFor = sinceText(routine.sleep.lastWakeAt);
  const nowLead = activeSleep && sleepStart ? `${child.name} ${sleepingWord(child.sex)} כבר`
    : awakeFor ? (child.sex === 'female' ? 'ערה כבר' : child.sex === 'male' ? 'ער כבר' : 'זמן ערות:') : null;
  const nowValue = activeSleep && sleepStart ? formatClock((tick.getTime() - sleepStart.getTime()) / 1000) : awakeFor;
  const tiles: { type: ActivityType; label: string; a11y: string; status: string; onPress: () => void }[] = [
    { type: 'bottle', label: 'האכלה', a11y: 'תיעוד האכלה', status: bubbles[0].value ? (bubbles[0].value === 'עכשיו' ? 'עכשיו' : `לפני ${bubbles[0].value}`) : 'עוד לא היום', onPress: () => setQuick('feed') },
    { type: 'sleep', label: activeSleep ? 'סיום שינה' : 'שינה', a11y: activeSleep ? 'סיום שינה' : 'התחלת שינה', status: activeSleep ? 'בשינה עכשיו' : s.minutes > 0 ? `${formatDuration(s.minutes)} היום` : 'עוד לא היום', onPress: () => setQuick('sleep') },
    { type: 'diaper', label: 'חיתול', a11y: 'תיעוד חיתול', status: bubbles[2].value ? (bubbles[2].value === 'עכשיו' ? 'עכשיו' : `לפני ${bubbles[2].value}`) : 'עוד לא היום', onPress: () => setQuick('diaper') },
    { type: 'solids', label: 'ארוחה', a11y: 'תיעוד ארוחה', status: so.count === 0 ? 'עוד לא היום' : so.count === 1 ? 'אחת היום' : `${so.count} היום`, onPress: () => openActivityForm('solids') },
  ];

  // How far each thing is toward the family's own usual time: the ring is full when that time has come.
  const toward = (kind: 'feed' | 'sleep' | 'wake' | 'diaper'): number | null => {
    const p = predictions.find((x) => x.kind === kind);
    return p ? Math.max(0.04, Math.min(1, 1 - p.minutesUntil / p.usualMin)) : null;
  };
  const ringOf: Record<string, number | null> = {
    bottle: toward('feed'), sleep: toward(activeSleep ? 'wake' : 'sleep'), diaper: toward('diaper'),
    solids: routine.solidsPerDay ? Math.min(1, so.count / routine.solidsPerDay) : null,
  };
  const anyLearned = Object.values(ringOf).some((v) => v !== null);

  const isBrandNew = recent.data !== undefined && recent.data.length === 0;

  const look = useBabyLook(child, now);
  // While the character is shown as video, the pose and outfit of the still pictures do not apply.
  const clips = clipsFor(look.stage, child.sex, look.config.look);
  const onClip = clips !== null;
  // The baby's expression mirrors the diary: asleep, just fed, or waiting longer than usual.
  const mood = babyMood(month.data ?? [], now, child.sex);

  return (
    <Screen scroll wash={false} contentStyle={{ paddingBottom: 0 }}>
      {/* The sky behind the character. It scrolls with the page and ends under the white sheet. */}
      <LinearGradient colors={theme.sky} locations={[0, 0.5, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.sky} pointerEvents="none" />
      <Rise index={0} style={styles.topBar}>
        <Logo size={28} />
        <View style={styles.topEnd}>
          {hasConflicts ? (
            <PressScale onPress={() => router.push('/updates')} accessibilityRole="button" accessibilityLabel="עדכונים, יש פריטים שדורשים תשומת לב" style={styles.bell}>
              <Bell size={20} color={colors.ink} strokeWidth={2} />
              <View style={styles.bellDot} />
            </PressScale>
          ) : null}
          <PressScale onPress={openChildSheet} accessibilityRole="button"
            accessibilityLabel={`${child.name}, ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}
            accessibilityHint={children.length > 1 ? 'מעבר בין ילדים' : 'ניהול ילדים'} style={styles.childBtn}>
            <Avatar name={child.name} uri={child.photoUri} size={40} />
          </PressScale>
        </View>
      </Rise>

      {/* The stage: the greeting, and the child's baby character standing in an arch window. */}
      <Rise index={1}>
        <View style={styles.stageText}>
          <Text variant="display" color={colors.ink} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>{`${greetingForHour(now.getHours())}, ${child.name}`}</Text>
          <Text variant="label" color={theme.onSky}>{`${formatDateLong(now)} · ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}</Text>
        </View>
        <View style={styles.archRing}>
          <View style={styles.arch}>
            <BabyFigure active={focused && !lookOpen && quick === null} mood={mood.mood} stage={look.stage} config={look.config} sex={child.sex} height={320} label={onClip ? `הדמות של ${child.name}` : `הדמות של ${child.name}, ${stageLabel[look.stage]}`} />
          </View>
          {onClip ? null : (
            <PressScale onPress={() => setLookOpen(true)} accessibilityRole="button" accessibilityLabel="התאמת המראה של הדמות" style={styles.lookBtn}>
              <Palette size={18} color={colors.primaryStrong} strokeWidth={2} />
            </PressScale>
          )}
        </View>
      </Rise>

      {/* The sheet that rises over the sky: what is going on now, and the four things to log. */}
      <View style={styles.sheet}>
        <Rise index={2}>
          <View testID="baby-mood-reason">
            <Text style={styles.nowLine} color="#5B4353">
              {nowLead && nowValue ? <>{nowLead} <Text style={styles.nowStrong} color={colors.primaryStrong}>{nowValue}</Text>.</> : `עוד לא תיעדתם היום את ${child.name}.`}
            </Text>
          </View>
          <View testID="next-up" accessible={!!next} accessibilityLabel={next ? `${nextTitle[next.kind]} בסביבות ${formatTime(next.at)}. ${nextBasis(next.kind, formatDuration(next.usualMin))}` : undefined}>
            <Text style={styles.nowLine} color="#5B4353">
              {next ? <>{nextTitle[next.kind]} בסביבות <Text style={styles.nowStrong} color={colors.primaryStrong}>{formatTime(next.at)}</Text></> : 'עוד כמה תיעודים ונדע לומר מה הבא.'}
            </Text>
          </View>
        </Rise>

        <Rise index={3} style={{ gap: spacing.sm }}>
          <View style={styles.rings}>
            {tiles.map((tl) => {
              const tone = activityTones[tl.type];
              const Icon = activityIcons[tl.type];
              return (
                <PressScale key={tl.type} onPress={tl.onPress} accessibilityRole="button" accessibilityLabel={tl.a11y} accessibilityHint={tl.status} scaleTo={0.93} style={styles.ringItem}>
                  <Ring progress={ringOf[tl.type]} color={tone.ink} track={tone.bg}>
                    {tl.type === 'sleep' && activeSleep ? <Square size={22} color={tone.ink} strokeWidth={2.4} /> : tl.type === 'sleep' ? <Moon size={26} color={tone.ink} strokeWidth={1.9} /> : <Icon size={26} color={tone.ink} />}
                  </Ring>
                  <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }} numberOfLines={1}>{tl.label}</Text>
                  <Text variant="caption" color={colors.textSecondary} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11.5 }}>{tl.status}</Text>
                </PressScale>
              );
            })}
          </View>
          <Text variant="caption" color={colors.textSecondary} center>
            {anyLearned ? 'הטבעת מתמלאת ככל שמתקרבים לזמן הרגיל שלכם' : 'הטבעות יתחילו להתמלא אחרי כמה ימי תיעוד'}
          </Text>
        </Rise>

        {/* Today in one line */}
        <Rise index={4} style={styles.todayLine}>
          {todayStats.slice(0, 3).map((st, i) => (
            <Pressable key={st.type} onPress={() => goJournal(st.filter)} accessibilityRole="button" accessibilityLabel={`${st.main}, ${st.sub}. מעבר ליומן`}
              style={[styles.todayCell, i > 0 && styles.todayDivider]}>
              <Text variant="bodyStrong" color={colors.ink} numberOfLines={1} adjustsFontSizeToFit>{st.main}</Text>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{st.sub}</Text>
            </Pressable>
          ))}
        </Rise>

      {/* Only when there is something current: a medicine given today, the next visit, the latest moment */}
      {highlights.length > 0 ? (
        <Rise index={5} style={{ gap: spacing.md }}>
          <SectionHeader title="כדאי לדעת" />
          <Card style={{ paddingVertical: spacing.xs, gap: 0 }}>
            {highlights.map((hl) => (
              <Pressable key={hl.key} onPress={() => router.push(hl.href)} accessibilityRole="button" accessibilityLabel={`${hl.detail}: ${hl.title}`}
                style={({ pressed }) => [styles.highlight, pressed && { opacity: 0.7 }]}>
                <View style={styles.highlightIcon}><hl.icon size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color={colors.textSecondary}>{hl.detail}</Text>
                  <Text variant="bodyStrong" numberOfLines={1}>{hl.title}</Text>
                </View>
                <ChevronLeft size={18} color={colors.textSecondary} />
              </Pressable>
            ))}
          </Card>
        </Rise>
      ) : null}

      {insights.length > 0 ? (
        <Rise index={5} style={{ gap: spacing.md }}>
          <SectionHeader title="תובנות מהשגרה שלכם" />
          <InsightsRow insights={insights} daysMissing={daysMissing} />
        </Rise>
      ) : null}

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

      </View>

      <QuickLog kind={quick} onClose={() => setQuick(null)} childId={child.id} routine={routine} activeSleep={activeSleep ?? null} />
      {onClip ? null : <BabyCustomizeSheet child={child} now={now} open={lookOpen} onClose={() => setLookOpen(false)} />}
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  bellDot: { position: 'absolute', top: 10, end: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white },
  topEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  highlightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sky: { position: 'absolute', top: -120, start: -spacing.xl, end: -spacing.xl, height: 720 },
  stageText: { paddingHorizontal: spacing.xs, zIndex: 1 },
  // The arch is painted in the clip's own backdrop colour, so the character stands in a window and the sky can be any colour.
  archRing: { alignSelf: 'center', marginTop: spacing.md, padding: 8, borderTopLeftRadius: 164, borderTopRightRadius: 164, borderBottomLeftRadius: 42, borderBottomRightRadius: 42, backgroundColor: 'rgba(255,255,255,0.55)' },
  arch: { width: 312, height: 336, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.background, borderTopLeftRadius: 156, borderTopRightRadius: 156, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  lookBtn: { position: 'absolute', bottom: 14, end: 14, width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  sheet: { marginHorizontal: -spacing.xl, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: 130, gap: spacing.lg, backgroundColor: '#FDFBFA', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  nowLine: { fontSize: 19, lineHeight: 28, fontWeight: '500' },
  nowStrong: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  childBtn: { borderRadius: 24, padding: 3, backgroundColor: colors.surface, ...shadow.card },
  rings: { flexDirection: 'row', justifyContent: 'space-between' },
  ringItem: { flex: 1, alignItems: 'center', gap: 2 },
  todayLine: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 24, paddingVertical: spacing.md, ...shadow.card },
  todayCell: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  todayDivider: { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: colors.borderStrong },
  firstRun: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
}));
