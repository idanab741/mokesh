import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChevronRight, Copy, LogOut, Share2, UserMinus, UserPlus, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { TextField } from '@/components/ui/inputs';
import { ConfirmDialog, Sheet, useToast } from '@/components/ui/overlays';
import { Button, Card, EmptyState, IconButton, Notice, Screen, SectionHeader } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, themed } from '@/design/tokens';
import {
  type Family, type FamilyMember, type FamilyRole, acceptInvitation, createInvitation, ensureOwnFamily, inviteLink, isInviteCode, loadFamilies,
  removeMember, roleExplain, roleLabel, setMyName,
} from '@/services/family';
import { config } from '@/services/config';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';

type InviteRole = Exclude<FamilyRole, 'owner'>;
// 'relative' (view only) is not offered yet: the app cannot yet stop a read-only member from logging on their own phone.
const INVITE_ROLES: InviteRole[] = ['parent', 'caregiver'];

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export default function FamilyScreen() {
  const user = useSession((s) => s.user);
  const { db, syncNow, syncAfterJoin } = useServices();
  const qc = useQueryClient();
  const toast = useToast((s) => s.show);
  const families = useQuery({ queryKey: ['families', user?.id], queryFn: loadFamilies, enabled: !!user });
  const [inviteFor, setInviteFor] = useState<Family | null>(null);
  const [role, setRole] = useState<InviteRole>('parent');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [remove, setRemove] = useState<{ family: Family; member: FamilyMember } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [myName, setMyNameText] = useState('');

  const refresh = async () => { await qc.invalidateQueries({ queryKey: ['families'] }); };
  const back = <IconButton icon={ChevronRight} label="חזרה" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/child'))} tone="surface" />;

  if (!config.isCloudConfigured || !user) {
    return (
      <Screen edges={['top', 'bottom']} contentStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        {back}
        <EmptyState icon={Users} title="שיתוף משפחתי"
          body="כדי שבן או בת זוג, סבתא או מטפלת יראו ויתעדו יחד איתך, צריך חשבון. הנתונים שכבר תיעדת יישמרו ויעלו לחשבון."
          actionLabel={config.isCloudConfigured ? 'יצירת חשבון או כניסה' : undefined}
          onAction={config.isCloudConfigured ? () => router.push('/auth/sign-up') : undefined} />
      </Screen>
    );
  }

  const startInvite = async () => {
    setBusy(true);
    try {
      let family = inviteFor;
      if (!family) {
        // First invitation before anything was synced: make sure the local children are on the server first.
        await syncNow();
        const list = await loadFamilies();
        family = list.find((f) => f.myRole === 'owner') ?? null;
        if (!family) { const id = await ensureOwnFamily('המשפחה שלנו'); family = { id, name: 'המשפחה שלנו', myRole: 'owner', members: [] }; }
      }
      setCode(await createInvitation(family.id, role));
    } catch {
      toast('לא הצלחנו ליצור הזמנה. כדאי לבדוק את החיבור ולנסות שוב.', { tone: 'error' });
    } finally { setBusy(false); }
  };
  const link = code ? inviteLink(code) : null;
  const share = async () => {
    if (!code) return;
    const text = `הוזמנת להצטרף למשפחה שלנו ב-Lilbaby.\n${link ?? `קוד ההצטרפות: ${code}`}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ text }); return; } catch { /* closed the share sheet, or sharing is blocked: fall back to copying */ }
    }
    const copied = await copy(text);
    toast(copied ? 'ההזמנה הועתקה' : 'לא הצלחנו להעתיק. אפשר לסמן את הקוד ולהעתיק ידנית.', copied ? undefined : { tone: 'error' });
  };
  const join = async () => {
    if (!isInviteCode(joinCode)) return setJoinError('הקוד צריך להכיל 64 תווים. כדאי להעתיק אותו במלואו מההזמנה.');
    setBusy(true); setJoinError(null);
    try {
      await acceptInvitation(joinCode);
      await syncAfterJoin();
      await refresh();
      setJoinOpen(false); setJoinCode('');
      toast('הצטרפת למשפחה');
    } catch (err) {
      setJoinError(err instanceof Error && /not valid/i.test(err.message) ? 'הקוד אינו בתוקף: ייתכן שכבר נעשה בו שימוש, שפג תוקפו או שבוטל.' : 'ההצטרפות לא הושלמה. כדאי לבדוק את החיבור ולנסות שוב.');
    } finally { setBusy(false); }
  };
  const doRemove = async () => {
    if (!remove) return;
    setBusy(true);
    try {
      await removeMember(remove.member.id);
      if (remove.member.isMe) {
        // The family's children are no longer this person's to see: take them off this device too.
        const id = remove.family.id;
        await db.run('DELETE FROM activity_events WHERE child_id IN (SELECT id FROM children WHERE family_id = ?)', [id]);
        await db.run('DELETE FROM measurements WHERE child_id IN (SELECT id FROM children WHERE family_id = ?)', [id]);
        await db.run('DELETE FROM milestones WHERE child_id IN (SELECT id FROM children WHERE family_id = ?)', [id]);
        for (const t of ['health_records', 'medication_administrations', 'medications', 'appointments']) await db.run(`DELETE FROM ${t} WHERE child_id IN (SELECT id FROM children WHERE family_id = ?)`, [id]);
        await db.run('DELETE FROM children WHERE family_id = ?', [id]);
        useSession.getState().setActiveChildId(null);
        await qc.invalidateQueries();
      }
      await refresh();
      toast(remove.member.isMe ? 'יצאת מהמשפחה' : 'ההרשאה הוסרה');
    } catch {
      toast(remove.member.isMe ? 'אי אפשר לצאת: מנהל/ת יחיד/ה צריך/ה קודם להעביר את הניהול.' : 'ההסרה לא הושלמה.', { tone: 'error' });
    } finally { setBusy(false); setRemove(null); }
  };

  const list = families.data ?? [];
  const nameless = list.some((f) => f.members.some((m) => m.isMe && !m.name));
  const saveName = async () => {
    if (!myName.trim()) return;
    setBusy(true);
    try { await setMyName(myName); await refresh(); toast('השם נשמר'); }
    catch { toast('השם לא נשמר. אפשר לנסות שוב.', { tone: 'error' }); }
    finally { setBusy(false); }
  };
  const closeInvite = () => { setInviteFor(null); setCode(null); setInviting(false); };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.head}>{back}<Text variant="title" accessibilityRole="header" style={{ flex: 1 }}>משפחה ושיתוף</Text></View>
      <Text color={colors.textSecondary}>מי שמצטרף רואה את אותם ילדים ואותו תיעוד, בזמן אמת, מהטלפון שלו.</Text>

      {families.isLoading ? <Text color={colors.textSecondary}>טוען…</Text> : null}
      {families.isError ? <Notice tone="warning" text="לא הצלחנו לטעון את פרטי המשפחה. כדאי לבדוק את החיבור לאינטרנט." /> : null}

      {nameless ? (
        <Card style={{ gap: spacing.sm }}>
          <TextField label="איך לקרוא לך במשפחה?" value={myName} onChangeText={setMyNameText} placeholder="למשל: אמא, סבתא רחל" maxLength={40} />
          <Button label="שמירת השם" size="md" variant="secondary" loading={busy} onPress={() => void saveName()} />
        </Card>
      ) : null}

      {list.map((family) => (
        <View key={family.id} style={{ gap: spacing.md }}>
          <SectionHeader title={family.name} />
          <Card style={styles.list}>
            {family.members.map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={styles.avatar}><Text variant="bodyStrong" color={colors.primaryStrong}>{(m.name ?? '?').slice(0, 1)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>{m.name ?? 'בן/בת משפחה'}{m.isMe ? ' (אני)' : ''}</Text>
                  <Text variant="caption" color={colors.textSecondary}>{roleLabel[m.role]}</Text>
                </View>
                {m.isMe && m.role !== 'owner' ? (
                  <IconButton icon={LogOut} label="יציאה מהמשפחה" onPress={() => setRemove({ family, member: m })} />
                ) : !m.isMe && family.myRole === 'owner' ? (
                  <IconButton icon={UserMinus} label={`הסרת ${m.name ?? 'בן/בת משפחה'}`} onPress={() => setRemove({ family, member: m })} />
                ) : null}
              </View>
            ))}
          </Card>
          {family.myRole === 'owner' ? (
            <Button label="הזמנת בן/בת משפחה" icon={UserPlus} size="md" onPress={() => { setInviteFor(family); setInviting(true); }} />
          ) : null}
        </View>
      ))}

      {!families.isLoading && list.length === 0 ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="heading">עדיין רק את/ה כאן</Text>
          <Text color={colors.textSecondary}>אפשר להזמין הורה נוסף, סבא וסבתא או מטפלת.</Text>
          <Button label="הזמנת בן/בת משפחה" icon={UserPlus} size="md" onPress={() => setInviting(true)} />
        </Card>
      ) : null}

      <Card style={{ gap: spacing.sm }}>
        <Text variant="heading">קיבלת הזמנה?</Text>
        <Text color={colors.textSecondary}>פתיחת הקישור מההזמנה מצרפת אוטומטית. אפשר גם להדביק כאן את הקוד.</Text>
        <Button label="הצטרפות עם קוד" variant="secondary" size="md" onPress={() => setJoinOpen(true)} />
      </Card>

      <Sheet visible={inviting} onClose={closeInvite} title={code ? 'ההזמנה מוכנה' : 'את מי מזמינים?'}>
        {code ? (
          <>
            <Text color={colors.textSecondary}>שלחו את ההזמנה למי שהזמנתם. היא מתאימה לאדם אחד ותקפה לשבוע.</Text>
            <View style={styles.codeBox}><Text variant="caption" selectable style={{ writingDirection: 'ltr' }} testID="invite-code">{link ?? code}</Text></View>
            <Button label="שיתוף ההזמנה" icon={Share2} onPress={() => void share()} />
            <Button label="העתקת הקישור" icon={Copy} variant="secondary" size="md"
              onPress={async () => toast((await copy(link ?? code)) ? 'הועתק' : 'לא הצלחנו להעתיק. אפשר לסמן ולהעתיק ידנית.')} />
            <Notice text="מי שמחזיק בקישור יכול להצטרף למשפחה, אז שלחו אותו רק לאדם שהתכוונתם אליו." />
          </>
        ) : (
          <>
            <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
              {INVITE_ROLES.map((r) => {
                const selected = r === role;
                return (
                  <Pressable key={r} onPress={() => setRole(r)} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
                    accessibilityLabel={roleLabel[r]} style={[styles.role, selected && styles.roleSelected]}>
                    <Text variant="bodyStrong" color={selected ? colors.primaryStrong : colors.textPrimary}>{roleLabel[r]}</Text>
                    <Text variant="label" color={colors.textSecondary}>{roleExplain[r]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label="יצירת הזמנה" loading={busy} onPress={() => void startInvite()} />
          </>
        )}
      </Sheet>

      <Sheet visible={joinOpen} onClose={() => setJoinOpen(false)} title="הצטרפות למשפחה">
        <TextField label="קוד ההצטרפות" value={joinCode} onChangeText={(t) => { setJoinCode(t.trim()); setJoinError(null); }} error={joinError}
          autoCapitalize="none" autoCorrect={false} placeholder="הדביקו את הקוד מההזמנה" style={{ writingDirection: 'ltr' }} />
        <Button label="הצטרפות" loading={busy} onPress={() => void join()} />
      </Sheet>

      <ConfirmDialog visible={remove !== null} destructive loading={busy}
        title={remove?.member.isMe ? `לצאת מ"${remove.family.name}"?` : `להסיר את ${remove?.member.name ?? 'בן/בת המשפחה'}?`}
        body={remove?.member.isMe ? 'הילדים והתיעוד של המשפחה הזו לא יוצגו יותר אצלך.' : 'הם לא יוכלו עוד לראות או לתעד. אפשר להזמין שוב בכל רגע.'}
        confirmLabel={remove?.member.isMe ? 'יציאה' : 'הסרה'} onCancel={() => setRemove(null)} onConfirm={() => void doRemove()} />
    </Screen>
  );
}

const styles = themed(() => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  list: { paddingVertical: spacing.xs, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  role: { gap: 2, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  roleSelected: { borderColor: colors.primaryStrong, backgroundColor: colors.primaryLight },
  codeBox: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
}));
