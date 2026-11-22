import { Platform, Share } from 'react-native';
import type { SqlDriver } from '@/data/db/driver';

/** Everything stored about the family, as one JSON document the user can keep. */
export async function buildExport(db: SqlDriver): Promise<string> {
  const [children, events, measurements, milestones] = await Promise.all([
    db.all('SELECT id, name, birth_date, sex, gestational_weeks, notes, created_at FROM children WHERE deleted_at IS NULL'),
    db.all('SELECT id, child_id, activity_type, occurred_at, started_at, ended_at, payload, notes FROM activity_events WHERE deleted_at IS NULL ORDER BY occurred_at'),
    db.all('SELECT id, child_id, measured_at, weight_g, length_mm, head_circumference_mm, notes FROM measurements WHERE deleted_at IS NULL ORDER BY measured_at'),
    db.all('SELECT id, child_id, catalog_key, title, achieved_on, notes FROM milestones WHERE deleted_at IS NULL ORDER BY achieved_on'),
  ]);
  return JSON.stringify({
    exported_at: new Date().toISOString(),
    format_version: 1,
    children,
    activity_events: events.map((e) => ({ ...e, payload: JSON.parse(String(e.payload ?? '{}')) })),
    measurements,
    milestones,
  }, null, 2);
}

export async function exportData(db: SqlDriver): Promise<void> {
  const json = await buildExport(db);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `parenting-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: json, title: 'ייצוא נתונים' });
}

/** Removes every record from this device. Does not touch the server. */
export async function wipeLocalData(db: SqlDriver): Promise<void> {
  await db.transaction(async () => {
    for (const table of ['activity_events', 'measurements', 'milestones', 'health_records', 'medication_administrations', 'medications', 'appointments', 'photo_files', 'photos', 'children', 'kv']) await db.run(`DELETE FROM ${table}`);
  });
}
