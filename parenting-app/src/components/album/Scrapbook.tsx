import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Mascot } from '@/components/home/Companion';
import { Text } from '@/components/ui/Text';
import { colors, gradients, spacing, themed } from '@/design/tokens';
import type { Photo } from '@/domain/photos';
import { PhotoThumb } from './PhotoThumb';

/** A hand-lettered face for the album's titles and captions (web); the system face elsewhere. */
export const HAND = Platform.select({ web: { fontFamily: '"Amatic SC", Rubik, sans-serif', fontWeight: '700' as const }, default: { fontWeight: '700' as const } });

const TILTS = [-3, 2.2, -1.4, 3, -2.4, 1.6];
const TAPES = ['#FFD7A8', '#BFE3F5', '#F7C1D9', '#CBEFD8', '#E0CCF5'];
export const tiltOf = (i: number) => TILTS[i % TILTS.length];

/** The album's cover: a bound book with the latest picture in its window. */
export function AlbumCover({ name, latest, familyId, photos, months }: { name: string; latest: Photo | null; familyId: string | null | undefined; photos: number; months: number }) {
  return (
    <View style={styles.coverWrap}>
      {/* The pages under the cover */}
      <View style={[styles.leaf, { top: 10, start: 10, end: -4 }]} />
      <View style={[styles.leaf, { top: 5, start: 5, end: -2 }]} />
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
        <View style={styles.spine} />
        <View style={styles.stitch} />
        <View style={styles.window}>
          {latest ? <PhotoThumb photo={latest} familyId={familyId} /> : <View style={styles.windowEmpty}><Mascot pose="heart" size={86} /></View>}
        </View>
        <Text center color={colors.white} style={[styles.coverTitle, HAND]} numberOfLines={1} adjustsFontSizeToFit>{`האלבום של ${name}`}</Text>
        <View style={styles.coverLine} />
        <Text variant="label" center color="rgba(255,255,255,0.92)">
          {photos === 0 ? 'מחכה לתמונה הראשונה' : `${photos === 1 ? 'תמונה אחת' : `${photos} תמונות`} · ${months === 1 ? 'חודש אחד' : `${months} חודשים`}`}
        </Text>
      </LinearGradient>
    </View>
  );
}

/** A picture stuck on the page: white frame, a strip of tape, a few words underneath. */
export function Polaroid({ photo, familyId, index, wide, label, caption, onPress }: {
  photo: Photo; familyId: string | null | undefined; index: number; wide?: boolean; label: string; caption: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={[styles.polaroid, wide ? styles.polaroidWide : styles.polaroidHalf, { transform: [{ rotate: `${tiltOf(index)}deg` }] }]}>
      <View style={[styles.tape, { backgroundColor: TAPES[index % TAPES.length], transform: [{ rotate: `${-tiltOf(index) * 1.6}deg` }] }]} />
      <View style={styles.picture}><PhotoThumb photo={photo} familyId={familyId} /></View>
      <Text center numberOfLines={1} color="#4A3A44" style={[styles.caption, HAND]}>{caption}</Text>
    </Pressable>
  );
}

/** One month of the album: a paper page with its pictures laid out by hand. */
export function AlbumPage({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return (
    <View style={styles.page}>
      <View style={styles.holes}>{[0, 1, 2].map((i) => <View key={i} style={styles.hole} />)}</View>
      <View style={styles.pageHead}>
        <View style={styles.label}><Text color={colors.ink} style={[styles.labelText, HAND]}>{title}</Text></View>
        <Text variant="caption" color="#8A7A80">{count}</Text>
      </View>
      <View style={styles.spread}>{children}</View>
    </View>
  );
}

const PAPER = '#FFF8EE';
const styles = themed(() => StyleSheet.create({
  coverWrap: { alignSelf: 'center', width: '82%', maxWidth: 320, marginBottom: spacing.sm },
  leaf: { position: 'absolute', bottom: -10, borderRadius: 26, backgroundColor: PAPER, borderWidth: 1, borderColor: '#EADFCF' },
  cover: { borderRadius: 26, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, paddingEnd: spacing.xl + 18, alignItems: 'center', gap: spacing.sm, overflow: 'hidden',
    shadowColor: '#3B2147', shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  // The binding runs down the leading (right) edge, as a Hebrew book opens.
  spine: { position: 'absolute', top: 0, bottom: 0, start: 0, width: 26, backgroundColor: 'rgba(0,0,0,0.13)' },
  stitch: { position: 'absolute', top: 14, bottom: 14, start: 26, width: 0, borderStartWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.55)' },
  window: { width: 150, height: 150, borderRadius: 75, overflow: 'hidden', borderWidth: 5, borderColor: 'rgba(255,255,255,0.95)', backgroundColor: PAPER },
  windowEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  coverTitle: { fontSize: 40, lineHeight: 46, marginTop: spacing.xs },
  coverLine: { width: 70, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.7)' },

  page: { backgroundColor: PAPER, borderRadius: 22, borderWidth: 1, borderColor: '#EADFCF', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, paddingStart: spacing.lg + 16, gap: spacing.md,
    shadowColor: '#3B2147', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  holes: { position: 'absolute', start: 8, top: 0, bottom: 0, justifyContent: 'space-evenly' },
  hole: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FDFBFA', borderWidth: 1, borderColor: '#E4D8C8' },
  pageHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: 2, borderRadius: 6, transform: [{ rotate: '-1.5deg' }] },
  labelText: { fontSize: 28, lineHeight: 34 },
  spread: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', rowGap: spacing.lg, columnGap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },

  polaroid: { backgroundColor: colors.white, padding: 7, paddingBottom: 4, borderRadius: 4,
    shadowColor: '#3B2147', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  polaroidHalf: { width: '46%' },
  polaroidWide: { width: '68%' },
  picture: { width: '100%', aspectRatio: 1, overflow: 'hidden', backgroundColor: '#F1EBE4' },
  caption: { fontSize: 20, lineHeight: 28, minHeight: 28 },
  tape: { position: 'absolute', top: -9, alignSelf: 'center', width: 54, height: 18, opacity: 0.85, zIndex: 2 },
}));
