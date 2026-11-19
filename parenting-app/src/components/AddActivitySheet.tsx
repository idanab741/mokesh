import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/ui/overlays';
import { ActivityBadge } from '@/components/ui/primitives';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/design/tokens';
import { ACTIVITY_TYPES, type ActivityType } from '@/domain/activity';
import { activityLabel } from '@/i18n/he';
import { useUi } from '@/state/ui';

export function openActivityForm(type: ActivityType, id?: string) {
  router.push({ pathname: '/activity/[type]', params: id ? { type, id } : { type } });
}

/** The "+" sheet: every activity is one tap away. */
export function AddActivitySheet() {
  const open = useUi((s) => s.addSheetOpen);
  const close = useUi((s) => s.closeAddSheet);
  const pick = (type: ActivityType) => {
    close();
    openActivityForm(type);
  };
  return (
    <Sheet visible={open} onClose={close} title="מה מתעדים?">
      <View style={styles.grid}>
        {ACTIVITY_TYPES.map((type) => (
          <Pressable key={type} onPress={() => pick(type)} accessibilityRole="button" accessibilityLabel={activityLabel[type]}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
            <ActivityBadge type={type} size={52} />
            <Text variant="label" center numberOfLines={1}>{activityLabel[type]}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    flexBasis: '30%', flexGrow: 1, minHeight: 108, alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md,
  },
});
