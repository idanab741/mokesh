// Web implementation (Metro picks open.native.ts on iOS/Android).
// SQLite compiled to JavaScript, persisted to IndexedDB after every write.
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { SqlDriver } from './driver';
import { createSqlJsDriver } from './sqljsDriver';

const IDB_NAME = 'parenting-app';
const IDB_STORE = 'files';
const IDB_KEY = 'parenting.db';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadBytes(): Promise<Uint8Array | null> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as Uint8Array | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function openDriver(): Promise<SqlDriver> {
  const SQL = await initSqlJs();
  const existing = await loadBytes().catch(() => null);
  const db = existing ? new SQL.Database(existing) : new SQL.Database();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    saveBytes(db.export()).catch((err) => console.warn('[db] persist failed', err));
  };
  const schedule = () => {
    if (timer === null) timer = setTimeout(flush, 50);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => {
      if (timer !== null) {
        clearTimeout(timer);
        flush();
      }
    });
  }
  return createSqlJsDriver(db, schedule);
}
