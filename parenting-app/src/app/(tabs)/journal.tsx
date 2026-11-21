import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { EventRow } from '@/components/activity/EventRow';
import { Mascot } from '@/components/home/Companion';
import { activityIcons } from '@/components/ui/Icons';
import { Chip, EmptyState, IconButton, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, shadow, spacing, themed } from '@/design/tokens';
import { type ActivityType, type FilterKey, matchesFilter } from '@/domain/activity';
import { learnRoutine, predictNext } from '@/domain/routine';
import { eventsForDay, summarizeDay } from '@/domain/summary';
import { useActiveChild, useAppTheme, useEventsBetween, useNow } from '@/hooks/data';
import { filterLabel } from '@/i18n/he';
import { addDays, dayKey, formatDateFull, formatDayLabel, formatDuration, formatTime, isSameDay, startOfDay, weekdayShort } from '@/lib/time';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

const FILTERS: FilterKey[] = ['all', 'feeding', 'sleep', 'diaper', 'solids', 'other'];
const partOfDay = (hour: number) => (hour >= 5 && hour < 12 ? 'בוקר' : hour >= 12 && hour < 17 ? 'צהריים' : hour >= 17 && hour < 21 ? 'ערב' : 'לילה');

export default function JournalScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const { child } = useActiveChild();
  const theme = useAppTheme();
  const user = useSession((s) => s.user);
  const openAddSheet = useUi((s) => s.openAddSheet);
  const now = useNow(30_000);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [filter, setFilter] = useState<FilterKey>('all');

  // Arriving from a Home card ("האכלות" → journal filtered to feedings, today).
  useEffect(() => {
    if (params.filter && (FILTERS as string[]).includes(params.filter)) {
      setFilter(params.filter as FilterKey);
      setDay(startOfDay(new Date()));
    }
  }, [params.filter]);

  const query = useEventsBetween(child?.id, day, day);
  const dayEvents = useMemo(() => eventsForDay(query.data ?? [], day, now), [query.data, day, now]);
  const visible = useMemo(() => dayEvents.filter((e) => matchesFilter(e, filter)), [dayEvents, filter]);
  // Today's time line also shows what the family's own routine expects next, above "now".
  const recent = useEventsBetween(child?.id, addDays(now, -14), now);
  const expected = useMemo(() => {
    if (!isSameDay(day, now)) return [];
    const active = summarizeDay(recent.data ?? [], now, now).sleep.active;
    const routine = learnRoutine(recent.data ?? [], now);
    return predictNext(routine, now, active ? new Date(active.startedAt ?? active.occurredAt) : null)
      .filter((p) => p.minutesUntil > 0 && isSameDay(p.at, now))
      .filter((p) => filter === 'all' || (filter === 'feeding' && p.kind === 'feed') || (filter === 'sleep' && (p.kind === 'sleep' || p.kind === 'wake')) || (filter === 'diaper' && p.kind === 'diaper'))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.data, day, filter, now]);
  // Newest first, with a small heading whenever the part of the day changes.
  const rows = useMemo(() => {
    const out: ({ kind: 'header'; key: string; label: string } | { kind: 'event'; key: string; event: (typeof visible)[number]; last?: boolean }
      | { kind: 'expected'; key: string; type: ActivityType; label: string; at: Date } | { kind: 'now'; key: string })[] = [];
    const label2 = { feed: 'האכלה, לפי השגרה שלכם', sleep: 'שינה, לפי השגרה שלכם', wake: 'התעוררות, לפי השגרה שלכם', diaper: 'החלפת חיתול, לפי השגרה שלכם' } as const;
    for (const p of expected) out.push({ kind: 'expected', key: `x-${p.kind}`, type: p.kind === 'feed' ? 'bottle' : p.kind === 'diaper' ? 'diaper' : 'sleep', label: label2[p.kind], at: p.at });
    if (isSameDay(day, new Date()) && (visible.length > 0 || expected.length > 0)) out.push({ kind: 'now', key: 'now' });
    let last = '';
    for (const event of visible) {
      const at = new Date(event.occurredAt);
      const label = at.getTime() < startOfDay(day).getTime() ? 'מהיום הקודם' : partOfDay(at.getHours());
      if (label !== last) { out.push({ kind: 'header', key: `h-${label}`, label }); last = label; }
      out.push({ kind: 'event', key: event.id, event });
    }
    for (let k = out.length - 1; k >= 0; k -= 1) { const r = out[k]; if (r.kind === 'event') { r.last = true; break; } }
    return out;
  }, [visible, day, expected]);
  const summary = useMemo(() => summarizeDay(query.data ?? [], day, now), [query.data, day, now]);

  const isToday = isSameDay(day, now);
  // The strip shows the week ending on the selected day (or today), most recent first in RTL.
  const stripEnd = isToday ? day : addDays(day, Math.min(3, Math.round((startOfDay(now).getTime() - day.getTime()) / 86_400_000)));
  const strip = Array.from({ length: 7 }, (_, i) => addDays(stripEnd, i - 6));

  const totals = [
    { label: 'האכלות', value: String(summary.feeding.count) },
    { label: 'מ״ל', value: String(summary.feeding.totalMl) },
    { label: 'שינה', value: summary.sleep.minutes > 0 ? formatDuration(summary.sleep.minutes) : '–' },
    { label: 'חיתולים', value: String(summary.diaper.count) },
    { label: 'ארוחות', value: String(summary.solids.count) },
  ];

  return (
    <Screen wash={false}>
      {/* The same sky as Home behind the day picker; the day itself sits on the white sheet below. */}
      <LinearGradient colors={theme.sky} locations={[0, 0.5, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.sky} pointerEvents="none" />
      <View style={styles.header}>
        <Text variant="title" color={colors.ink} accessibilityRole="header">יומן</Text>
        {!isToday ? (
          <Pressable onPress={() => setDay(startOfDay(new Date()))} accessibilityRole="button" style={styles.todayBtn} hitSlop={8}>
            <Text variant="label" color={colors.primaryStrong}>חזרה להיום</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.dateNav}>
        <IconButton icon={ChevronRight} label="היום הקודם" tone="surface" onPress={() => setDay(addDays(day, -1))} />
        <View style={{ flex: 1, alignItems: 'center' }} accessibilityLiveRegion="polite">
          <Text variant="heading" color={colors.ink}>{formatDayLabel(day, now)}</Text>
          <Text variant="caption" color={theme.onSky}>{formatDateFull(day)}</Text>
        </View>
        <IconButton icon={ChevronLeft} label="היום הבא" tone="surface" onPress={() => setDay(addDays(day, 1))} disabled={isToday} />
      </View>

      <View style={styles.strip}>
        {strip.map((d) => {
          const selected = isSameDay(d, day);
          const future = d.getTime() > startOfDay(now).getTime();
          return (
            <Pressable key={dayKey(d)} disabled={future} onPress={() => setDay(d)} accessibilityRole="button"
              accessibilityState={{ selected, disabled: future }} accessibilityLabel={formatDayLabel(d, now)}
              style={[styles.stripDay, selected && styles.stripDaySelected, future && { opacity: 0.35 }]}>
              <Text variant="caption" color={selected ? colors.white : colors.textSecondary}>{weekdayShort(d)}</Text>
              <Text variant="bodyStrong" color={selected ? colors.white : colors.textPrimary}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sheet}>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => <Chip key={f} label={filterLabel[f]} selected={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        // A day is a few dozen rows at most: draw them all, so the whole day is there to scroll and to search.
        initialNumToRender={60}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={dayEvents.length > 0 ? (
          <View style={styles.totals} accessibilityLabel="סיכום היום">
            {totals.map((t) => (
              <View key={t.label} style={{ alignItems: 'center', flex: 1 }}>
                <Text variant="label" style={{ fontWeight: '700' }} numberOfLines={1}>{t.value}</Text>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{t.label}</Text>
              </View>
            ))}
          </View>
        ) : undefined}
        renderItem={({ item }) => {
          if (item.kind === 'header') return <Text variant="caption" color={colors.textSecondary} style={styles.partHeader} accessibilityRole="header">{item.label}</Text>;
          if (item.kind === 'now') {
            return (
              <View style={styles.nowRow} accessibilityLabel={`עכשיו, ${formatTime(now)}`}>
                <View style={styles.nowLine} /><Text variant="caption" color={colors.primaryStrong} style={{ fontWeight: '700' }}>{`עכשיו · ${formatTime(now)}`}</Text><View style={styles.nowLine} />
              </View>
            );
          }
          if (item.kind === 'expected') {
            const tone = activityTones[item.type];
            const Icon = activityIcons[item.type];
            return (
              <View style={styles.expRow} accessibilityLabel={`צפוי: ${item.label}, בסביבות ${formatTime(item.at)}`}>
                <Text variant="label" color={colors.textSecondary} style={styles.expTime}>{formatTime(item.at)}</Text>
                <View style={styles.expRail}><View style={[styles.expDot, { borderColor: tone.ink }]}><Icon size={18} color={tone.ink} /></View><View style={styles.expLine} /></View>
                <View style={styles.expBody}>
                  <Text variant="body" color={colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>{item.label}</Text>
                  <View style={styles.expTag}><Text variant="caption" color={colors.textSecondary} style={{ fontSize: 11 }}>צפוי</Text></View>
                </View>
              </View>
            );
          }
          return <EventRow timeline isLast={item.last} event={item.event} now={now} day={day} showSync={!!user} onPress={() => openActivityForm(item.event.type, item.event.id)} />;
        }}
        ListEmptyComponent={query.isLoading ? undefined : (
          <EmptyState icon={CalendarDays}
            title={dayEvents.length === 0 ? (isToday ? 'עוד אין תיעוד היום' : 'אין תיעוד ביום הזה') : `אין ${filterLabel[filter]} ביום הזה`}
            body={dayEvents.length === 0 ? 'כל פעילות שתתועד תופיע כאן לפי סדר השעות.' : 'אפשר לבחור סינון אחר או להוסיף תיעוד.'}
            actionLabel={isToday ? 'הוספת פעילות' : undefined} onAction={isToday ? openAddSheet : undefined} />
        )}
      />
      </View>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  sky: { position: 'absolute', top: -120, start: 0, end: 0, height: 520 },
  sheet: { flex: 1, paddingTop: spacing.lg, backgroundColor: '#FDFBFA', borderTopLeftRadius: 34, borderTopRightRadius: 34, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, minHeight: 52 },
  todayBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill, justifyContent: 'center' },
  dateNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.md },
  strip: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  stripDay: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.7)', minHeight: 60, justifyContent: 'center' },
  stripDaySelected: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  filters: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 140, flexGrow: 1 },
  partHeader: { fontWeight: '700', marginTop: spacing.xs, marginBottom: spacing.sm, marginStart: 56, letterSpacing: 0.3 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  nowLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.primaryStrong, opacity: 0.45 },
  expRow: { flexDirection: 'row', gap: spacing.md, minHeight: 54 },
  expTime: { width: 44, paddingTop: 9, textAlign: 'left', writingDirection: 'ltr' },
  expRail: { alignItems: 'center', width: 38 },
  expDot: { width: 38, height: 38, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  expLine: { flex: 1, width: 2, marginVertical: 4, borderRadius: 1, backgroundColor: colors.border },
  expBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 38 },
  expTag: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  totals: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 22, paddingVertical: spacing.md, marginBottom: spacing.sm, ...shadow.card, shadowOpacity: 0.05 },
}));
