import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChartNoAxesColumn, House, type LucideIcon, Plus, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, I18nManager, PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, shadow, themed } from '@/design/tokens';
import { useUi } from '@/state/ui';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'בית', icon: House },
  journal: { label: 'יומן', icon: CalendarDays },
  stats: { label: 'נתונים', icon: ChartNoAxesColumn },
  child: { label: 'הילד שלי', icon: UserRound },
};
const SLOTS = 5;
const ADD_SLOT = 2;
/** Inner margin of the capsule; the slots share what is left. */
const PAD = 6;

/**
 * בית | יומן | (+) | נתונים | הילד שלי, built like the Triplace bar: a floating glass capsule, icons
 * only, a tinted pill behind the current tab that springs to the next one, and the big round "+"
 * rising out of the middle where Triplace has its globe. Press and drag along the bar and the pill
 * follows the finger; letting go opens whatever is under it.
 */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const openAddSheet = useUi((s) => s.openAddSheet);
  const [width, setWidth] = useState(0);
  const slot = Math.max(0, (width - PAD * 2) / SLOTS);
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
      const s = (w - PAD * 2) / SLOTS;
      const raw = latest.current.rtl ? (x + w - PAD - pageX) / s - 0.5 : (pageX - x - PAD) / s - 0.5;
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
  const pillOffset = Animated.add(Animated.multiply(pos, slot), PAD);
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
      <View ref={barRef} style={styles.bar} accessibilityRole="tablist" {...pan.panHandlers} {...({ dataSet: { tour: 'tabs' } } as object)}
        onLayout={(e) => { setWidth(e.nativeEvent.layout.width); barRef.current?.measureInWindow((x: number, _y: number, w: number) => { frame.current = { x, w }; }); }}>
        <View style={styles.glass} pointerEvents="none">
          <BlurView intensity={36} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.glassTint]} />
        </View>
        {slot > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.pillSlot, { width: slot }, rtl ? { right: pillOffset } : { left: pillOffset }]}>
            <View style={[styles.pill, dragSlot !== null && styles.pillLens, shown === ADD_SLOT && dragSlot === null && { opacity: 0 }]} />
          </Animated.View>
        ) : null}
        {Array.from({ length: SLOTS }, (_, i) => {
          if (i === ADD_SLOT) {
            return (
              <Pressable key="add" onPress={openAddSheet} accessibilityRole="button" accessibilityLabel="הוספת פעילות" style={styles.tab}>
                <View style={[styles.add, shown === i && { transform: [{ scale: 1.08 }] }]} {...({ dataSet: { tour: 'tab-add' } } as object)}>
                  <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addFill}>
                    <Plus size={30} color={colors.white} strokeWidth={2.6} />
                  </LinearGradient>
                </View>
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
              <Icon size={27} color={focused ? colors.primaryStrong : colors.ink} strokeWidth={focused ? 2.5 : 2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  // A capsule floating above the content, with a margin on every side; screens scroll underneath it.
  wrap: { position: 'absolute', start: 12, end: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', height: 62, borderRadius: 31, paddingHorizontal: 6, ...shadow.card, shadowOpacity: 0.18 },
  glass: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, borderRadius: 31, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' },
  glassTint: { backgroundColor: colors.primaryLight, opacity: 0.82 },
  tab: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  pillSlot: { position: 'absolute', top: 0, bottom: 0, start: undefined, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 0 },
  pill: { width: '100%', height: 50, borderRadius: 25, backgroundColor: colors.primaryStrong, opacity: 0.16 },
  pillLens: { height: 54, borderRadius: 27, opacity: 0.24 },
  // The "+" rises out of the capsule, where Triplace has its globe.
  add: { width: 66, height: 66, borderRadius: 33, marginTop: -26, padding: 4, backgroundColor: colors.white, ...shadow.card, shadowOpacity: 0.22 },
  addFill: { flex: 1, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
}));
