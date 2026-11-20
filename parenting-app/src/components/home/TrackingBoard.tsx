import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { activityIcons } from '@/components/ui/Icons';
import { PressScale } from '@/components/ui/motion';
import { ActivityBadge } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, shadow, spacing } from '@/design/tokens';
import type { ActivityType } from '@/domain/activity';
import { MIN_SAMPLES, type Prediction, type Routine } from '@/domain/routine';
import { formatDuration, formatTime, ltr } from '@/lib/time';

/* ---------- "What's next": predictions from the family's own routine ---------- */

const predictionType: Record<Prediction['kind'], ActivityType> = { feed: 'bottle', sleep: 'sleep', wake: 'sleep', diaper: 'diaper' };
const predictionTitle: Record<Prediction['kind'], string> = { feed: 'האכלה הבאה', sleep: 'השינה הבאה', wake: 'התעוררות', diaper: 'החלפת חיתול' };

function basisText(p: Prediction): string {
  const usual = formatDuration(p.usualMin);
  switch (p.kind) {
    case 'feed': return `אצלכם כל ${usual} בערך`;
    case 'sleep': return `אצלכם אחרי ${usual} ערות בערך`;
    case 'wake': return `שנת יום אצלכם: ${usual} בערך`;
    case 'diaper': return `אצלכם כל ${usual} בערך`;
  }
}
function whenText(p: Prediction): { text: string; late: boolean } {
  if (p.minutesUntil > 5) return { text: `בעוד ${formatDuration(p.minutesUntil)}`, late: false };
  if (p.minutesUntil >= -10) return { text: 'בערך עכשיו', late: false };
  return { text: `עברו ${formatDuration(-p.minutesUntil)}`, late: true };
}

export function NextUp({ predictions, routine, onAct }: {
  predictions: Prediction[]; routine: Routine; onAct: (kind: Prediction['kind']) => void;
}) {
  if (predictions.length === 0) {
    const rows: { type: ActivityType; label: string; n: number }[] = [
      { type: 'bottle', label: 'האכלות', n: routine.feed.samples },
      { type: 'sleep', label: 'שינה', n: routine.sleep.awakeSamples },
      { type: 'diaper', label: 'חיתולים', n: routine.diaper.samples },
    ];
    return (
      <View style={styles.next} testID="next-up">
        <View style={styles.nextHead}>
          <View style={styles.spark}><Sparkles size={16} color={colors.primaryStrong} strokeWidth={2.2} /></View>
          <Text variant="heading" accessibilityRole="header">לומדים את השגרה שלכם</Text>
        </View>
        <Text variant="label" color={colors.textSecondary}>
          ככל שתתעדו, נראה כאן מתי בדרך כלל מגיעות ההאכלה, השינה וההחלפה הבאות. הכול מחושב רק מהתיעוד שלכם.
        </Text>
        <View style={styles.learnRow}>
          {rows.map((r) => {
            const tone = activityTones[r.type];
            const done = Math.min(r.n, MIN_SAMPLES);
            return (
              <View key={r.label} style={styles.learnCell} accessible accessibilityLabel={`${r.label}: ${done} מתוך ${MIN_SAMPLES}`}>
                <View style={styles.learnTop}>
                  <Text variant="caption" color={colors.textSecondary}>{r.label}</Text>
                  <Text variant="caption" color={tone.ink} style={{ fontWeight: '700' }}>{ltr(`${done}/${MIN_SAMPLES}`)}</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${(done / MIN_SAMPLES) * 100}%`, backgroundColor: tone.solid }]} /></View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.next} testID="next-up">
      <View style={styles.nextHead}>
        <View style={styles.spark}><Sparkles size={16} color={colors.primaryStrong} strokeWidth={2.2} /></View>
        <View style={{ flex: 1 }}>
          <Text variant="heading" accessibilityRole="header">מה הלאה</Text>
          <Text variant="caption" color={colors.textSecondary}>לפי השגרה שתיעדתם בשבועיים האחרונים</Text>
        </View>
      </View>
      {predictions.map((p, i) => {
        const type = predictionType[p.kind];
        const tone = activityTones[type];
        const Icon = activityIcons[type];
        const when = whenText(p);
        return (
          <PressScale key={p.kind} onPress={() => onAct(p.kind)} accessibilityRole="button"
            accessibilityLabel={`${predictionTitle[p.kind]} בסביבות ${formatTime(p.at)}, ${when.text}. ${basisText(p)}`}
            style={[styles.nextRow, i > 0 && styles.nextDivider]}>
            <View style={[styles.nextIcon, { backgroundColor: tone.bg }]}><Icon size={20} color={tone.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1}>{predictionTitle[p.kind]}</Text>
              <Text variant="caption" color={colors.textSecondary} numberOfLines={2}>{basisText(p)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="heading" color={tone.ink}>{ltr(`~${formatTime(p.at)}`)}</Text>
              <View style={[styles.whenPill, { backgroundColor: when.late ? tone.solid : tone.bg }]}>
                <Text variant="caption" color={when.late ? colors.white : tone.ink} style={{ fontWeight: '700' }}>{when.text}</Text>
              </View>
            </View>
          </PressScale>
        );
      })}
    </View>
  );
}

/* ---------- One card per activity, with buttons that say exactly what they do ---------- */

/** A filled button saves on the spot; an outlined one opens a form to fill in. */
export function ActionButton({ label, a11yLabel, type, kind = 'save', onPress, icon, wide }: {
  label: string; a11yLabel?: string; type: ActivityType; kind?: 'save' | 'open'; onPress: () => void; icon?: ReactNode; wide?: boolean;
}) {
  const tone = activityTones[type];
  const save = kind === 'save';
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={a11yLabel ?? label}
      accessibilityHint={save ? 'נשמר מיד' : 'פותח טופס'}
      style={[styles.action, save ? styles.actionSave : styles.actionOpen, wide && { flexBasis: '100%' }, save ? { backgroundColor: tone.ink } : { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: tone.bg }]}>
      {icon}
      <Text variant="bodyStrong" color={save ? colors.white : tone.ink} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>{label}</Text>
      {save ? null : <ChevronLeft size={16} color={tone.ink} strokeWidth={2.4} />}
    </PressScale>
  );
}

export function TrackRow({ type, title, status, detail, onOpen, children, active }: {
  type: ActivityType; title: string; status: string; detail: string; onOpen: () => void; children: ReactNode;
  /** Something is running right now (a sleep): the card lights up in the activity's colour. */
  active?: { label: string; clock: string };
}) {
  const tone = activityTones[type];
  const head = (
    <PressScale onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${title}: ${status}. ${detail}. מעבר ליומן`} style={styles.rowHead} scaleTo={0.985}>
      {active
        ? <View style={styles.activeIcon}>{activityIcons[type]({ size: 24, color: colors.white })}</View>
        : <ActivityBadge type={type} size={48} />}
      <View style={{ flex: 1 }}>
        <View style={styles.rowTitle}>
          <Text variant="heading" color={active ? colors.white : colors.textPrimary} numberOfLines={1}>{active ? active.label : title}</Text>
          {active ? null : <View style={[styles.statusPill, { backgroundColor: tone.bg }]}><Text variant="caption" color={tone.ink} style={{ fontWeight: '700' }} numberOfLines={1}>{status}</Text></View>}
        </View>
        {active
          ? <Text variant="title" color={colors.white} style={{ writingDirection: 'ltr', textAlign: 'right' }}>{active.clock}</Text>
          : <Text variant="label" color={colors.textSecondary} numberOfLines={1}>{detail}</Text>}
      </View>
      <ChevronLeft size={20} color={active ? colors.white : colors.textSecondary} strokeWidth={2.2} />
    </PressScale>
  );
  const body = <>{head}<View style={styles.actions}>{children}</View></>;
  return active ? (
    <LinearGradient colors={tone.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.row, { borderWidth: 0 }]} accessibilityRole="timer">{body}</LinearGradient>
  ) : (
    <View style={styles.row}>
      <View style={[styles.stripe, { backgroundColor: tone.solid }]} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  next: { backgroundColor: colors.surface, borderRadius: 26, padding: spacing.lg, gap: spacing.sm, ...shadow.card },
  nextHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  spark: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, minHeight: 60 },
  nextDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  nextIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  whenPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: 2 },
  learnRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  learnCell: { flex: 1, gap: 6 },
  learnTop: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#ECEBE8', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  row: { backgroundColor: colors.surface, borderRadius: 26, padding: spacing.lg, gap: spacing.md, overflow: 'hidden', ...shadow.card },
  stripe: { position: 'absolute', top: 18, bottom: 18, start: 0, width: 4, borderTopEndRadius: 4, borderBottomEndRadius: 4 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, flexShrink: 1 },
  activeIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 18, paddingHorizontal: spacing.md },
  actionSave: { flexBasis: '28%', minHeight: 54 },
  actionOpen: { flexBasis: '40%', minHeight: 46 },
});
