import { ValidationError } from '@/domain/activity';
import { CAPTION_MAX, type Photo } from '@/domain/photos';
import { newId } from '@/lib/id';
import type { SqlDriver, SqlRow } from '../db/driver';

interface Row extends SqlRow {
  id: string; child_id: string; taken_on: string; caption: string | null; storage_path: string; thumb: string | null; created_at: string;
}
const toPhoto = (r: Row): Photo => ({ id: r.id, childId: r.child_id, takenOn: r.taken_on, caption: r.caption, storagePath: r.storage_path, thumb: r.thumb, createdAt: r.created_at });
const PENDING = `sync_status = CASE WHEN sync_status = 'conflict' THEN 'conflict' ELSE 'pending' END`;

export interface PhotoDraft { takenOn: string; caption: string | null; thumb: string | null; data: string }

export function createPhotosRepository(db: SqlDriver) {
  const day = (v: string) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ValidationError('invalid_time'); return v; };
  const text = (v: string | null) => v?.trim().slice(0, CAPTION_MAX) || null;
  return {
    async list(childId: string): Promise<Photo[]> {
      return (await db.all<Row>('SELECT id, child_id, taken_on, caption, storage_path, thumb, created_at FROM photos WHERE child_id = ? AND deleted_at IS NULL ORDER BY taken_on DESC, created_at DESC LIMIT 600', [childId])).map(toPhoto);
    },
    async add(childId: string, draft: PhotoDraft, now: Date = new Date()): Promise<string> {
      const id = newId();
      const stamp = now.toISOString();
      // Inside the family's folder in Storage; the folder itself comes from the child's family at upload time.
      const path = `general/${id}.jpg`;
      await db.transaction(async () => {
        await db.run(
          `INSERT INTO photos (id, child_id, taken_on, caption, storage_path, thumb, created_at, updated_at, version, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
          [id, childId, day(draft.takenOn), text(draft.caption), path, draft.thumb, stamp, stamp]);
        await db.run('INSERT INTO photo_files (photo_id, data, uploaded) VALUES (?, ?, 0)', [id, draft.data]);
      });
      return id;
    },
    async update(id: string, patch: { takenOn: string; caption: string | null }, now: Date = new Date()): Promise<void> {
      await db.run(`UPDATE photos SET taken_on = ?, caption = ?, updated_at = ?, ${PENDING} WHERE id = ? AND deleted_at IS NULL`, [day(patch.takenOn), text(patch.caption), now.toISOString(), id]);
    },
    async remove(id: string, now: Date = new Date()): Promise<void> {
      const stamp = now.toISOString();
      await db.run(`UPDATE photos SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [stamp, stamp, id]);
      await db.run('DELETE FROM photo_files WHERE photo_id = ?', [id]);
    },
    /** The full picture as a data URL, when this device has it. */
    async file(id: string): Promise<string | null> {
      return (await db.all<{ data: string }>('SELECT data FROM photo_files WHERE photo_id = ?', [id]))[0]?.data ?? null;
    },
    async keepFile(id: string, data: string): Promise<void> {
      await db.run('INSERT INTO photo_files (photo_id, data, uploaded) VALUES (?, ?, 1) ON CONFLICT(photo_id) DO UPDATE SET data = excluded.data, uploaded = 1', [id, data]);
    },
    /** Pictures whose row reached the server and whose file has not. */
    async waitingUpload(): Promise<{ id: string; path: string; data: string; familyId: string | null }[]> {
      return (await db.all<{ id: string; storage_path: string; data: string; family_id: string | null }>(
        `SELECT p.id, p.storage_path, f.data, c.family_id FROM photo_files f JOIN photos p ON p.id = f.photo_id JOIN children c ON c.id = p.child_id
         WHERE f.uploaded = 0 AND p.deleted_at IS NULL AND p.sync_status = 'synced' LIMIT 8`)).map((r) => ({ id: r.id, path: r.storage_path, data: r.data, familyId: r.family_id }));
    },
    async markUploaded(id: string): Promise<void> { await db.run('UPDATE photo_files SET uploaded = 1 WHERE photo_id = ?', [id]); },
  };
}
export type PhotosRepository = ReturnType<typeof createPhotosRepository>;
