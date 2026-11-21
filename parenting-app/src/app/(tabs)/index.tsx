import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CalendarClock, ChevronDown, ChevronLeft, ClipboardList, HeartPulse, type LucideIcon, Moon, Palette, Pill, Sparkles, Square, Users, Utensils, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Album, Companion, SterilizeCard, SterilizeSheet } from '@/components/home/Companion';
import { Ring } from '@/components/home/Ring';
import { SpotlightTour, type TourStep } from '@/components/tour/SpotlightTour';
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
import { type Advice, buildAdvice } from '@/domain/advisor';
import { computeRangeStats } from '@/domain/stats';
import { sterilizeState } from '@/domain/sterilize';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventsBetween, useAppTheme, useHealth, useMilestones, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
import { diaperKindLabel, sleepingWord } from '@/i18n/he';
import { formatDateShort, formatRelative, addDays, formatClock, formatDateLong, formatDuration, formatTime, greetingForHour } from '@/lib/time';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

/** Marks an element as a stop of the tour (the web build reads it as data-tour). */
const tourTarget = (name: string) => ({ dataSet: { tour: name } }) as object;

const tourSteps = (name: string): TourStep[] => [
  { hero: true, pose: 'wave', title: 'ברוכים הבאים!', text: `אני לילי. חצי דקה ואראה לכם מה יש כאן, ואז נתחיל לתעד את ${name}.`, button: 'יאללה, מתחילים' },
  { target: 'baby', radius: 52, pose: 'heart', title: `הדמות של ${name}`, text: 'היא גדלה יחד עם הילד: שוכבת, זוחלת ועומדת. אפשר להחליף דמות וצבע בהגדרות.' },
  { target: 'lili', pose: 'point', title: 'כאן אני מדברת', text: 'אגיד מה קורה עכשיו ומה שווה לתעד, ואציע כפתור אחד שעושה את זה.' },
  { target: 'needs', radius: 30, pose: 'point', title: 'שינה, אוכל, חיתול', text: 'כרטיס לכל אחד משלושת הדברים שהיום בנוי מהם, כמו זה של השינה. הפלוס מתעד בשתי לחיצות, והטבעת מתמלאת ככל שמתקרב הזמן הרגיל שלכם.' },
  { target: 'sterilizer', pose: 'think', title: 'סטריליזטור', text: 'רושמים מתי הופעל, ואני סופרת כמה בקבוקים נקיים נשארו.' },
  { target: 'album', pose: 'cheer', title: 'האלבום', text: 'חיוך ראשון, שן ראשונה, צעד ראשון. כל רגע שתופסים נשמר כאן.' },
  { target: 'tab-add', radius: 40, pose: 'point', title: 'הפלוס הגדול', text: 'מכל מסך, פותח את כל סוגי התיעוד: גם הנקה, שאיבה ומוצקים.' },
  { target: 'tabs', radius: 34, pose: 'point', title: 'הסרגל התחתון', text: 'בית, יומן היום, נתונים, וכל מה שנוגע לילד. אפשר גם לגרור עליו את האצבע.' },
  { hero: true, pose: 'cheer', title: 'זהו, אתם מוכנים', text: 'נתחיל מארבעה דברים קטנים שיעזרו לי להכיר אתכם. אני אלווה אתכם בכל אחד.', button: 'מתחילים' },
];

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
  const [sterOpen, setSterOpen] = useState(false);
  // Shown once per device: the tour of the screen, and Lili's first steps (which ones were put off).
  const { kv } = useServices();
  const [tourOpen, setTourOpen] = useState(false);
  const [skipped, setSkipped] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([kv.get('tour_home_done'), kv.get('lili_setup_skipped')]).then(([done, skip]) => {
      if (!live) return;
      setTourOpen(!done);
      setSkipped(skip ? skip.split(',') : []);
    });
    return () => { live = false; };
  }, [kv]);
  const endTour = () => { setTourOpen(false); void kv.set('tour_home_done', '1'); };
  const skipSetup = (id: string) => { const next = [...(skipped ?? []), id]; setSkipped(next); void kv.set('lili_setup_skipped', next.join(',')); };
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

  // The family's own usual day, from the seven days before today (only once three of them have records).
  const usualDay = useMemo(() => {
    const st = computeRangeStats(month.data ?? [], addDays(now, -7), addDays(now, -1), now);
    return st.daysWithData >= 3 ? st.averages : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.data]);
  const lastDirty = (month.data ?? []).filter((e) => e.type === 'diaper' && e.deletedAt === null && e.payload.kind !== 'wet')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const nextAt = (kind: 'feed' | 'sleep' | 'wake' | 'diaper') => { const p = predictions.find((x) => x.kind === kind); return p ? formatTime(p.at) : null; };
  // The three things a baby's day is made of. Each says where things stand, what the day adds up to, and how that compares with this family's own usual day.
  const needs: { type: ActivityType; title: string; a11y: string; status: string; facts: string[]; ring: number | null; onPress: () => void; filter: FilterKey }[] = [
    {
      type: 'sleep', title: 'שינה', a11y: activeSleep ? 'סיום שינה' : 'התחלת שינה', filter: 'sleep', ring: ringOf.sleep, onPress: () => setQuick('sleep'),
      status: activeSleep && sleepStart ? `${child.name} ${sleepingWord(child.sex)} כבר ${formatClock((tick.getTime() - sleepStart.getTime()) / 1000)}${nextAt('wake') ? ` · התעוררות בסביבות ${nextAt('wake')}` : ''}`
        : awakeFor ? `${child.sex === 'female' ? 'ערה' : child.sex === 'male' ? 'ער' : 'ערות'} ${awakeFor}${nextAt('sleep') ? ` · השינה הבאה בסביבות ${nextAt('sleep')}` : ''}` : 'עוד לא תועדה שינה',
      facts: [`${s.minutes > 0 ? formatDuration(s.minutes) : '0 ד׳'} היום`, ...(usualDay?.sleepMinPerDay ? [`אצלכם בדרך כלל ${formatDuration(usualDay.sleepMinPerDay)}`] : [])],
    },
    {
      type: 'bottle', title: 'אוכל', a11y: 'תיעוד האכלה', filter: 'feeding', ring: ringOf.bottle, onPress: () => setQuick('feed'),
      status: bubbles[0].value ? `${bubbles[0].value === 'עכשיו' ? (child.sex === 'female' ? 'אכלה עכשיו' : child.sex === 'male' ? 'אכל עכשיו' : 'האכלה עכשיו') : `האכלה אחרונה לפני ${bubbles[0].value}`}${nextAt('feed') ? ` · הבאה בסביבות ${nextAt('feed')}` : ''}` : 'עוד לא תועדה האכלה',
      facts: [`${f.count === 1 ? 'האכלה אחת' : `${f.count} האכלות`} היום`, ...(f.totalMl > 0 ? [`${f.totalMl} מ״ל בבקבוק`] : []),
        ...(so.count > 0 ? [so.count === 1 ? 'ארוחת מוצקים אחת' : `${so.count} ארוחות מוצקים`] : []),
        ...(routine.feed.gapMin ? [`אצלכם כל ${formatDuration(routine.feed.gapMin)} בערך`] : [])],
    },
    {
      type: 'diaper', title: 'חיתול', a11y: 'תיעוד חיתול', filter: 'diaper', ring: ringOf.diaper, onPress: () => setQuick('diaper'),
      status: bubbles[2].value ? `${bubbles[2].value === 'עכשיו' ? 'הוחלף עכשיו' : `הוחלף לפני ${bubbles[2].value}`}${nextAt('diaper') ? ` · הבא בסביבות ${nextAt('diaper')}` : ''}` : 'עוד לא תועדה החלפה',
      facts: [`${d.count === 1 ? 'החלפה אחת' : `${d.count} החלפות`} היום`, ...(lastDirty ? [`יציאה אחרונה: ${formatRelative(new Date(lastDirty.occurredAt), now)}`] : []),
        ...(usualDay?.diapersPerDay ? [`אצלכם בדרך כלל ${Math.round(usualDay.diapersPerDay)} ביום`] : [])],
    },
  ];

  // Lili, the companion: one thing worth saying now, built only from the diary and this family's routine.
  const sterilize = useMemo(() => sterilizeState(month.data ?? []), [month.data]);
  const marked = moments.data ?? [];
  const latestMoment = marked.find((m) => m.achievedOn) ?? null;
  // Lili's first steps with a new family: a photo, the last sleep, the last feeding, the last diaper.
  // Each says why it helps. A step is done once its record exists, and can be put off.
  const all = month.data ?? [];
  const setupSteps: { id: string; done: boolean; pose: Advice['pose']; text: string; label: string; go: () => void }[] = [
    { id: 'photo', done: !!child.photoUri, pose: 'wave', label: 'הוספת תמונה', go: () => router.push({ pathname: '/child/edit', params: { id: child.id } }),
      text: `נעים מאוד, אני לילי! בואו נתחיל מתמונה של ${child.name}. היא תופיע ליד השם, וכל מי שמטפל יחד איתכם יזהה מיד על מי מדובר.` },
    { id: 'sleep', done: all.some((e) => e.type === 'sleep'), pose: 'sleep', label: 'תיעוד השינה האחרונה', go: () => openActivityForm('sleep'),
      text: `מתי ${child.name} ${child.sex === 'female' ? 'ישנה' : child.sex === 'male' ? 'ישן' : 'ישנו'} בפעם האחרונה? כשאדע, אספור כמה זמן עבר בערות ואלמד מתי מגיעה אצלכם השינה הבאה.` },
    { id: 'feed', done: all.some((e) => e.type === 'bottle' || e.type === 'nursing'), pose: 'point', label: 'תיעוד ההאכלה האחרונה', go: () => setQuick('feed'),
      text: 'ומתי הייתה ההאכלה האחרונה? מכאן אלמד כל כמה זמן אוכלים אצלכם וכמה, ואדע לומר מתי בדרך כלל מגיעה הבאה.' },
    { id: 'diaper', done: all.some((e) => e.type === 'diaper'), pose: 'think', label: 'תיעוד החיתול האחרון', go: () => setQuick('diaper'),
      text: 'ואחרון: החיתול. כך תמיד תדעו מתי הוחלף ומתי הייתה היציאה האחרונה, גם כשמישהו אחר החליף.' },
  ];
  const setupIndex = skipped === null ? -1 : setupSteps.findIndex((st) => !st.done && !skipped.includes(st.id));
  const setup = setupIndex >= 0 ? setupSteps[setupIndex] : null;

  const routineAdvice = buildAdvice({
    childName: child.name, sex: child.sex, now,
    eventsToday: (today.data ?? []).length, totalEvents: (month.data ?? []).length,
    asleepMin: activeSleep && sleepStart ? Math.max(0, (now.getTime() - sleepStart.getTime()) / 60_000) : null,
    awakeMin: routine.sleep.lastWakeAt ? Math.max(0, (now.getTime() - routine.sleep.lastWakeAt.getTime()) / 60_000) : null,
    routine, predictions, sterilize, usesBottles: routine.feed.bottleMl !== null,
    moments: { count: marked.length, latestTitle: latestMoment?.title ?? null,
      latestDaysAgo: latestMoment?.achievedOn ? Math.max(0, Math.round((now.getTime() - new Date(`${latestMoment.achievedOn}T12:00:00`).getTime()) / 86_400_000)) : null },
    sleepTodayMin: s.minutes, usualSleepMin: usualDay?.sleepMinPerDay ?? null,
  });
  const advice: Advice = setup ? { id: `setup-${setup.id}`, pose: setup.pose, text: setup.text, action: { label: setup.label, kind: 'feed' } } : routineAdvice;
  const onAdvice = () => {
    if (setup) { setup.go(); return; }
    const kind = advice.action?.kind;
    if (kind === 'feed') setQuick('feed'); else if (kind === 'sleep') setQuick('sleep'); else if (kind === 'diaper') setQuick('diaper');
    else if (kind === 'sterilize') setSterOpen(true); else if (kind === 'moments') router.push('/milestones');
  };

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
        <View style={styles.archRing} {...tourTarget('baby')}>
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
          <View {...tourTarget('lili')}>
            <Companion advice={advice} onAction={onAdvice} step={setup ? { index: setupIndex + 1, total: setupSteps.length, onSkip: () => skipSetup(setup.id) } : undefined} />
          </View>
        </Rise>

        <Rise index={2}>
          <Text variant="title" color={colors.ink} accessibilityRole="header">{`היום של ${child.name}`}</Text>
          <Text variant="label" color={colors.textSecondary}>שלושת הדברים שהיום של תינוק בנוי מהם.</Text>
        </Rise>

        <Rise index={3} style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.md }}>
          {needs.map((n, idx) => {
            const tone = activityTones[n.type];
            const Icon = activityIcons[n.type];
            return (
              <View key={n.type} style={[styles.need, { backgroundColor: tone.bg }]} {...(idx === 0 ? tourTarget('needs') : {})}>
                <View style={styles.needHead}>
                  <Pressable onPress={() => goJournal(n.filter)} accessibilityRole="button" accessibilityLabel={`${n.title}: ${n.status}. מעבר ליומן`} style={styles.needInfo}>
                    <Ring size={60} progress={n.ring} color={tone.ink} track="#FFFFFF">
                      {n.type === 'sleep' ? <Moon size={24} color={tone.ink} strokeWidth={1.9} /> : <Icon size={24} color={tone.ink} />}
                    </Ring>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading" color={tone.ink}>{n.title}</Text>
                      <Text variant="label" color={colors.ink}>{n.status}</Text>
                    </View>
                  </Pressable>
                  <PressScale onPress={n.onPress} accessibilityRole="button" accessibilityLabel={n.a11y} scaleTo={0.9} style={[styles.needAdd, { backgroundColor: tone.ink }]}>
                    {n.type === 'sleep' && activeSleep ? <Square size={20} color={colors.white} strokeWidth={2.6} /> : <Plus size={24} color={colors.white} strokeWidth={2.6} />}
                  </PressScale>
                </View>
                <View style={styles.facts}>
                  {n.facts.map((fact) => (
                    <View key={fact} style={styles.fact}><Text variant="caption" color={colors.ink} style={{ fontWeight: '600' }}>{fact}</Text></View>
                  ))}
                </View>
              </View>
            );
          })}
          </View>
          <Text variant="caption" color={colors.textSecondary} center>
            {anyLearned ? 'הטבעת מתמלאת ככל שמתקרבים לזמן הרגיל שלכם' : 'הטבעות יתחילו להתמלא אחרי כמה ימי תיעוד'}
          </Text>
        </Rise>

        {/* The gear, and the album of moments */}
        <Rise index={4} style={{ gap: spacing.md }}>
          <View {...tourTarget('sterilizer')}><SterilizeCard state={sterilize} now={now} onLog={() => setSterOpen(true)} /></View>
          <View {...tourTarget('album')}><Album marked={marked} sex={child.sex} name={child.name} onOpen={() => router.push('/milestones')} /></View>
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

      {tourOpen && focused ? <SpotlightTour steps={tourSteps(child.name)} onDone={endTour} /> : null}
      <SterilizeSheet open={sterOpen} onClose={() => setSterOpen(false)} childId={child.id} last={sterilize} />
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
  need: { borderRadius: 28, padding: spacing.md, gap: spacing.md },
  needHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  needInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  needAdd: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 4 },
  firstRun: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
}));
