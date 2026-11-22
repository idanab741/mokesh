import { Image, StyleSheet, View } from 'react-native';
import { colors } from '@/design/tokens';
import type { Photo } from '@/domain/photos';
import { usePhotoFile } from '@/hooks/photos';

/** A square preview. A photo that came without one (taken in the phone app) shows its file. */
export function PhotoThumb({ photo, familyId }: { photo: Photo; familyId: string | null | undefined }) {
  const file = usePhotoFile(photo.thumb ? null : photo, familyId);
  const uri = photo.thumb ?? file.data;
  return uri
    ? <Image source={{ uri }} style={styles.thumb} resizeMode="cover" accessibilityIgnoresInvertColors />
    : <View style={[styles.thumb, { backgroundColor: colors.primaryLight }]} />;
}

const styles = StyleSheet.create({ thumb: { width: '100%', height: '100%' } });
