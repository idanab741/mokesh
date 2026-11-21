import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';
import { POSTER_ASPECT, POSTER_LABEL, POSTER_STILL } from './welcomePosterMeta';

const CLIP = require('../../../assets/welcome/poster.mp4');

/** The side edges melt into the page, which paints the same sky beside the clip on a wide or short screen. */
const MASK = 'linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%)';
const FADE = { maskImage: MASK, WebkitMaskImage: MASK };

/** All our characters together with Lili, as a quiet looping clip. */
export function WelcomePoster({ height }: { height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // iOS only lets a video start by itself when the element really carries the muted attribute.
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    v.play().catch(() => undefined);
  }, []);
  return (
    <video ref={ref} role="img" aria-label={POSTER_LABEL} data-testid="welcome-poster" src={Asset.fromModule(CLIP).uri} poster={Asset.fromModule(POSTER_STILL).uri}
      muted loop playsInline preload="auto" onClick={(e) => { e.currentTarget.play().catch(() => undefined); }}
      style={{ display: 'block', height, width: Math.round(height * POSTER_ASPECT), objectFit: 'cover', ...FADE }} />
  );
}
