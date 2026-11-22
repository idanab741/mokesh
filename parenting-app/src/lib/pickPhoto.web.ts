import * as ImagePicker from 'expo-image-picker';
import { PHOTO_EDGE, THUMB_EDGE } from '@/domain/photos';

export interface PickedPhoto { data: string; thumb: string | null }

const load = (uri: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('image'));
  img.src = uri;
});

function scaled(img: HTMLImageElement, edge: number, quality: number): string {
  const k = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/** A picture from the device, scaled down in the browser: the full one and a small preview. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const img = await load(asset.uri);
  return { data: scaled(img, PHOTO_EDGE, 0.82), thumb: scaled(img, THUMB_EDGE, 0.7) };
}
