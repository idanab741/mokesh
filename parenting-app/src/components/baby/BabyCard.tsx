import * as ImagePicker from 'expo-image-picker';
import { Camera, Check } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Sheet, useToast } from '@/components/ui/overlays';
import { Button, Chip, Notice } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { ageParts } from '@/domain/age';
import {
  type AvatarConfig, type BabyStage, OUTFIT_COLORS, defaultStageForAge, outfitName, parseAvatar, photoFingerprint,
  resolveOutfit, resolveStage, stageLabel,
} from '@/domain/avatar';
import type { Child } from '@/domain/child';
import { useChildMutations } from '@/hooks/data';
import { analysePhoto, canAnalysePhotos } from '@/services/photoLook';
import { Baby3D } from './Baby3D';

/** Resolved look of a child's 3D baby. */
export function useBabyLook(child: Child, now: Date) {
  const config = parseAvatar(child.avatar);
  const months = ageParts(child.birthDate, now)?.totalMonths ?? 0;
  return { config, months, stage: resolveStage(config, months) };
}

/**
 * Keeps the 3D baby in step with the child's photo: whenever the photo changes, skin tone
 * and hair are read from it once (on the device) and stored with the avatar.
 */
export function useLookFromPhoto(child: Child | null) {
  const { setAvatar } = useChildMutations();
  const busy = useRef<string | null>(null);
  const id = child?.id;
  const uri = child?.photoUri ?? null;
  const raw = child?.avatar ?? null;
  useEffect(() => {
    if (!id || !uri || !canAnalysePhotos) return;
    const config = parseAvatar(raw);
    const print = photoFingerprint(uri);
    if (config.photo === print || busy.current === print) return;
    busy.current = print;
    analysePhoto(uri)
      .catch(() => null)
      .then((look) => {
        const next: AvatarConfig = look ? { ...config, skin: look.skin, hair: look.hair, photo: print, photoOk: true } : { ...config, photo: print, photoOk: false };
        setAvatar.mutate({ id, avatar: JSON.stringify(next) });
      })
      .finally(() => { busy.current = null; });
    // setAvatar is a stable mutation object; depending on it would re-run the analysis needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, uri, raw]);
}

const STAGES: (BabyStage | 'auto')[] = ['auto', 'tummy', 'sit', 'crawl', 'stand'];

/**
 * The look editor. A parent can change the colour of the clothes (and the pose); how the
 * baby itself looks comes from the child's photo.
 */
export function BabyCustomizeSheet({ child, now, open, onClose }: { child: Child; now: Date; open: boolean; onClose: () => void }) {
  const { setAvatar, setPhoto } = useChildMutations();
  const toast = useToast((s) => s.show);
  const { config, months, stage } = useBabyLook(child, now);
  const outfit = resolveOutfit(config, child.sex);
  const update = (patch: Partial<AvatarConfig>) => setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, ...patch }) });

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      if (!result.canceled && result.assets[0]) setPhoto.mutate({ id: child.id, uri: result.assets[0].uri });
    } catch {
      toast('לא הצלחנו לפתוח את התמונות. אפשר לבדוק את ההרשאות בהגדרות המכשיר.', { tone: 'error' });
    }
  };

  const photoStatus = !child.photoUri
    ? `העלו תמונה של ${child.name} מקרוב, והדמות תקבל את גוון העור והשיער ממנה.`
    : !canAnalysePhotos
      ? 'התאמת הדמות לתמונה זמינה כרגע רק בגרסת הדפדפן.'
      : config.photoOk === false
        ? 'לא הצלחנו לזהות פנים בתמונה. כדאי לנסות תמונה מקרוב, באור טוב ובלי כובע.'
        : config.photoOk
          ? 'גוון העור והשיער של הדמות נקבעו לפי התמונה.'
          : 'קוראים את התמונה…';

  return (
    <Sheet visible={open} onClose={onClose} title={`המראה של ${child.name}`}>
      <View style={styles.preview}>
        {open ? <Baby3D stage={stage} config={config} sex={child.sex} height={200} label={`תצוגה מקדימה של ${child.name}`} /> : null}
      </View>

      <View style={styles.photoRow}>
        <Avatar name={child.name} uri={child.photoUri} size={60} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Text variant="caption" color={config.photoOk === false ? colors.warning : colors.textSecondary} accessibilityLiveRegion="polite">{photoStatus}</Text>
          <Button label={child.photoUri ? 'החלפת תמונה' : 'העלאת תמונה'} icon={Camera} size="md" variant="secondary" onPress={() => void pickPhoto()} style={{ alignSelf: 'flex-start' }} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color={colors.textSecondary}>צבע הבגדים</Text>
        <View style={styles.swatches} accessibilityRole="radiogroup">
          {OUTFIT_COLORS.map((color) => {
            const selected = color === outfit;
            return (
              <Pressable key={color} onPress={() => update({ outfit: color })} accessibilityRole="radio" accessibilityState={{ checked: selected }}
                aria-checked={selected} accessibilityLabel={`בגדים בצבע ${outfitName[color]}`}
                style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected, color === '#FFFFFF' ? styles.swatchLight : null]}>
                {selected ? <Check size={20} color={colors.textPrimary} strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color={colors.textSecondary}>תנוחה</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {STAGES.map((s) => (
            <Chip key={s} selected={config.stage === s} onPress={() => update({ stage: s })}
              label={s === 'auto' ? `לפי הגיל (${stageLabel[defaultStageForAge(months)]})` : stageLabel[s]} />
          ))}
        </View>
      </View>
      <Notice text="התמונה נקראת במכשיר שלכם בלבד ולא נשלחת לשום מקום. התנוחה לפי הגיל היא ברירת מחדל משחקית: כל ילד מתקדם בקצב שלו." />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  swatch: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchLight: { borderColor: colors.borderStrong },
  swatchSelected: { borderColor: colors.textPrimary, borderWidth: 3 },
  preview: { height: 200, borderRadius: radius.xl, backgroundColor: '#FFF1F5', overflow: 'hidden' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
});
