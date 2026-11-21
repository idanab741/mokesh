import { router } from 'expo-router';
import { ChevronRight, Copy, Printer, Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { useToast } from '@/components/ui/overlays';
import { Button, Card, IconButton, Notice, Screen, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import { buildReport, reportHtml, reportText } from '@/domain/report';
import { computeRangeStats } from '@/domain/stats';
import { useActiveChild, useEventsBetween, useMeasurements, useMilestones, useNow } from '@/hooks/data';
import { addDays } from '@/lib/time';

const RANGES = [{ value: '7', label: 'שבוע' }, { value: '14', label: 'שבועיים' }, { value: '30', label: 'חודש' }] as const;
type Range = (typeof RANGES)[number]['value'];

export default function ReportScreen() {
  const { child } = useActiveChild();
  const now = useNow(60_000);
  const toast = useToast((s) => s.show);
  const [range, setRange] = useState<Range>('14');
  const from = addDays(now, -(Number(range) - 1));
  const events = useEventsBetween(child?.id, from, now);
  const measurements = useMeasurements(child?.id);
  const milestones = useMilestones(child?.id);
  const report = useMemo(() => {
    if (!child) return null;
    return buildReport({
      child, stats: computeRangeStats(events.data ?? [], from, now, now), measurements: measurements.data ?? [],
      milestones: milestones.data ?? [], from, to: now, now,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child, events.data, measurements.data, milestones.data, range]);
  if (!child || !report) return <Screen><View /></Screen>;

  const text = reportText(report);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast('הסיכום הועתק'); }
    catch { toast('לא הצלחנו להעתיק. אפשר לסמן את הטקסט ולהעתיק ידנית.', { tone: 'error' }); }
  };
  const share = async () => {
    if (Platform.OS !== 'web') { await Share.share({ message: text, title: report.title }); return; }
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ title: report.title, text }); return; } catch { /* the share sheet was closed or is blocked: copy instead */ }
    }
    await copy();
  };
  const print = () => {
    const win = window.open('', '_blank');
    if (!win) { toast('הדפדפן חסם את חלון ההדפסה. אפשר להעתיק את הסיכום במקום.', { tone: 'error' }); return; }
    win.document.write(reportHtml(report));
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.head}>
        <IconButton icon={ChevronRight} label="חזרה" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))} tone="surface" />
        <Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>סיכום לרופא/ה</Text>
      </View>
      <Text color={colors.textSecondary}>עמוד אחד עם מה שתיעדתם, להראות בטיפת חלב או אצל הרופא/ה.</Text>
      <Segmented options={RANGES} value={range} onChange={setRange} />

      <Card style={{ gap: spacing.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="heading" selectable>{report.title}</Text>
          {report.subtitle.map((s) => <Text key={s} variant="caption" color={colors.textSecondary} selectable>{s}</Text>)}
        </View>
        {report.sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text variant="bodyStrong" selectable>{s.title}</Text>
            {s.lines.map((l) => <Text key={l} variant="label" selectable>{l}</Text>)}
          </View>
        ))}
      </Card>
      <Notice text={report.footer} />

      <Button label="שיתוף הסיכום" icon={Share2} onPress={() => void share()} />
      <View style={styles.actions}>
        <Button label="העתקה" icon={Copy} variant="secondary" size="md" style={{ flex: 1 }} onPress={() => void copy()} />
        {Platform.OS === 'web' ? <Button label="הדפסה / PDF" icon={Printer} variant="secondary" size="md" style={{ flex: 1 }} onPress={print} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  section: { gap: 2, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
