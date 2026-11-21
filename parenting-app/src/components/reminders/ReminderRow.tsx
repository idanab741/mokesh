import { Baby, Bell, CalendarHeart, Check, Clock, Droplet } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, spacing, themed } from '@/design/tokens';
import { type Reminder, type ReminderKind, clockText, dayKey } from '@/domain/reminders';

const KIND_ICON: Record<ReminderKind, typeof Bell> = { feed: Baby, diaper: Droplet, visit: CalendarHeart, daily: Clock };

export function whenText(r: Reminder, now: Date): string {
  const time = clockText(r.at.getHours(), r.at.getMinutes());
  return dayKey(r.at) === dayKey(now) ? time : `מחר ${time}`;
}

/** One reminder: what it is, when, and a way to say it was taken care of. */
export function ReminderRow({ reminder, now, due, onDone }: { reminder: Reminder; now: Date; due: boolean; onDone?: () => void }) {
  const Icon = KIND_ICON[reminder.kind];
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, due && { backgroundColor: colors.primaryStrong }]}><Icon size={18} color={due ? colors.white : colors.primaryStrong} strokeWidth={2} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={colors.ink}>{reminder.title}</Text>
        <Text variant="caption" color={colors.textSecondary}>{due ? reminder.body : `${whenText(reminder, now)} · ${reminder.body}`}</Text>
      </View>
      {onDone ? (
        <Pressable onPress={onDone} accessibilityRole="button" accessibilityLabel={`סימון ${reminder.title} כבוצע`} hitSlop={8} style={styles.doneBtn}>
          <Check size={16} color={colors.primaryStrong} strokeWidth={2.6} />
          <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '700' }}>בוצע</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, minHeight: 40, borderRadius: 20, backgroundColor: colors.primaryLight },
}));
