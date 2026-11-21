import { router } from 'expo-router';
import { ChevronRight, Ruler, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineChart } from '@/components/charts/LineChart';
import { DateField, TextField } from '@/components/ui/inputs';
import { ConfirmDialog, Sheet, useToast } from '@/components/ui/overlays';
import { Button, Card, EmptyState, IconButton, Notice, Screen, SectionHeader, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import type { Measurement } from '@/domain/child';
import { useActiveChild, useCanManage, useMeasurementMutations, useMeasurements } from '@/hooks/data';
import { dayKey, formatDateFull, formatDateShort, parseDayKey } from '@/lib/time';

type Metric = 'weight' | 'length' | 'head';
const METRICS = [
  { value: 'weight', label: 'משקל' },
  { value: 'length', label: 'אורך / גובה' },
  { value: 'head', label: 'היקף ראש' },
] as const;

const pick = (m: Measurement, metric: Metric) =>
  metric === 'weight' ? (m.weightG === null ? null : m.weightG / 1000) : metric === 'length' ? (m.lengthMm === null ? null : m.lengthMm / 10) : m.headCircumferenceMm === null ? null : m.headCircumferenceMm / 10;
const unit = (metric: Metric) => (metric === 'weight' ? 'ק״ג' : 'ס״מ');
const fmt = (v: number) => (Math.round(v * 100) / 100).toString();
const decimal = (t: string) => t.replace(',', '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6);

export default function GrowthScreen() {
  const { child } = useActiveChild();
  const canManage = useCanManage(child?.familyId);
  const list = useMeasurements(child?.id);
  const { create, remove } = useMeasurementMutations(child?.id);
  const toast = useToast((s) => s.show);
  const [metric, setMetric] = useState<Metric>('weight');
  const [sheet, setSheet] = useState(false);
  const [date, setDate] = useState<string | null>(dayKey(new Date()));
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [head, setHead] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const points = useMemo(() => (list.data ?? [])
    .map((m) => ({ m, v: pick(m, metric), d: parseDayKey(m.measuredAt) }))
    .filter((p): p is { m: Measurement; v: number; d: Date } => p.v !== null && p.d !== null)
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .map((p) => ({ t: p.d.getTime(), value: p.v, label: formatDateShort(p.d) })), [list.data, metric]);

  const save = () => {
    const w = weight ? Math.round(Number(weight) * 1000) : null;
    const l = length ? Math.round(Number(length) * 10) : null;
    const h = head ? Math.round(Number(head) * 10) : null;
    if (!date) return setError('יש להזין תאריך מדידה תקין.');
    if (date > dayKey(new Date())) return setError('אי אפשר לתעד מדידה בתאריך עתידי.');
    if (w === null && l === null && h === null) return setError('יש להזין לפחות מדידה אחת.');
    if (w !== null && (Number.isNaN(w) || w < 300 || w > 40000)) return setError('המשקל צריך להיות בין 0.3 ל-40 ק״ג.');
    if (l !== null && (Number.isNaN(l) || l < 200 || l > 1400)) return setError('האורך צריך להיות בין 20 ל-140 ס״מ.');
    if (h !== null && (Number.isNaN(h) || h < 150 || h > 700)) return setError('היקף הראש צריך להיות בין 15 ל-70 ס״מ.');
    setError(null);
    create.mutate({ measuredAt: date, weightG: w, lengthMm: l, headCircumferenceMm: h, notes: null }, {
      onSuccess: () => { setSheet(false); setWeight(''); setLength(''); setHead(''); toast('המדידה נשמרה'); },
      onError: () => setError('לא הצלחנו לשמור. אפשר לנסות שוב.'),
    });
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon={ChevronRight} label="חזרה" tone="surface" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))} />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>גדילה</Text>
      </View>
      <Text color={colors.textSecondary}>{child ? `המדידות של ${child.name}, כפי שהוזנו.` : ''}</Text>
      {canManage
        ? <Button label="הוספת מדידה" onPress={() => { setError(null); setSheet(true); }} />
        : <Notice text="מדידות גדילה מוסיפים ההורים. ההרשאה שלך היא לתיעוד היומי." />}

      {(list.data?.length ?? 0) === 0 ? (
        <Card><EmptyState icon={Ruler} title="עוד אין מדידות" body="אפשר להזין משקל, אורך והיקף ראש אחרי ביקור בטיפת חלב או אצל הרופא/ה." /></Card>
      ) : (
        <>
          <Segmented options={METRICS} value={metric} onChange={setMetric} />
          <Card style={{ gap: spacing.sm }}>
            <Text variant="label" color={colors.textSecondary}>{METRICS.find((m) => m.value === metric)!.label} ({unit(metric)})</Text>
            {points.length >= 2 ? (
              <LineChart points={points} color={colors.primaryStrong} formatValue={fmt}
                summaryLabel={`גרף ${METRICS.find((m) => m.value === metric)!.label}: ${points.length} מדידות, מ-${fmt(points[0].value)} עד ${fmt(points[points.length - 1].value)} ${unit(metric)}.`} />
            ) : (
              <Notice text={points.length === 1 ? `מדידה אחת: ${fmt(points[0].value)} ${unit(metric)}. גרף יוצג אחרי שתי מדידות לפחות.` : 'אין מספיק נתונים לגרף עבור המדד הזה.'} />
            )}
          </Card>
          <Notice text="הגרף מציג רק את המדידות שהוזנו. עקומות גדילה ואחוזונים אינם מוצגים בגרסה הזו." />

          <SectionHeader title="היסטוריית מדידות" />
          <Card style={{ paddingVertical: spacing.xs }}>
            {(list.data ?? []).map((m) => {
              const d = parseDayKey(m.measuredAt);
              const parts = [m.weightG !== null ? `${fmt(m.weightG / 1000)} ק״ג` : null, m.lengthMm !== null ? `${fmt(m.lengthMm / 10)} ס״מ` : null,
                m.headCircumferenceMm !== null ? `היקף ראש ${fmt(m.headCircumferenceMm / 10)} ס״מ` : null].filter(Boolean).join(' · ');
              return (
                <View key={m.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{parts}</Text>
                    <Text variant="caption" color={colors.textSecondary}>{d ? formatDateFull(d) : m.measuredAt}</Text>
                  </View>
                  <IconButton icon={Trash2} label="מחיקת המדידה" onPress={() => setToDelete(m.id)} />
                </View>
              );
            })}
          </Card>
        </>
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="מדידה חדשה">
        <DateField label="תאריך המדידה" value={date} onChange={setDate} />
        <TextField label="משקל (ק״ג)" value={weight} onChangeText={(t) => setWeight(decimal(t))} keyboardType="decimal-pad" inputMode="decimal" placeholder="למשל 7.25" />
        <TextField label="אורך / גובה (ס״מ)" value={length} onChangeText={(t) => setLength(decimal(t))} keyboardType="decimal-pad" inputMode="decimal" placeholder="למשל 66.5" />
        <TextField label="היקף ראש (ס״מ)" value={head} onChangeText={(t) => setHead(decimal(t))} keyboardType="decimal-pad" inputMode="decimal" placeholder="למשל 42" />
        {error ? <Notice tone="danger" text={error} /> : null}
        <Button label="שמירה" onPress={save} loading={create.isPending} />
      </Sheet>
      <ConfirmDialog visible={toDelete !== null} destructive title="למחוק את המדידה?" confirmLabel="מחיקה" loading={remove.isPending}
        onCancel={() => setToDelete(null)} onConfirm={() => toDelete && remove.mutate(toDelete, { onSuccess: () => { setToDelete(null); toast('המדידה נמחקה'); } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: spacing.md },
});
