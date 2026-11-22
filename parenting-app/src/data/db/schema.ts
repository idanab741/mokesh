import type { SqlDriver } from './driver';

/**
 * Local SQLite schema. Column names deliberately match the Postgres schema so that
 * sync is a column-for-column copy. Extra local-only columns:
 *   sync_status      'pending' | 'synced' | 'conflict'
 *   conflict_remote  JSON of the server row when both sides changed
 *   version          last server version seen (0 = never uploaded)
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE children (
    id TEXT PRIMARY KEY NOT NULL,
    family_id TEXT,
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    sex TEXT NOT NULL DEFAULT 'unspecified',
    gestational_weeks INTEGER,
    photo_uri TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );

  CREATE TABLE activity_events (
    id TEXT PRIMARY KEY NOT NULL,
    child_id TEXT NOT NULL,
    created_by TEXT,
    activity_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    client_event_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT,
    UNIQUE (child_id, client_event_id)
  );
  CREATE INDEX activity_child_time ON activity_events (child_id, occurred_at DESC);
  CREATE INDEX activity_child_type_time ON activity_events (child_id, activity_type, occurred_at DESC);
  CREATE INDEX activity_sync ON activity_events (sync_status);

  CREATE TABLE measurements (
    id TEXT PRIMARY KEY NOT NULL,
    child_id TEXT NOT NULL,
    created_by TEXT,
    measured_at TEXT NOT NULL,
    weight_g INTEGER,
    length_mm INTEGER,
    head_circumference_mm INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE INDEX measurements_child ON measurements (child_id, measured_at DESC);

  CREATE TABLE kv (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v2: how the 3D baby looks (JSON). Device-only for now, like photo_uri.
  `ALTER TABLE children ADD COLUMN avatar TEXT;`,
  // v3: moments the family marked (first smile, crawls, ...). Columns match public.milestones.
  `
  CREATE TABLE milestones (
    id TEXT PRIMARY KEY NOT NULL,
    child_id TEXT NOT NULL,
    created_by TEXT,
    catalog_key TEXT,
    domain TEXT NOT NULL,
    title TEXT NOT NULL,
    achieved_on TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE INDEX milestones_child ON milestones (child_id);
  `,
  // v4: health notes. Columns match public.health_records, medications, medication_administrations, appointments.
  `
  CREATE TABLE health_records (
    id TEXT PRIMARY KEY NOT NULL, child_id TEXT NOT NULL, created_by TEXT, record_type TEXT NOT NULL, occurred_at TEXT NOT NULL,
    title TEXT, temperature_c REAL, notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE INDEX health_records_child ON health_records (child_id, occurred_at DESC);
  CREATE TABLE medications (
    id TEXT PRIMARY KEY NOT NULL, child_id TEXT NOT NULL, created_by TEXT, name TEXT NOT NULL, instructions TEXT, dose_text TEXT, prescribed_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE TABLE medication_administrations (
    id TEXT PRIMARY KEY NOT NULL, medication_id TEXT NOT NULL, child_id TEXT NOT NULL, created_by TEXT, given_at TEXT NOT NULL,
    dose_text TEXT, notes TEXT, client_event_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE INDEX med_admin_child ON medication_administrations (child_id, given_at DESC);
  CREATE TABLE appointments (
    id TEXT PRIMARY KEY NOT NULL, child_id TEXT NOT NULL, created_by TEXT, kind TEXT NOT NULL, title TEXT NOT NULL, scheduled_at TEXT NOT NULL,
    location TEXT, summary TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE INDEX appointments_child ON appointments (child_id, scheduled_at);
  `,
  // v5: the photo journal. `photos` matches public.photos (with a small thumbnail as a data URL);
  // the full picture stays on the device in `photo_files` and goes to Storage on its own.
  `
  CREATE TABLE photos (
    id TEXT PRIMARY KEY NOT NULL, child_id TEXT NOT NULL, created_by TEXT, taken_on TEXT NOT NULL, caption TEXT,
    storage_path TEXT NOT NULL, thumb TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    conflict_remote TEXT
  );
  CREATE INDEX photos_child ON photos (child_id, taken_on DESC);
  CREATE TABLE photo_files (photo_id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, uploaded INTEGER NOT NULL DEFAULT 0);
  `,
];

export async function migrate(driver: SqlDriver): Promise<void> {
  const rows = await driver.all<{ user_version: number }>('PRAGMA user_version');
  let current = Number(rows[0]?.user_version ?? 0);
  while (current < MIGRATIONS.length) {
    const next = current + 1;
    await driver.transaction(async () => {
      await driver.exec(MIGRATIONS[current]);
      await driver.exec(`PRAGMA user_version = ${next}`);
    });
    current = next;
  }
}
