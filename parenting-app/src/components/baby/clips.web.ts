import type { BabyClipMap, BabyClips } from './clips';

export type { BabyClipMap, BabyClips } from './clips';

/**
 * Rendered clips of the character (generated from the reference picture, kept with their own
 * light backdrop). A character or pose without a clip is shown with its still pictures.
 */
export const babyClips: BabyClipMap = {
  boy: {
    stand: {
      idle: require('../../../assets/baby/clips/boy-stand-idle.mp4'),
      poster: require('../../../assets/baby/clips/boy-stand-poster.jpg'),
      wave: require('../../../assets/baby/clips/boy-stand-wave.mp4'),
    },
  },
  girl: {},
};

/** Shown for every character that has no clip of its own yet (girl, other poses). */
export const fallbackClips: BabyClips | null = babyClips.boy.stand ?? null;
