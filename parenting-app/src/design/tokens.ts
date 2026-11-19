import type { ActivityType } from '@/domain/activity';

/**
 * Design tokens. The brand palette is the brief's; where a pastel does not give
 * WCAG AA contrast for text (4.5:1) a darker "ink" from the same hue is used instead.
 * Measured ratios are noted next to the values that needed adjusting.
 */
export const colors = {
  background: '#FAF3EB',
  surface: '#FFFCFA',
  surfaceMuted: '#F6EDE6',
  primary: '#B9838D', // accents, icons, borders – 3.1:1, not for small text
  primaryStrong: '#8E5965', // filled buttons and links – white text 5.6:1
  primaryLight: '#F3DEE1',
  textPrimary: '#684E55', // 6.8:1 on background
  textSecondary: '#7C636A', // brief's #957D83 is 3.4:1; this is 5.0:1
  textOnPrimary: '#FFFFFF',
  border: '#F0E5E3',
  borderStrong: '#E2D2D0',
  danger: '#A8434B',
  dangerLight: '#F7E4E4',
  success: '#3F6F5A',
  warning: '#7D5829',
  warningLight: '#F6E9D7',
  overlay: 'rgba(72, 52, 58, 0.38)',
  white: '#FFFFFF',
} as const;

export interface ActivityTone {
  bg: string;
  ink: string;
}

export const activityTones: Record<ActivityType, ActivityTone> = {
  bottle: { bg: '#F3DEE1', ink: '#84515D' },
  nursing: { bg: '#F3DEE1', ink: '#84515D' },
  pumping: { bg: '#E3ECF4', ink: '#46678A' },
  sleep: { bg: '#E9E5F3', ink: '#5B4E8A' },
  diaper: { bg: '#E2EEE8', ink: '#3F6F5A' },
  solids: { bg: '#F6E9D7', ink: '#7D5829' },
  other: { bg: '#EFE9E4', ink: '#6E5F58' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: 'Heebo_400Regular',
  medium: 'Heebo_500Medium',
  semibold: 'Heebo_600SemiBold',
  bold: 'Heebo_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  metric: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  timer: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 52 },
} as const;
export type TextVariant = keyof typeof type;

export const shadow = {
  card: {
    shadowColor: '#8E5965',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#8E5965',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

/** Minimum touch target (Apple HIG 44pt / Material 48dp). */
export const HIT = 48;
