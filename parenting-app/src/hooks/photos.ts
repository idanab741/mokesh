import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PhotoDraft } from '@/data/repositories/photos';
import { fetchPhotoFile, removePhotoFile } from '@/services/photoFiles';
import { getSupabase } from '@/services/supabase';
import { useServices } from '@/state/services';
import { useSession } from '@/state/session';

/** The photo journal of one child, with its writes. */
export function usePhotos(childId: string | undefined) {
  const { photos } = useServices();
  return useQuery({ queryKey: ['photos', childId], queryFn: () => photos.list(childId!), enabled: !!childId });
}

export function usePhotoMutations(childId: string | undefined, familyId: string | null | undefined) {
  const { photos, requestSync } = useServices();
  const qc = useQueryClient();
  const done = async () => { await qc.invalidateQueries({ queryKey: ['photos'] }); requestSync(); };
  const add = useMutation({ mutationFn: (draft: PhotoDraft) => photos.add(childId!, draft), onSuccess: done });
  const update = useMutation({ mutationFn: ({ id, takenOn, caption }: { id: string; takenOn: string; caption: string | null }) => photos.update(id, { takenOn, caption }), onSuccess: done });
  const remove = useMutation({
    mutationFn: async (photo: { id: string; storagePath: string }) => {
      await photos.remove(photo.id);
      const supabase = getSupabase();
      if (supabase && familyId && useSession.getState().user) void removePhotoFile(supabase, familyId, photo.storagePath);
    },
    onSuccess: done,
  });
  return { add, update, remove };
}

/** The full picture: from this device, or fetched once from the family's storage and kept. */
export function usePhotoFile(photo: { id: string; storagePath: string } | null, familyId: string | null | undefined) {
  const { photos } = useServices();
  const user = useSession((s) => s.user);
  return useQuery({
    queryKey: ['photo-file', photo?.id, !!user], enabled: !!photo, staleTime: Infinity,
    queryFn: async () => {
      const local = await photos.file(photo!.id);
      if (local) return local;
      const supabase = getSupabase();
      if (!supabase || !familyId || !user) return null;
      return fetchPhotoFile(supabase, photos, photo!, familyId);
    },
  });
}
