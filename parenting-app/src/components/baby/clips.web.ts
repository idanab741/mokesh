import { IRIS_BASE } from '@/domain/avatar';
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
      base: { skin: [0.8176, 0.0687, 0.9233], hair: [0.5648, 0.0759, 1.0303], cloth: [0.8201, 0.0522, -2.9964], iris: IRIS_BASE.boy },
      wave: require('../../../assets/baby/clips/boy-stand-wave.mp4'),
    },
  },
  girl: {
    stand: {
      idle: require('../../../assets/baby/clips/girl-stand-idle.mp4'),
      poster: require('../../../assets/baby/clips/girl-stand-poster.jpg'),
      base: { skin: [0.8511, 0.0698, 0.8631], hair: [0.6113, 0.0735, 1.0459], cloth: [0.86, 0.0613, -2.9909], iris: IRIS_BASE.girl },
      wave: require('../../../assets/baby/clips/girl-stand-wave.mp4'),
    },
  },
};

/** Shown for a pose that has no clip of its own yet: the standing character of the same sex. */
export const fallbackClips: Record<'boy' | 'girl', BabyClips | null> = { boy: babyClips.boy.stand ?? null, girl: babyClips.girl.stand ?? babyClips.boy.stand ?? null };
