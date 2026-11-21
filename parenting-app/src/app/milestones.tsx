import { router } from 'expo-router';
import { Check, ChevronRight, Plus, Sparkles, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DateField, TextField } from '@/components/ui/inputs';
import { Sheet, useToast } from '@/components/ui/overlays';
import { Button, Card, IconButton, Notice, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, themed } from '@/design/tokens';
import { stageLabel } from '@/domain/avatar';
import { CATALOG, type CatalogItem, GROUPS, type Milestone, catalogTitle, groupLabel, stageFromMilestones } from '@/domain/milestones';
import { useActiveChild, useCanManage, useMilestoneMutations, useMilestones } from '@/hooks/data';
import { errorMessage } from '@/i18n/he';
import { dayKey, formatDateFull, parseDayKey } from '@/lib/time';

/** What the sheet is editing: a catalog moment, a moment the family wrote, or a new one of their own. */
type Editing = { kind: 'catalog'; item: CatalogItem; existing: Milestone | null } | { kind: 'custom'; existing: Milestone | null };

export default function MilestonesScreen() {
  const { child } = useActiveChild();
  const list = useMilestones(child?.id);
  const { mark, add, update, remove } = useMilestoneMutations(child?.id);
  const canManage = useCanManage(child?.familyId);
  const toast = useToast((s) => s.show);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!child) return <Screen><View /></Screen>;

  const marked = list.data ?? [];
  const byKey = new Map(marked.filter((m) => m.catalogKey).map((m) => [m.catalogKey as string, m]));
  const dateText = (m: Milestone) => { const d = m.achievedOn ? parseDayKey(m.achievedOn) : null; return d ? formatDateFull(d) : 'בלי תאריך'; };

  const open = (e: Editing) => {
    if (!canManage) return;
    setEditing(e); setError(null);
    setTitle(e.kind === 'custom' ? e.existing?.title ?? '' : '');
    setDate(e.existing ? e.existing.achievedOn : dayKey(new Date()));
    setNotes(e.existing?.notes ?? '');
  };
  const busy = mark.isPending || add.isPending || update.isPending || remove.isPending;
  const save = () => {
    if (!editing) return;
    const before = stageFromMilestones(marked);
    const done = {
      onSuccess: () => {
        const after = editing.kind === 'catalog' && editing.item.pose ? stageFromMilestones([...marked, { catalogKey: editing.item.key }]) : before;
        setEditing(null);
        toast(after && after !== before ? `נשמר. הדמות של ${child.name} עברה ל${stageLabel[after]}.` : 'הרגע נשמר');
      },
      onError: (err: unknown) => setError(errorMessage(err)),
    };
    if (editing.kind === 'catalog') {
      mark.mutate({ key: editing.item.key, draft: { title: catalogTitle(editing.item, child.sex), achievedOn: date, notes } }, done);
    } else if (!title.trim()) {
      setError('כדאי לכתוב מה קרה, במילים שלכם.');
    } else if (editing.existing) {
      update.mutate({ id: editing.existing.id, draft: { title, achievedOn: date, notes } }, done);
    } else {
      add.mutate({ title, achievedOn: date, notes }, done);
    }
  };
  const unmark = () => {
    if (!editing?.existing) return;
    remove.mutate(editing.existing.id, { onSuccess: () => { setEditing(null); toast('הרגע הוסר'); }, onError: (err) => setError(errorMessage(err)) });
  };
  const sheetTitle = !editing ? '' : editing.kind === 'catalog' ? catalogTitle(editing.item, child.sex) : editing.existing ? 'עריכת רגע' : 'רגע משלכם';

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.head}>
        <IconButton icon={ChevronRight} label="חזרה" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))} tone="surface" />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>{`הרגעים של ${child.name}`}</Text>
      </View>
      <Notice text="כל ילד מתקדם בקצב שלו. כאן רק שומרים את מה שכבר קרה, בלי לוחות זמנים ובלי השוואות." />
      {!canManage ? <Notice text="רגעים מוסיפים ההורים. ההרשאה שלך היא לתיעוד היומי." /> : null}

      {marked.length > 0 ? (
        <>
          <SectionHeader title="מה שכבר קרה" />
          <Card style={styles.list}>
            {marked.map((m) => {
              const item = CATALOG.find((c) => c.key === m.catalogKey);
              return (
                <Pressable key={m.id} disabled={!canManage} accessibilityRole="button" accessibilityLabel={`${m.title}, ${dateText(m)}`}
                  onPress={() => open(item ? { kind: 'catalog', item, existing: m } : { kind: 'custom', existing: m })}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                  <View style={styles.dot}><Sparkles size={18} color={colors.primaryStrong} strokeWidth={2} /></View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{m.title}</Text>
                    <Text variant="caption" color={colors.textSecondary}>{dateText(m)}{m.notes ? ` · ${m.notes}` : ''}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Card>
        </>
      ) : null}

      {canManage ? <Button label="רגע משלכם" icon={Plus} variant="secondary" size="md" onPress={() => open({ kind: 'custom', existing: null })} /> : null}

      {GROUPS.map((group) => (
        <View key={group} style={{ gap: spacing.md }}>
          <SectionHeader title={groupLabel[group]} />
          <View style={styles.chips}>
            {CATALOG.filter((c) => c.group === group).map((item) => {
              const existing = byKey.get(item.key) ?? null;
              const label = catalogTitle(item, child.sex);
              return (
                <Pressable key={item.key} disabled={!canManage} onPress={() => open({ kind: 'catalog', item, existing })}
                  accessibilityRole="button" accessibilityState={{ selected: !!existing }} accessibilityLabel={existing ? `${label}, סומן` : label}
                  style={[styles.chip, existing && styles.chipOn]}>
                  {existing ? <Check size={16} color={colors.primaryStrong} strokeWidth={3} /> : null}
                  <Text variant="label" color={existing ? colors.primaryStrong : colors.textPrimary} style={existing ? { fontWeight: '700' } : null}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Sheet visible={editing !== null} onClose={() => setEditing(null)} title={sheetTitle}>
        {editing?.kind === 'custom' ? (
          <TextField label="מה קרה?" value={title} onChangeText={(t) => { setTitle(t); setError(null); }} placeholder="למשל: פעם ראשונה בים" maxLength={160} />
        ) : null}
        <DateField label="מתי?" value={date} onChange={setDate} hint="אפשר להשאיר ריק אם לא זוכרים" />
        <TextField label="הערה (לא חובה)" value={notes} onChangeText={setNotes} placeholder="איפה זה היה, מי היה שם" maxLength={300} />
        {editing?.kind === 'catalog' && editing.item.pose && !editing.existing ? (
          <Notice text={`אחרי השמירה הדמות בעמוד הבית תוצג ב${stageLabel[editing.item.pose]}.`} />
        ) : null}
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label="שמירה" loading={busy} onPress={save} />
        {editing?.existing ? <Button label="הסרת הרגע" icon={Trash2} variant="ghost" size="md" onPress={unmark} /> : null}
      </Sheet>
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  list: { paddingVertical: spacing.xs, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  dot: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  chipOn: { borderColor: colors.primaryStrong, backgroundColor: colors.primaryLight },
}));
