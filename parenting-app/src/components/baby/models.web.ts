import type { BabyModels } from './models';

export type { BabyModelSource, BabyModels } from './models';

/** Real 3D models, one per character and pose. Poses that are missing fall back to the sprite views. */
export const babyModels: BabyModels = {
  boy: {
    sit: { file: require('../../../assets/baby/models/boy-sit.glb'), clothS: 0.4, clothV: 0.67 },
  },
  girl: {
    sit: { file: require('../../../assets/baby/models/girl-sit.glb'), clothS: 0.42, clothV: 0.78 },
  },
};
