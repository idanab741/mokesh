import { router } from 'expo-router';
import { BellOff, ChevronRight, CloudOff, GitCompareArrows } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { EventRow } from '@/components/activity/EventRow';
import { ActivityBadge, Button, Card, EmptyState, IconButton, Notice, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import { useActiveChild, useActiveSleep, useConflicts, useNow, useUnsynced } from '@/hooks/data';
import { sleepingWord } from '@/i18n/he';
import { formatDuration, formatTime } from '@/lib/time';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';

/** What needs the parent's attention right now. Everything here is derived from real state. */
export default function UpdatesScreen() {
  const { child } = useActiveChild();
  const { syncNow } = useServices();
  const user = useSession((s) => s.user);
  const sync = useSession((s) => s.sync);
  const now = useNow(30_000);
  const activeSleep = useActiveSleep(child?.id);
  const conflicts = useConflicts(child?.id);
  const unsynced = useUnsynced();
  const pending = user ? unsynced.data?.pending ?? 0 : 0;
  const sleep = activeSleep.data;
  const nothing = !sleep && (conflicts.data?.length ?? 0) === 0 && pending === 0;

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon={ChevronRight} label="חזרה" tone="surface" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
        <Text variant="title" accessibilityRole="header">עדכונים</Text>
      </View>

      {nothing ? <Card><EmptyState icon={BellOff} title="אין עדכונים כרגע" body="כאן יופיעו טיימר שינה פעיל, רשומות שממתינות לסנכרון ושינויים שדורשים הכרעה." /></Card> : null}

      {sleep && child ? (
        <Card onPress={() => openActivityForm('sleep', sleep.id)} style={styles.item} accessibilityLabel="טיימר שינה פעיל">
          <ActivityBadge type="sleep" />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{child.name} {sleepingWord(child.sex)}</Text>
            <Text variant="caption" color={colors.textSecondary}>
              מאז {formatTime(new Date(sleep.startedAt ?? sleep.occurredAt))} · {formatDuration((now.getTime() - Date.parse(sleep.startedAt ?? sleep.occurredAt)) / 60_000)}
            </Text>
          </View>
        </Card>
      ) : null}

      {(conflicts.data?.length ?? 0) > 0 ? (
        <>
          <SectionHeader title="דורש הכרעה" />
          <Notice tone="warning" icon={GitCompareArrows} text="הרשומות האלה שונו בשני מכשירים. שום דבר לא נדרס – פתחו כל רשומה ובחרו איזו גרסה להשאיר." />
          <Card style={{ paddingBottom: 0 }}>
            {conflicts.data!.map((e, i, all) => (
              <EventRow key={e.id} event={e} now={now} showSync isLast={i === all.length - 1} onPress={() => openActivityForm(e.type, e.id)} />
            ))}
          </Card>
        </>
      ) : null}

      {pending > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <View style={styles.item}>
            <CloudOff size={22} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{pending === 1 ? 'רשומה אחת ממתינה לסנכרון' : `${pending} רשומות ממתינות לסנכרון`}</Text>
              <Text variant="caption" color={colors.textSecondary}>הן שמורות במכשיר ויועלו כשיהיה חיבור.</Text>
            </View>
          </View>
          <Button label="לנסות לסנכרן עכשיו" size="md" variant="secondary" loading={sync.status === 'syncing'} onPress={() => void syncNow()} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
