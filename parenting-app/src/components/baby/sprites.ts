// Generated list of sprite strips (see tools/baby-sprites/build.py). One strip = 8 views, 45° apart.
/* eslint-disable @typescript-eslint/no-require-imports */
import type { BabyStage } from '@/domain/avatar';

export type SpriteSex = 'boy' | 'girl';
export type OutfitKey = 'teal' | 'blue' | 'pink' | 'lilac' | 'yellow' | 'white';

export const babySprites: Record<SpriteSex, Record<BabyStage, Record<OutfitKey, number>>> = {
  boy: {
    tummy: {
      teal: require('../../../assets/baby/boy-tummy-teal.webp'),
      blue: require('../../../assets/baby/boy-tummy-blue.webp'),
      pink: require('../../../assets/baby/boy-tummy-pink.webp'),
      lilac: require('../../../assets/baby/boy-tummy-lilac.webp'),
      yellow: require('../../../assets/baby/boy-tummy-yellow.webp'),
      white: require('../../../assets/baby/boy-tummy-white.webp'),
    },
    sit: {
      teal: require('../../../assets/baby/boy-sit-teal.webp'),
      blue: require('../../../assets/baby/boy-sit-blue.webp'),
      pink: require('../../../assets/baby/boy-sit-pink.webp'),
      lilac: require('../../../assets/baby/boy-sit-lilac.webp'),
      yellow: require('../../../assets/baby/boy-sit-yellow.webp'),
      white: require('../../../assets/baby/boy-sit-white.webp'),
    },
    crawl: {
      teal: require('../../../assets/baby/boy-crawl-teal.webp'),
      blue: require('../../../assets/baby/boy-crawl-blue.webp'),
      pink: require('../../../assets/baby/boy-crawl-pink.webp'),
      lilac: require('../../../assets/baby/boy-crawl-lilac.webp'),
      yellow: require('../../../assets/baby/boy-crawl-yellow.webp'),
      white: require('../../../assets/baby/boy-crawl-white.webp'),
    },
    stand: {
      teal: require('../../../assets/baby/boy-stand-teal.webp'),
      blue: require('../../../assets/baby/boy-stand-blue.webp'),
      pink: require('../../../assets/baby/boy-stand-pink.webp'),
      lilac: require('../../../assets/baby/boy-stand-lilac.webp'),
      yellow: require('../../../assets/baby/boy-stand-yellow.webp'),
      white: require('../../../assets/baby/boy-stand-white.webp'),
    },
  },
  girl: {
    tummy: {
      teal: require('../../../assets/baby/girl-tummy-teal.webp'),
      blue: require('../../../assets/baby/girl-tummy-blue.webp'),
      pink: require('../../../assets/baby/girl-tummy-pink.webp'),
      lilac: require('../../../assets/baby/girl-tummy-lilac.webp'),
      yellow: require('../../../assets/baby/girl-tummy-yellow.webp'),
      white: require('../../../assets/baby/girl-tummy-white.webp'),
    },
    sit: {
      teal: require('../../../assets/baby/girl-sit-teal.webp'),
      blue: require('../../../assets/baby/girl-sit-blue.webp'),
      pink: require('../../../assets/baby/girl-sit-pink.webp'),
      lilac: require('../../../assets/baby/girl-sit-lilac.webp'),
      yellow: require('../../../assets/baby/girl-sit-yellow.webp'),
      white: require('../../../assets/baby/girl-sit-white.webp'),
    },
    crawl: {
      teal: require('../../../assets/baby/girl-crawl-teal.webp'),
      blue: require('../../../assets/baby/girl-crawl-blue.webp'),
      pink: require('../../../assets/baby/girl-crawl-pink.webp'),
      lilac: require('../../../assets/baby/girl-crawl-lilac.webp'),
      yellow: require('../../../assets/baby/girl-crawl-yellow.webp'),
      white: require('../../../assets/baby/girl-crawl-white.webp'),
    },
    stand: {
      teal: require('../../../assets/baby/girl-stand-teal.webp'),
      blue: require('../../../assets/baby/girl-stand-blue.webp'),
      pink: require('../../../assets/baby/girl-stand-pink.webp'),
      lilac: require('../../../assets/baby/girl-stand-lilac.webp'),
      yellow: require('../../../assets/baby/girl-stand-yellow.webp'),
      white: require('../../../assets/baby/girl-stand-white.webp'),
    },
  },
};
