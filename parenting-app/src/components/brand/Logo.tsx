import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { colors } from '@/design/tokens';

/** Working product name. Change it here and it changes everywhere. */
export const PRODUCT_NAME = 'נומי';

/** App mark: a crescent moon cradling a small star, on the brand gradient. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Defs>
        <LinearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF9DB4" />
          <Stop offset="1" stopColor="#C7375F" />
        </LinearGradient>
      </Defs>
      <Rect width="48" height="48" rx="14" fill="url(#logoBg)" />
      <Path d="M30.5 12.5a13 13 0 1 0 5.6 21.2a10.5 10.5 0 0 1-5.6-21.2z" fill="#FFFFFF" />
      <Circle cx="33" cy="20" r="2.6" fill="#FFE39A" />
    </Svg>
  );
}

export function Logo({ size = 36, color = colors.textPrimary }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }} accessible accessibilityRole="image" accessibilityLabel={PRODUCT_NAME}>
      <LogoMark size={size} />
      <Text style={{ fontSize: size * 0.72, lineHeight: size, fontWeight: '700', letterSpacing: -0.5 }} color={color}>{PRODUCT_NAME}</Text>
    </View>
  );
}
