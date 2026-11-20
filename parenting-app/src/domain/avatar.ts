export type BabyStage = 'tummy' | 'sit' | 'crawl' | 'stand';

/** How the 3D baby looks. Chosen by the parent; nothing here is inferred from a photo. */
export interface AvatarConfig {
  skin: string;
  /** null = no hair yet. */
  hair: string | null;
  eyes: string;
  outfit: string;
  /** 'auto' follows the child's age; a parent can always pick the stage themselves. */
  stage: BabyStage | 'auto';
}

export const SKIN_TONES = ['#FFE3D0', '#F8CFAE', '#EDB98F', '#D09A6E', '#A9744C', '#7A4E33'] as const;
export const HAIR_COLORS = ['#2A1C14', '#5B3B23', '#8C5E30', '#C79A4E', '#EACB7C', '#B4492C'] as const;
export const EYE_COLORS = ['#3A2A1F', '#6B5234', '#4E7C5C', '#4878AA'] as const;
export const OUTFIT_COLORS = ['#FFFFFF', '#EC5F88', '#6C63E8', '#17B39C', '#F2A32B'] as const;

export const DEFAULT_AVATAR: AvatarConfig = { skin: SKIN_TONES[1], hair: HAIR_COLORS[1], eyes: EYE_COLORS[0], outfit: OUTFIT_COLORS[0], stage: 'auto' };

export const stageLabel: Record<BabyStage, string> = { tummy: 'שכיבה על הבטן', sit: 'ישיבה', crawl: 'זחילה', stand: 'עמידה' };

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
      skin: typeof v.skin === 'string' ? v.skin : DEFAULT_AVATAR.skin,
      hair: v.hair === null || typeof v.hair === 'string' ? v.hair : DEFAULT_AVATAR.hair,
      eyes: typeof v.eyes === 'string' ? v.eyes : DEFAULT_AVATAR.eyes,
      outfit: typeof v.outfit === 'string' ? v.outfit : DEFAULT_AVATAR.outfit,
      stage: v.stage === 'tummy' || v.stage === 'sit' || v.stage === 'crawl' || v.stage === 'stand' ? v.stage : 'auto',
    };
  } catch {
    return DEFAULT_AVATAR;
  }
}
