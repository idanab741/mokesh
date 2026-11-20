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
 * Palettes of the video character. `color: null` is the character as it was rendered; every
 * other entry is the tone the clip is repainted to. Swatch is what the picker shows.
 */
export const SKIN_TONES = [
  { key: 'porcelain', label: 'בהיר מאוד', color: '#FBDCCB', swatch: '#FBDCCB' },
  { key: 'peach', label: 'בהיר', color: null, swatch: '#F7C4A8' },
  { key: 'honey', label: 'דבש', color: '#EEC3A2', swatch: '#EEC3A2' },
  { key: 'tan', label: 'שזוף', color: '#D9AA86', swatch: '#D9AA86' },
  { key: 'brown', label: 'חום', color: '#B5825F', swatch: '#B5825F' },
  { key: 'deep', label: 'כהה', color: '#8C5F45', swatch: '#8C5F45' },
] as const;
export const HAIR_COLORS = [
  { key: 'golden', label: 'זהוב', color: null, swatch: '#B8824F' },
  { key: 'blond', label: 'בלונד', color: '#DCC190', swatch: '#DCC190' },
  { key: 'chestnut', label: 'ערמוני', color: '#946645', swatch: '#946645' },
  { key: 'brown', label: 'חום', color: '#65493A', swatch: '#65493A' },
  { key: 'black', label: 'שחור', color: '#403632', swatch: '#403632' },
  { key: 'auburn', label: "ג'ינג'י", color: '#B97A55', swatch: '#B97A55' },
] as const;
export const EYE_COLORS = [
  { key: 'brown', label: 'חום', color: null, swatch: '#6B4428' },
  { key: 'hazel', label: 'דבש', color: '#7A5A2E', swatch: '#8A6A36' },
  { key: 'blue', label: 'כחול', color: '#6C9CC8', swatch: '#6C9CC8' },
  { key: 'green', label: 'ירוק', color: '#6F9B6A', swatch: '#6F9B6A' },
  { key: 'grey', label: 'אפור', color: '#8C9AA8', swatch: '#8C9AA8' },
] as const;
export const CLOTH_COLORS = [
  { key: 'mint', label: 'מנטה', color: null, swatch: '#A6DDD6' },
  { key: 'rose', label: 'ורוד', color: '#F5BFCB', swatch: '#F5BFCB' },
  { key: 'peach', label: 'אפרסק', color: '#F8CDB0', swatch: '#F8CDB0' },
  { key: 'butter', label: 'חמאה', color: '#F5E2A6', swatch: '#F5E2A6' },
  { key: 'sky', label: 'תכלת', color: '#B4D2EE', swatch: '#B4D2EE' },
  { key: 'lilac', label: 'לילך', color: '#D2C4EE', swatch: '#D2C4EE' },
  { key: 'sage', label: 'ירוק מרווה', color: '#C3D9BC', swatch: '#C3D9BC' },
  { key: 'cream', label: 'שמנת', color: '#F4EFE6', swatch: '#F4EFE6' },
] as const;
export type SkinKey = (typeof SKIN_TONES)[number]['key'];
export type HairKey = (typeof HAIR_COLORS)[number]['key'];
export type EyeKey = (typeof EYE_COLORS)[number]['key'];
export type ClothKey = (typeof CLOTH_COLORS)[number]['key'];

/** The repaint colours of a look; null leaves that part as rendered. */
export interface BabyLookColors { skin: string | null; hair: string | null; eyes: string | null; cloth: string | null }
const colorOf = <T extends { key: string; color: string | null }>(list: readonly T[], key: string) => list.find((x) => x.key === key)?.color ?? null;
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
