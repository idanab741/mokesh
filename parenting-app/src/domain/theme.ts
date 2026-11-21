import type { ChildSex } from './age';

/**
 * The colour world of a child's screens: the sky behind the arch on Home and the wash at the top
 * of the other screens. It follows the child's sex by default and a parent can pick another.
 */
export type ThemeKey = 'rose' | 'sky' | 'meadow';
export interface AppTheme {
  key: ThemeKey;
  label: string;
  /** Top to bottom: the sky behind the character. */
  sky: readonly [string, string, string];
  /** Emphasis in running text and the active tab (>= 4.5:1 on white). */
  accent: string;
  /** Soft surface in the accent's hue. */
  accentSoft: string;
  /** The round "+" button. */
  button: readonly [string, string];
  /** Secondary text on the sky. */
  onSky: string;
  /** Headings: a deep tone of the colour world. */
  ink: string;
}

export const THEMES: Record<ThemeKey, AppTheme> = {
  rose: { key: 'rose', label: 'זריחה ורודה', sky: ['#FFD9C2', '#FFC3D3', '#E6CBFF'], accent: '#C7375F', accentSoft: '#FFE3EC', button: ['#FF8FAE', '#D9457A'], onSky: '#7A5568', ink: '#3A2233' },
  sky: { key: 'sky', label: 'בוקר כחול', sky: ['#FFE7CC', '#C6E2FF', '#C9CEFF'], accent: '#2563B8', accentSoft: '#E1EEFF', button: ['#6FB1FF', '#3A78D8'], onSky: '#4F5F7A', ink: '#1E2A47' },
  meadow: { key: 'meadow', label: 'אחו ירוק', sky: ['#FFF1C4', '#CBEFD8', '#BFE3F5'], accent: '#0A7767', accentSoft: '#DDF5EE', button: ['#4FD9C4', '#0FA08B'], onSky: '#4E6A60', ink: '#1F3530' },
};
export const THEME_KEYS: ThemeKey[] = ['rose', 'sky', 'meadow'];

export function defaultThemeFor(sex: ChildSex): ThemeKey {
  return sex === 'female' ? 'rose' : sex === 'male' ? 'sky' : 'meadow';
}
export function resolveTheme(choice: string | null | undefined, sex: ChildSex): AppTheme {
  return THEMES[(choice && choice in THEMES ? choice : defaultThemeFor(sex)) as ThemeKey];
}
