import { ImagePlus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { PhotoThumb } from '@/components/album/PhotoThumb';
import { tiltOf } from '@/components/album/Scrapbook';
import { Text } from '@/components/ui/Text';
import { colors, shadow, spacing, themed } from '@/design/tokens';
import type { Photo } from '@/domain/photos';

/** The album on Home: the latest pictures, and the way in. */
export function PhotoStrip({ photos, name, familyId, onOpen }: { photos: readonly Photo[]; name: string; familyId: string | null | undefined; onOpen: () => void }) {
  const latest = photos.slice(0, 3);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`האלבום של ${name}: ${photos.length} תמונות. פתיחה`} style={styles.card}>
      <View style={styles.head}>
        <Text variant="bodyStrong" color={colors.ink}>{`האלבום של ${name}`}</Text>
        <Text variant="label" color={colors.primaryStrong} style={{ fontWeight: '600' }}>{photos.length === 0 ? 'התמונה הראשונה' : photos.length === 1 ? 'תמונה אחת' : `${photos.length} תמונות`}</Text>
      </View>
      <View style={styles.row}>
        {latest.map((p, i) => (
          <View key={p.id} style={[styles.polaroid, { transform: [{ rotate: `${tiltOf(i)}deg` }] }]}><View style={styles.picture}><PhotoThumb photo={p} familyId={familyId} /></View></View>
        ))}
        <View style={[styles.polaroid, styles.add]}><ImagePlus size={22} color={colors.primaryStrong} strokeWidth={2} /></View>
      </View>
    </Pressable>
  );
}

const styles = themed(() => StyleSheet.create({
  card: { gap: spacing.md, backgroundColor: '#FFF8EE', borderRadius: 24, padding: spacing.md, borderWidth: 1, borderColor: '#EADFCF', ...shadow.card },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 },
  polaroid: { width: 62, backgroundColor: colors.white, padding: 4, paddingBottom: 12, borderRadius: 3, shadowColor: '#3B2147', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  picture: { width: '100%', aspectRatio: 1, overflow: 'hidden', backgroundColor: '#F1EBE4' },
  add: { height: 70, paddingBottom: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, shadowOpacity: 0 },
}));
