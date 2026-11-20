import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { activityIcons } from '@/components/ui/Icons';
import { PressScale } from '@/components/ui/motion';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, shadow, spacing } from '@/design/tokens';
import type { ActivityType } from '@/domain/activity';
import { MIN_SAMPLES, type Prediction } from '@/domain/routine';
import { formatDuration, formatTime, ltr } from '@/lib/time';

/** What the family's own routine says about one activity: a prediction, or how far the learning is. */
export type Learned =
  | { state: 'predicted'; prediction: Prediction; basis: string; nextLabel: string }
  | { state: 'learning'; samples: number }
  | { state: 'none' };

/**
 * One activity on the home screen: how long since the last time, where that stands against the
 * family's usual rhythm, what was logged today, and one button that says what it logs.
 */
export function TrackCard({ type, title, sinceLabel, since, learned, today, action, actionIcon, onAction, onOpen, running }: {
  type: ActivityType; title: string;
  /** The small words over the big figure, e.g. "מאז ההאכלה". */
  sinceLabel: string;
  /** The big figure; null when there is nothing to count from. */
  since: string | null;
  learned: Learned; today: string;
  action: string; actionIcon?: ReactNode; onAction: () => void; onOpen: () => void;
  /** A timer is running for this activity: the card takes the activity's colour. */
  running?: boolean;
}) {
  const tone = activityTones[type];
  const Icon = activityIcons[type];
  const fg = running ? colors.white : colors.textPrimary;
  const sub = running ? 'rgba(255,255,255,0.86)' : colors.textSecondary;

  let line1 = ''; let line2 = ''; let progress: number | null = null; let past = false;
  if (learned.state === 'predicted') {
    const p = learned.prediction;
    progress = Math.max(0.04, Math.min(1, 1 - p.minutesUntil / p.usualMin));
    past = p.minutesUntil < -10;
    line1 = past ? `עברו ${formatDuration(-p.minutesUntil)} מהרגיל` : `${learned.nextLabel} ${ltr(`~${formatTime(p.at)}`)}`;
    line2 = learned.basis;
  } else if (learned.state === 'learning') {
    progress = Math.min(learned.samples, MIN_SAMPLES) / MIN_SAMPLES;
    line1 = `לומדים את השגרה ${ltr(`${Math.min(learned.samples, MIN_SAMPLES)}/${MIN_SAMPLES}`)}`;
    line2 = 'ככל שתתעדו, נדע מתי הבא';
  }

  const body = (
    <>
      <PressScale onPress={onOpen} scaleTo={0.985} accessibilityRole="button"
        accessibilityLabel={`${title}. ${sinceLabel}: ${since ?? 'אין עדיין'}. ${line1}. ${today}. מעבר ליומן`} style={{ gap: 2 }}>
        <View style={styles.head}>
          <View style={[styles.icon, { backgroundColor: running ? 'rgba(255,255,255,0.22)' : tone.bg }]}><Icon size={20} color={running ? colors.white : tone.ink} /></View>
          <Text variant="bodyStrong" color={fg} numberOfLines={1} style={{ flex: 1 }}>{title}</Text>
        </View>
        <Text variant="caption" color={sub} numberOfLines={1}>{sinceLabel}</Text>
        <Text variant="metric" color={fg} numberOfLines={1} adjustsFontSizeToFit style={running ? { writingDirection: 'ltr', textAlign: 'right' } : null}>{since ?? '—'}</Text>
        {progress !== null ? (
          <View style={[styles.track, running && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: running ? colors.white : learned.state === 'learning' ? colors.borderStrong : tone.solid }]} />
          </View>
        ) : null}
        {line1 ? <Text variant="caption" color={running ? colors.white : learned.state === 'predicted' ? tone.ink : colors.textSecondary} style={{ fontWeight: '700' }} numberOfLines={1}>{line1}</Text> : null}
        {line2 ? <Text variant="caption" color={sub} numberOfLines={2}>{line2}</Text> : null}
        <Text variant="caption" color={sub} numberOfLines={2} style={{ marginTop: 4 }}>{today}</Text>
      </PressScale>
      <PressScale onPress={onAction} accessibilityRole="button" accessibilityLabel={action}
        style={[styles.action, { backgroundColor: running ? colors.white : tone.ink }]}>
        {actionIcon ?? <Plus size={18} color={running ? tone.ink : colors.white} strokeWidth={2.8} />}
        <Text variant="bodyStrong" color={running ? tone.ink : colors.white} numberOfLines={1}>{action}</Text>
      </PressScale>
    </>
  );
  return running
    ? <LinearGradient colors={tone.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card} accessibilityRole="timer">{body}</LinearGradient>
    : <View style={[styles.card, styles.cardPlain]}>{body}</View>;
}

const styles = StyleSheet.create({
  card: { flexBasis: '47%', flexGrow: 1, borderRadius: 26, padding: spacing.md, gap: spacing.md, justifyContent: 'space-between' },
  cardPlain: { backgroundColor: colors.surface, ...shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  icon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#ECEBE8', overflow: 'hidden', marginVertical: 6 },
  trackGap: { height: 6, marginVertical: 6 },
  fill: { height: 6, borderRadius: 3 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 50, borderRadius: radius.md, paddingHorizontal: spacing.sm },
});
