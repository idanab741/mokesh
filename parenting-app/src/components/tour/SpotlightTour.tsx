import type { MascotPose } from '@/domain/advisor';

export interface TourStep {
  /** A centred opening or closing card, without a spotlight. */
  hero?: boolean;
  /** `data-tour` name of the thing to light up. */
  target?: string;
  pose: MascotPose;
  title: string;
  text: string;
  button?: string;
  /** Corner radius of the spotlight, to match the control's own shape. */
  radius?: number;
}

/** The spotlight tour runs on the web build; native shows nothing for now. */
export function SpotlightTour(_: { steps: TourStep[]; onDone: () => void }) {
  return null;
}
