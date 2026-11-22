import { router } from 'expo-router';
import { View } from 'react-native';
import { Mascot } from '@/components/home/Companion';
import { Sheet } from '@/components/ui/overlays';
import { Button } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/design/tokens';
import { useUi } from '@/state/ui';

/** Shown to a visitor who tried to change something: looking is free, keeping needs an account. */
export function AccountPrompt() {
  const open = useUi((s) => s.accountPromptOpen);
  const close = useUi((s) => s.closeAccountPrompt);
  const go = (path: '/auth/sign-up' | '/auth/sign-in') => { close(); router.push(path); };
  return (
    <Sheet visible={open} onClose={close} title="בשביל זה צריך חשבון">
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Mascot pose="point" size={84} />
        <Text center color={colors.textSecondary}>בלי חשבון אפשר להציץ ולראות איך האפליקציה עובדת. כדי לתעד את התינוק שלכם, לשמור ולשתף עם המשפחה, פותחים חשבון.</Text>
      </View>
      <Button label="יצירת חשבון" onPress={() => go('/auth/sign-up')} />
      <Button label="כבר יש לי חשבון" variant="secondary" onPress={() => go('/auth/sign-in')} />
      <Button label="להמשיך להציץ" variant="ghost" size="md" onPress={close} />
    </Sheet>
  );
}
