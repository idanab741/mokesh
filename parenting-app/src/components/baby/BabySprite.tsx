import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import type { ChildSex } from '@/domain/age';
import { type AvatarConfig, type BabyStage, outfitKey, resolveOutfit } from '@/domain/avatar';
import type { BabyMood } from '@/domain/mood';
import { babyAsleep, babyFaces, babyTurns } from './turns';

/** Every turn sheet is a 5 x 5 grid holding 23 views of a full turn, 15° apart. */
const FRAMES = 23;
const COLS = 5;
const ROWS = 5;
/** Horizontal drag distance that turns the baby by one view. */
const DRAG_PX = 12;
/** How long the baby rests facing us between turns. */
const REST_MS = 4200;
/** Time per view while it spins: a full turn takes about a second and a half. */
const SPIN_STEP_MS = 62;
/** After a drag the baby stays on the chosen view this long. */
const HOLD_AFTER_DRAG_MS = 2600;

function Sheet({ source, frame, size, cols, rows }: { source: number; frame: number; size: number; cols: number; rows: number }) {
  return (
    // The sheet is a grid of views; show one of them by sliding the grid. Forced LTR so the
    // grid is laid out the same way in a right-to-left app.
    <View style={{ width: size, height: size, overflow: 'hidden', direction: 'ltr' }}>
      <Image source={source} contentFit="fill" transition={0}
        style={{ width: size * cols, height: size * rows,
          transform: [{ translateX: -(frame % cols) * size }, { translateY: -Math.floor(frame / cols) * size }] }} />
    </View>
  );
}

/** Runs a looping animation while `on` is true and returns its 0..1 value. */
function useLoop(on: boolean, half: number, easing = Easing.inOut(Easing.sin)) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) { value.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: half, easing, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: half, easing, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on, half, easing, value]);
  return value;
}

/**
 * The child's baby character. It has a 360° view (23 rendered views, 15° apart): it rests
 * facing us, spins a full turn every few seconds, and can be turned by dragging sideways.
 * Its expression and the way it moves follow `mood`: it bounces when laughing, droops when
 * sad, and lies asleep, breathing slowly, while a sleep is being logged.
 */
export function BabySprite({ stage, config, sex = 'unspecified', height = 250, label, mood = 'happy', autoRotate = true, active = true }: {
  stage: BabyStage; config: AvatarConfig; sex?: ChildSex; height?: number; label: string;
  mood?: BabyMood;
  autoRotate?: boolean;
  /** Pass false while the screen is hidden so all movement stops. */
  active?: boolean;
}) {
  const who = sex === 'female' ? 'girl' : 'boy';
  const outfit = outfitKey(resolveOutfit(config, sex));
  const turn = (babyTurns[who][stage] ?? babyTurns[who].sit!)[outfit];
  const faces = (babyFaces[who][stage] ?? babyFaces[who].sit!)[outfit];
  const asleep = mood === 'asleep';

  const [frame, setFrame] = useState(0);
  const dragging = useRef(false);
  const dragStart = useRef(0);
  const released = useRef(0);
  const current = useRef(0);

  const show = (next: number) => {
    const wrapped = ((next % FRAMES) + FRAMES) % FRAMES;
    if (wrapped === current.current) return;
    current.current = wrapped;
    setFrame(wrapped);
  };

  // A sleeping baby does not turn: go back to the front for when it wakes up.
  useEffect(() => { if (asleep) { current.current = 0; setFrame(0); } }, [asleep]);

  // Only a content baby turns by itself; a sad one stays put (it can still be dragged).
  const spins = autoRotate && active && (mood === 'happy' || mood === 'laughing');
  useEffect(() => {
    if (!spins) {
      // Whatever the view, ease back to the front so the face is visible.
      if (current.current === 0 || !active) return;
      const back = setInterval(() => {
        if (dragging.current || Date.now() - released.current < HOLD_AFTER_DRAG_MS) return;
        if (current.current === 0) clearInterval(back); else show(current.current + (current.current > FRAMES / 2 ? 1 : -1));
      }, SPIN_STEP_MS);
      return () => clearInterval(back);
    }
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      // Leave the view the parent chose alone for a moment before turning on.
      if (!dragging.current && Date.now() - released.current > HOLD_AFTER_DRAG_MS) show(current.current + 1);
      // Rest when facing front again, otherwise keep spinning.
      timer = setTimeout(step, current.current === 0 ? REST_MS : SPIN_STEP_MS);
    };
    timer = setTimeout(step, current.current === 0 ? REST_MS : SPIN_STEP_MS);
    return () => clearTimeout(timer);
    // `show` only touches refs and setters, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spins, active, mood]);

  // How the body moves in each mood.
  const breathe = useLoop(active && (mood === 'happy' || asleep), asleep ? 2400 : 1700);
  const bounce = useLoop(active && mood === 'laughing', 230, Easing.out(Easing.quad));
  const sway = useLoop(active && mood === 'sad', 2100);
  const snooze = useLoop(active && asleep, 1600, Easing.linear);

  const asleepRef = useRef(asleep);
  asleepRef.current = asleep;
  const responder = useMemo(() => PanResponder.create({
    // Only horizontal drags, so the page still scrolls vertically over the baby.
    onMoveShouldSetPanResponder: (_e, g) => !asleepRef.current && Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { dragging.current = true; dragStart.current = current.current; },
    onPanResponderMove: (_e, g) => show(dragStart.current - Math.round(g.dx / DRAG_PX)),
    onPanResponderRelease: () => { dragging.current = false; released.current = Date.now(); },
    onPanResponderTerminate: () => { dragging.current = false; released.current = Date.now(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Facing front, a laughing or sad baby shows that face; every other view is the turn sheet.
  const face = frame === 0 && (mood === 'laughing' || mood === 'sad');
  const transform = [
    { translateY: Animated.add(bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.035] }), sway.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.008] })) },
    { rotate: Animated.add(bounce.interpolate({ inputRange: [0, 1], outputRange: [0, 0.02] }), sway.interpolate({ inputRange: [0, 1], outputRange: [-0.02, 0.02] })).interpolate({ inputRange: [-1, 1], outputRange: ['-1rad', '1rad'] }) },
    { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, asleep ? 1.028 : 1.018] }) },
  ];

  return (
    <View style={{ height, alignItems: 'center', justifyContent: 'flex-end' }} {...responder.panHandlers}
      accessible accessibilityRole="image" accessibilityLabel={label}
      accessibilityHint={asleep ? undefined : 'אפשר לגרור ימינה ושמאלה כדי לסובב'}
      testID={`baby-view-${frame}`}>
      {/* The pictures themselves ignore the pointer, so a mouse drag turns the baby instead of dragging an image. */}
      <Animated.View testID={`baby-mood-${mood}`} style={{ width: height, height, pointerEvents: 'none', transform }}>
        {asleep ? <Sheet source={babyAsleep[who][outfit]} frame={0} size={height} cols={1} rows={1} />
          : face ? <Sheet source={faces} frame={mood === 'laughing' ? 0 : 1} size={height} cols={2} rows={1} />
            : <Sheet source={turn} frame={frame} size={height} cols={COLS} rows={ROWS} />}
      </Animated.View>
      {asleep ? (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: height * 0.12, start: '62%',
          opacity: snooze.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
          transform: [{ translateY: snooze.interpolate({ inputRange: [0, 1], outputRange: [8, -14] }) }] }}>
          <Text variant="heading" color="#7C6FD1">z z</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
