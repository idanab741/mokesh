import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type TextVariant, colors, type } from '@/design/tokens';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  center?: boolean;
}

/** All text goes through here: Heebo, RTL-natural alignment, capped Dynamic Type scaling. */
export function Text({ variant = 'body', color = colors.textPrimary, center, style, ...rest }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.5}
      {...rest}
      style={[type[variant], { color, writingDirection: 'rtl' }, center ? { textAlign: 'center' } : null, style]}
    />
  );
}
