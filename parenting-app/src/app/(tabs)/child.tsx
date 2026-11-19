import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronLeft, CloudOff, Download, LogOut, type LucideIcon, Pencil, Plus, RefreshCw, Ruler, Trash2, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { ConfirmDialog, useToast } from '@/components/ui/overlays';
import { Button, Card, Notice, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import { formatAgeWithSex } from '@/domain/age';
import { useActiveChild, useMeasurements, useUnsynced } from '@/hooks/data';
import { formatDateFull, formatRelative, parseDayKey } from '@/lib/time';
import { config } from '@/services/config';
import { exportData, wipeLocalData } from '@/services/dataExport';
import { getSupabase } from '@/services/supabase';
import { signOut } from '@/state/auth';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';

function Row({ icon: Icon, title, detail, onPress, danger }: { icon: LucideIcon; title: string; detail?: string; onPress: () => void; danger?: boolean }) {
  const fg = danger ? colors.danger : colors.textPrimary;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.dangerLight }]}><Icon size={20} color={danger ? colors.danger : colors.primaryStrong} strokeWidth={1.8} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={fg}>{title}</Text>
        {detail ? <Text variant="caption" color={colors.textSecondary}>{detail}</Text> : null}
      </View>
      <ChevronLeft size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const kg = (g: number) => `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} ק״ג`;
const cm = (mm: number) => `${(mm / 10).toFixed(1).replace(/\.0$/, '')} ס״מ`;

export default function ChildScreen() {
  const { child, children, select } = useActiveChild();
  const { db, syncNow } = useServices();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);
  const sync = useSession((s) => s.sync);
  const toast = useToast((s) => s.show);
  const unsynced = useUnsynced();
  const measurements = useMeasurements(child?.id);
  const [confirm, setConfirm] = useState<'wipe' | 'account' | null>(null);
  const [busy, setBusy] = useState(false);
  if (!child) return <Screen><View /></Screen>;

  const birth = parseDayKey(child.birthDate);
  const latest = measurements.data?.[0];
  const latestText = latest
    ? [latest.weightG ? kg(latest.weightG) : null, latest.lengthMm ? cm(latest.lengthMm) : null].filter(Boolean).join(' · ') || 'היקף ראש נמדד'
    : 'עוד לא הוזנו מדידות';
  const pending = unsynced.data?.pending ?? 0;

  const doExport = async () => {
    try {
      await exportData(db);
    } catch {
      toast('הייצוא נכשל. אפשר לנסות שוב.', { tone: 'error' });
    }
  };
  const wipe = async () => {
    setBusy(true);
    try {
      if (confirm === 'account') {
        const { error } = (await getSupabase()?.rpc('delete_my_data')) ?? { error: null };
        if (error) throw new Error(error.message);
        await signOut();
      }
      await wipeLocalData(db);
      useSession.getState().setActiveChildId(null);
      await qc.invalidateQueries();
      setConfirm(null);
      router.replace('/');
    } catch (err) {
      setConfirm(null);
      const message = err instanceof Error && err.message.includes('transfer ownership')
        ? 'לפני מחיקת החשבון צריך להעביר את ניהול המשפחה להורה אחר.'
        : 'המחיקה לא הושלמה. לא נמחק דבר.';
      toast(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <Text variant="title" accessibilityRole="header" style={{ paddingTop: spacing.md }}>הילד שלי</Text>

      <Card style={styles.profile}>
        <Avatar name={child.name} uri={child.photoUri} size={84} />
        <Text variant="title" center>{child.name}</Text>
        <Text color={colors.textSecondary} center>{formatAgeWithSex(child.birthDate, child.sex) ?? ''}</Text>
        <Text variant="caption" color={colors.textSecondary} center>
          {birth ? `תאריך לידה: ${formatDateFull(birth)}` : ''}{child.gestationalWeeks ? ` · נולד/ה בשבוע ${child.gestationalWeeks}` : ''}
        </Text>
        <Button label="עריכת פרופיל" icon={Pencil} variant="secondary" size="md" style={{ alignSelf: 'stretch', marginTop: spacing.sm }}
          onPress={() => router.push({ pathname: '/child/edit', params: { id: child.id } })} />
      </Card>

      <SectionHeader title="גדילה" />
      <Card style={styles.list}>
        <Row icon={Ruler} title="מדידות גדילה" detail={latest ? `אחרונה: ${latestText}` : latestText} onPress={() => router.push('/growth')} />
      </Card>

      <SectionHeader title="הילדים שלנו" />
      <Card style={styles.list}>
        {children.map((c) => (
          <Pressable key={c.id} onPress={() => select(c.id)} accessibilityRole="radio" accessibilityState={{ selected: c.id === child.id }}
            accessibilityLabel={c.name} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
            <Avatar name={c.name} uri={c.photoUri} size={40} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{c.name}</Text>
              <Text variant="caption" color={colors.textSecondary}>{formatAgeWithSex(c.birthDate, c.sex) ?? ''}</Text>
            </View>
            {c.id === child.id ? <Text variant="caption" color={colors.primaryStrong}>מוצג עכשיו</Text> : null}
          </Pressable>
        ))}
        <Row icon={Plus} title="הוספת ילד/ה" onPress={() => router.push('/child/edit')} />
      </Card>

      <SectionHeader title="חשבון וגיבוי" />
      {user ? (
        <Card style={styles.list}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><UserRound size={20} color={colors.primaryStrong} strokeWidth={1.8} /></View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{user.email ?? 'מחובר/ת'}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                {sync.status === 'syncing' ? 'מסנכרן…'
                  : pending > 0 ? `${pending} רשומות ממתינות לסנכרון`
                  : sync.lastSyncedAt ? `סונכרן ${formatRelative(new Date(sync.lastSyncedAt))}` : 'עוד לא בוצע סנכרון'}
              </Text>
            </View>
          </View>
          {sync.status === 'error' ? <Notice tone="warning" icon={CloudOff} text="הסנכרון האחרון לא הושלם. הנתונים שמורים במכשיר ויועלו בניסיון הבא." /> : null}
          <Row icon={RefreshCw} title="סנכרון עכשיו" onPress={() => void syncNow()} />
          <Row icon={LogOut} title="יציאה מהחשבון" detail="הנתונים יישארו שמורים במכשיר" onPress={() => void signOut()} />
        </Card>
      ) : (
        <Card style={{ gap: spacing.md }}>
          <Notice icon={CloudOff} text={config.isCloudConfigured
            ? 'כרגע הנתונים שמורים במכשיר הזה בלבד. חשבון מוסיף גיבוי וסנכרון בין מכשירים.'
            : 'הנתונים שמורים במכשיר הזה בלבד. בגרסה הזו עדיין לא חובר שרת, ולכן אין גיבוי או שיתוף משפחתי.'} />
          {config.isCloudConfigured ? <Button label="יצירת חשבון או כניסה" size="md" onPress={() => router.push('/auth/sign-up')} /> : null}
        </Card>
      )}

      <SectionHeader title="המידע שלך" />
      <Card style={styles.list}>
        <Row icon={Download} title="ייצוא כל הנתונים" detail="קובץ JSON עם כל מה שתועד" onPress={() => void doExport()} />
        {user
          ? <Row icon={Trash2} danger title="מחיקת החשבון וכל הנתונים" detail="פעולה סופית שאי אפשר לבטל" onPress={() => setConfirm('account')} />
          : <Row icon={Trash2} danger title="מחיקת כל הנתונים מהמכשיר" detail="פעולה סופית שאי אפשר לבטל" onPress={() => setConfirm('wipe')} />}
      </Card>

      <ConfirmDialog visible={confirm !== null} destructive loading={busy}
        title={confirm === 'account' ? 'למחוק את החשבון וכל הנתונים?' : 'למחוק את כל הנתונים מהמכשיר?'}
        body="כל הילדים, התיעוד והמדידות יימחקו לצמיתות. מומלץ לייצא קודם."
        confirmLabel="מחיקה לצמיתות" onCancel={() => setConfirm(null)} onConfirm={() => void wipe()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  list: { paddingVertical: spacing.xs, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  rowIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
});
