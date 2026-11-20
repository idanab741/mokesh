import { CloudOff, GitCompareArrows } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityBadge } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, shadow, spacing } from '@/design/tokens';
import type { ActivityEvent } from '@/domain/activity';
import { eventDetail, eventTitle } from '@/i18n/he';
import { formatTime, isSameDay, ltr } from '@/lib/time';

/** One line in a timeline. `day` lets a sleep that crosses midnight explain itself. */
export function EventRow({ event, onPress, now, day, showSync, isLast, card }: {
  event: ActivityEvent;
  onPress: () => void;
  now: Date;
  day?: Date;
  showSync?: boolean;
  isLast?: boolean;
  /** Stand-alone white card (journal) instead of a row on a shared rail (Home). */
  card?: boolean;
}) {
  const start = new Date(event.startedAt ?? event.occurredAt);
  const end = event.endedAt ? new Date(event.endedAt) : null;
  const detail = eventDetail(event, now);
  let timeText = formatTime(new Date(event.occurredAt));
  let crossNote: string | null = null;
  if (event.type === 'sleep') {
    timeText = end ? ltr(`${formatTime(start)}–${formatTime(end)}`) : formatTime(start);
    if (day && !isSameDay(start, day)) crossNote = 'התחילה ביום הקודם';
    else if (day && end && !isSameDay(end, day)) crossNote = 'נמשכה ליום הבא';
  }
  const title = eventTitle(event);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${timeText}${detail ? `, ${detail}` : ''}`}
      accessibilityHint="פתיחת הרשומה לעריכה"
      style={({ pressed }) => [styles.row, card && styles.card, pressed && { opacity: 0.7 }]}>
      <View style={styles.rail}>
        <ActivityBadge type={event.type} size={42} />
        {!isLast && !card ? <View style={styles.line} /> : null}
      </View>
      <View style={[styles.body, card && { paddingBottom: 0 }]}>
        <View style={styles.top}>
          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{title}</Text>
          {showSync && event.syncStatus === 'conflict' ? <GitCompareArrows size={16} color={colors.danger} accessibilityLabel="נדרשת הכרעה בין שתי גרסאות" /> : null}
          {showSync && event.syncStatus === 'pending' ? <CloudOff size={15} color={colors.textSecondary} accessibilityLabel="עדיין לא סונכרן" /> : null}
          <Text variant="label" color={colors.textSecondary} style={styles.time}>{timeText}</Text>
        </View>
        {detail ? <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{detail}</Text> : null}
        {crossNote ? <Text variant="caption" color={colors.textSecondary}>{crossNote}</Text> : null}
        {event.notes && event.type !== 'other' ? <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>״{event.notes}״</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, minHeight: 64 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.md, marginBottom: spacing.sm, alignItems: 'center', ...shadow.card, shadowOpacity: 0.05 },
  rail: { alignItems: 'center', width: 42 },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4, borderRadius: 1 },
  body: { flex: 1, paddingBottom: spacing.lg, gap: 2, paddingTop: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: {},
});
