import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Button } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { getDb } from '@/data/db';
import type { SqlDriver } from '@/data/db/driver';
import { type ChildrenRepository, type MeasurementsRepository, createChildrenRepository, createMeasurementsRepository } from '@/data/repositories/children';
import { type EventsRepository, createEventsRepository } from '@/data/repositories/events';
import { type KvStore, createKvStore } from '@/data/repositories/kv';
import { type SyncEngine, createSyncEngine } from '@/data/sync/engine';
import { createSupabaseGateway } from '@/data/sync/supabaseGateway';
import { colors, spacing } from '@/design/tokens';
import { getSupabase } from '@/services/supabase';
import { useSession } from './session';

export interface Services {
  db: SqlDriver;
  kv: KvStore;
  events: EventsRepository;
  children: ChildrenRepository;
  measurements: MeasurementsRepository;
  /** Null when no Supabase project is configured. */
  syncEngine: SyncEngine | null;
  /** Fire-and-forget: coalesces bursts of writes into one sync round. No-op when signed out. */
  requestSync: () => void;
  syncNow: () => Promise<void>;
}

const ServicesContext = createContext<Services | null>(null);

export const queryClient = new QueryClient({
  defaultOptions: {
    // The source of truth is the local database: always fresh, never "offline".
    queries: { networkMode: 'always', staleTime: 0, retry: false, refetchOnWindowFocus: false },
    mutations: { networkMode: 'always' },
  },
});

export function useServices(): Services {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside <ServicesProvider>');
  return ctx;
}

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Services | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boot = useCallback(async () => {
    setError(null);
    try {
      const db = await getDb();
      const kv = createKvStore(db);
      const supabase = getSupabase();
      const syncEngine = supabase ? createSyncEngine({ db, kv, remote: createSupabaseGateway(supabase) }) : null;

      const syncNow = async () => {
        const { user, setSync } = useSession.getState();
        if (!syncEngine || !user) return;
        setSync({ status: 'syncing' });
        const result = await syncEngine.sync();
        setSync({
          status: result.failed > 0 ? 'error' : 'idle',
          lastError: result.lastError,
          lastSyncedAt: result.failed > 0 ? useSession.getState().sync.lastSyncedAt : new Date().toISOString(),
        });
        await queryClient.invalidateQueries();
      };
      const requestSync = () => {
        if (!syncEngine || !useSession.getState().user) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void syncNow(), 800);
      };

      const stored = await kv.get('active_child_id');
      useSession.getState().setActiveChildId(stored);
      setServices({
        db, kv, syncEngine, requestSync, syncNow,
        events: createEventsRepository(db),
        children: createChildrenRepository(db),
        measurements: createMeasurementsRepository(db),
      });
    } catch (err) {
      console.error('[boot] failed to open the local database', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { void boot(); }, [boot]);

  // Sync when the app returns to the foreground (covers "connection came back while away").
  useEffect(() => {
    if (!services) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') services.requestSync();
    });
    // ...and the moment the device reports that connectivity is back.
    let wasOffline = false;
    const net = Network.addNetworkStateListener(({ isConnected, isInternetReachable }) => {
      const online = !!isConnected && isInternetReachable !== false;
      if (online && wasOffline) services.requestSync();
      wasOffline = !online;
    });
    return () => {
      sub.remove();
      net.remove();
    };
  }, [services]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg }}>
        <Text variant="heading" center>לא הצלחנו לפתוח את הנתונים במכשיר</Text>
        <Text color={colors.textSecondary} center>הנתונים שלך לא נמחקו. אפשר לנסות שוב.</Text>
        <Button label="ניסיון נוסף" onPress={() => void boot()} />
      </View>
    );
  }
  if (!services) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <ServicesContext.Provider value={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ServicesContext.Provider>
  );
}
