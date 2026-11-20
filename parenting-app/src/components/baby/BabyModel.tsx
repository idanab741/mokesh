import type { BabyModelSource } from './models';

export interface BabyModelProps {
  model: BabyModelSource;
  /** Outfit key: 'teal' keeps the clothes as modelled. */
  outfit: string;
  size: number;
  active: boolean;
  onReady: () => void;
  onError: () => void;
}

/** The 3D viewer exists on the web build only (BabyModel.web.tsx). */
export function BabyModel(_props: BabyModelProps) {
  return null;
}
