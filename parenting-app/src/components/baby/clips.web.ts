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
  girl: {
    stand: {
      idle: require('../../../assets/baby/clips/girl-stand-idle.mp4'),
      poster: require('../../../assets/baby/clips/girl-stand-poster.jpg'),
      wave: require('../../../assets/baby/clips/girl-stand-wave.mp4'),
    },
    // Cut from one generated clip of three girls crawling side by side (tools/baby-motion/source/girls-crawl-three.mp4).
    crawl: {
      idle: require('../../../assets/baby/clips/girl-crawl-idle.mp4'),
      poster: require('../../../assets/baby/clips/girl-crawl-poster.jpg'),
    },
  },
};

/** Shown for a pose that has no clip of its own yet: the standing character of the same sex. */
export const fallbackClips: Record<'boy' | 'girl', BabyClips | null> = { boy: babyClips.boy.stand ?? null, girl: babyClips.girl.stand ?? babyClips.boy.stand ?? null };
