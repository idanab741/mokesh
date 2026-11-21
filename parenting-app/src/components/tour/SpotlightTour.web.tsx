import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mascot } from '@/components/home/Companion';
import { colors } from '@/design/tokens';
import type { TourStep } from './SpotlightTour';

export type { TourStep } from './SpotlightTour';

interface Rect { x: number; y: number; w: number; h: number }
const PAD = 8;

/**
 * A tour over the real screen, like the one in Triplace: everything dims, a spotlight moves from
 * one control to the next, and Lili says in a sentence what it is for. A story-style bar shows
 * progress; "הבא" or a tap anywhere moves on, "דלג" ends it.
 */
export function SpotlightTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[i];

  useLayoutEffect(() => {
    if (!step || step.hero || !step.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    // A step whose target is not on this screen is passed over.
    if (!el) { if (i < steps.length - 1) setI(i + 1); else onDone(); return; }
    // Bring it into view only if it is not there already (the bottom bar never needs it).
    const r0 = el.getBoundingClientRect();
    if (r0.top < 60 || r0.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setRect(null);
    const measure = () => { const r = el.getBoundingClientRect(); setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }); };
    const t1 = setTimeout(measure, 380);
    const t2 = setTimeout(measure, 750);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);
  if (!step) return null;

  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone());
  const vh = window.innerHeight;
  // The explanation sits at the far end of the screen from the spotlight, always fully on screen.
  const upper = rect ? rect.y + rect.h / 2 < vh * 0.5 : false;
  const card: React.CSSProperties = step.hero || !rect ? { top: '50%', transform: 'translateY(-50%)' } : upper ? { bottom: 104 } : { top: 76 };

  return createPortal(
    <div data-spotlight-tour="" dir="rtl" onClick={next} role="dialog" aria-label="סיור באפליקציה"
      style={{ position: 'fixed', inset: 0, zIndex: 100000, fontFamily: 'Rubik, system-ui, sans-serif', cursor: 'pointer', background: step.hero || !rect ? 'rgba(30,18,32,0.74)' : 'transparent' }}>
      {!step.hero && rect ? (
        <div style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: Math.min(30, rect.h / 2), boxShadow: '0 0 0 4px rgba(255,255,255,0.9), 0 0 0 9999px rgba(30,18,32,0.74)', transition: 'all 380ms cubic-bezier(.3,1.2,.4,1)', pointerEvents: 'none' }} />
      ) : null}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 16, display: 'flex', gap: 5 }} aria-hidden>
        {steps.map((s, k) => <span key={s.title} style={{ flex: 1, height: 4, borderRadius: 2, background: k <= i ? '#fff' : 'rgba(255,255,255,0.35)', transition: 'background 250ms' }} />)}
      </div>
      <button type="button" aria-label="דילוג על ההסבר" onClick={(e) => { e.stopPropagation(); onDone(); }}
        style={{ position: 'absolute', top: 30, left: 16, background: 'rgba(255,255,255,0.16)', color: '#fff', border: 0, borderRadius: 99, padding: '8px 14px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        דלג
      </button>
      <div style={{ position: 'absolute', left: 16, right: 16, ...card, background: '#fff', borderRadius: 28, padding: '16px 16px 14px', boxShadow: '0 16px 40px rgba(0,0,0,0.25)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Mascot pose={step.pose} size={step.hero ? 96 : 68} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong style={{ fontSize: step.hero ? 21 : 18, color: colors.ink, lineHeight: 1.25 }}>{step.title}</strong>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: '#5B4353' }}>{step.text}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); next(); }}
            style={{ alignSelf: 'flex-start', marginTop: 8, background: colors.primaryStrong, color: '#fff', border: 0, borderRadius: 99, padding: '10px 20px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            {step.button ?? (i === steps.length - 1 ? 'סיום' : 'הבא')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
