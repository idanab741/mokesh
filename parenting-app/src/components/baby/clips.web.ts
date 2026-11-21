import type { BabyClipMap, BabyClips, BabyLook } from './clips';

export type { BabyClipMap, BabyClips, BabyLook } from './clips';

/**
 * Rendered clips of the character (generated from the reference picture, kept with their own
 * light backdrop). A character or pose without a clip is shown with its still pictures.
 */
/** The crawl clips are framed tighter than the standing ones; this brings the head to the same size. */
const CRAWL_SCALE = 0.85;
/** The six boys were generated in one clip, each framed tighter still. */
const BOY_CRAWL_SCALE = 0.7;
/** Lying on the back, for the youngest. */
const LYING_SCALE = 0.9;

export const babyClips: BabyClipMap = {
  boy: {
    stand: {
      idle: require('../../../assets/baby/clips/boy-stand-idle.mp4'),
      poster: require('../../../assets/baby/clips/boy-stand-poster.jpg'),
      wave: require('../../../assets/baby/clips/boy-stand-wave.mp4'),
    },
    // Cut from one generated clip of six boys lying on their backs (tools/baby-motion/source/boys-lying-six.mp4).
    tummy: {
      idle: require('../../../assets/baby/clips/boy-tummy-idle.mp4'),
      poster: require('../../../assets/baby/clips/boy-tummy-poster.jpg'),
      scale: LYING_SCALE,
    },
    // Cut from one generated clip of six boys crawling (tools/baby-motion/source/boys-crawl-six.mp4).
    crawl: {
      idle: require('../../../assets/baby/clips/boy-crawl-idle.mp4'),
      poster: require('../../../assets/baby/clips/boy-crawl-poster.jpg'),
      scale: BOY_CRAWL_SCALE,
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

/** The other characters cut from the same multi-character clips. No standing clip yet. */
export const babyLooks: Record<'boy' | 'girl', BabyLook[]> = {
  boy: [
    { key: 'porcelain', label: 'עור בהיר מאוד, שיער בלונדיני', clips: { tummy: { idle: require('../../../assets/baby/clips/boy-porcelain-tummy-idle.mp4'), poster: require('../../../assets/baby/clips/boy-porcelain-tummy-poster.jpg'), scale: LYING_SCALE }, crawl: { idle: require('../../../assets/baby/clips/boy-porcelain-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/boy-porcelain-crawl-poster.jpg'), scale: BOY_CRAWL_SCALE } } },
    { key: 'olive', label: 'עור שזוף־בהיר, שיער חום', clips: { tummy: { idle: require('../../../assets/baby/clips/boy-olive-tummy-idle.mp4'), poster: require('../../../assets/baby/clips/boy-olive-tummy-poster.jpg'), scale: LYING_SCALE }, crawl: { idle: require('../../../assets/baby/clips/boy-olive-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/boy-olive-crawl-poster.jpg'), scale: BOY_CRAWL_SCALE } } },
    { key: 'tan', label: 'עור שזוף, שיער חום כהה', clips: { tummy: { idle: require('../../../assets/baby/clips/boy-tan-tummy-idle.mp4'), poster: require('../../../assets/baby/clips/boy-tan-tummy-poster.jpg'), scale: LYING_SCALE }, crawl: { idle: require('../../../assets/baby/clips/boy-tan-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/boy-tan-crawl-poster.jpg'), scale: BOY_CRAWL_SCALE } } },
    { key: 'brown', label: 'עור חום, שיער שחור', clips: { tummy: { idle: require('../../../assets/baby/clips/boy-brown-tummy-idle.mp4'), poster: require('../../../assets/baby/clips/boy-brown-tummy-poster.jpg'), scale: LYING_SCALE }, crawl: { idle: require('../../../assets/baby/clips/boy-brown-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/boy-brown-crawl-poster.jpg'), scale: BOY_CRAWL_SCALE } } },
    { key: 'deep', label: 'עור כהה, שיער שחור', clips: { tummy: { idle: require('../../../assets/baby/clips/boy-deep-tummy-idle.mp4'), poster: require('../../../assets/baby/clips/boy-deep-tummy-poster.jpg'), scale: LYING_SCALE }, crawl: { idle: require('../../../assets/baby/clips/boy-deep-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/boy-deep-crawl-poster.jpg'), scale: BOY_CRAWL_SCALE } } },
  ],
  girl: [
    { key: 'blonde', label: 'בלונדינית, עיניים כחולות', clips: { crawl: { idle: require('../../../assets/baby/clips/girl-blonde-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/girl-blonde-crawl-poster.jpg'), scale: CRAWL_SCALE } } },
    { key: 'dark', label: 'שיער כהה, עור כהה', clips: { crawl: { idle: require('../../../assets/baby/clips/girl-dark-crawl-idle.mp4'), poster: require('../../../assets/baby/clips/girl-dark-crawl-poster.jpg'), scale: CRAWL_SCALE } } },
  ],
};
