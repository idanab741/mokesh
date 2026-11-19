import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { CalendarDays, ChartColumn, House, type LucideIcon, Plus, Smile } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { colors, radius, shadow, spacing } from '@/design/tokens';
import { useUi } from '@/state/ui';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'בית', icon: House },
  journal: { label: 'יומן', icon: CalendarDays },
  stats: { label: 'נתונים', icon: ChartColumn },
  child: { label: 'הילד שלי', icon: Smile },
};

/** בית | יומן | (+) | נתונים | הילד שלי — the add button sits in the middle, within thumb reach. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const openAddSheet = useUi((s) => s.openAddSheet);

  const items = state.routes.map((route, index) => {
    const tab = TABS[route.name];
    if (!tab) return null;
    const focused = state.index === index;
    const Icon = tab.icon;
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label} style={styles.tab}>
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
          <Icon size={22} color={focused ? colors.primaryStrong : colors.textSecondary} strokeWidth={focused ? 2.1 : 1.7} />
        </View>
        <Text variant="caption" maxFontSizeMultiplier={1.2} numberOfLines={1}
          color={focused ? colors.primaryStrong : colors.textSecondary}
          style={focused ? { fontFamily: 'Heebo_600SemiBold' } : null}>
          {tab.label}
        </Text>
      </Pressable>
    );
  }).filter(Boolean);

  const middle = Math.ceil(items.length / 2);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {items.slice(0, middle)}
      <View style={styles.addSlot}>
        <Pressable onPress={openAddSheet} accessibilityRole="button" accessibilityLabel="הוספת פעילות"
          style={({ pressed }) => [styles.add, pressed && { transform: [{ scale: 0.95 }] }]}>
          <Plus size={30} color={colors.white} strokeWidth={2.2} />
        </Pressable>
      </View>
      {items.slice(middle)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, paddingTop: spacing.sm, paddingHorizontal: spacing.sm,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 56, justifyContent: 'center' },
  iconWrap: { width: 48, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapFocused: { backgroundColor: colors.primaryLight },
  addSlot: { width: 76, alignItems: 'center' },
  add: {
    width: 62, height: 62, borderRadius: 31, backgroundColor: colors.primaryStrong, alignItems: 'center', justifyContent: 'center',
    marginTop: -26, borderWidth: 4, borderColor: colors.background, ...shadow.floating,
  },
});
