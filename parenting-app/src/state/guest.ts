import { config } from '@/services/config';
import { useSession } from './session';
import { useUi } from './ui';

/**
 * A visitor: the app can have accounts, and nobody is signed in. A visitor looks and does not
 * touch. (A build without a server has no accounts at all, so nobody is a visitor there.)
 */
export const isGuest = () => config.isCloudConfigured && !useSession.getState().user;

/** `guest` for showing things differently; `guard(fn)` runs fn for a member and asks a visitor to open an account. */
export function useGuest() {
  const user = useSession((s) => s.user);
  const guest = config.isCloudConfigured && !user;
  const ask = useUi((s) => s.openAccountPrompt);
  return { guest, ask, guard: <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => { if (guest) ask(); else fn(...args); } };
}
