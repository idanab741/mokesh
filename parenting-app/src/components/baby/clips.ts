import type { BabyStage } from '@/domain/avatar';

export interface BabyClips {
  /** Looping clip of the character at rest. */
  idle: number;
  /** First frame of the idle clip, shown until the clip plays. */
  poster: number;
  /** The colours the character was rendered with (OKLab lightness, chroma, hue), measured by tools/baby-motion/tint-video.py. */
  base: { skin: [number, number, number]; hair: [number, number, number]; cloth: [number, number, number] };
  /** One-shot clip that starts and ends on the idle pose. */
  wave?: number;
}

export type BabyClipMap = Record<'boy' | 'girl', Partial<Record<BabyStage, BabyClips>>>;

/** The clips are played on the web build only for now (see clips.web.ts). */
export const babyClips: BabyClipMap = { boy: {}, girl: {} };

/** Shown for a pose that has no clip of its own yet. None on native. */
export const fallbackClips: Record<'boy' | 'girl', BabyClips | null> = { boy: null, girl: null };
