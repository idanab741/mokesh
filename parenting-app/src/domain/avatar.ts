import type { ChildSex } from './age';

export type BabyStage = 'tummy' | 'sit' | 'crawl' | 'stand';

/**
 * How the 3D baby looks.
 * The parent chooses only the colour of the clothes (and may override the pose). Skin tone
 * and hair come from the child's photo; they are never picked by hand.
 */
export interface AvatarConfig {
  skin: string;
  /** null = no hair yet. */
  hair: string | null;
  eyes: string;
  /** 'auto' = the default for the child's sex. */
  outfit: string;
  /** 'auto' follows the child's age; a parent can always pick the stage themselves. */
  stage: BabyStage | 'auto';
  /** Fingerprint of the photo the look was last derived from (so it is analysed once per photo). */
  photo?: string;
  /** False when the last photo could not be read (no face found). */
  photoOk?: boolean;
}

export const SKIN_TONES = ['#FFE3D0', '#F8CFAE', '#EDB98F', '#D09A6E', '#A9744C', '#7A4E33'] as const;
export const HAIR_COLORS = ['#2A1C14', '#5B3B23', '#8C5E30', '#C79A4E', '#EACB7C', '#B4492C'] as const;
export const OUTFIT_COLORS = ['#A9D8DC', '#A8C8F0', '#F5A9BF', '#C9B8F2', '#F6D58A', '#FFFFFF'] as const;
export const outfitName: Record<string, string> = {
  '#A9D8DC': 'טורקיז', '#A8C8F0': 'תכלת', '#F5A9BF': 'ורוד', '#C9B8F2': 'סגול בהיר', '#F6D58A': 'צהוב', '#FFFFFF': 'לבן',
};
/** One warm brown for everyone: eye colour cannot be read reliably from a snapshot. */
export const EYE_COLOR = '#7A4A26';

export const DEFAULT_AVATAR: AvatarConfig = { skin: SKIN_TONES[1], hair: HAIR_COLORS[2], eyes: EYE_COLOR, outfit: 'auto', stage: 'auto' };

export const stageLabel: Record<BabyStage, string> = { tummy: 'שכיבה על הבטן', sit: 'ישיבה', crawl: 'זחילה', stand: 'עמידה' };

export function resolveOutfit(config: AvatarConfig, sex: ChildSex): string {
  if (config.outfit !== 'auto') return config.outfit;
  return sex === 'female' ? '#F5A9BF' : '#A9D8DC';
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
      skin: typeof v.skin === 'string' ? v.skin : DEFAULT_AVATAR.skin,
      hair: v.hair === null || typeof v.hair === 'string' ? v.hair : DEFAULT_AVATAR.hair,
      eyes: EYE_COLOR,
      outfit: typeof v.outfit === 'string' && (OUTFIT_COLORS as readonly string[]).includes(v.outfit) ? v.outfit : 'auto',
      stage: v.stage === 'tummy' || v.stage === 'sit' || v.stage === 'crawl' || v.stage === 'stand' ? v.stage : 'auto',
      photo: typeof v.photo === 'string' ? v.photo : undefined,
      photoOk: typeof v.photoOk === 'boolean' ? v.photoOk : undefined,
    };
  } catch {
    return DEFAULT_AVATAR;
  }
}

/** Short, stable fingerprint of a photo URI (data URIs can be megabytes long). */
export function photoFingerprint(uri: string): string {
  return `${uri.length}:${uri.slice(-32)}`;
}

/* ------------------------------------------------------------------------------------------
 * Reading the look from a photo. Pure functions over RGBA pixels, so they are unit-tested
 * and run entirely on the device: the photo is never uploaded for this.
 * ---------------------------------------------------------------------------------------- */

export interface PhotoLook {
  skin: string;
  hair: string | null;
}

const hexRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Skin-like colour, in a way that works from very fair to very dark skin (YCbCr chroma window). */
function isSkin(r: number, g: number, b: number): boolean {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 130 && cr >= 134 && cr <= 178 && r > b && luma(r, g, b) > 35;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

function nearest<T extends string>(rgb: [number, number, number], palette: readonly T[]): T {
  let best = palette[0];
  let bestD = Infinity;
  for (const hex of palette) {
    const [r, g, b] = hexRgb(hex);
    // Lightness matters most when matching tones; weight it above hue differences.
    const d = 3 * (luma(...rgb) - luma(r, g, b)) ** 2 + (rgb[0] - r) ** 2 + (rgb[1] - g) ** 2 + (rgb[2] - b) ** 2;
    if (d < bestD) { bestD = d; best = hex; }
  }
  return best;
}

/**
 * Estimates skin tone and hair from a square, face-centred photo (the crop the photo picker
 * produces). Returns null when too little skin is visible to say anything.
 */
export function lookFromPixels(rgba: Uint8ClampedArray | number[], width: number, height: number): PhotoLook | null {
  const skin: [number[], number[], number[]] = [[], [], []];
  const cx = width / 2, cy = height * 0.55;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      // Face area: an ellipse a little below the centre.
      const dx = (x - cx) / (width * 0.3), dy = (y - cy) / (height * 0.34);
      if (dx * dx + dy * dy > 1) continue;
      const i = (y * width + x) * 4;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (isSkin(r, g, b)) { skin[0].push(r); skin[1].push(g); skin[2].push(b); }
    }
  }
  const faceArea = Math.PI * width * 0.3 * height * 0.34;
  if (skin[0].length < faceArea * 0.12) return null;
  const skinRgb: [number, number, number] = [median(skin[0]), median(skin[1]), median(skin[2])];
  // Photos are usually lit: lift the measured tone slightly toward its true, brighter colour.
  const lifted: [number, number, number] = [Math.min(255, skinRgb[0] * 1.06), Math.min(255, skinRgb[1] * 1.06), Math.min(255, skinRgb[2] * 1.06)];

  // Hair: the band above the face. Mostly skin there => a baby without much hair.
  const hair: [number[], number[], number[]] = [[], [], []];
  let bandSkin = 0, band = 0;
  for (let y = Math.round(height * 0.06); y < height * 0.26; y += 1) {
    for (let x = Math.round(width * 0.3); x < width * 0.7; x += 1) {
      const i = (y * width + x) * 4;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      band += 1;
      // Same colour as the face (not merely "skin-like": blond hair is skin-like too).
      const likeFace = Math.abs(luma(r, g, b) - luma(...skinRgb)) < 45 && Math.abs((r - b) - (skinRgb[0] - skinRgb[2])) < 30;
      if (isSkin(r, g, b) && likeFace) { bandSkin += 1; continue; }
      hair[0].push(r); hair[1].push(g); hair[2].push(b);
    }
  }
  let hairHex: string | null = null;
  if (band > 0 && bandSkin / band < 0.55 && hair[0].length > band * 0.3) {
    const rgb: [number, number, number] = [median(hair[0]), median(hair[1]), median(hair[2])];
    const sat = Math.max(...rgb) - Math.min(...rgb);
    // Hair is brown-to-blond or dark. A saturated blue/green band is background, not hair.
    const hairLike = rgb[0] >= rgb[2] - 8 && (sat < 120 || rgb[0] > rgb[2] + 20);
    hairHex = hairLike ? nearest(rgb, HAIR_COLORS) : null;
  }
  return { skin: nearest(lifted, SKIN_TONES), hair: hairHex };
}
