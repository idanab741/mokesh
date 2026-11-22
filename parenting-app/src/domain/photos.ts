/**
 * The photo journal: pictures a family keeps of their child, by the day they were taken.
 * The album groups them by the child's month of life ("the third month").
 */
export interface Photo {
  id: string;
  childId: string;
  /** YYYY-MM-DD */
  takenOn: string;
  caption: string | null;
  storagePath: string;
  /** A small preview as a data URL; shown in grids on every device, also before the file arrives. */
  thumb: string | null;
  createdAt: string;
}

export const CAPTION_MAX = 300;
export const PHOTO_EDGE = 1280;
export const THUMB_EDGE = 320;

/** 1 for the first month of life, 2 for the second, and so on. 0 for a date before the birth. */
export function monthOfLife(birthDate: string, day: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = day.split('-').map(Number);
  const months = (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0);
  return months < 0 ? 0 : months + 1;
}

const ORDINALS = ['', 'הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני', 'התשיעי', 'העשירי', 'האחד־עשר', 'השנים־עשר'];
export function monthTitle(n: number): string {
  if (n <= 0) return 'לפני הלידה';
  if (n <= 12) return `החודש ${ORDINALS[n]}`;
  const years = Math.floor((n - 1) / 12);
  const rest = ((n - 1) % 12) + 1;
  const y = years === 1 ? 'שנה' : years === 2 ? 'שנתיים' : `${years} שנים`;
  return `${y}, החודש ${ORDINALS[rest]}`;
}

export interface AlbumMonth { month: number; title: string; photos: Photo[] }

/** Newest month first; inside a month, newest photo first. */
export function groupByMonth(photos: readonly Photo[], birthDate: string): AlbumMonth[] {
  const map = new Map<number, Photo[]>();
  for (const p of photos) {
    const n = monthOfLife(birthDate, p.takenOn);
    map.set(n, [...(map.get(n) ?? []), p]);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([month, list]) => ({
    month, title: monthTitle(month),
    photos: [...list].sort((a, b) => b.takenOn.localeCompare(a.takenOn) || b.createdAt.localeCompare(a.createdAt)),
  }));
}

/** The object's key in the bucket: the family's folder, then the row's own path. */
export const objectKey = (familyId: string, storagePath: string) => `${familyId}/${storagePath}`;
