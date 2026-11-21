import type { BabyStage } from '@/domain/avatar';

export interface BabyClips {
  /** Looping clip of the character at rest. */
  idle: number;
  /** First frame of the idle clip, shown until the clip plays. */
  poster: number;
  /** One-shot clip that starts and ends on the idle pose. */
  wave?: number;
  /** Drawn smaller than the box, so a crawling character's head is the size of a standing one's. */
  scale?: number;
}

export type BabyClipMap = Record<'boy' | 'girl', Partial<Record<BabyStage, BabyClips>>>;

/** The clips are played on the web build only for now (see clips.web.ts). */
export const babyClips: BabyClipMap = { boy: {}, girl: {} };

/** A character a parent can pick: the same child drawn with other hair, eyes and skin. */
export interface BabyLook { key: string; label: string; clips: Partial<Record<BabyStage, BabyClips>> }
/** Extra characters per sex, beside the default one in `babyClips`. */
export const babyLooks: Record<'boy' | 'girl', BabyLook[]> = { boy: [], girl: [] };

/** Shown for a pose that has no clip of its own yet. None on native. */
export const fallbackClips: Record<'boy' | 'girl', BabyClips | null> = { boy: null, girl: null };
