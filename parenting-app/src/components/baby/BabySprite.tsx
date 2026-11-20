import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, outfitKey, resolveOutfit } from '@/domain/avatar';
import { babySprites } from './sprites';
import { babyTurns } from './turns';

/** How long the baby rests facing us between turns. */
const REST_MS = 3200;
/** Time per view while it spins: a full turn takes a little over a second. */
const SPIN_STEP_MS = 95;
const FADE_MS = 90;

interface Sheet { source: number; frames: number; cols: number; rows: number }

function Strip({ sheet, frame, size }: { sheet: Sheet; frame: number; size: number }) {
  return (
    // The sheet is a grid of views; show one of them by sliding the grid. Forced LTR so the
    // grid is laid out the same way in a right-to-left app.
    <View style={{ width: size, height: size, overflow: 'hidden', direction: 'ltr' }}>
      <Image source={sheet.source} contentFit="fill" transition={0}
        style={{ width: size * sheet.cols, height: size * sheet.rows,
          transform: [{ translateX: -(frame % sheet.cols) * size }, { translateY: -Math.floor(frame / sheet.cols) * size }] }} />
    </View>
  );
}

/**
 * The child's baby character with a 360° view: rendered views all around (12 where the
 * character has a turn sheet, otherwise 8). It rests facing us, spins a full turn every few
 * seconds, and can be turned by dragging sideways, like a product turntable.
 */
export function BabySprite({ stage, config, sex = 'unspecified', height = 250, label, autoRotate = true, active = true }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height?: number; label: string;
  autoRotate?: boolean;
  /** Pass false while the screen is hidden so the turning stops. */
  active?: boolean;
}) {
  const who = sex === 'female' ? 'girl' : 'boy';
  const outfit = outfitKey(resolveOutfit(config, sex));
  const turn = babyTurns[who][stage]?.[outfit];
  const sheet: Sheet = turn ? { source: turn, frames: 12, cols: 4, rows: 3 } : { source: babySprites[who][stage][outfit], frames: 8, cols: 8, rows: 1 };
  const FRAMES = sheet.frames;
  const framesRef = useRef(FRAMES);
  framesRef.current = FRAMES;
  const [frame, setFrame] = useState(0);
  const [previous, setPrevious] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const current = useRef(0);

  const show = (next: number, animate: boolean) => {
    const n = framesRef.current;
    const wrapped = ((next % n) + n) % n;
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

  // A different character or pose may have fewer views: start again from the front.
  useEffect(() => { current.current = 0; setFrame(0); setPrevious(0); }, [FRAMES]);

  useEffect(() => {
    if (!autoRotate || !active) return;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      if (!dragging.current) show(current.current + 1, true);
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
    onPanResponderMove: (_e, g) => show(dragStart.current - Math.round(g.dx / (270 / framesRef.current)), false),
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
          <Strip sheet={sheet} frame={previous} size={height} />
        </Animated.View>
        <Animated.View style={{ opacity: fade }}><Strip sheet={sheet} frame={frame} size={height} /></Animated.View>
      </Animated.View>
    </View>
  );
}
