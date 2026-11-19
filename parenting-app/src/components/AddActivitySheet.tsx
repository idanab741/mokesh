import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Sheet } from '@/components/ui/overlays';
import { activityIcons } from '@/components/ui/Icons';
import { Text } from '@/components/ui/Text';
import { activityTones, radius, spacing } from '@/design/tokens';
import { ACTIVITY_TYPES, type ActivityType } from '@/domain/activity';
import { activityLabel } from '@/i18n/he';
import { useUi } from '@/state/ui';

function Icon({ type }: { type: ActivityType }) {
  const Glyph = activityIcons[type];
  return <Glyph size={26} color={activityTones[type].ink} />;
}

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
            style={({ pressed }) => [styles.tile, { backgroundColor: activityTones[type].bg }, pressed && { opacity: 0.7 }]}>
            <View style={styles.tileIcon}><Icon type={type} /></View>
            <Text variant="label" color={activityTones[type].ink} style={{ fontWeight: '600' }} center numberOfLines={1}>{activityLabel[type]}</Text>
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
    borderRadius: radius.lg, paddingVertical: spacing.md,
  },
  tileIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
});
