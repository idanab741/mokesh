import { router } from 'expo-router';
import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Sheet } from '@/components/ui/overlays';
import { Button } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { formatAgeWithSex } from '@/domain/age';
import { useActiveChild } from '@/hooks/data';
import { useUi } from '@/state/ui';

export function ChildSwitcherSheet() {
  const open = useUi((s) => s.childSheetOpen);
  const close = useUi((s) => s.closeChildSheet);
  const { child: active, children, select } = useActiveChild();
  return (
    <Sheet visible={open} onClose={close} title="הילדים שלנו">
      <View style={{ gap: spacing.sm }}>
        {children.map((c) => {
          const selected = c.id === active?.id;
          return (
            <Pressable key={c.id} onPress={() => { select(c.id); close(); }}
              accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={c.name}
              style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.7 }]}>
              <Avatar name={c.name} uri={c.photoUri} size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{c.name}</Text>
                <Text variant="caption" color={colors.textSecondary}>{formatAgeWithSex(c.birthDate, c.sex) ?? ''}</Text>
              </View>
              {selected ? <Check size={20} color={colors.primaryStrong} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Button label="הוספת ילד/ה" icon={Plus} variant="secondary" onPress={() => { close(); router.push('/child/edit'); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
});
