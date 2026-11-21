import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { BabyFigure } from '@/components/baby/BabyFigure';
import { DateField, FieldGroup, TextField } from '@/components/ui/inputs';
import { ConfirmDialog, useToast } from '@/components/ui/overlays';
import { Button, Notice, Segmented } from '@/components/ui/primitives';
import { SheetCard, SkyScreen } from '@/components/ui/SkyScreen';
import { Text } from '@/components/ui/Text';
import { colors, spacing, themed } from '@/design/tokens';
import type { ChildSex } from '@/domain/age';
import { parseAvatar } from '@/domain/avatar';
import { resolveTheme } from '@/domain/theme';
import { useChildMutations, useChildren } from '@/hooks/data';
import { dayKey } from '@/lib/time';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';

const SEX = [
  { value: 'female', label: 'בת' },
  { value: 'male', label: 'בן' },
  { value: 'unspecified', label: 'לא לציין' },
] as const;

const AVATAR = parseAvatar(null);

const MESSAGES: Record<string, string> = {
  name_required: 'צריך להזין שם.',
  birth_date_invalid: 'תאריך הלידה אינו תקין.',
  birth_date_future: 'תאריך הלידה לא יכול להיות בעתיד.',
};

/** Add a child (also the last onboarding step) or edit an existing profile. */
export default function ChildEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const children = useChildren();
  const { create, update, remove } = useChildMutations();
  const { kv } = useServices();
  const setActiveChildId = useSession((s) => s.setActiveChildId);
  const toast = useToast((s) => s.show);
  const existing = id ? children.data?.find((c) => c.id === id) : undefined;
  const isFirst = !id && (children.data?.length ?? 0) === 0;

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<string | null>(null);
  const [sex, setSex] = useState<ChildSex>('unspecified');
  const [weeks, setWeeks] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [loaded, setLoaded] = useState(!id);
  const filled = useRef(false);

  useEffect(() => {
    if (!existing || filled.current) return;
    filled.current = true;
    setName(existing.name);
    setBirthDate(existing.birthDate);
    setSex(existing.sex);
    setWeeks(existing.gestationalWeeks ? String(existing.gestationalWeeks) : '');
    setNotes(existing.notes ?? '');
    setPhotoUri(existing.photoUri);
    setLoaded(true);
  }, [existing]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      toast('לא הצלחנו לפתוח את התמונות. אפשר לבדוק את ההרשאות בהגדרות המכשיר.', { tone: 'error' });
    }
  };

  const save = () => {
    const w = weeks.trim() ? Number(weeks) : null;
    if (!name.trim()) return setError(MESSAGES.name_required);
    if (!birthDate) return setError(MESSAGES.birth_date_invalid);
    if (birthDate > dayKey(new Date())) return setError(MESSAGES.birth_date_future);
    if (w !== null && (!Number.isInteger(w) || w < 22 || w > 44)) return setError('שבוע הלידה צריך להיות בין 22 ל-44.');
    setError(null);
    const draft = { name, birthDate, sex, gestationalWeeks: w, photoUri, notes: notes.trim() || null };
    const onError = (err: unknown) => setError(MESSAGES[err instanceof Error ? err.message : ''] ?? 'לא הצלחנו לשמור. אפשר לנסות שוב.');
    if (existing) {
      update.mutate({ id: existing.id, draft }, { onSuccess: () => { toast('הפרופיל עודכן'); close(); }, onError });
    } else {
      create.mutate(draft, {
        onSuccess: (child) => {
          setActiveChildId(child.id);
          void kv.set('active_child_id', child.id);
          toast(`${child.name} נוסף/ה`);
          router.replace('/(tabs)');
        },
        onError,
      });
    }
  };

  const title = existing ? 'עריכת פרופיל' : isFirst ? 'מי מצטרף אלינו?' : 'הוספת ילד/ה';
  // The sky follows the choice as it is made: rose for a girl, blue for a boy.
  const theme = resolveTheme(existing ? parseAvatar(existing.avatar).theme : null, sex);
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SkyScreen title={title} subtitle={existing ? undefined : 'כמה פרטים, והדמות מחכה בבית'} onClose={close} sky={theme.sky}
        hero={(
          <View style={styles.stage}>
            <View style={styles.archRing}>
              <View style={styles.arch}>
                <BabyFigure key={sex} active mood="happy" stage="stand" config={existing ? parseAvatar(existing.avatar) : AVATAR} sex={sex} height={150}
                  label={sex === 'female' ? 'הדמות של התינוקת באפליקציה' : 'הדמות של התינוק באפליקציה'} />
              </View>
            </View>
            <Pressable onPress={() => void pickPhoto()} accessibilityRole="button" accessibilityLabel="בחירת תמונת פרופיל" style={styles.photo}>
              <Avatar name={name || '?'} uri={photoUri} size={64} />
              <View style={styles.photoBadge}><Camera size={14} color={colors.white} strokeWidth={2} /></View>
            </Pressable>
          </View>
        )}
        footer={<Button label={existing ? 'שמירת שינויים' : 'שמירה והמשך'} onPress={save} loading={create.isPending || update.isPending} />}>
        {loaded ? (
          <>
            <SheetCard>
              <TextField label="שם" value={name} onChangeText={setName} maxLength={60} autoComplete="off" placeholder="איך קוראים לו/לה?" />
              <DateField label="תאריך לידה" value={birthDate} onChange={setBirthDate} />
              <FieldGroup label="מין" hint="משמש לניסוח (בן/בת), ובהמשך לעקומות גדילה.">
                <Segmented options={SEX} value={sex} onChange={setSex} />
              </FieldGroup>
            </SheetCard>
            <SheetCard>
              <Text variant="label" color={colors.textSecondary}>לא חובה</Text>
              <TextField label="שבוע לידה (לא חובה)" value={weeks} onChangeText={(t) => setWeeks(t.replace(/[^\d]/g, '').slice(0, 2))}
                keyboardType="number-pad" inputMode="numeric" maxLength={2} placeholder="למשל 39" hint="רלוונטי בעיקר לפגים, להתאמות גיל בעתיד." />
              <TextField label="הערות אישיות (לא חובה)" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
            </SheetCard>
            {error ? <Notice tone="danger" text={error} /> : null}
            {existing ? <Button label="הסרת הילד/ה מהאפליקציה" variant="danger" size="md" onPress={() => setConfirmRemove(true)} /> : null}
          </>
        ) : null}
      </SkyScreen>
      <ConfirmDialog visible={confirmRemove} destructive title={`להסיר את ${existing?.name ?? ''}?`}
        body="הפרופיל וכל התיעוד שלו יוסרו מהאפליקציה." confirmLabel="הסרה" loading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => existing && remove.mutate(existing.id, { onSuccess: () => { setConfirmRemove(false); toast('הפרופיל הוסר'); router.replace('/'); } })} />
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDFBFA' },
  stage: { alignSelf: 'center' },
  // The same arch window as on Home, small: the character the family will meet there.
  archRing: { padding: 6, borderTopLeftRadius: 86, borderTopRightRadius: 86, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: 'rgba(255,255,255,0.55)' },
  arch: { width: 160, height: 166, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.background, borderTopLeftRadius: 80, borderTopRightRadius: 80, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  photo: { position: 'absolute', bottom: -6, end: -34, borderRadius: 36, borderWidth: 3, borderColor: colors.white },
  photoBadge: { position: 'absolute', bottom: -2, end: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
}));
