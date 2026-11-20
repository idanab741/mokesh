import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { CalendarDays, ChartColumn, House, type LucideIcon, Plus, Smile } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PressScale } from '@/components/ui/motion';
import { colors, gradients, shadow, spacing } from '@/design/tokens';
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
      <Pressable key={route.key} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} aria-selected={focused}
        accessibilityLabel={tab.label} style={styles.tab}>
        <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
          <Icon size={22} color={focused ? colors.primaryStrong : colors.textSecondary} strokeWidth={focused ? 2.1 : 1.7} />
        </View>
        <Text variant="caption" maxFontSizeMultiplier={1.2} numberOfLines={1}
          color={focused ? colors.primaryStrong : colors.textSecondary}
          style={focused ? { fontWeight: '600' } : null}>
          {tab.label}
        </Text>
      </Pressable>
    );
  }).filter(Boolean);

  const middle = Math.ceil(items.length / 2);
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, spacing.md) }]} pointerEvents="box-none">
      <View style={styles.bar} accessibilityRole="tablist">
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.82)' }]} />
        {items.slice(0, middle)}
        <View style={styles.addSlot}>
          <PressScale onPress={openAddSheet} accessibilityRole="button" accessibilityLabel="הוספת פעילות" scaleTo={0.9} style={styles.add}>
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
            <View style={{ zIndex: 1 }}><Plus size={30} color={colors.white} strokeWidth={2.4} /></View>
          </PressScale>
        </View>
        {items.slice(middle)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Floats above the content so screens scroll underneath it.
  wrap: { position: 'absolute', start: spacing.lg, end: spacing.lg },
  bar: { flexDirection: 'row', alignItems: 'center', height: 68, borderRadius: 34, overflow: 'hidden', paddingHorizontal: spacing.sm, ...shadow.card, shadowOpacity: 0.16 },
  tab: { flex: 1, alignItems: 'center', gap: 2, height: 68, justifyContent: 'center', zIndex: 1 },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  iconWrapFocused: { backgroundColor: colors.primaryLight },
  addSlot: { width: 72, alignItems: 'center', zIndex: 1 },
  add: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
