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
 * character as rendered. Swatch is what the picker shows.
 */
export type LookShift = readonly [number, number, number, number];
export const SKIN_TONES = [
  { key: 'porcelain', label: 'בהיר מאוד', shift: [0.0309, 0.77, -0.0005, 0.968], swatch: '#F5C5AD' },
  { key: 'peach', label: 'בהיר', shift: null, swatch: '#F3B799' },
  { key: 'honey', label: 'דבש', shift: [-0.0164, 1.19, 0.0376, 1.024], swatch: '#F2B08B' },
  { key: 'tan', label: 'שזוף', shift: [-0.0737, 1.41, 0.0593, 1.135], swatch: '#E69B6E' },
  { key: 'brown', label: 'חום', shift: [-0.1297, 1.436, 0.0383, 1.186], swatch: '#D4895C' },
  { key: 'deep', label: 'כהה', shift: [-0.2382, 1.325, -0.0365, 1.269], swatch: '#AE6948' },
] as const;
export const HAIR_COLORS = [
  { key: 'golden', label: 'זהוב', shift: null, swatch: '#915C39' },
  { key: 'blond', label: 'בלונד', shift: [0.2383, 0.87, 0.1736, 1.016], swatch: '#D5A77D' },
  { key: 'chestnut', label: 'ערמוני', shift: [-0.1863, 0.902, -0.1646, 1.207], swatch: '#5A2C16' },
  { key: 'brown', label: 'חום', shift: [-0.2619, 0.563, -0.2058, 1.055], swatch: '#3C2116' },
  { key: 'black', label: 'שחור', shift: [-0.3175, 0.261, -0.2543, 1.013], swatch: '#281A16' },
  { key: 'auburn', label: "ג'ינג'י", shift: [-0.03, 1.3, -0.3, 1.05], swatch: '#A4552F' },
] as const;
/** Lightness, chroma and hue of the rendered iris: what the eye colours are measured against. */
export const IRIS_BASE = [0.3689, 0.0834, 0.8006] as const;
export const EYE_COLORS = [
  { key: 'brown', label: 'חום', shift: null, swatch: '#61331A' },
  { key: 'hazel', label: 'דבש', shift: [0.0227, 0.904, 0.2746, 1.2], swatch: '#643C18' },
  { key: 'blue', label: 'כחול', shift: [0.1101, 0.907, -2.9475, 1.2], swatch: '#306384' },
  { key: 'green', label: 'ירוק', shift: [0.0153, 0.965, 1.5113, 1.2], swatch: '#364D21' },
  { key: 'grey', label: 'אפור', shift: [0.1, 0.3, -2.9, 1.2], swatch: '#5F6E78' },
] as const;
export const CLOTH_COLORS = [
  { key: 'mint', label: 'מנטה', shift: null, swatch: '#A0D5D1' },
  { key: 'rose', label: 'ורוד', shift: [0.0059, 1.228, 3.0313, 1.023], swatch: '#F3B9C7' },
  { key: 'peach', label: 'אפרסק', shift: [0.0028, 1.553, -2.396, 0.936], swatch: '#F9BA96' },
  { key: 'butter', label: 'חמאה', shift: [0.0645, 1.634, -1.767, 0.89], swatch: '#F9DB98' },
  { key: 'sky', label: 'תכלת', shift: [-0.0066, 0.721, 0.9152, 1.117], swatch: '#B1CBDF' },
  { key: 'lilac', label: 'לילך', shift: [-0.0046, 1.005, 2.2506, 1.143], swatch: '#D8BDDF' },
  { key: 'sage', label: 'ירוק מרווה', shift: [-0.0236, 0.863, -1.0985, 1.104], swatch: '#B9C8A7' },
  { key: 'cream', label: 'שמנת', shift: [0.0927, 0.306, -2.1066, 0.899], swatch: '#F0E6DC' },
] as const;
export type SkinKey = (typeof SKIN_TONES)[number]['key'];
export type HairKey = (typeof HAIR_COLORS)[number]['key'];
export type EyeKey = (typeof EYE_COLORS)[number]['key'];
export type ClothKey = (typeof CLOTH_COLORS)[number]['key'];

/** How each part of a look is shifted; null leaves that part as rendered. */
export interface BabyLookColors { skin: LookShift | null; hair: LookShift | null; eyes: LookShift | null; cloth: LookShift | null }
const colorOf = <T extends { key: string; shift: LookShift | null }>(list: readonly T[], key: string) => list.find((x) => x.key === key)?.shift ?? null;
export function lookColors(config: AvatarConfig): BabyLookColors {
  return { skin: colorOf(SKIN_TONES, config.skin), hair: colorOf(HAIR_COLORS, config.hair), eyes: colorOf(EYE_COLORS, config.eyes), cloth: colorOf(CLOTH_COLORS, config.cloth) };
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
