import { Asset } from 'expo-asset';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import type { BabyClipProps } from './BabyClip';

export type { BabyClipProps } from './BabyClip';

/** The clips are cropped to this shape. */
const ASPECT = 668 / 720;
/** The edges fade out, so the clip's own backdrop melts into the screen (which has the same colour). */
const FEATHER = 'linear-gradient(to right, transparent 0, #000 16%, #000 84%, transparent 100%), linear-gradient(to bottom, transparent 0, #000 10%, #000 92%, transparent 100%)';
const layer: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' };

/**
 * The baby as real rendered video: an idle clip that loops, and a wave that plays once when
 * the screen opens and whenever the baby is tapped. Both clips share the same first frame,
 * so switching between them does not jump.
 */
export function BabyClip({ clips, height, label, active }: BabyClipProps) {
  const idle = useRef<HTMLVideoElement>(null);
  const wave = useRef<HTMLVideoElement>(null);
  const [waving, setWaving] = useState(false);
  const greeted = useRef(false);

  const playWave = () => {
    const w = wave.current;
    if (!w || waving) return;
    w.currentTime = 0;
    w.play().then(() => setWaving(true)).catch(() => undefined);
  };

  useEffect(() => {
    const v = idle.current;
    if (!v) return;
    if (!active) { v.pause(); wave.current?.pause(); return; }
    v.play().catch(() => undefined);
    if (greeted.current || !clips.wave) return;
    // Say hello once, shortly after the screen opens.
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) return;
    const id = setTimeout(() => { greeted.current = true; playWave(); }, 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const backToIdle = () => {
    const v = idle.current;
    if (v) { v.currentTime = 0; v.play().catch(() => undefined); }
    setWaving(false);
  };

  return (
    <div role="img" aria-label={label} data-testid="baby-clip" data-waving={waving ? '1' : '0'} onClick={playWave}
      style={{ position: 'relative', width: Math.round(height * ASPECT), height, cursor: clips.wave ? 'pointer' : 'default', maskImage: FEATHER, WebkitMaskImage: FEATHER, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}>
      <video ref={idle} src={Asset.fromModule(clips.idle).uri} poster={Asset.fromModule(clips.poster).uri} muted loop playsInline autoPlay preload="auto" style={layer} />
      {clips.wave ? (
        <video ref={wave} src={Asset.fromModule(clips.wave).uri} muted playsInline preload="auto" onEnded={backToIdle}
          style={{ ...layer, opacity: waving ? 1 : 0, transition: 'opacity 160ms linear' }} />
      ) : null}
    </div>
  );
}
