import type { PhotoLook } from '@/domain/avatar';

/**
 * Native builds cannot read pixels from an image without an extra native module.
 * Until that is added (expo-image-manipulator + a pixel reader), the baby keeps its default
 * look on iOS/Android and the UI says so instead of pretending.
 */
export async function analysePhoto(_uri: string): Promise<PhotoLook | null> {
  return null;
}

export const canAnalysePhotos = false;
