import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { DateField, FieldGroup, TextField } from '@/components/ui/inputs';
import { ConfirmDialog, useToast } from '@/components/ui/overlays';
import { Button, IconButton, Notice, Segmented } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing, themed } from '@/design/tokens';
import type { ChildSex } from '@/domain/age';
import { useChildMutations, useChildren } from '@/hooks/data';
import { dayKey } from '@/lib/time';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';

const SEX = [
  { value: 'female', label: 'בת' },
  { value: 'male', label: 'בן' },
  { value: 'unspecified', label: 'לא לציין' },
] as const;

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

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon={X} label="סגירה" tone="surface" onPress={close} />
        <Text variant="heading" accessibilityRole="header">{existing ? 'עריכת פרופיל' : isFirst ? 'מי מצטרף אלינו?' : 'הוספת ילד/ה'}</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loaded ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => void pickPhoto()} accessibilityRole="button" accessibilityLabel="בחירת תמונת פרופיל" style={styles.photo}>
              <Avatar name={name || '?'} uri={photoUri} size={96} />
              <View style={styles.photoBadge}><Camera size={16} color={colors.white} strokeWidth={2} /></View>
            </Pressable>
            <TextField label="שם" value={name} onChangeText={setName} maxLength={60} autoComplete="off" placeholder="איך קוראים לו/לה?" />
            <DateField label="תאריך לידה" value={birthDate} onChange={setBirthDate} />
            <FieldGroup label="מין" hint="משמש לניסוח (בן/בת), ובהמשך לעקומות גדילה.">
              <Segmented options={SEX} value={sex} onChange={setSex} />
            </FieldGroup>
            <TextField label="שבוע לידה (לא חובה)" value={weeks} onChangeText={(t) => setWeeks(t.replace(/[^\d]/g, '').slice(0, 2))}
              keyboardType="number-pad" inputMode="numeric" maxLength={2} placeholder="למשל 39" hint="רלוונטי בעיקר לפגים, להתאמות גיל בעתיד." />
            <TextField label="הערות אישיות (לא חובה)" value={notes} onChangeText={setNotes} multiline maxLength={2000} />
            {error ? <Notice tone="danger" text={error} /> : null}
            {existing ? <Button label="הסרת הילד/ה מהאפליקציה" variant="danger" size="md" onPress={() => setConfirmRemove(true)} /> : null}
          </ScrollView>
        ) : <View style={{ flex: 1 }} />}
        <View style={styles.footer}>
          <Button label={existing ? 'שמירת שינויים' : 'שמירה והמשך'} onPress={save} loading={create.isPending || update.isPending} />
        </View>
      </KeyboardAvoidingView>
      <ConfirmDialog visible={confirmRemove} destructive title={`להסיר את ${existing?.name ?? ''}?`}
        body="הפרופיל וכל התיעוד שלו יוסרו מהאפליקציה." confirmLabel="הסרה" loading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => existing && remove.mutate(existing.id, { onSuccess: () => { setConfirmRemove(false); toast('הפרופיל הוסר'); router.replace('/'); } })} />
    </SafeAreaView>
  );
}

const styles = themed(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.xl },
  photo: { alignSelf: 'center' },
  photoBadge: { position: 'absolute', bottom: 0, end: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderColor: colors.border },
}));
