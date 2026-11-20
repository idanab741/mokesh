import type { BabyStage } from '@/domain/avatar';

export interface BabyModelSource {
  /** Bundled .glb file. */
  file: number;
  /** Median saturation and brightness of the teal clothes in the model's texture (used to recolour them). */
  clothS: number;
  clothV: number;
}

export type BabyModels = Record<'boy' | 'girl', Partial<Record<BabyStage, BabyModelSource>>>;

/**
 * The 3D models are only drawn on the web build for now (see models.web.ts), so the native
 * bundle does not carry them. Characters without a model use the rendered sprite views.
 */
export const babyModels: BabyModels = { boy: {}, girl: {} };
