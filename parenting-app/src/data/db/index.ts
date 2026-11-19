import type { SqlDriver } from './driver';
import { openDriver } from './open';
import { migrate } from './schema';

let instance: Promise<SqlDriver> | null = null;

/** Opens (once) and migrates the local database. */
export function getDb(): Promise<SqlDriver> {
  if (!instance) {
    instance = (async () => {
      const driver = await openDriver();
      await migrate(driver);
      return driver;
    })();
    instance.catch(() => {
      instance = null;
    });
  }
  return instance;
}
