import type { ChildSex } from './age';

export type BabyStage = 'tummy' | 'sit' | 'crawl' | 'stand';

/**
 * What a parent can choose about the baby character: the colour of the clothes, and
 * optionally the pose. The character itself is a rendered illustration.
 */
export interface AvatarConfig {
  /** 'auto' = the default for the child's sex. */
  outfit: string;
  /** 'auto' follows the child's age; a parent can always pick the stage themselves. */
  stage: BabyStage | 'auto';
  /** The look of the video character: keys of the palettes below. */
  skin: SkinKey;
  hair: HairKey;
  eyes: EyeKey;
  cloth: ClothKey;
}

/**
 * Palettes of the video character. Every option says how that look differs from the character
 * as it was rendered: [lightness shift, chroma ratio, hue shift, contrast ratio] in OKLab, measured
 * from rendered reference sheets by tools/baby-motion/calibrate.py. `shift: null` is the
 * character as rendered. `girl` is the same measurement on the girl's own reference sheet, where
 * one exists. Swatch is what the picker shows.
 */
export type LookShift = readonly [number, number, number, number];
export const SKIN_TONES = [
  { key: 'porcelain', label: 'בהיר מאוד', shift: [0.0309, 0.77, -0.0005, 0.968], girl: [0.0436, 0.684, -0.0237, 1.023], swatch: '#F5C5AD' },
  { key: 'peach', label: 'בהיר', shift: null, swatch: '#F3B799' },
  { key: 'honey', label: 'דבש', shift: [-0.0164, 1.19, 0.0376, 1.024], girl: [-0.0228, 1.207, 0.0648, 1.05], swatch: '#F2B08B' },
  { key: 'tan', label: 'שזוף', shift: [-0.0737, 1.41, 0.0593, 1.135], girl: [-0.0705, 1.332, 0.0435, 1.21], swatch: '#E69B6E' },
  { key: 'brown', label: 'חום', shift: [-0.1297, 1.436, 0.0383, 1.186], girl: [-0.1306, 1.441, -0.0097, 1.26], swatch: '#D4895C' },
  { key: 'deep', label: 'כהה', shift: [-0.2382, 1.325, -0.0365, 1.269], girl: [-0.2966, 1.301, -0.0757, 1.203], swatch: '#AE6948' },
] as const;
export const HAIR_COLORS = [
  { key: 'golden', label: 'זהוב', shift: null, swatch: '#915C39' },
  { key: 'blond', label: 'בלונד', shift: [0.2383, 0.87, 0.1736, 1.016], girl: [0.2407, 0.691, 0.1195, 1.02], swatch: '#D5A77D' },
  { key: 'chestnut', label: 'ערמוני', shift: [-0.1863, 0.902, -0.1646, 1.207], girl: [-0.1686, 0.873, -0.1245, 1.042], swatch: '#5A2C16' },
  { key: 'brown', label: 'חום', shift: [-0.2619, 0.563, -0.2058, 1.055], girl: [-0.257, 0.509, -0.0845, 0.856], swatch: '#3C2116' },
  { key: 'black', label: 'שחור', shift: [-0.3175, 0.261, -0.2543, 1.013], girl: [-0.3191, 0.185, 0.0958, 0.839], swatch: '#281A16' },
  { key: 'auburn', label: "ג'ינג'י", shift: [-0.03, 1.3, -0.3, 1.05], swatch: '#A4552F' },
] as const;
/** Lightness, chroma and hue of the rendered iris: what the eye colours are measured against. */
export const IRIS_BASE = { boy: [0.3689, 0.0834, 0.8006], girl: [0.3463, 0.0685, 0.9073] } as const;
export const EYE_COLORS = [
  { key: 'brown', label: 'חום', shift: null, swatch: '#61331A' },
  { key: 'hazel', label: 'דבש', shift: [0.0227, 0.904, 0.2746, 1.2], girl: [0.0736, 1.208, 0.2424, 1.185], swatch: '#643C18' },
  { key: 'blue', label: 'כחול', shift: [0.1101, 0.907, -2.9475, 1.2], girl: [0.0443, 1.193, -3.0438, 1.2], swatch: '#306384' },
  { key: 'green', label: 'ירוק', shift: [0.0153, 0.965, 1.5113, 1.2], girl: [0.035, 0.96, 1.1699, 1.2], swatch: '#364D21' },
  { key: 'grey', label: 'אפור', shift: [0.1, 0.3, -2.9, 1.2], swatch: '#5F6E78' },
] as const;
export const CLOTH_COLORS = [
  { key: 'mint', label: 'מנטה', shift: null, swatch: '#A0D5D1' },
  { key: 'rose', label: 'ורוד', shift: [0.0059, 1.228, 3.0313, 1.023], girl: [0.0117, 0.993, -2.8439, 0.944], swatch: '#F3B9C7' },
  { key: 'peach', label: 'אפרסק', shift: [0.0028, 1.553, -2.396, 0.936], girl: [0.0176, 1.297, -2.3429, 0.872], swatch: '#F9BA96' },
  { key: 'butter', label: 'חמאה', shift: [0.0645, 1.634, -1.767, 0.89], girl: [0.067, 1.287, -1.6737, 0.806], swatch: '#F9DB98' },
  { key: 'sky', label: 'תכלת', shift: [-0.0066, 0.721, 0.9152, 1.117], girl: [-0.0026, 0.783, 1.1042, 1.068], swatch: '#B1CBDF' },
  { key: 'lilac', label: 'לילך', shift: [-0.0046, 1.005, 2.2506, 1.143], girl: [0.0058, 0.927, 2.4667, 1.038], swatch: '#D8BDDF' },
  { key: 'sage', label: 'ירוק מרווה', shift: [-0.0236, 0.863, -1.0985, 1.104], girl: [-0.0008, 0.819, -1.0905, 1.06], swatch: '#B9C8A7' },
  { key: 'cream', label: 'שמנת', shift: [0.0927, 0.306, -2.1066, 0.899], girl: [0.0925, 0.414, -1.8777, 0.781], swatch: '#F0E6DC' },
] as const;
export type SkinKey = (typeof SKIN_TONES)[number]['key'];
export type HairKey = (typeof HAIR_COLORS)[number]['key'];
export type EyeKey = (typeof EYE_COLORS)[number]['key'];
export type ClothKey = (typeof CLOTH_COLORS)[number]['key'];

/** How each part of a look is shifted; null leaves that part as rendered. */
export interface BabyLookColors { skin: LookShift | null; hair: LookShift | null; eyes: LookShift | null; cloth: LookShift | null }
type Option = { key: string; shift: LookShift | null; girl?: LookShift };
const shiftOf = (list: readonly Option[], key: string, girl: boolean): LookShift | null => {
  const option = list.find((x) => x.key === key);
  return (girl ? option?.girl : undefined) ?? option?.shift ?? null;
};
export function lookColors(config: AvatarConfig, sex: ChildSex = 'unspecified'): BabyLookColors {
  const girl = sex === 'female';
  return { skin: shiftOf(SKIN_TONES, config.skin, girl), hair: shiftOf(HAIR_COLORS, config.hair, girl), eyes: shiftOf(EYE_COLORS, config.eyes, girl), cloth: shiftOf(CLOTH_COLORS, config.cloth, girl) };
}
const keyIn = <T extends { key: string }>(list: readonly T[], value: unknown, fallback: T['key']): T['key'] =>
  (typeof value === 'string' && list.some((x) => x.key === value) ? value : fallback) as T['key'];

export const OUTFIT_COLORS = ['#A9D8DC', '#A8C8F0', '#F5A9BF', '#C9B8F2', '#F6D58A', '#FFFFFF'] as const;
export const outfitName: Record<string, string> = {
  '#A9D8DC': 'טורקיז', '#A8C8F0': 'תכלת', '#F5A9BF': 'ורוד', '#C9B8F2': 'סגול בהיר', '#F6D58A': 'צהוב', '#FFFFFF': 'לבן',
};
const OUTFIT_KEYS = { '#A9D8DC': 'teal', '#A8C8F0': 'blue', '#F5A9BF': 'pink', '#C9B8F2': 'lilac', '#F6D58A': 'yellow', '#FFFFFF': 'white' } as const;

export const DEFAULT_AVATAR: AvatarConfig = { outfit: 'auto', stage: 'auto', skin: 'peach', hair: 'golden', eyes: 'brown', cloth: 'mint' };

export const stageLabel: Record<BabyStage, string> = { tummy: 'שכיבה על הבטן', sit: 'ישיבה', crawl: 'זחילה', stand: 'עמידה' };

export function resolveOutfit(config: AvatarConfig, sex: ChildSex): string {
  if (config.outfit !== 'auto') return config.outfit;
  return sex === 'female' ? '#F5A9BF' : '#A9D8DC';
}

/** File-name key of an outfit colour (the sprite strips are pre-rendered per colour). */
export function outfitKey(hex: string): (typeof OUTFIT_KEYS)[keyof typeof OUTFIT_KEYS] {
  return OUTFIT_KEYS[hex as keyof typeof OUTFIT_KEYS] ?? 'teal';
}

/**
 * A playful default only, not a developmental norm: children reach these stages at very
 * different ages, which is exactly why the parent can override it.
 */
export function defaultStageForAge(totalMonths: number): BabyStage {
  if (totalMonths < 4) return 'tummy';
  if (totalMonths < 8) return 'sit';
  if (totalMonths < 11) return 'crawl';
  return 'stand';
}

export function resolveStage(config: AvatarConfig, totalMonths: number): BabyStage {
  return config.stage === 'auto' ? defaultStageForAge(totalMonths) : config.stage;
}

export function parseAvatar(raw: string | null | undefined): AvatarConfig {
  if (!raw) return DEFAULT_AVATAR;
  try {
    const v = JSON.parse(raw) as Partial<AvatarConfig>;
    return {
      outfit: typeof v.outfit === 'string' && (OUTFIT_COLORS as readonly string[]).includes(v.outfit) ? v.outfit : 'auto',
      stage: v.stage === 'tummy' || v.stage === 'sit' || v.stage === 'crawl' || v.stage === 'stand' ? v.stage : 'auto',
      skin: keyIn(SKIN_TONES, v.skin, 'peach'),
      hair: keyIn(HAIR_COLORS, v.hair, 'golden'),
      eyes: keyIn(EYE_COLORS, v.eyes, 'brown'),
      cloth: keyIn(CLOTH_COLORS, v.cloth, 'mint'),
    };
  } catch {
    return DEFAULT_AVATAR;
  }
}
