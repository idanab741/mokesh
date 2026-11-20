import { type ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const useNative = true;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable that gives physical feedback: it sinks slightly under the finger and springs back.
 * It is a single element, so layout styles (flex, width) behave exactly as on a plain Pressable.
 */
export function PressScale({ children, style, scaleTo = 0.965, disabled, ...rest }: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: useNative, speed: 40, bounciness: 6 }).start();
  return (
    <AnimatedPressable {...rest} disabled={disabled}
      onPressIn={(e) => { to(scaleTo); rest.onPressIn?.(e); }} onPressOut={(e) => { to(1); rest.onPressOut?.(e); }}
      style={[style, { transform: [{ scale }] }, disabled ? { opacity: 0.45 } : null]}>
      {children}
    </AnimatedPressable>
  );
}

/** Content rises into place when a screen opens. `index` staggers siblings. */
export function Rise({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 420, delay: Math.min(index, 8) * 55, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [progress, index]);
  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Slow vertical drift for illustrations. */
export function Float({ children, distance = 8, duration = 3200 }: { children: ReactNode; distance?: number; duration?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [t, duration]);
  return <Animated.View style={{ transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }}>{children}</Animated.View>;
}
