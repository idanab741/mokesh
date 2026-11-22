import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BarChart } from '@/components/charts/BarChart';
import { TextField } from '@/components/ui/inputs';
import { Sheet } from '@/components/ui/overlays';
import { Button, Segmented } from '@/components/ui/primitives';
import { SheetCard, SkyScreen } from '@/components/ui/SkyScreen';
import { Text } from '@/components/ui/Text';
import { colors, gradients, spacing, themed } from '@/design/tokens';
import { formatRelative } from '@/lib/time';
import { type AdminAccount, accountsCsv, isAdmin, loadAccount, loadInsights, loadOverview, searchAccounts } from '@/services/admin';
import { useSession } from '@/state/session';

const TYPE_LABEL: Record<string, string> = { bottle: 'בקבוק', nursing: 'הנקה', pumping: 'שאיבה', sleep: 'שינה', diaper: 'חיתול', solids: 'מוצקים', other: 'אחר' };
const SCREEN_LABEL: Record<string, string> = {
  screen_home: 'בית', screen_journal: 'יומן', screen_stats: 'נתונים', screen_child: 'הילד שלי', screen_album: 'אלבום', screen_reminders: 'תזכורות',
  screen_health: 'בריאות', screen_milestones: 'רגעים', screen_growth: 'גדילה', screen_foods: 'טעימות', screen_family: 'משפחה', screen_report: 'סיכום לרופא',
};
const ROLE_LABEL: Record<string, string> = { owner: 'בעלים', parent: 'הורה', caregiver: 'מטפל/ת', relative: 'קרוב/ה' };
const SEX_LABEL: Record<string, string> = { female: 'בנות', male: 'בנים', unspecified: 'לא צוין' };
const FUNNEL: [string, string][] = [['welcome_view', 'ראו את עמוד הפתיחה'], ['peek_start', 'נכנסו להצצה'], ['account_prompt', 'נתקלו ב"צריך חשבון"'], ['signup_done', 'פתחו חשבון'], ['signin_done', 'נכנסו לחשבון קיים']];
const TABS = [{ value: 'overview', label: 'סקירה' }, { value: 'accounts', label: 'חשבונות' }, { value: 'use', label: 'שימוש' }, { value: 'families', label: 'משפחות' }] as const;
type Tab = (typeof TABS)[number]['value'];

const num = (n: number) => n.toLocaleString('he-IL');
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');
const dayLabel = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d}.${m}`; };
const when = (iso: string | null) => (iso ? formatRelative(new Date(iso)) : 'אין');
const size = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);
const series = (rows: { day: string; n: number }[]) => rows.map((d, i) => ({ key: d.day, axisLabel: i % 5 === 4 ? dayLabel(d.day) : '', fullLabel: dayLabel(d.day), values: [d.n] }));

function Stat({ value, label, hint }: { value: string | number; label: string; hint?: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="metric" color={colors.ink}>{typeof value === 'number' ? num(value) : value}</Text>
      <Text variant="label" color={colors.ink}>{label}</Text>
      {hint ? <Text variant="caption" color={colors.textSecondary}>{hint}</Text> : null}
    </View>
  );
}

function Lines({ rows, of }: { rows: [string, number][]; of?: number }) {
  const max = Math.max(1, of ?? 0, ...rows.map(([, n]) => n));
  return (
    <View style={{ gap: spacing.sm }}>
      {rows.map(([label, n]) => (
        <View key={label} style={{ gap: 3 }}>
          <View style={styles.lineHead}>
            <Text variant="label" color={colors.ink}>{label}</Text>
            <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>{of ? `${num(n)} · ${pct(n, of)}` : num(n)}</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: n === 0 ? 0 : `${Math.max(2, (n / max) * 100)}%` }]} /></View>
        </View>
      ))}
    </View>
  );
}

function Chart({ rows, unit, total }: { rows: { day: string; n: number }[]; unit: string; total: string }) {
  return (
    <BarChart data={series(rows)} series={[{ label: unit, color: colors.primaryStrong, grad: gradients.primary }]}
      formatValue={(v) => `${Math.round(v)} ${unit}`} formatTick={(v) => String(Math.round(v))} summaryLabel={`${unit} לפי יום ב-30 הימים האחרונים. ${total}`} />
  );
}

function AccountSheet({ account, onClose }: { account: AdminAccount | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['admin', 'account', account?.user_id], queryFn: () => loadAccount(account!.user_id), enabled: !!account });
  const d = q.data;
  return (
    <Sheet visible={!!account} onClose={onClose} title="חשבון">
      <Text variant="bodyStrong" color={colors.ink} style={{ writingDirection: 'ltr', textAlign: 'left' }}>{account?.email ?? ''}</Text>
      {!d ? <ActivityIndicator color={colors.primaryStrong} /> : (
        <>
          <Text variant="caption" color={colors.textSecondary}>{`נרשם ${when(d.created_at)} · כניסה אחרונה ${when(d.last_sign_in)} · תיעוד אחרון ${when(d.last_record)}`}</Text>
          <View style={styles.stats}>
            <Stat value={d.week} label="תיעודים השבוע" />
            <Stat value={d.days_active_30} label="ימים פעילים" hint="מתוך 30" />
            <Stat value={d.children.length} label="ילדים" hint={d.children.map((c) => `${c.age_months} ח׳`).join(', ') || undefined} />
          </View>
          <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>משפחות ותפקיד</Text>
          <Text color={colors.textSecondary}>{d.roles.length === 0 ? 'עוד לא במשפחה' : d.roles.map((r) => `${ROLE_LABEL[r.role] ?? r.role} (${r.members} חברים)`).join(' · ')}</Text>
          <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>מה תועד</Text>
          {Object.keys(d.by_type).length === 0 ? <Text color={colors.textSecondary}>עוד לא תועד דבר.</Text>
            : <Lines rows={Object.entries(d.by_type).sort((a, b) => b[1] - a[1]).map(([k, n]) => [TYPE_LABEL[k] ?? k, n])} />}
          <View style={styles.stats}>
            <Stat value={d.photos} label="תמונות" /><Stat value={d.milestones} label="רגעים" /><Stat value={d.measurements} label="מדידות" /><Stat value={d.health} label="בריאות" />
          </View>
          <Text variant="caption" color={colors.textSecondary}>מוצגים מספרים בלבד. שמות הילדים ותוכן היומן לא נחשפים כאן.</Text>
        </>
      )}
    </Sheet>
  );
}

/** The owner's view of how the app is doing: counts and accounts. A family's diary is never shown here. */
export default function AdminScreen() {
  const user = useSession((s) => s.user);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<AdminAccount | null>(null);
  const admin = useQuery({ queryKey: ['admin', 'is', user?.id], queryFn: isAdmin, enabled: !!user });
  const ok = admin.data === true;
  const overview = useQuery({ queryKey: ['admin', 'overview'], queryFn: loadOverview, enabled: ok });
  const insights = useQuery({ queryKey: ['admin', 'insights'], queryFn: loadInsights, enabled: ok });
  const accounts = useQuery({ queryKey: ['admin', 'accounts', search.trim()], queryFn: () => searchAccounts(search, 100), enabled: ok && tab === 'accounts' });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!user || admin.data === false || admin.isError) {
    return (
      <SkyScreen title="ניהול" onBack={back}>
        <SheetCard>
          <Text color={colors.textSecondary}>המסך הזה פתוח רק לחשבון הניהול של האפליקציה.</Text>
          {!user ? <Button label="כניסה לחשבון" size="md" onPress={() => router.push('/auth/sign-in')} /> : null}
        </SheetCard>
      </SkyScreen>
    );
  }
  const o = overview.data; const x = insights.data;
  const exportCsv = async () => {
    const rows = await searchAccounts(search, 500);
    if (Platform.OS !== 'web') return;
    const url = URL.createObjectURL(new Blob([`﻿${accountsCsv(rows)}`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `lilbaby-accounts-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <SkyScreen title="ניהול" subtitle="מספרים וחשבונות. היומנים של המשפחות לא מוצגים כאן." onBack={back}
      hero={<Segmented options={[...TABS]} value={tab} onChange={setTab} />}>
      {!o || !x ? (overview.isError || insights.isError
        ? <SheetCard><Text color={colors.danger}>לא הצלחנו לטעון את הנתונים.</Text><Button label="ניסיון נוסף" size="md" variant="secondary" onPress={() => { void overview.refetch(); void insights.refetch(); }} /></SheetCard>
        : <ActivityIndicator color={colors.primaryStrong} style={{ marginTop: spacing.xxl }} />) : tab === 'overview' ? (
        <>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>חשבונות</Text>
            <View style={styles.stats}>
              <Stat value={o.accounts.total} label="בסך הכול" /><Stat value={o.accounts.today} label="היום" /><Stat value={o.accounts.week} label="7 ימים" /><Stat value={o.accounts.month} label="30 יום" />
            </View>
            <Chart rows={o.signups_by_day} unit="הרשמות" total={`סך הכול ${o.accounts.month}.`} />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>מבקרים</Text>
            <Text variant="caption" color={colors.textSecondary}>מכשירים שונים שפתחו את האפליקציה בכל יום, כולל אורחים. נספר מאז שהמדידה הופעלה.</Text>
            <Chart rows={x.visitors_by_day} unit="מבקרים" total="" />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>מעמוד הפתיחה לחשבון</Text>
            <Text variant="caption" color={colors.textSecondary}>מכשירים שונים ב-30 הימים האחרונים</Text>
            <Lines rows={FUNNEL.map(([k, label]) => [label, o.funnel_month[k] ?? 0])} />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>מי נשאר</Text>
            <View style={styles.stats}>
              <Stat value={pct(x.retention.retained, x.retention.cohort)} label="חזרו השבוע" hint={`${x.retention.retained} מתוך ${x.retention.cohort} שנרשמו לפני יותר משבוע`} />
              <Stat value={x.retention.never_logged} label="לא תיעדו אף פעם" />
              <Stat value={x.retention.no_child} label="בלי ילד" hint="נרשמו ולא הוסיפו" />
            </View>
          </SheetCard>
        </>
      ) : tab === 'accounts' ? (
        <>
          <SheetCard>
            <TextField label="חיפוש לפי אימייל" value={search} onChangeText={setSearch} placeholder="חלק מהכתובת" autoCapitalize="none" keyboardType="email-address" />
            <View style={styles.lineHead}>
              <Text variant="caption" color={colors.textSecondary}>{accounts.data ? `${accounts.data.length} חשבונות${accounts.data.length === 100 ? ' (100 הראשונים)' : ''}` : ''}</Text>
              {Platform.OS === 'web' ? <Pressable onPress={() => void exportCsv()} accessibilityRole="button" accessibilityLabel="ייצוא הרשימה לקובץ" hitSlop={10}><Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '700' }}>ייצוא לקובץ</Text></Pressable> : null}
            </View>
            {accounts.isLoading ? <ActivityIndicator color={colors.primaryStrong} /> : null}
            {(accounts.data ?? []).map((a) => (
              <Pressable key={a.user_id} onPress={() => setOpen(a)} accessibilityRole="button" accessibilityLabel={`פרטי החשבון ${a.email ?? ''}`} style={styles.account}>
                <Text variant="bodyStrong" color={colors.ink} numberOfLines={1} style={{ writingDirection: 'ltr', textAlign: 'left' }}>{a.email ?? 'בלי אימייל'}</Text>
                <Text variant="caption" color={colors.textSecondary}>{`נרשם ${when(a.created_at)} · פעילות אחרונה ${when(a.last_active)}`}</Text>
                <Text variant="caption" color={colors.textSecondary}>{`${a.children} ילדים · ${a.records} תיעודים${a.families > 1 ? ` · ${a.families} משפחות` : ''}`}</Text>
              </Pressable>
            ))}
            {accounts.data && accounts.data.length === 0 ? <Text color={colors.textSecondary}>לא נמצאו חשבונות.</Text> : null}
          </SheetCard>
        </>
      ) : tab === 'use' ? (
        <>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>פעילים</Text>
            <View style={styles.stats}>
              <Stat value={o.active.day} label="היום" hint="תיעדו משהו" /><Stat value={o.active.week} label="השבוע" /><Stat value={o.active.month} label="החודש" />
            </View>
            <View style={styles.stats}>
              <Stat value={o.records.events_week} label="תיעודים השבוע" hint={`${num(o.records.events)} בסך הכול`} />
              <Stat value={o.active.week > 0 ? (o.records.events_week / o.active.week / 7).toFixed(1) : '–'} label="ליום, למשתמש פעיל" />
            </View>
            <Chart rows={x.records_by_day} unit="תיעודים" total="" />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>מתי מתעדים</Text>
            <Text variant="caption" color={colors.textSecondary}>לפי שעה ביממה, 30 הימים האחרונים</Text>
            <BarChart data={x.by_hour.map((h) => ({ key: String(h.hour), axisLabel: h.hour % 6 === 0 ? `${h.hour}:00` : '', fullLabel: `${h.hour}:00`, values: [h.n] }))}
              series={[{ label: 'תיעודים', color: colors.primaryStrong, grad: gradients.primary }]} formatValue={(v) => `${Math.round(v)} תיעודים`} formatTick={(v) => String(Math.round(v))}
              summaryLabel="מספר התיעודים לפי שעה ביממה" />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>מה מתעדים</Text>
            <Text variant="caption" color={colors.textSecondary}>30 הימים האחרונים, לפי סוג</Text>
            <Lines rows={Object.entries(o.records.by_type).sort((a, b) => b[1] - a[1]).map(([k, n]) => [TYPE_LABEL[k] ?? k, n])} />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>במה משתמשים</Text>
            <Text variant="caption" color={colors.textSecondary}>כמה חשבונות השתמשו בכל חלק לפחות פעם אחת</Text>
            <Lines of={x.adoption.accounts} rows={[['תיעוד יומי', x.adoption.logged], ['אלבום תמונות', x.adoption.photos], ['רגעים', x.adoption.milestones], ['מדידות גדילה', x.adoption.measurements], ['בריאות', x.adoption.health], ['שיתוף משפחתי', x.adoption.sharing]]} />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>מסכים</Text>
            <Text variant="caption" color={colors.textSecondary}>כניסות ב-7 הימים האחרונים</Text>
            {Object.keys(o.screens_week).length === 0 ? <Text color={colors.textSecondary}>עוד אין מדידות.</Text>
              : <Lines rows={Object.entries(o.screens_week).sort((a, b) => b[1] - a[1]).map(([k, n]) => [SCREEN_LABEL[k] ?? k, n])} />}
          </SheetCard>
        </>
      ) : (
        <>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>משפחות וילדים</Text>
            <View style={styles.stats}>
              <Stat value={o.families} label="משפחות" hint={`${o.shared_families} משותפות`} /><Stat value={o.children} label="ילדים" />
            </View>
            <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>גיל הילדים</Text>
            <Lines rows={[['עד 3 חודשים', x.children_age.m0_3], ['3 עד 6 חודשים', x.children_age.m3_6], ['חצי שנה עד שנה', x.children_age.m6_12], ['שנה עד שנתיים', x.children_age.m12_24], ['מעל שנתיים', x.children_age.m24_plus]]} />
            <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>מין</Text>
            <Lines rows={Object.entries(x.children_sex).map(([k, n]) => [SEX_LABEL[k] ?? k, n])} />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>שיתוף</Text>
            <View style={styles.stats}>
              <Stat value={x.sharing.invites} label="הזמנות נשלחו" /><Stat value={x.sharing.accepted} label="התקבלו" hint={pct(x.sharing.accepted, x.sharing.invites)} /><Stat value={x.sharing.pending} label="ממתינות" />
            </View>
            <Text variant="label" color={colors.ink} style={{ fontWeight: '700' }}>תפקידים</Text>
            <Lines rows={Object.entries(x.sharing.roles).sort((a, b) => b[1] - a[1]).map(([k, n]) => [ROLE_LABEL[k] ?? k, n])} />
          </SheetCard>
          <SheetCard>
            <Text variant="heading" color={colors.ink}>תוכן ואחסון</Text>
            <View style={styles.stats}>
              <Stat value={o.records.photos} label="תמונות" hint={`${x.storage.files} קבצים · ${size(x.storage.bytes)}`} /><Stat value={o.records.milestones} label="רגעים" />
              <Stat value={o.records.measurements} label="מדידות" /><Stat value={o.records.health} label="רשומות בריאות" />
            </View>
          </SheetCard>
        </>
      )}
      {o && x ? <Button label="רענון" variant="secondary" size="md" onPress={() => { void overview.refetch(); void insights.refetch(); void accounts.refetch(); }} /> : null}
      <AccountSheet account={open} onClose={() => setOpen(null)} />
    </SkyScreen>
  );
}

const styles = themed(() => StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexGrow: 1, flexBasis: '22%', minWidth: 72, backgroundColor: colors.primaryLight, borderRadius: 18, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  lineHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: '#F1EAEE', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.primaryStrong },
  account: { gap: 2, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(58,34,51,0.06)' },
}));
