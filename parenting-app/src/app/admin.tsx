import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/charts/BarChart';
import { Button } from '@/components/ui/primitives';
import { SheetCard, SkyScreen } from '@/components/ui/SkyScreen';
import { Text } from '@/components/ui/Text';
import { colors, gradients, spacing, themed } from '@/design/tokens';
import { formatRelative } from '@/lib/time';
import { type AdminAccount, isAdmin, loadAccounts, loadOverview } from '@/services/admin';
import { useSession } from '@/state/session';

const TYPE_LABEL: Record<string, string> = { bottle: 'בקבוק', nursing: 'הנקה', pumping: 'שאיבה', sleep: 'שינה', diaper: 'חיתול', solids: 'מוצקים', other: 'אחר' };
const SCREEN_LABEL: Record<string, string> = {
  screen_home: 'בית', screen_journal: 'יומן', screen_stats: 'נתונים', screen_child: 'הילד שלי', screen_album: 'אלבום', screen_reminders: 'תזכורות',
  screen_health: 'בריאות', screen_milestones: 'רגעים', screen_growth: 'גדילה', screen_foods: 'טעימות', screen_family: 'משפחה', screen_report: 'סיכום לרופא',
};
const FUNNEL: [string, string][] = [['welcome_view', 'ראו את עמוד הפתיחה'], ['peek_start', 'נכנסו להצצה'], ['account_prompt', 'נתקלו ב"צריך חשבון"'], ['signup_done', 'פתחו חשבון'], ['signin_done', 'נכנסו לחשבון קיים']];
const dayLabel = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d}.${m}`; };

function Stat({ value, label, hint }: { value: number; label: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="metric" color={colors.ink}>{value.toLocaleString('he-IL')}</Text>
      <Text variant="label" color={colors.ink}>{label}</Text>
      {hint ? <Text variant="caption" color={colors.textSecondary}>{hint}</Text> : null}
    </View>
  );
}

function Lines({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <View style={{ gap: spacing.sm }}>
      {rows.map(([label, n]) => (
        <View key={label} style={{ gap: 3 }}>
          <View style={styles.lineHead}><Text variant="label" color={colors.ink}>{label}</Text><Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>{n.toLocaleString('he-IL')}</Text></View>
          <View style={styles.track}><View style={[styles.fill, { width: n === 0 ? 0 : `${Math.max(2, (n / max) * 100)}%` }]} /></View>
        </View>
      ))}
    </View>
  );
}

function AccountRow({ a }: { a: AdminAccount }) {
  return (
    <View style={styles.account}>
      <Text variant="bodyStrong" color={colors.ink} numberOfLines={1} style={{ writingDirection: 'ltr', textAlign: 'left' }}>{a.email ?? 'בלי אימייל'}</Text>
      <Text variant="caption" color={colors.textSecondary}>
        {`נרשם ${formatRelative(new Date(a.created_at))} · פעילות אחרונה ${a.last_active ? formatRelative(new Date(a.last_active)) : 'אין'}`}
      </Text>
      <Text variant="caption" color={colors.textSecondary}>{`${a.children} ילדים · ${a.records} תיעודים${a.families > 1 ? ` · ${a.families} משפחות` : ''}`}</Text>
    </View>
  );
}

/** The owner's view of how the app is doing: counts and accounts. A family's diary is never shown here. */
export default function AdminScreen() {
  const user = useSession((s) => s.user);
  const admin = useQuery({ queryKey: ['admin', 'is', user?.id], queryFn: isAdmin, enabled: !!user });
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: loadOverview, enabled: admin.data === true });
  const accounts = useQuery({ queryKey: ['admin', 'accounts'], queryFn: () => loadAccounts(0), enabled: admin.data === true });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'));

  if (!user || admin.data === false || admin.isError) {
    return (
      <SkyScreen title="ניהול" onBack={back}>
        <SheetCard><Text color={colors.textSecondary}>המסך הזה פתוח רק לחשבון הניהול של האפליקציה.</Text></SheetCard>
      </SkyScreen>
    );
  }
  const o = overview.data;
  return (
    <SkyScreen title="ניהול" subtitle="מספרים וחשבונות. היומנים של המשפחות לא מוצגים כאן." onBack={back}>
      {!o ? (overview.isError ? <SheetCard><Text color={colors.danger}>לא הצלחנו לטעון את הנתונים.</Text><Button label="ניסיון נוסף" size="md" variant="secondary" onPress={() => void overview.refetch()} /></SheetCard>
        : <ActivityIndicator color={colors.primaryStrong} style={{ marginTop: spacing.xxl }} />) : (
        <>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>חשבונות</Text>
            <View style={styles.stats}>
              <Stat value={o.accounts.total} label="בסך הכול" />
              <Stat value={o.accounts.today} label="היום" />
              <Stat value={o.accounts.week} label="7 ימים" />
              <Stat value={o.accounts.month} label="30 יום" />
            </View>
            <BarChart data={o.signups_by_day.map((d, i) => ({ key: d.day, axisLabel: i % 5 === 4 ? dayLabel(d.day) : '', fullLabel: dayLabel(d.day), values: [d.n] }))}
              series={[{ label: 'הרשמות', color: colors.primaryStrong, grad: gradients.primary }]} formatValue={(v) => `${Math.round(v)} הרשמות`} formatTick={(v) => String(Math.round(v))}
              summaryLabel={`הרשמות לפי יום ב-30 הימים האחרונים. סך הכול ${o.accounts.month}.`} />
          </SheetCard>

          <SheetCard>
            <Text variant="heading" color={colors.ink}>שימוש</Text>
            <View style={styles.stats}>
              <Stat value={o.active.day} label="פעילים היום" hint="תיעדו משהו" />
              <Stat value={o.active.week} label="פעילים השבוע" />
              <Stat value={o.active.month} label="פעילים החודש" />
            </View>
            <View style={styles.stats}>
              <Stat value={o.families} label="משפחות" hint={`${o.shared_families} משותפות`} />
              <Stat value={o.children} label="ילדים" />
              <Stat value={o.records.events_week} label="תיעודים השבוע" hint={`${o.records.events.toLocaleString('he-IL')} בסך הכול`} />
            </View>
          </SheetCard>

          <SheetCard>
            <Text variant="heading" color={colors.ink}>מה מתעדים</Text>
            <Text variant="caption" color={colors.textSecondary}>30 הימים האחרונים, לפי סוג</Text>
            <Lines rows={Object.entries(o.records.by_type).sort((a, b) => b[1] - a[1]).map(([k, n]) => [TYPE_LABEL[k] ?? k, n])} />
            <View style={styles.stats}>
              <Stat value={o.records.photos} label="תמונות" />
              <Stat value={o.records.milestones} label="רגעים" />
              <Stat value={o.records.measurements} label="מדידות" />
              <Stat value={o.records.health} label="רשומות בריאות" />
            </View>
          </SheetCard>

          <SheetCard>
            <Text variant="heading" color={colors.ink}>מעמוד הפתיחה לחשבון</Text>
            <Text variant="caption" color={colors.textSecondary}>מכשירים שונים ב-30 הימים האחרונים. נספר מאז שהמדידה הופעלה.</Text>
            <Lines rows={FUNNEL.map(([k, label]) => [label, o.funnel_month[k] ?? 0])} />
          </SheetCard>

          <SheetCard>
            <Text variant="heading" color={colors.ink}>מסכים</Text>
            <Text variant="caption" color={colors.textSecondary}>כניסות ב-7 הימים האחרונים</Text>
            {Object.keys(o.screens_week).length === 0 ? <Text color={colors.textSecondary}>עוד אין מדידות.</Text>
              : <Lines rows={Object.entries(o.screens_week).sort((a, b) => b[1] - a[1]).map(([k, n]) => [SCREEN_LABEL[k] ?? k, n])} />}
          </SheetCard>

          <SheetCard>
            <Text variant="heading" color={colors.ink}>חשבונות אחרונים</Text>
            {(accounts.data ?? []).map((a) => <AccountRow key={a.user_id} a={a} />)}
            {accounts.isLoading ? <ActivityIndicator color={colors.primaryStrong} /> : null}
          </SheetCard>
          <Button label="רענון" variant="secondary" size="md" onPress={() => { void overview.refetch(); void accounts.refetch(); }} />
        </>
      )}
    </SkyScreen>
  );
}

const styles = themed(() => StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, flexBasis: '22%', minWidth: 72, backgroundColor: colors.primaryLight, borderRadius: 18, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#F1EAEE', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primaryStrong },
  account: { gap: 2, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(58,34,51,0.06)' },
}));
