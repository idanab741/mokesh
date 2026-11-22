import type { SqlDriver } from './driver';

/** Thrown when someone without an account tries to change anything. */
export class GuestError extends Error {
  constructor() { super('guest_read_only'); this.name = 'GuestError'; }
}

/**
 * The driver the screens work with. A visitor without an account may look at everything and
 * change nothing: every write except the app's own small settings (kv) is refused here, in one
 * place, whichever screen it came from.
 */
export function guardDriver(raw: SqlDriver, isGuest: () => boolean, onBlocked: () => void): SqlDriver {
  const check = (sql: string, single = true) => {
    // Only a single statement on kv passes; a script of several statements never does.
    if (!isGuest() || (single && /^\s*(INSERT INTO|UPDATE|DELETE FROM)\s+kv\b[^;]*;?\s*$/i.test(sql))) return;
    onBlocked();
    throw new GuestError();
  };
  return {
    exec: async (sql) => { check(sql, false); return raw.exec(sql); },
    run: async (sql, params) => { check(sql); return raw.run(sql, params); },
    all: (sql, params) => raw.all(sql, params),
    transaction: (fn) => raw.transaction(fn),
  };
}
