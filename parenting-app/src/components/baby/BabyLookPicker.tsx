import { Check } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/ui/overlays';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { parseAvatar } from '@/domain/avatar';
import type { Child } from '@/domain/child';
import { useChildMutations } from '@/hooks/data';
import { babyClips, babyLooks } from './clips';

/** The characters a parent can choose between for this child (same sex, other hair, eyes and skin). */
export function looksFor(sex: Child['sex']) {
  const who = sex === 'female' ? 'girl' : 'boy';
  const base = babyClips[who];
  const first = base.crawl ?? base.stand ?? base.sit ?? base.tummy;
  if (!first || babyLooks[who].length === 0) return [];
  return [
    { key: 'auto', label: who === 'girl' ? 'שיער חום־בהיר, עיניים חומות' : 'עור בהיר, שיער חום־בהיר', poster: first.poster, standing: !!base.stand },
    ...babyLooks[who].map((l) => ({ key: l.key, label: l.label, poster: (l.clips.crawl ?? l.clips.stand ?? l.clips.sit ?? l.clips.tummy)!.poster, standing: !!l.clips.stand })),
  ];
}

export function BabyLookPicker({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const { setAvatar } = useChildMutations();
  const config = parseAvatar(child.avatar);
  const looks = looksFor(child.sex);
  const current = looks.some((l) => l.key === config.look) ? config.look : 'auto';
  return (
    <Sheet visible={open} onClose={onClose} title={`הדמות של ${child.name}`}>
      <View style={styles.row} accessibilityRole="radiogroup">
        {looks.map((l) => {
          const selected = l.key === current;
          return (
            <Pressable key={l.key} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected} accessibilityLabel={l.label}
              onPress={() => { setAvatar.mutate({ id: child.id, avatar: JSON.stringify({ ...config, look: l.key }) }); onClose(); }}
              style={[styles.tile, selected && styles.tileSelected]}>
              <View style={styles.poster}><Image source={l.poster} style={styles.posterImage} resizeMode="cover" accessibilityIgnoresInvertColors /></View>
              {selected ? <View style={styles.check}><Check size={16} color={colors.white} strokeWidth={3} /></View> : null}
              <Text variant="caption" center color={colors.textSecondary} numberOfLines={2}>{l.label}</Text>
              {l.standing ? null : <Text variant="caption" center color={colors.warning}>בלי עמידה בינתיים</Text>}
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" color={colors.textSecondary}>לדמויות שמסומנות "בלי עמידה" עוד אין סרטון עמידה, ולכן מגיל 11 חודשים הן ימשיכו להופיע בזחילה עד שנוסיף אותו.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '30%', flexGrow: 1, maxWidth: '32%', gap: 4, padding: 6, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
  tileSelected: { borderColor: colors.primaryStrong },
  poster: { width: '100%', aspectRatio: 668 / 720, borderRadius: radius.md, overflow: 'hidden' },
  posterImage: { width: '100%', height: '100%' },
  check: { position: 'absolute', top: 10, end: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center' },
});
