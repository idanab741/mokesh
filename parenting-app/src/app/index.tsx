import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '@/design/tokens';
import { useChildren } from '@/hooks/data';
import { useSession } from '@/state/session';

/** Entry gate: a family with a child goes to the app, everyone else to the welcome flow. */
export default function Index() {
  const children = useChildren();
  const authReady = useSession((s) => s.authReady);
  if (children.isLoading || !authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={children.data && children.data.length > 0 ? '/(tabs)' : '/welcome'} />;
}
