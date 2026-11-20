import type { BabyStage } from '@/domain/avatar';

export interface BabyClips {
  /** Looping clip of the character at rest. */
  idle: number;
  /** First frame of the idle clip, shown until the clip plays. */
  poster: number;
  /** One-shot clip that starts and ends on the idle pose. */
  wave?: number;
}

export type BabyClipMap = Record<'boy' | 'girl', Partial<Record<BabyStage, BabyClips>>>;

/** The clips are played on the web build only for now (see clips.web.ts). */
export const babyClips: BabyClipMap = { boy: {}, girl: {} };
