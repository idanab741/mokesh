import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { CalendarDays, ChartNoAxesColumn, House, type LucideIcon, SquarePlus, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, I18nManager, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, themed } from '@/design/tokens';
import { useUi } from '@/state/ui';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'בית', icon: House },
  journal: { label: 'יומן', icon: CalendarDays },
  stats: { label: 'נתונים', icon: ChartNoAxesColumn },
  child: { label: 'הילד שלי', icon: UserRound },
};
const SLOTS = 5;
const ADD_SLOT = 2;

/**
 * בית | יומן | (+) | נתונים | הילד שלי. A plain bar on the bottom edge, icons only, like the bars
 * people already know. A soft pill sits behind the current tab and springs to the next one; press
 * and drag along the bar and the pill follows the finger, and letting go opens whatever is under it.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const openAddSheet = useUi((s) => s.openAddSheet);
  const [width, setWidth] = useState(0);
  const slot = width / SLOTS;
  const rtl = I18nManager.isRTL || Platform.OS === 'web';

  const routes = state.routes.filter((r: { name: string }) => TABS[r.name]);
  // Tabs sit in slots 0, 1, 3, 4; the "+" keeps the middle.
  const slotOf = (tabIndex: number) => (tabIndex < ADD_SLOT ? tabIndex : tabIndex + 1);
  const activeTab = Math.max(0, routes.findIndex((r: { key: string }) => r.key === state.routes[state.index]?.key));
  const pos = useRef(new Animated.Value(slotOf(activeTab))).current;
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const frame = useRef({ x: 0, w: 0 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const barRef = useRef<any>(null);

  useEffect(() => {
    if (dragSlot !== null) return;
    Animated.spring(pos, { toValue: slotOf(activeTab), useNativeDriver: false, friction: 7, tension: 90 }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dragSlot]);

  const go = (target: number) => {
    if (target === ADD_SLOT) { openAddSheet(); return; }
    const route = routes[target < ADD_SLOT ? target : target - 1];
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (route.key !== state.routes[state.index]?.key && !event.defaultPrevented) navigateToTab(route.key);
  };
  const latest = useRef({ go, slot, rtl });
  latest.current = { go, slot, rtl };

  const pan = useMemo(() => {
    const at = (pageX: number) => {
      const { x, w } = frame.current;
      const s = w / SLOTS;
      const raw = latest.current.rtl ? (x + w - pageX) / s - 0.5 : (pageX - x) / s - 0.5;
      return Math.min(SLOTS - 1, Math.max(0, raw));
    };
    return PanResponder.create({
      // A plain tap goes to the tab under it; only a sideways drag takes over.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => { barRef.current?.measureInWindow((x: number, _y: number, w: number) => { frame.current = { x, w }; }); },
      onPanResponderMove: (e) => { const p = at(e.nativeEvent.pageX); pos.setValue(p); setDragSlot(Math.round(p)); },
      onPanResponderRelease: (e) => { const target = Math.round(at(e.nativeEvent.pageX)); setDragSlot(null); latest.current.go(target); },
      onPanResponderTerminate: () => setDragSlot(null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = dragSlot ?? slotOf(activeTab);
  const pillOffset = Animated.multiply(pos, slot);
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View ref={barRef} style={styles.bar} accessibilityRole="tablist" {...pan.panHandlers}
        onLayout={(e) => { setWidth(e.nativeEvent.layout.width); barRef.current?.measureInWindow((x: number, _y: number, w: number) => { frame.current = { x, w }; }); }}>
        {slot > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.pillSlot, { width: slot }, rtl ? { right: pillOffset } : { left: pillOffset }]}>
            <Animated.View style={[styles.pill, dragSlot !== null && styles.pillLens]} />
          </Animated.View>
        ) : null}
        {Array.from({ length: SLOTS }, (_, i) => {
          if (i === ADD_SLOT) {
            return (
              <Pressable key="add" onPress={openAddSheet} accessibilityRole="button" accessibilityLabel="הוספת פעילות" style={styles.tab}>
                <SquarePlus size={28} color={shown === i ? colors.primaryStrong : colors.textPrimary} strokeWidth={shown === i ? 2.3 : 1.8} />
              </Pressable>
            );
          }
          const route = routes[i < ADD_SLOT ? i : i - 1];
          if (!route) return <View key={i} style={styles.tab} />;
          const tab = TABS[route.name];
          const focused = shown === i;
          const Icon = tab.icon;
          return (
            <Pressable key={route.key} onPress={() => go(i)} accessibilityRole="tab" accessibilityState={{ selected: activeTab === (i < ADD_SLOT ? i : i - 1) }}
              aria-selected={activeTab === (i < ADD_SLOT ? i : i - 1)} accessibilityLabel={tab.label} style={styles.tab}>
              <Icon size={26} color={focused ? colors.primaryStrong : colors.textPrimary} strokeWidth={focused ? 2.4 : 1.8} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  // On the bottom edge, full width; screens scroll underneath it.
  wrap: { position: 'absolute', start: 0, end: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.96)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
  bar: { flexDirection: 'row', alignItems: 'center', height: 54 },
  tab: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  pillSlot: { position: 'absolute', top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pill: { width: 58, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight },
  pillLens: { width: 66, height: 46, borderRadius: 23, opacity: 0.9 },
}));
