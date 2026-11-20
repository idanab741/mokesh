import type { BabyClips } from './clips';

export interface BabyClipProps {
  clips: BabyClips;
  height: number;
  label: string;
  /** Pass false while the screen is hidden so playback stops. */
  active: boolean;
}

/** Clips are played on the web build only (BabyClip.web.tsx). */
export function BabyClip(_props: BabyClipProps) {
  return null;
}
