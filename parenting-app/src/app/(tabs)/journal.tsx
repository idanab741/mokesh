import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { EventRow } from '@/components/activity/EventRow';
import { Chip, EmptyState, IconButton, Screen } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { type FilterKey, matchesFilter } from '@/domain/activity';
import { eventsForDay, summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventsBetween, useNow } from '@/hooks/data';
import { filterLabel } from '@/i18n/he';
import { addDays, dayKey, formatDateFull, formatDayLabel, formatDuration, isSameDay, startOfDay, weekdayShort } from '@/lib/time';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

const FILTERS: FilterKey[] = ['all', 'feeding', 'sleep', 'diaper', 'solids', 'other'];

export default function JournalScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const { child } = useActiveChild();
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
    <Screen>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">יומן</Text>
        {!isToday ? (
          <Pressable onPress={() => setDay(startOfDay(new Date()))} accessibilityRole="button" style={styles.todayBtn} hitSlop={8}>
            <Text variant="label" color={colors.primaryStrong}>חזרה להיום</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.dateNav}>
        <IconButton icon={ChevronRight} label="היום הקודם" tone="surface" onPress={() => setDay(addDays(day, -1))} />
        <View style={{ flex: 1, alignItems: 'center' }} accessibilityLiveRegion="polite">
          <Text variant="heading">{formatDayLabel(day, now)}</Text>
          <Text variant="caption" color={colors.textSecondary}>{formatDateFull(day)}</Text>
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

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => <Chip key={f} label={filterLabel[f]} selected={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={dayEvents.length > 0 ? (
          <View style={styles.totals} accessibilityLabel="סיכום היום">
            {totals.map((t) => (
              <View key={t.label} style={{ alignItems: 'center', flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>{t.value}</Text>
                <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{t.label}</Text>
              </View>
            ))}
          </View>
        ) : undefined}
        renderItem={({ item, index }) => (
          <EventRow event={item} now={now} day={day} showSync={!!user} isLast={index === visible.length - 1}
            onPress={() => openActivityForm(item.type, item.id)} />
        )}
        ListEmptyComponent={query.isLoading ? undefined : (
          <EmptyState icon={CalendarDays}
            title={dayEvents.length === 0 ? (isToday ? 'עוד אין תיעוד היום' : 'אין תיעוד ביום הזה') : `אין ${filterLabel[filter]} ביום הזה`}
            body={dayEvents.length === 0 ? 'כל פעילות שתתועד תופיע כאן לפי סדר השעות.' : 'אפשר לבחור סינון אחר או להוסיף תיעוד.'}
            actionLabel={isToday ? 'הוספת פעילות' : undefined} onAction={isToday ? openAddSheet : undefined} />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, minHeight: 52 },
  todayBtn: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill, justifyContent: 'center' },
  dateNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, gap: spacing.md },
  strip: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  stripDay: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, minHeight: 56, justifyContent: 'center' },
  stripDaySelected: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  filters: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 140, flexGrow: 1 },
  totals: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, marginBottom: spacing.lg },
});
