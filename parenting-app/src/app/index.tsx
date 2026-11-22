import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/design/tokens';
import { useChildren } from '@/hooks/data';
import { acceptPendingInvite, pendingInvite } from '@/services/family';
import { useServices } from '@/state/services';
import { isGuest } from '@/state/guest';
import { useSession } from '@/state/session';

/** Entry gate: a family with a child goes to the app, everyone else to the welcome flow. */
export default function Index() {
  const children = useChildren();
  const authReady = useSession((s) => s.authReady);
  const user = useSession((s) => s.user);
  const { syncAfterJoin } = useServices();
  // An invitation opened by someone who is already signed in is accepted here, before the gate decides.
  const [joining, setJoining] = useState(() => pendingInvite() !== null);
  useEffect(() => {
    if (!authReady || !joining) return;
    if (!user) { setJoining(false); return; }
    let live = true;
    acceptPendingInvite().then((r) => (r === 'joined' ? syncAfterJoin() : undefined)).catch(() => undefined).finally(() => { if (live) setJoining(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.id]);
  if (children.isLoading || !authReady || (joining && !!user)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  // A visitor always starts at the welcome page: the way in is an account, and a look around is one tap from there.
  if (isGuest()) return <Redirect href="/welcome" />;
  return <Redirect href={children.data && children.data.length > 0 ? '/(tabs)' : '/welcome'} />;
}
