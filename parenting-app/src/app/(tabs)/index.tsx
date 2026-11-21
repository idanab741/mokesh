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
import { BabyLookPicker, looksFor } from '@/components/baby/BabyLookPicker';
import { MobileIllustration } from '@/components/brand/Illustrations';
import { Logo } from '@/components/brand/Logo';
import { DayStrip } from '@/components/home/DayStrip';
import { InsightsRow } from '@/components/home/InsightsRow';
import { QuickLog, type QuickKind } from '@/components/home/QuickLog';
import { activityIcons } from '@/components/ui/Icons';
import { Float, PressScale, Rise } from '@/components/ui/motion';
import { ActivityBadge, Button, Card, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, gradients, shadow, spacing } from '@/design/tokens';
import type { ActivityType, FilterKey } from '@/domain/activity';
import { formatAgeWithSex } from '@/domain/age';
import { stageLabel } from '@/domain/avatar';
import { buildInsights, daysUntilInsights } from '@/domain/insights';
import { babyMood } from '@/domain/mood';
import { learnRoutine, predictNext } from '@/domain/routine';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventsBetween, useHealth, useMilestones, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
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
  const [pickOpen, setPickOpen] = useState(false);
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
  const shortcuts: { label: string; icon: LucideIcon; href: '/milestones' | '/health' | '/foods' | '/report' | '/family'; bg: string; ink: string }[] = [
    { label: 'רגעים', icon: Sparkles, href: '/milestones', bg: '#FFE8EF', ink: '#BE2C55' },
    { label: 'בריאות', icon: HeartPulse, href: '/health', bg: '#DDF6F0', ink: '#0A7767' },
    { label: 'טעימות', icon: Utensils, href: '/foods', bg: '#FFF0D6', ink: '#955400' },
    { label: 'סיכום לרופא', icon: ClipboardList, href: '/report', bg: '#E4F0FF', ink: '#1F6BC2' },
    { label: 'משפחה', icon: Users, href: '/family', bg: '#ECEAFF', ink: '#4740C2' },
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

  const isBrandNew = recent.data !== undefined && recent.data.length === 0;

  const look = useBabyLook(child, now);
  // While the character is shown as video, the pose and outfit of the still pictures do not apply.
  const clips = clipsFor(look.stage, child.sex, look.config.look);
  const canPick = looksFor(child.sex).length > 1;
  const onClip = clips !== null;
  // The baby's expression mirrors the diary: asleep, just fed, or waiting longer than usual.
  const mood = babyMood(month.data ?? [], now, child.sex);

  return (
    <Screen scroll wash={false}>
      {/* The colour wash scrolls with the page and fades to the clip's own backdrop before the baby begins. */}
      <LinearGradient colors={gradients.wash} locations={[0, 0.5, 1]} style={styles.wash} pointerEvents="none" />
      <Rise index={0} style={styles.topBar}>
        <Logo size={28} />
        <View style={styles.topEnd}>
          <PressScale onPress={openChildSheet} accessibilityRole="button"
            accessibilityLabel={`${child.name}, ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}
            accessibilityHint={children.length > 1 ? 'מעבר בין ילדים' : 'ניהול ילדים'} style={styles.childPill}>
            <Avatar name={child.name} uri={child.photoUri} size={32} />
            <Text variant="label" style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>{child.name}</Text>
            <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.4} />
          </PressScale>
          <PressScale onPress={() => router.push('/updates')} accessibilityRole="button"
            accessibilityLabel={hasConflicts ? 'עדכונים, יש פריטים שדורשים תשומת לב' : 'עדכונים'} style={styles.bell}>
            <Bell size={20} color={colors.textPrimary} strokeWidth={2} />
            {hasConflicts ? <View style={styles.bellDot} /> : null}
          </PressScale>
        </View>
      </Rise>

      {/* The stage: the child's baby character at full size, with the three "how long since" facts around it. */}
      <Rise index={1}>
        <View style={styles.stageText}>
          <Text variant="display" accessibilityRole="header">{greetingForHour(now.getHours())}</Text>
          <Text variant="label" color={colors.textSecondary}>{`${formatDateLong(now)} · ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}</Text>
        </View>
        <View style={styles.stageBaby}>
          <BabyFigure active={focused && !lookOpen && !pickOpen && quick === null} mood={mood.mood} stage={look.stage} config={look.config} sex={child.sex} height={320} label={onClip ? `הדמות של ${child.name}` : `הדמות של ${child.name}, ${stageLabel[look.stage]}`} />
          {onClip ? null : (
            <PressScale onPress={() => setLookOpen(true)} accessibilityRole="button" accessibilityLabel="התאמת המראה של הדמות" style={styles.lookBtn}>
              <Palette size={18} color={colors.primaryStrong} strokeWidth={2} />
            </PressScale>
          )}
        </View>
        <Text variant="caption" color={colors.textSecondary} style={styles.moodLine} testID="baby-mood-reason">
          {mood.reason ?? (clips?.wave ? 'הקישו על הדמות לנפנוף' : onClip ? '' : 'גררו כדי לסובב')}
        </Text>
        {canPick ? (
          <Pressable onPress={() => setPickOpen(true)} accessibilityRole="button" accessibilityLabel="החלפת דמות" hitSlop={8} style={styles.pick}>
            <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '600' }}>החלפת דמות</Text>
          </Pressable>
        ) : null}
        {/* How long since each thing: below the character, never over it. */}
        <View style={styles.sinceRow}>
          {bubbles.map((b) => {
            const tone = activityTones[b.type];
            const Icon = activityIcons[b.type];
            return (
              <PressScale key={b.type} onPress={() => goJournal(b.filter)} accessibilityRole="button" accessibilityLabel={`${b.label}: ${b.value ?? 'אין עדיין'}`} style={styles.since}>
                <View style={[styles.bubbleIcon, { backgroundColor: tone.bg }]}><Icon size={16} color={tone.ink} /></View>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{b.label}</Text>
                <Text variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit style={b.type === 'sleep' && activeSleep ? { writingDirection: 'ltr' } : null}>{b.value ?? '—'}</Text>
              </PressScale>
            );
          })}
        </View>
      </Rise>

      {/* What the family's own routine expects next, or how far the learning is. */}
      <Rise index={2}>
        {next ? (
          <View style={styles.next} testID="next-up" accessible
            accessibilityLabel={`${nextTitle[next.kind]} בסביבות ${formatTime(next.at)}. ${nextBasis(next.kind, formatDuration(next.usualMin))}`}>
            <ActivityBadge type={nextType} size={40} soft />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{nextTitle[next.kind]}</Text>
              <Text variant="caption" color={colors.textSecondary}>{nextBasis(next.kind, formatDuration(next.usualMin))}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="heading" color={activityTones[nextType].ink} style={{ writingDirection: 'ltr' }}>{`~${formatTime(next.at)}`}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                {next.minutesUntil > 5 ? `בעוד ${formatDuration(next.minutesUntil)}` : next.minutesUntil >= -10 ? 'בערך עכשיו' : `עברו ${formatDuration(-next.minutesUntil)}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.next} testID="next-up">
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">לומדים את השגרה שלכם</Text>
              <Text variant="caption" color={colors.textSecondary}>ככל שתתעדו, נראה כאן מתי בדרך כלל מגיעות ההאכלה, השינה וההחלפה הבאות.</Text>
            </View>
          </View>
        )}
      </Rise>

      {/* Logging: four big buttons, each opens a short sheet. */}
      <Rise index={3} style={styles.dock}>
        {dock.map((b) => {
          const Icon = activityIcons[b.type];
          return (
            <PressScale key={b.type} onPress={b.onPress} accessibilityRole="button" accessibilityLabel={b.a11y} scaleTo={0.93} style={styles.dockItem}>
              <LinearGradient colors={activityTones[b.type].grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dockIcon}>
                {b.type === 'sleep' && activeSleep ? <Square size={24} color={colors.white} strokeWidth={2.6} /> : b.type === 'sleep' ? <Moon size={28} color={colors.white} strokeWidth={2} /> : <Icon size={28} color={colors.white} />}
              </LinearGradient>
              <Text variant="label" style={{ fontWeight: '700' }} numberOfLines={1}>{b.label}</Text>
            </PressScale>
          );
        })}
      </Rise>

      {/* Today in numbers */}
      <Rise index={4} style={styles.stats}>
        {todayStats.map((st) => (
          <PressScale key={st.type} onPress={() => goJournal(st.filter)} accessibilityRole="button" accessibilityLabel={`${st.main}, ${st.sub}. מעבר ליומן`} style={styles.stat}>
            <ActivityBadge type={st.type} size={36} soft />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>{st.main}</Text>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{st.sub}</Text>
            </View>
          </PressScale>
        ))}
      </Rise>

      {/* Everything beyond the daily tracking, one tap away */}
      <Rise index={4} style={{ gap: spacing.md }}>
        <SectionHeader title={`עוד על ${child.name}`} />
        <View style={styles.shortcuts}>
          {shortcuts.map((sc) => (
            <PressScale key={sc.href} onPress={() => router.push(sc.href)} accessibilityRole="button" accessibilityLabel={sc.label} scaleTo={0.94} style={styles.shortcut}>
              <View style={[styles.shortcutIcon, { backgroundColor: sc.bg }]}><sc.icon size={24} color={sc.ink} strokeWidth={1.9} /></View>
              <Text variant="caption" center numberOfLines={2} style={{ fontWeight: '600' }}>{sc.label}</Text>
            </PressScale>
          ))}
        </View>
        {highlights.length > 0 ? (
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
        ) : null}
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

      <BabyLookPicker child={child} open={pickOpen} onClose={() => setPickOpen(false)} />
      <QuickLog kind={quick} onClose={() => setQuick(null)} childId={child.id} routine={routine} activeSleep={activeSleep ?? null} />
      {onClip ? null : <BabyCustomizeSheet child={child} now={now} open={lookOpen} onClose={() => setLookOpen(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  bellDot: { position: 'absolute', top: 10, end: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white },
  wash: { position: 'absolute', top: -80, start: -40, end: -40, height: 185 },
  topEnd: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  childPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, maxWidth: 170, backgroundColor: colors.surface, borderRadius: 22, paddingStart: 6, paddingEnd: spacing.md, ...shadow.card },
  stageText: { paddingHorizontal: spacing.xs, zIndex: 1 },
  // A solid canvas behind the clip: the clip is blended against it (see BabyClip).
  stageBaby: { marginTop: -spacing.lg, alignItems: 'center', justifyContent: 'flex-end', height: 320, backgroundColor: colors.background },
  bubbleIcon: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lookBtn: { position: 'absolute', bottom: 0, end: 0, width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  pick: { alignSelf: 'center', minHeight: 36, justifyContent: 'center' },
  moodLine: { alignSelf: 'center', marginTop: spacing.xs },
  sinceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  since: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, ...shadow.card },
  next: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 22, padding: spacing.md, paddingEnd: spacing.lg, ...shadow.card },
  dock: { flexDirection: 'row', justifyContent: 'space-between' },
  dockItem: { alignItems: 'center', gap: 6, flex: 1 },
  dockIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: 18, padding: spacing.sm, paddingEnd: spacing.md },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  shortcut: { flex: 1, alignItems: 'center', gap: 6 },
  shortcutIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  highlightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  firstRun: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
