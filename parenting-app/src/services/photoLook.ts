// Web implementation (Metro picks photoLook.native.ts on iOS/Android).
import { type PhotoLook, lookFromPixels } from '@/domain/avatar';

const SIZE = 96;

/**
 * Reads skin tone and hair from a photo, entirely in the browser: the image is drawn to a
 * small off-screen canvas and only its pixels are inspected. Nothing is uploaded.
 * Returns null when no face-like area is found.
 */
export async function analysePhoto(uri: string): Promise<PhotoLook | null> {
  if (typeof document === 'undefined') return null;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = uri;
  });
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  // Centre-crop to a square, like the picker's own crop.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return lookFromPixels(ctx.getImageData(0, 0, SIZE, SIZE).data, SIZE, SIZE);
}

export const canAnalysePhotos = true;
