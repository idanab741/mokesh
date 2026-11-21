import { Asset } from 'expo-asset';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { BabyClipProps } from './BabyClip';

export type { BabyClipProps } from './BabyClip';

/** The clips are this shape. */
const ASPECT = 668 / 720;
/** The edges fade out, so the clip's own backdrop melts into the screen (which has the same colour). */
const layer: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' };

/**
 * The baby as real rendered video, played exactly as it was rendered: an idle clip that loops
 * and a wave that plays once when the screen opens and whenever the baby is tapped. Both clips
 * share the same first frame, so switching between them does not jump.
 *
 * The clips are not recoloured while they play. Repainting skin, hair and clothes live was tried
 * and dropped: it flickered on phones and never looked rendered.
 */
export function BabyClip({ clips, height, label, active, greet = true }: BabyClipProps) {
  const idle = useRef<HTMLVideoElement>(null);
  const wave = useRef<HTMLVideoElement>(null);
  const [waving, setWaving] = useState(false);
  const wavingRef = useRef(false);
  const greeted = useRef(false);

  /** iOS only lets a video start by itself when the element really carries the muted attribute. */
  const quiet = (v: HTMLVideoElement | null) => { if (v) { v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); } };

  const playWave = () => {
    // A tap is also the moment a phone that held autoplay back (low power mode) lets the clip start.
    if (idle.current?.paused && !wavingRef.current) idle.current.play().catch(() => undefined);
    const w = wave.current;
    if (!w || wavingRef.current) return;
    w.currentTime = 0;
    w.play().then(() => { wavingRef.current = true; setWaving(true); }).catch(() => undefined);
  };
  const backToIdle = () => {
    const v = idle.current;
    if (v) { v.currentTime = 0; v.play().catch(() => undefined); }
    wavingRef.current = false;
    setWaving(false);
  };

  useEffect(() => {
    const v = idle.current;
    if (!v) return;
    quiet(v); quiet(wave.current);
    if (!active) { v.pause(); wave.current?.pause(); return; }
    // Coming back (another tab, a sheet that was open): carry on from where the baby stopped.
    // A wave that was cut off is finished rather than left frozen.
    if (wavingRef.current && wave.current) wave.current.play().catch(() => backToIdle());
    else v.play().catch(() => undefined);
    if (!greet || greeted.current || !clips.wave || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Say hello once, shortly after the screen opens.
    const hello = setTimeout(() => { greeted.current = true; playWave(); }, 900);
    return () => clearTimeout(hello);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div role="img" aria-label={label} data-testid="baby-clip" data-waving={waving ? '1' : '0'} onClick={playWave}
      style={{ position: 'relative', overflow: 'hidden', width: Math.round(height * ASPECT), height, cursor: clips.wave ? 'pointer' : 'default' }}>
      <video ref={idle} src={Asset.fromModule(clips.idle).uri} poster={Asset.fromModule(clips.poster).uri} muted loop playsInline autoPlay preload="auto" style={layer} />
      {clips.wave ? (
        <video ref={wave} src={Asset.fromModule(clips.wave).uri} muted playsInline preload="auto" onEnded={backToIdle}
          style={{ ...layer, visibility: waving ? 'visible' : 'hidden' }} />
      ) : null}
    </div>
  );
}
