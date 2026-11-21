import type { BabyClipMap, BabyClips, BabyLook } from './clips';

export type { BabyClipMap, BabyClips, BabyLook } from './clips';

/**
 * Rendered clips of the character (generated from the reference picture, kept with their own
 * light backdrop). A character or pose without a clip is shown with its still pictures.
 */
/** The crawl clips are framed tighter than the standing ones; this brings the head to the same size. */
const CRAWL_SCALE = 0.85;

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
      scale: CRAWL_SCALE,
    },
  },
};

/** Shown for a pose that has no clip of its own yet: the standing character of the same sex. */
export const fallbackClips: Record<'boy' | 'girl', BabyClips | null> = { boy: babyClips.boy.stand ?? null, girl: babyClips.girl.stand ?? babyClips.boy.stand ?? null };

/** The other girls cut from the same three-character clip. They only crawl for now. */
export const babyLooks: Record<'boy' | 'girl', BabyLook[]> = {
  boy: [],
  girl: [
    { key: 'blonde', label: 'בלונדינית, עיניים כחולות', clips: { crawl: { idle: require('../../../assets/baby/clips/girl-blonde-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/girl-blonde-crawl-poster.jpg'), scale: CRAWL_SCALE } } },
    { key: 'dark', label: 'שיער כהה, עור כהה', clips: { crawl: { idle: require('../../../assets/baby/clips/girl-dark-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/girl-dark-crawl-poster.jpg'), scale: CRAWL_SCALE } } },
  ],
};
