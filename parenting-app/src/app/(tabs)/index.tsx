import { router } from 'expo-router';
import { Bell, ChevronDown, Moon, Plus, Sparkles, Sun, Sunrise, Sunset } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { EventRow } from '@/components/activity/EventRow';
import { Avatar } from '@/components/Avatar';
import { BottleIcon, DiaperIcon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/overlays';
import { ActivityBadge, Button, Card, EmptyState, IconButton, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing } from '@/design/tokens';
import type { ActivityType, FilterKey } from '@/domain/activity';
import { formatAgeWithSex } from '@/domain/age';
import { summarizeDay } from '@/domain/summary';
import { useActiveChild, useEventMutations, useEventsBetween, useLastBottle, useNow, useRecentEvents, useUnsynced } from '@/hooks/data';
import { diaperKindLabel, errorMessage, milkTypeLabel, sleepingWord } from '@/i18n/he';
import { formatClock, formatDateLong, formatDuration, formatRelative, formatTime, greetingForHour, ltr } from '@/lib/time';
import { useSession } from '@/state/session';
import { useUi } from '@/state/ui';

function greetingIcon(hour: number) {
  if (hour >= 5 && hour < 12) return Sunrise;
  if (hour >= 12 && hour < 17) return Sun;
  if (hour >= 17 && hour < 21) return Sunset;
  return Moon;
}

function TrackerCard({ type, title, metric, detail, onPress, onAdd, addLabel }: {
  type: ActivityType; title: string; metric: string; detail: string; onPress: () => void; onAdd: () => void; addLabel: string;
}) {
  const tone = activityTones[type];
  return (
    <Card onPress={onPress} style={styles.tracker} accessibilityLabel={`${title}: ${metric}. ${detail}`}>
      <View style={styles.trackerTop}>
        <ActivityBadge type={type} size={40} />
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={addLabel} hitSlop={10}
          style={({ pressed }) => [styles.trackerAdd, { backgroundColor: tone.bg }, pressed && { opacity: 0.6 }]}>
          <Plus size={18} color={tone.ink} strokeWidth={2.4} />
        </Pressable>
      </View>
      <Text variant="label" color={colors.textSecondary} numberOfLines={1}>{title}</Text>
      <Text variant="metric" numberOfLines={1} adjustsFontSizeToFit>{metric}</Text>
      <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{detail}</Text>
    </Card>
  );
}

function QuickAction({ label, onPress, children, tone }: { label: string; onPress: () => void; children: React.ReactNode; tone: { bg: string; ink: string } }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.quick, { backgroundColor: tone.bg }, pressed && { opacity: 0.7 }]}>
      {children}
      <Text variant="label" color={tone.ink} style={{ fontFamily: 'Heebo_600SemiBold', flexShrink: 1 }} numberOfLines={1}>{label}</Text>
    </Pressable>
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
  const recent = useRecentEvents(child?.id, 6);
  const lastBottle = useLastBottle(child?.id);
  const unsynced = useUnsynced();
  const { create, remove, endSleep } = useEventMutations();

  const summary = summarizeDay(today.data ?? [], now, now);
  const activeSleep = summary.sleep.active;
  const tick = useNow(1000, !!activeSleep);
  if (!child) return <Screen><View /></Screen>;

  const GreetingIcon = greetingIcon(now.getHours());
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

  return (
    <Screen scroll>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.greeting}>
            <GreetingIcon size={20} color={colors.primary} strokeWidth={1.9} />
            <Text variant="title" accessibilityRole="header">{greetingForHour(now.getHours())}</Text>
          </View>
          <Text variant="label" color={colors.textSecondary}>{formatDateLong(now)}</Text>
        </View>
        <IconButton icon={Bell} label={hasConflicts ? 'עדכונים, יש פריטים שדורשים תשומת לב' : 'עדכונים'} tone="surface"
          badge={hasConflicts} onPress={() => router.push('/updates')} />
      </View>

      {/* Child */}
      <Pressable onPress={openChildSheet} accessibilityRole="button"
        accessibilityLabel={`${child.name}, ${formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}`}
        accessibilityHint={children.length > 1 ? 'מעבר בין ילדים' : 'ניהול ילדים'}
        style={({ pressed }) => [styles.child, pressed && { opacity: 0.8 }]}>
        <Avatar name={child.name} uri={child.photoUri} size={56} />
        <View style={{ flex: 1 }}>
          <Text variant="heading">{child.name}</Text>
          <Text variant="label" color={colors.textSecondary}>{formatAgeWithSex(child.birthDate, child.sex, now) ?? ''}</Text>
        </View>
        <View style={styles.switch}>
          <ChevronDown size={18} color={colors.primaryStrong} strokeWidth={2.2} />
        </View>
      </Pressable>

      {/* Running sleep */}
      {activeSleep ? (
        <View style={styles.sleepBanner} accessibilityRole="timer">
          <ActivityBadge type="sleep" size={44} />
          <View style={{ flex: 1 }}>
            <Text variant="label" color={activityTones.sleep.ink}>{child.name} {sleepingWord(child.sex)}</Text>
            <Text variant="title" color={activityTones.sleep.ink} style={{ writingDirection: 'ltr' }}>
              {formatClock((tick.getTime() - Date.parse(activeSleep.startedAt ?? activeSleep.occurredAt)) / 1000)}
            </Text>
          </View>
          <Button label="סיום שינה" size="md" onPress={stopSleep} loading={endSleep.isPending} style={{ backgroundColor: activityTones.sleep.ink }} />
        </View>
      ) : null}

      {/* Trackers */}
      <View style={styles.grid}>
        <TrackerCard type="bottle" title="האכלות" metric={f.count === 1 ? 'האכלה אחת' : `${f.count} האכלות`} detail={feedingDetail}
          onPress={() => goJournal('feeding')} onAdd={() => openActivityForm('bottle')} addLabel="הוספת האכלה" />
        <TrackerCard type="sleep" title="שינה" metric={s.minutes > 0 ? formatDuration(s.minutes) : '0 ד׳'} detail={sleepDetail}
          onPress={() => goJournal('sleep')} onAdd={() => openActivityForm('sleep', activeSleep?.id)} addLabel="הוספת שינה" />
        <TrackerCard type="diaper" title="חיתולים" metric={d.count === 1 ? 'החלפה אחת' : `${d.count} החלפות`} detail={diaperDetail}
          onPress={() => goJournal('diaper')} onAdd={() => openActivityForm('diaper')} addLabel="הוספת חיתול" />
        <TrackerCard type="solids" title="מוצקים" metric={so.count === 1 ? 'ארוחה אחת' : `${so.count} ארוחות`} detail={solidsDetail}
          onPress={() => goJournal('solids')} onAdd={() => openActivityForm('solids')} addLabel="הוספת ארוחה" />
      </View>

      {/* One-tap actions */}
      <SectionHeader title="תיעוד בלחיצה" />
      <View style={styles.quickRow}>
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
      </View>

      {/* Recent activity */}
      <SectionHeader title="פעילות אחרונה"
        action={recent.data && recent.data.length > 0 ? (
          <Pressable onPress={() => router.push('/(tabs)/journal')} accessibilityRole="link" hitSlop={12}>
            <Text variant="label" color={colors.primaryStrong}>ליומן המלא</Text>
          </Pressable>
        ) : undefined} />
      {isBrandNew ? (
        <Card>
          <EmptyState icon={Sparkles} title={`מתחילים לתעד את ${child.name}`}
            body="בקבוק, חיתול או שינה – כל תיעוד יופיע כאן ויצטרף לסיכום היומי."
            actionLabel="תיעוד ראשון" onAction={openAddSheet} />
        </Card>
      ) : (
        <Card style={{ paddingBottom: 0 }}>
          {(recent.data ?? []).map((event, i, all) => (
            <EventRow key={event.id} event={event} now={now} isLast={i === all.length - 1} showSync={!!user}
              onPress={() => openActivityForm(event.type, event.id)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  child: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  switch: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sleepBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: activityTones.sleep.bg, borderRadius: radius.xl, padding: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tracker: { flexBasis: '47%', flexGrow: 1, gap: 2, minHeight: 160 },
  trackerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  trackerAdd: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quick: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: radius.pill, flexGrow: 1, justifyContent: 'center' },
});
