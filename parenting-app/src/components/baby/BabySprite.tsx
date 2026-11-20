import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, outfitKey, resolveOutfit } from '@/domain/avatar';
import { babyTurns } from './turns';

/** How long the baby rests facing us between turns. */
const REST_MS = 3200;
/** Time per view while it spins: a full turn takes a little over a second. */
const SPIN_STEP_MS = 95;
const FADE_MS = 90;
/** After a drag the baby stays on the chosen view this long. */
const HOLD_AFTER_DRAG_MS = 2600;

/** Every turn sheet is a 4 x 3 grid of 12 views, 30° apart. */
const FRAMES = 12;
const COLS = 4;
const ROWS = 3;
/** Horizontal drag distance that turns the baby by one view. */
const DRAG_PX = 22;

function Strip({ source, frame, size }: { source: number; frame: number; size: number }) {
  return (
    // The sheet is a grid of views; show one of them by sliding the grid. Forced LTR so the
    // grid is laid out the same way in a right-to-left app.
    <View style={{ width: size, height: size, overflow: 'hidden', direction: 'ltr' }}>
      <Image source={source} contentFit="fill" transition={0}
        style={{ width: size * COLS, height: size * ROWS,
          transform: [{ translateX: -(frame % COLS) * size }, { translateY: -Math.floor(frame / COLS) * size }] }} />
    </View>
  );
}

/**
 * The child's baby character with a 360° view: twelve rendered views, 30° apart. It rests facing us, spins a full turn every few
 * seconds, and can be turned by dragging sideways, like a product turntable.
 */
export function BabySprite({ stage, config, sex = 'unspecified', height = 250, label, autoRotate = true, active = true }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height?: number; label: string;
  autoRotate?: boolean;
  /** Pass false while the screen is hidden so the turning stops. */
  active?: boolean;
}) {
  const stages = babyTurns[sex === 'female' ? 'girl' : 'boy'];
  const outfits = stages[stage] ?? stages.sit!;
  const source = outfits[outfitKey(resolveOutfit(config, sex))];
  const [frame, setFrame] = useState(0);
  const [previous, setPrevious] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const released = useRef(0);
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
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      // Leave the view the parent chose alone for a moment before turning on.
      if (!dragging.current && Date.now() - released.current > HOLD_AFTER_DRAG_MS) show(current.current + 1, true);
      // Rest when facing front again, otherwise keep spinning.
      timer = setTimeout(step, current.current === 0 ? REST_MS : SPIN_STEP_MS);
    };
    timer = setTimeout(step, current.current === 0 ? REST_MS : SPIN_STEP_MS);
    return () => clearTimeout(timer);
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
    onPanResponderRelease: () => { dragging.current = false; released.current = Date.now(); },
    onPanResponderTerminate: () => { dragging.current = false; released.current = Date.now(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'flex-end' }} {...responder.panHandlers}
      accessible accessibilityRole="image" accessibilityLabel={label} accessibilityHint="אפשר לגרור ימינה ושמאלה כדי לסובב"
      testID={`baby-view-${frame}`}>
      <Animated.View style={{ width: height, height, pointerEvents: 'none', transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }] }}>
        {/* The outgoing view fades out exactly as the new one fades in, so two views never linger together. */}
        <Animated.View style={{ position: 'absolute', opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Strip source={source} frame={previous} size={height} />
        </Animated.View>
        <Animated.View style={{ opacity: fade }}><Strip source={source} frame={frame} size={height} /></Animated.View>
      </Animated.View>
    </View>
  );
}
