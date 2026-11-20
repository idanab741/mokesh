import { Platform } from 'react-native';
import type { ActivityType } from '@/domain/activity';

/**
 * Design tokens, second pass.
 * Direction: clean and bright like a native iOS app – neutral warm-white canvas, pure white
 * cards, near-black text, one confident rose accent, and a distinct vivid hue per activity so
 * the day can be read by colour. Text/background pairs are measured for WCAG AA (ratios noted).
 */
export const colors = {
  /** The canvas takes the backdrop colour of the baby clips, so the character stands on the screen itself. */
  background: '#F1F1EF',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F1EF',
  primary: '#E4668A', // accents and icons
  primaryStrong: '#C7375F', // filled buttons, links – white text 5.1:1
  primaryLight: '#FFE8EF',
  textPrimary: '#1C1A1F', // 15.8:1 on background
  textSecondary: '#6A6570', // 5.2:1 on background, 5.7:1 on white
  textOnPrimary: '#FFFFFF',
  border: '#ECE9E6',
  borderStrong: '#DDD8D4',
  danger: '#B3261E',
  dangerLight: '#FDECEA',
  success: '#0A7767',
  warning: '#955400',
  warningLight: '#FFF0D6',
  overlay: 'rgba(20, 18, 24, 0.42)',
  white: '#FFFFFF',
} as const;

/** Gradients are part of the identity: warm rose into soft lilac, never flat fills for hero surfaces. */
export const gradients = {
  /** Wash at the top of every screen, fading into the canvas. */
  wash: ['#F1F1EF', '#F1F1EF', '#F1F1EF'],
  primary: ['#F0628C', '#C7375F'],
  brand: ['#FF8FB0', '#B45CF0'],
} as const;

export interface ActivityTone {
  /** Soft tint for surfaces. */
  bg: string;
  /** Text / icon colour on the tint (>= 4.5:1). */
  ink: string;
  /** Saturated colour for marks: chart bars, timeline segments, dots. */
  solid: string;
  /** Two-stop gradient for icon chips and chart marks. */
  grad: readonly [string, string];
}

export const activityTones: Record<ActivityType, ActivityTone> = {
  bottle: { bg: '#FFE8EF', ink: '#BE2C55', solid: '#EC5F88', grad: ['#FF8FAE', '#E8527E'] },
  nursing: { bg: '#FFE8EF', ink: '#BE2C55', solid: '#EC5F88', grad: ['#FF8FAE', '#E8527E'] },
  pumping: { bg: '#E4F0FF', ink: '#1F6BC2', solid: '#4C9BEF', grad: ['#7DB9FF', '#3E86E0'] },
  sleep: { bg: '#ECEAFF', ink: '#4740C2', solid: '#6C63E8', grad: ['#9C94FF', '#5B52D6'] },
  diaper: { bg: '#DDF6F0', ink: '#0A7767', solid: '#17B39C', grad: ['#4FD9C4', '#0FA08B'] },
  solids: { bg: '#FFF0D6', ink: '#955400', solid: '#F2A32B', grad: ['#FFC457', '#EE922A'] },
  other: { bg: '#EFEEF1', ink: '#55505C', solid: '#8E8896', grad: ['#B0AAB8', '#7B7585'] },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;

/**
 * System typeface: San Francisco (incl. SF Hebrew) on iPhone, iPad and Mac, Roboto / Noto on
 * Android, Segoe UI on Windows. Nothing is downloaded, and it is the face people's own
 * devices already use everywhere else.
 */
const family = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Hebrew", system-ui, "Segoe UI", Roboto, "Noto Sans Hebrew", Arial, sans-serif',
  default: undefined,
});
const face = (fontWeight: '400' | '500' | '600' | '700') => ({ fontFamily: family, fontWeight });

export const fonts = { regular: face('400'), medium: face('500'), semibold: face('600'), bold: face('700') } as const;
/** For SVG <Text>, which takes a family string. */
export const svgFontFamily = family ?? 'System';

export const type = {
  display: { ...fonts.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  title: { ...fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  heading: { ...fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { ...fonts.regular, fontSize: 16, lineHeight: 23 },
  bodyStrong: { ...fonts.semibold, fontSize: 16, lineHeight: 23 },
  label: { ...fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { ...fonts.regular, fontSize: 13, lineHeight: 18 },
  metric: { ...fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  timer: { ...fonts.bold, fontSize: 46, lineHeight: 54, letterSpacing: -1 },
} as const;
export type TextVariant = keyof typeof type;

export const shadow = {
  card: { shadowColor: '#3B2147', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  floating: { shadowColor: '#C7375F', shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const;

/** Minimum touch target (Apple HIG 44pt / Material 48dp). */
export const HIT = 48;
