import { router } from 'expo-router';
import { ChevronRight, Plus, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { openActivityForm } from '@/components/AddActivitySheet';
import { Sheet } from '@/components/ui/overlays';
import { Button, Card, EmptyState, IconButton, Notice, Screen, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { activityTones, colors, radius, spacing } from '@/design/tokens';
import type { FoodLogEntry } from '@/data/repositories/events';
import { useActiveChild, useFoodLog } from '@/hooks/data';
import { formatDateFull, formatDayLabel } from '@/lib/time';

type Filter = 'all' | 'allergen' | 'noted';
const FILTERS = [{ value: 'all', label: 'הכול' }, { value: 'allergen', label: 'אלרגניים' }, { value: 'noted', label: 'עם הערה' }] as const;

export default function FoodsScreen() {
  const { child } = useActiveChild();
  const log = useFoodLog(child?.id);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<FoodLogEntry | null>(null);
  if (!child) return <Screen><View /></Screen>;

  const all = log.data ?? [];
  const shown = all.filter((f) => (filter === 'allergen' ? f.isAllergen : filter === 'noted' ? f.reactions.length > 0 : true));
  const tone = activityTones.solids;
  const times = (n: number) => (n === 1 ? 'פעם אחת' : `${n} פעמים`);

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.head}>
        <IconButton icon={ChevronRight} label="חזרה" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))} tone="surface" />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>טעימות ואלרגנים</Text>
      </View>
      <Text color={colors.textSecondary}>{`כל מה ש${child.name} כבר טעמ${child.sex === 'female' ? 'ה' : child.sex === 'male' ? '' : '/ה'}, מתי, וההערות שכתבתם ליד.`}</Text>

      {all.length === 0 ? (
        <Card><EmptyState icon={Utensils} title="עוד לא תועדו טעימות" body="כל ארוחת מוצקים שמתעדים מוסיפה לכאן את המזונות שלה." actionLabel="תיעוד ארוחה" onAction={() => openActivityForm('solids')} /></Card>
      ) : (
        <>
          <View style={styles.stats}>
            <View style={[styles.stat, { backgroundColor: tone.bg }]}><Text variant="metric" color={tone.ink}>{all.length}</Text><Text variant="caption" color={tone.ink}>מזונות שנוסו</Text></View>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}><Text variant="metric">{all.filter((f) => f.isAllergen).length}</Text><Text variant="caption" color={colors.textSecondary}>סומנו כאלרגניים</Text></View>
            <View style={[styles.stat, { backgroundColor: colors.surface }]}><Text variant="metric">{all.filter((f) => f.reactions.length > 0).length}</Text><Text variant="caption" color={colors.textSecondary}>עם הערה</Text></View>
          </View>
          <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          {shown.length === 0 ? <Notice text="אין מזונות שמתאימים לסינון הזה." /> : (
            <Card style={styles.list}>
              {shown.map((f) => (
                <Pressable key={f.name} onPress={() => setOpen(f)} accessibilityRole="button"
                  accessibilityLabel={`${f.name}, ${times(f.count)}${f.isAllergen ? ', סומן כאלרגני' : ''}${f.reactions.length ? ', יש הערה' : ''}`}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text variant="bodyStrong">{f.name}</Text>
                      {f.isAllergen ? <View style={[styles.tag, { backgroundColor: colors.warningLight }]}><Text variant="caption" color={colors.warning} style={{ fontWeight: '700' }}>אלרגני</Text></View> : null}
                      {f.reactions.length ? <View style={[styles.tag, { backgroundColor: colors.primaryLight }]}><Text variant="caption" color={colors.primaryStrong} style={{ fontWeight: '700' }}>הערה</Text></View> : null}
                    </View>
                    <Text variant="caption" color={colors.textSecondary}>{`${times(f.count)} · לראשונה ${formatDateFull(new Date(f.firstAt))}`}</Text>
                  </View>
                  <Text variant="caption" color={colors.textSecondary}>{formatDayLabel(new Date(f.lastAt))}</Text>
                </Pressable>
              ))}
            </Card>
          )}
          <Button label="תיעוד ארוחה" icon={Plus} size="md" onPress={() => openActivityForm('solids')} />
        </>
      )}
      <Notice text="הרשימה מציגה רק מה שתיעדתם. סימון ״אלרגני״ הוא הסימון שלכם בזמן התיעוד, לא קביעה רפואית. בכל חשש לתגובה פונים לרופא/ה." />

      <Sheet visible={open !== null} onClose={() => setOpen(null)} title={open?.name ?? ''}>
        {open ? (
          <>
            <Text color={colors.textSecondary}>{`${times(open.count)} · לראשונה ${formatDateFull(new Date(open.firstAt))} · לאחרונה ${formatDateFull(new Date(open.lastAt))}`}</Text>
            {open.isAllergen ? <Notice tone="warning" text="סימנתם את המזון הזה כאלרגני." /> : null}
            <SectionHeader title="הערות שכתבתם" />
            {open.reactions.length === 0 ? <Text color={colors.textSecondary}>לא נכתבה הערה בארוחות עם המזון הזה.</Text> : (
              <View style={{ gap: spacing.sm }}>
                {[...open.reactions].reverse().map((r) => (
                  <View key={r.at} style={styles.note}>
                    <Text variant="caption" color={colors.textSecondary}>{formatDateFull(new Date(r.at))}{r.with.length ? ` · באותה ארוחה גם: ${r.with.join(', ')}` : ''}</Text>
                    <Text>{r.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 2 },
  list: { paddingVertical: spacing.xs, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  note: { gap: 2, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
});
