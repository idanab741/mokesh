import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, outfitKey, resolveOutfit } from '@/domain/avatar';
import { babySprites } from './sprites';

const FRAMES = 8;
/** Seconds each view is held while the baby turns on its own. */
const HOLD_MS = 1500;
const FADE_MS = 110;
/** Horizontal drag distance that turns the baby by one view (45°). */
const DRAG_PX = 34;

function Strip({ source, frame, size }: { source: number; frame: number; size: number }) {
  return (
    // The strip is a row of views; show one of them by sliding the row. Forced LTR so the
    // row is laid out the same way in a right-to-left app.
    <View style={{ width: size, height: size, overflow: 'hidden', direction: 'ltr' }}>
      <Image source={source} contentFit="fill" transition={0}
        style={{ width: size * FRAMES, height: size, transform: [{ translateX: -frame * size }] }} />
    </View>
  );
}

/**
 * The child's baby character with a 360° view: eight rendered views, 45° apart. It turns
 * slowly by itself and can be turned by dragging sideways, like a product turntable.
 */
export function BabySprite({ stage, config, sex = 'unspecified', height = 250, label, autoRotate = true, active = true }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height?: number; label: string;
  autoRotate?: boolean;
  /** Pass false while the screen is hidden so the turning stops. */
  active?: boolean;
}) {
  const source = babySprites[sex === 'female' ? 'girl' : 'boy'][stage][outfitKey(resolveOutfit(config, sex))];
  const [frame, setFrame] = useState(0);
  const [previous, setPrevious] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const current = useRef(0);

  const show = (next: number, animate: boolean) => {
    const wrapped = ((next % FRAMES) + FRAMES) % FRAMES;
    if (wrapped === current.current) return;
    setPrevious(current.current);
    current.current = wrapped;
    setFrame(wrapped);
    if (animate) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    } else {
      fade.setValue(1);
    }
  };

  useEffect(() => {
    if (!autoRotate || !active) return;
    const id = setInterval(() => { if (!dragging.current) show(current.current + 1, true); }, HOLD_MS);
    return () => clearInterval(id);
    // `show` only touches refs and setters, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRotate, active]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, breathe]);

  const responder = useMemo(() => PanResponder.create({
    // Only horizontal drags, so the page still scrolls vertically over the baby.
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { dragging.current = true; dragStart.current = current.current; },
    onPanResponderMove: (_e, g) => show(dragStart.current - Math.round(g.dx / DRAG_PX), false),
    onPanResponderRelease: () => { dragging.current = false; },
    onPanResponderTerminate: () => { dragging.current = false; },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'flex-end' }} {...responder.panHandlers}
      accessible accessibilityRole="image" accessibilityLabel={label} accessibilityHint="אפשר לגרור ימינה ושמאלה כדי לסובב"
      testID={`baby-view-${frame}`}>
      <Animated.View style={{ width: height, height, transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }] }}>
        {/* The outgoing view fades out exactly as the new one fades in, so two views never linger together. */}
        <Animated.View style={{ position: 'absolute', opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Strip source={source} frame={previous} size={height} />
        </Animated.View>
        <Animated.View style={{ opacity: fade }}><Strip source={source} frame={frame} size={height} /></Animated.View>
      </Animated.View>
    </View>
  );
}
