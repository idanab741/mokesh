import { ChartColumn, ChevronLeft, ChevronRight, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart, type BarDatum } from '@/components/charts/BarChart';
import { DateField } from '@/components/ui/inputs';
import { Sheet } from '@/components/ui/overlays';
import { ActivityBadge, Button, Card, EmptyState, IconButton, Notice, Screen, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing } from '@/design/tokens';
import type { ActivityType } from '@/domain/activity';
import { NIGHT_END_HOUR, NIGHT_START_HOUR, type RangeStats, compare, computeRangeStats, formatMinutesOfDay, previousRange } from '@/domain/stats';
import { useActiveChild, useEventsBetween, useFoodHistory, useNow } from '@/hooks/data';
import { addDays, dayKey, formatDateFull, formatDateShort, formatDayLabel, formatDuration, ltr, parseDayKey, startOfDay, weekdayShort } from '@/lib/time';

type Mode = 'day' | 'week' | 'month' | 'custom';
const MODES = [
  { value: 'day', label: 'יום' },
  { value: 'week', label: 'שבוע' },
  { value: 'month', label: 'חודש' },
  { value: 'custom', label: 'מותאם' },
] as const;
const MAX_CUSTOM_DAYS = 92;
const NIGHT_RANGE = ltr(`${NIGHT_START_HOUR}:00–0${NIGHT_END_HOUR}:00`);

// Validated with the dataviz palette checker against the card surface (CVD ΔE 28, contrast ≥ 3:1).
const SLEEP_SERIES = [
  { label: `לילה (${NIGHT_RANGE})`, color: '#6450B0' },
  { label: 'יום', color: '#B5822A' },
];

const round1 = (n: number) => (Math.round(n * 10) / 10).toString();

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}>
      <Text variant="caption" color={colors.textSecondary} numberOfLines={1}>{label}</Text>
      <Text variant="metric" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint ? <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{hint}</Text> : null}
    </View>
  );
}

/** Change against the previous period. Deliberately neutral in colour: more or less is not "good" or "bad". */
function Delta({ current, previous, what }: { current: number | null; previous: number | null; what: string }) {
  const c = compare(current, previous);
  if (c.direction === 'none') {
    return <Text variant="caption" color={colors.textSecondary}>אין נתונים מהתקופה הקודמת להשוואה</Text>;
  }
  const Icon = c.direction === 'up' ? TrendingUp : c.direction === 'down' ? TrendingDown : Minus;
  const text = c.direction === 'same'
    ? `${what}: ללא שינוי לעומת התקופה הקודמת`
    : `${what}: ${Math.abs(c.percent!)}% ${c.direction === 'up' ? 'יותר' : 'פחות'} מהתקופה הקודמת`;
  return (
    <View style={styles.delta}>
      <Icon size={16} color={colors.textSecondary} strokeWidth={2} />
      <Text variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

function Section({ type, title, children, empty }: { type: ActivityType; title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.sectionHead}>
        <ActivityBadge type={type} size={36} />
        <Text variant="heading" accessibilityRole="header">{title}</Text>
      </View>
      {empty ? <Text color={colors.textSecondary}>לא תועד דבר בתקופה הזו.</Text> : children}
    </Card>
  );
}

function chartData(stats: RangeStats, pick: (b: RangeStats['days'][number]) => number[]): BarDatum[] {
  const n = stats.days.length;
  const every = n <= 8 ? 1 : n <= 16 ? 2 : Math.ceil(n / 7);
  return stats.days.map((b, i) => ({
    key: b.key,
    axisLabel: n <= 8 ? weekdayShort(b.date) : (n - 1 - i) % every === 0 ? formatDateShort(b.date) : '',
    fullLabel: `${weekdayShort(b.date)} ${formatDateShort(b.date)}`,
    values: pick(b),
  }));
}

function ChartOrNote({ show, children }: { show: boolean; children: React.ReactNode }) {
  return show ? <>{children}</> : <Notice text="אין מספיק נתונים לגרף – נדרשים לפחות שני ימים עם תיעוד בתקופה." />;
}

export default function StatsScreen() {
  const { child } = useActiveChild();
  const now = useNow(60_000);
  const today = startOfDay(now);
  const [mode, setMode] = useState<Mode>('week');
  const [end, setEnd] = useState(() => startOfDay(new Date()));
  const [custom, setCustom] = useState<{ from: Date; to: Date } | null>(null);
  const [sheet, setSheet] = useState(false);
  const [draftFrom, setDraftFrom] = useState<string | null>(dayKey(addDays(today, -13)));
  const [draftTo, setDraftTo] = useState<string | null>(dayKey(today));

  const range = useMemo(() => {
    if (mode === 'custom' && custom) return custom;
    const length = mode === 'day' ? 1 : mode === 'month' ? 30 : 7;
    return { from: addDays(end, -(length - 1)), to: end };
  }, [mode, end, custom]);
  const prev = useMemo(() => previousRange(range.from, range.to), [range]);
  const length = Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000) + 1;

  const query = useEventsBetween(child?.id, prev.from, range.to);
  const earlierFoods = useFoodHistory(child?.id, range.from.toISOString());
  const stats = useMemo(() => computeRangeStats(query.data ?? [], range.from, range.to, now), [query.data, range, now]);
  const before = useMemo(() => computeRangeStats(query.data ?? [], prev.from, prev.to, now), [query.data, prev, now]);

  const canForward = mode !== 'custom' && end.getTime() < today.getTime();
  const shift = (dir: 1 | -1) => {
    const next = addDays(end, dir * length);
    setEnd(next.getTime() > today.getTime() ? today : next);
  };
  const onMode = (m: Mode) => {
    if (m === 'custom') return setSheet(true);
    setMode(m);
  };

  const fromDate = draftFrom ? parseDayKey(draftFrom) : null;
  const toDate = draftTo ? parseDayKey(draftTo) : null;
  const customError = !fromDate || !toDate ? 'יש להזין שני תאריכים תקינים.'
    : fromDate > toDate ? 'תאריך ההתחלה צריך להיות לפני תאריך הסיום.'
    : toDate > today ? 'אי אפשר לבחור תאריך עתידי.'
    : (toDate.getTime() - fromDate.getTime()) / 86_400_000 + 1 > MAX_CUSTOM_DAYS ? `אפשר לבחור עד ${MAX_CUSTOM_DAYS} ימים.` : null;

  const rangeLabel = length === 1 ? formatDayLabel(range.to, now) : ltr(`${formatDateShort(range.from)} – ${formatDateShort(range.to)}`);
  const t = stats.totals;
  const a = stats.averages;
  const multiDay = length > 1;
  const knownBefore = new Set((earlierFoods.data ?? []).map((f) => f.name.trim().toLowerCase()));
  const newFoods = earlierFoods.data ? stats.foods.filter((f) => !knownBefore.has(f.name.trim().toLowerCase())) : [];
  const daysWith = (pick: (b: RangeStats['days'][number]) => number) => stats.days.filter((b) => pick(b) > 0).length;

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.md }}>
        <Text variant="title" accessibilityRole="header">נתונים</Text>
        <Text variant="label" color={colors.textSecondary}>{child ? `מה שתועד עבור ${child.name}` : ''}</Text>
      </View>

      <Segmented options={MODES} value={mode} onChange={onMode} />

      <View style={styles.rangeNav}>
        <IconButton icon={ChevronRight} label="התקופה הקודמת" tone="surface" onPress={() => shift(-1)} disabled={mode === 'custom'} />
        <View style={{ flex: 1, alignItems: 'center' }} accessibilityLiveRegion="polite">
          <Text variant="heading">{rangeLabel}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            {length === 1 ? formatDateFull(range.to) : `${length} ימים · תיעוד ב-${stats.daysWithData} מהם`}
          </Text>
        </View>
        <IconButton icon={ChevronLeft} label="התקופה הבאה" tone="surface" onPress={() => shift(1)} disabled={!canForward} />
      </View>

      {stats.daysWithData === 0 ? (
        <Card>
          <EmptyState icon={ChartColumn} title="אין נתונים בתקופה הזו"
            body="הסיכומים והגרפים נבנים רק ממה שתועד בפועל. אפשר לבחור תקופה אחרת או להתחיל לתעד." />
        </Card>
      ) : (
        <>
          <Section type="bottle" title="האכלות" empty={t.feedCount === 0}>
            <View style={styles.tiles}>
              <Tile label="האכלות" value={String(t.feedCount)} hint={multiDay && a.feedsPerDay !== null ? `${round1(a.feedsPerDay)} ביום בממוצע` : `${t.bottleCount} בקבוק · ${t.nursingCount} הנקה`} />
              <Tile label="סה״כ בבקבוק" value={`${t.bottleMl} מ״ל`} hint={a.mlPerBottle !== null ? `ממוצע ${Math.round(a.mlPerBottle)} מ״ל לבקבוק` : undefined} />
              {multiDay ? <Tile label="ממוצע יומי בבקבוק" value={a.bottleMlPerDay !== null ? `${Math.round(a.bottleMlPerDay)} מ״ל` : '–'} hint="בימים עם בקבוק" /> : null}
              {t.nursingCount > 0 ? <Tile label="זמן הנקה מתועד" value={formatDuration(t.nursingMin)} hint={`${t.nursingCount} הנקות`} /> : null}
            </View>
            <Delta current={t.bottleMl > 0 ? t.bottleMl : t.feedCount} previous={t.bottleMl > 0 ? before.totals.bottleMl : before.totals.feedCount}
              what={t.bottleMl > 0 ? 'כמות בבקבוק' : 'מספר האכלות'} />
            {multiDay && t.bottleMl > 0 ? (
              <ChartOrNote show={daysWith((b) => b.bottleMl) >= 2}>
                <Text variant="label" color={colors.textSecondary}>כמות בבקבוק לפי יום (מ״ל)</Text>
                <BarChart data={chartData(stats, (b) => [b.bottleMl])} series={[{ label: 'מ״ל', color: activityTones.bottle.ink }]}
                  formatValue={(v) => `${Math.round(v)} מ״ל`} formatTick={(v) => String(Math.round(v))}
                  summaryLabel={`גרף כמות בבקבוק לפי יום. סך הכול ${t.bottleMl} מ״ל ב-${length} ימים.`} />
              </ChartOrNote>
            ) : null}
          </Section>

          <Section type="sleep" title="שינה" empty={t.sleepMin === 0}>
            <View style={styles.tiles}>
              <Tile label="שינה מתועדת" value={formatDuration(t.sleepMin)} hint={multiDay && a.sleepMinPerDay !== null ? `${formatDuration(a.sleepMinPerDay)} ביום בממוצע` : undefined} />
              <Tile label="פרקי שינה" value={String(t.sleepEpisodes)} />
              <Tile label="שנת לילה" value={formatDuration(t.nightSleepMin)} hint={NIGHT_RANGE} />
              <Tile label="שנת יום" value={formatDuration(t.daySleepMin)} />
              <Tile label={multiDay ? 'שעת הירדמות ממוצעת' : 'שעת הירדמות'} value={a.bedtimeMin !== null ? formatMinutesOfDay(a.bedtimeMin) : '–'} hint="ההירדמות הראשונה אחרי 18:00" />
            </View>
            <Delta current={t.sleepMin} previous={before.totals.sleepMin} what="שינה מתועדת" />
            {multiDay ? (
              <ChartOrNote show={daysWith((b) => b.sleepMin) >= 2}>
                <Text variant="label" color={colors.textSecondary}>שעות שינה לפי יום</Text>
                <BarChart data={chartData(stats, (b) => [b.nightSleepMin / 60, b.daySleepMin / 60])} series={SLEEP_SERIES}
                  formatValue={(v) => formatDuration(v * 60)} formatTick={(v) => `${round1(v)} ש׳`}
                  summaryLabel={`גרף שעות שינה לפי יום, מחולק ללילה ויום. סך הכול ${formatDuration(t.sleepMin)}.`} />
              </ChartOrNote>
            ) : null}
          </Section>

          <Section type="diaper" title="חיתולים" empty={t.diaperCount === 0}>
            <View style={styles.tiles}>
              <Tile label="החלפות" value={String(t.diaperCount)} hint={multiDay && a.diapersPerDay !== null ? `${round1(a.diapersPerDay)} ביום בממוצע` : undefined} />
              <Tile label="רטוב" value={String(t.diaperWet)} />
              <Tile label="יציאה" value={String(t.diaperDirty)} />
              <Tile label="רטוב ויציאה" value={String(t.diaperBoth)} />
            </View>
            <Delta current={t.diaperCount} previous={before.totals.diaperCount} what="מספר החלפות" />
            {multiDay ? (
              <ChartOrNote show={daysWith((b) => b.diaperCount) >= 2}>
                <Text variant="label" color={colors.textSecondary}>החלפות לפי יום</Text>
                <BarChart data={chartData(stats, (b) => [b.diaperCount])} series={[{ label: 'החלפות', color: activityTones.diaper.ink }]}
                  formatValue={(v) => `${Math.round(v)} החלפות`} formatTick={(v) => (Number.isInteger(v) ? String(v) : '')}
                  summaryLabel={`גרף החלפות חיתול לפי יום. סך הכול ${t.diaperCount}.`} />
              </ChartOrNote>
            ) : null}
          </Section>

          <Section type="solids" title="מוצקים" empty={t.solidsCount === 0}>
            <View style={styles.tiles}>
              <Tile label="ארוחות" value={String(t.solidsCount)} hint={multiDay && a.solidsPerDay !== null ? `${round1(a.solidsPerDay)} ביום בממוצע` : undefined} />
              <Tile label="מזונות שתועדו" value={String(stats.foods.length)} />
              <Tile label="מזונות חדשים" value={earlierFoods.data ? String(newFoods.length) : '–'} hint="שלא תועדו לפני התקופה" />
            </View>
            <View style={styles.foods}>
              {stats.foods.map((f) => {
                const isNew = newFoods.some((n) => n.name === f.name);
                return (
                  <View key={f.name} style={[styles.food, isNew && { borderColor: activityTones.solids.ink }]}>
                    <Text variant="label">{f.name}{f.count > 1 ? ` ×${f.count}` : ''}</Text>
                    {isNew ? <Text variant="caption" color={activityTones.solids.ink}>חדש</Text> : null}
                    {f.isAllergen ? <Text variant="caption" color={colors.textSecondary}>סומן כאלרגן</Text> : null}
                  </View>
                );
              })}
            </View>
          </Section>

          <Notice text="הנתונים מציגים רק את מה שתועד באפליקציה. הם אינם הערכה רפואית ואינם מחליפים התייעצות עם רופא/ה או טיפת חלב." />
        </>
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="טווח תאריכים">
        <DateField label="מתאריך" value={draftFrom} onChange={setDraftFrom} />
        <DateField label="עד תאריך" value={draftTo} onChange={setDraftTo} error={customError} />
        <Button label="הצגת הנתונים" disabled={!!customError} onPress={() => {
          if (!fromDate || !toDate) return;
          setCustom({ from: fromDate, to: toDate });
          setMode('custom');
          setSheet(false);
        }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rangeNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.md, gap: 2 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  foods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  food: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
});
