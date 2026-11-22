import { router } from 'expo-router';
import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { AlbumCover, AlbumPage, Polaroid } from '@/components/album/Scrapbook';
import { DateField, TextField } from '@/components/ui/inputs';
import { Sheet, useToast } from '@/components/ui/overlays';
import { Button } from '@/components/ui/primitives';
import { SkyScreen } from '@/components/ui/SkyScreen';
import { Text } from '@/components/ui/Text';
import { colors, spacing, themed } from '@/design/tokens';
import { CAPTION_MAX, type Photo, groupByMonth } from '@/domain/photos';
import { useActiveChild } from '@/hooks/data';
import { useGuest } from '@/state/guest';
import { usePhotoFile, usePhotoMutations, usePhotos } from '@/hooks/photos';
import { errorMessage } from '@/i18n/he';
import { type PickedPhoto, pickPhoto } from '@/lib/pickPhoto';
import { dayKey, formatDateFull } from '@/lib/time';

const dateText = (day: string) => formatDateFull(new Date(`${day}T12:00:00`));
const shortDate = (day: string) => { const [, m, d] = day.split('-').map(Number); return `${d}.${m}`; };

export default function AlbumScreen() {
  const { child } = useActiveChild();
  const list = usePhotos(child?.id);
  const { add, update, remove } = usePhotoMutations(child?.id, child?.familyId);
  const toast = useToast((s) => s.show);
  const { guard } = useGuest();
  const months = useMemo(() => (child ? groupByMonth(list.data ?? [], child.birthDate) : []), [list.data, child]);

  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [open, setOpen] = useState<Photo | null>(null);
  const [day, setDay] = useState<string | null>(dayKey(new Date()));
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const file = usePhotoFile(open, child?.familyId);

  const choose = async () => {
    try {
      const p = await pickPhoto();
      if (!p) return;
      setPicked(p); setDay(dayKey(new Date())); setCaption(''); setError(null);
    } catch {
      toast('לא הצלחנו לפתוח את התמונה. אפשר לנסות תמונה אחרת.', { tone: 'error' });
    }
  };
  const validDay = () => {
    if (!day) { setError('צריך תאריך לתמונה.'); return null; }
    if (day > dayKey(new Date())) { setError('התאריך עוד לא הגיע.'); return null; }
    return day;
  };
  const saveNew = () => {
    const d = validDay();
    if (!d || !picked) return;
    add.mutate({ takenOn: d, caption: caption || null, thumb: picked.thumb, data: picked.data }, {
      onSuccess: () => { setPicked(null); toast('התמונה נשמרה באלבום'); },
      onError: (e) => setError(errorMessage(e)),
    });
  };
  const view = (p: Photo) => { setOpen(p); setDay(p.takenOn); setCaption(p.caption ?? ''); setError(null); setConfirm(false); };
  const saveEdit = () => {
    const d = validDay();
    if (!d || !open) return;
    update.mutate({ id: open.id, takenOn: d, caption: caption || null }, { onSuccess: () => { setOpen(null); toast('נשמר'); }, onError: (e) => setError(errorMessage(e)) });
  };
  const doRemove = () => {
    if (!open) return;
    remove.mutate(open, { onSuccess: () => { setOpen(null); toast('התמונה נמחקה'); } });
  };

  const total = list.data?.length ?? 0;
  return (
    <SkyScreen title={child ? `האלבום של ${child.name}` : 'האלבום'} subtitle="דף לכל חודש בחיים"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
      <AlbumCover name={child?.name ?? ''} latest={list.data?.[0] ?? null} familyId={child?.familyId} photos={total} months={months.length} />
      <Button label="הוספת תמונה" icon={ImagePlus} onPress={guard(() => void choose())} />

      {total === 0 ? (
        <AlbumPage title="הדף הראשון" count="">
          <Text center color="#6B5A62" style={{ paddingVertical: spacing.lg }}>כל תמונה נדבקת בדף של החודש שבו צולמה, וכך האלבום נבנה מעצמו חודש אחרי חודש.</Text>
        </AlbumPage>
      ) : months.map((m) => (
        <AlbumPage key={m.month} title={m.title} count={m.photos.length === 1 ? 'תמונה אחת' : `${m.photos.length} תמונות`}>
          {m.photos.map((p, i) => (
            <Polaroid key={p.id} photo={p} familyId={child?.familyId} index={i + m.month} wide={i === 0 && m.photos.length % 2 === 1} onPress={() => view(p)}
              label={`תמונה מ-${dateText(p.takenOn)}${p.caption ? `, ${p.caption}` : ''}`} caption={p.caption ?? shortDate(p.takenOn)} />
          ))}
        </AlbumPage>
      ))}
      <Text variant="caption" center color={colors.textSecondary}>התמונות נשמרות במכשיר, ועם חשבון הן משותפות רק עם המשפחה שלכם.</Text>

      <Sheet visible={!!picked} onClose={() => setPicked(null)} title="תמונה חדשה">
        {picked ? <Image source={{ uri: picked.thumb ?? picked.data }} style={styles.preview} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
        <DateField label="מתי צולמה?" value={day} onChange={setDay} />
        <TextField label="כמה מילים (לא חובה)" value={caption} onChangeText={setCaption} maxLength={CAPTION_MAX} placeholder="למשל: אמבטיה ראשונה" />
        {error ? <Text variant="caption" color={colors.danger} accessibilityRole="alert">{error}</Text> : null}
        <Button label="שמירה באלבום" onPress={saveNew} loading={add.isPending} />
      </Sheet>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title={open ? dateText(open.takenOn) : ''}>
        {open ? (
          <View style={styles.full}>
            <Image source={{ uri: file.data ?? open.thumb ?? undefined }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={open.caption ?? 'תמונה מהאלבום'} accessibilityIgnoresInvertColors />
            {file.isLoading ? <ActivityIndicator color={colors.primaryStrong} /> : null}
          </View>
        ) : null}
        {open && !file.isLoading && !file.data ? <Text variant="caption" center color={colors.textSecondary}>התמונה המלאה עוד לא הגיעה למכשיר הזה. היא תופיע אחרי שהמכשיר שצילם יסתנכרן.</Text> : null}
        <DateField label="מתי צולמה?" value={day} onChange={setDay} />
        <TextField label="כמה מילים (לא חובה)" value={caption} onChangeText={setCaption} maxLength={CAPTION_MAX} />
        {error ? <Text variant="caption" color={colors.danger} accessibilityRole="alert">{error}</Text> : null}
        <Button label="שמירת שינויים" onPress={saveEdit} loading={update.isPending} />
        {confirm
          ? <Button label="כן, למחוק את התמונה" variant="danger" size="md" onPress={doRemove} loading={remove.isPending} />
          : <Button label="מחיקת התמונה" variant="ghost" size="md" icon={Trash2} onPress={() => setConfirm(true)} />}
      </Sheet>
    </SkyScreen>
  );
}

const styles = themed(() => StyleSheet.create({
  preview: { width: 140, height: 140, borderRadius: 24, alignSelf: 'center' },
  full: { width: '100%', aspectRatio: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#F4EEF1', alignItems: 'center', justifyContent: 'center' },
}));
