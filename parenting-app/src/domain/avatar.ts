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
}

export const OUTFIT_COLORS = ['#A9D8DC', '#A8C8F0', '#F5A9BF', '#C9B8F2', '#F6D58A', '#FFFFFF'] as const;
export const outfitName: Record<string, string> = {
  '#A9D8DC': 'טורקיז', '#A8C8F0': 'תכלת', '#F5A9BF': 'ורוד', '#C9B8F2': 'סגול בהיר', '#F6D58A': 'צהוב', '#FFFFFF': 'לבן',
};
const OUTFIT_KEYS = { '#A9D8DC': 'teal', '#A8C8F0': 'blue', '#F5A9BF': 'pink', '#C9B8F2': 'lilac', '#F6D58A': 'yellow', '#FFFFFF': 'white' } as const;

export const DEFAULT_AVATAR: AvatarConfig = { outfit: 'auto', stage: 'auto' };

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
    };
  } catch {
    return DEFAULT_AVATAR;
  }
}
