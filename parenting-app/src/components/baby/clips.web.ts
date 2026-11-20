import type { BabyClipMap } from './clips';

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
