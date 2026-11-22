import type { SupabaseClient } from '@supabase/supabase-js';
import type { PhotosRepository } from '@/data/repositories/photos';
import { objectKey } from '@/domain/photos';

const BUCKET = 'family-media';

function bytes(dataUrl: string): ArrayBuffer {
  const bin = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('read'));
  reader.readAsDataURL(blob);
});

/** Sends the pictures whose row is already on the server. Returns how many could not be sent. */
export async function uploadPhotoFiles(supabase: SupabaseClient, photos: PhotosRepository): Promise<number> {
  let failed = 0;
  for (const p of await photos.waitingUpload()) {
    if (!p.familyId) { failed += 1; continue; }
    const { error } = await supabase.storage.from(BUCKET).upload(objectKey(p.familyId, p.path), bytes(p.data), { contentType: 'image/jpeg' });
    // "Already exists": an earlier round sent it and was cut off before it was marked.
    if (!error || /exist|duplicate/i.test(error.message)) await photos.markUploaded(p.id);
    else failed += 1;
  }
  return failed;
}

/** The full picture of a photo this device does not hold yet (taken on another phone). */
export async function fetchPhotoFile(supabase: SupabaseClient, photos: PhotosRepository, photo: { id: string; storagePath: string }, familyId: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(objectKey(familyId, photo.storagePath));
  if (error || !data) return null;
  const url = await toDataUrl(data);
  await photos.keepFile(photo.id, url);
  return url;
}

/** Best effort: the row is already marked as deleted; this frees the space. */
export async function removePhotoFile(supabase: SupabaseClient, familyId: string, storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([objectKey(familyId, storagePath)]).then(() => undefined, () => undefined);
}
