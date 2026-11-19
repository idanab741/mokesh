import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string | null;
}

interface SessionState {
  activeChildId: string | null;
  user: AuthUser | null;
  authReady: boolean;
  sync: { status: 'idle' | 'syncing' | 'error'; lastError: string | null; lastSyncedAt: string | null };
  setActiveChildId: (id: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setAuthReady: () => void;
  setSync: (sync: Partial<SessionState['sync']>) => void;
}

/** Small client-only state. Everything that is *data* lives in SQLite and is read through TanStack Query. */
export const useSession = create<SessionState>((set) => ({
  activeChildId: null,
  user: null,
  authReady: false,
  sync: { status: 'idle', lastError: null, lastSyncedAt: null },
  setActiveChildId: (activeChildId) => set({ activeChildId }),
  setUser: (user) => set({ user }),
  setAuthReady: () => set({ authReady: true }),
  setSync: (sync) => set((s) => ({ sync: { ...s.sync, ...sync } })),
}));
