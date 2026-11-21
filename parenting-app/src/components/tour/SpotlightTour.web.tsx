import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mascot } from '@/components/home/Companion';
import { colors } from '@/design/tokens';
import type { TourStep } from './SpotlightTour';

export type { TourStep } from './SpotlightTour';

interface Rect { x: number; y: number; w: number; h: number; r: number }
const PAD = 8;
/** Space kept at the top for the progress bar and "דלג". */
const TOP = 78;
/** The explanation card always sits here, above the bottom bar, so it never jumps between steps. */
const CARD_BOTTOM = 112;
const DIM = 'rgba(30,18,32,0.76)';

function scrollParent(el: Element): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const s = getComputedStyle(p);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 4) return p;
  }
  return null;
}

/**
 * A tour over the real screen, like the one in Triplace: everything dims, one spotlight glides
 * from control to control, and Lili says in a sentence what each is for. The card stays in one
 * place, the screen scrolls under it so each control sits just above the card, and nothing is cut:
 * a control taller than the free space is lit only as far as the card.
 */
export function SpotlightTour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(200);
  const [view, setView] = useState({ w: window.innerWidth, h: window.visualViewport?.height ?? window.innerHeight });
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[i];

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.visualViewport?.height ?? window.innerHeight });
    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); window.visualViewport?.removeEventListener('resize', onResize); };
  }, []);
  useLayoutEffect(() => { if (cardRef.current) setCardH(cardRef.current.offsetHeight); }, [i, view.w]);

  useLayoutEffect(() => {
    if (!step) return;
    if (step.hero || !step.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    // A step whose control is not on this screen is passed over.
    if (!el) { if (i < steps.length - 1) setI(i + 1); else onDone(); return; }
    // The free space for the spotlight: under the top strip, above the card.
    const zoneBottom = view.h - CARD_BOTTOM - cardH - 18;
    const place = () => {
      const r = el.getBoundingClientRect();
      const fixed = r.bottom > view.h - 100 && !scrollParent(el)?.contains(el) ? true : getComputedStyle(el).position === 'fixed';
      const sc = scrollParent(el);
      // Scroll at once (no smooth scrolling to wait for) so the control sits at the top of the free space.
      if (sc && !fixed && (r.top < TOP + PAD || r.bottom > zoneBottom)) sc.scrollTop += r.top - (TOP + PAD + 4);
      const m = el.getBoundingClientRect();
      const inBar = m.top > view.h - 130;
      const y = Math.max(inBar ? 0 : TOP, m.top - PAD);
      const bottom = inBar ? m.bottom + PAD : Math.min(m.bottom + PAD, zoneBottom);
      const x = Math.max(6, m.left - PAD);
      const w = Math.min(view.w - 6, m.right + PAD) - x;
      const h = Math.max(40, bottom - y);
      setRect({ x, y, w, h, r: Math.min(step.radius ?? 30, h / 2, w / 2) });
    };
    place();
    // Once more after layout settles (fonts, images, the scroll we just made).
    const t = setTimeout(place, 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, cardH, view.h, view.w]);
  if (!step) return null;

  const next = () => (i < steps.length - 1 ? setI(i + 1) : onDone());
  const back = () => setI(Math.max(0, i - 1));
  // A hero step has no control: the spotlight closes to a point behind the card, so the dimming never flashes.
  const spot: Rect = rect && !step.hero ? rect : { x: view.w / 2, y: view.h - CARD_BOTTOM - cardH / 2, w: 0, h: 0, r: 0 };
  // The bar's own steps: the card moves up a little so the lit bar stays clear.
  const barStep = !!rect && !step.hero && rect.y > view.h - 150;
  const cardBottom = barStep ? view.h - rect.y + 18 : CARD_BOTTOM;

  return createPortal(
    <div data-spotlight-tour="" dir="rtl" onClick={next} role="dialog" aria-label="סיור באפליקציה"
      style={{ position: 'fixed', inset: 0, zIndex: 100000, fontFamily: 'Rubik, system-ui, sans-serif', cursor: 'pointer', overflow: 'hidden', touchAction: 'none' }}>
      <style>{'@keyframes lili-tour-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'}</style>
      <div style={{ position: 'absolute', left: spot.x, top: spot.y, width: spot.w, height: spot.h, borderRadius: spot.r,
        boxShadow: `0 0 0 ${spot.w ? 4 : 0}px rgba(255,255,255,0.92), 0 0 0 200vmax ${DIM}`,
        transition: 'left 420ms cubic-bezier(.3,1.1,.4,1), top 420ms cubic-bezier(.3,1.1,.4,1), width 420ms cubic-bezier(.3,1.1,.4,1), height 420ms cubic-bezier(.3,1.1,.4,1), border-radius 420ms ease', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 16, right: 16, display: 'flex', gap: 5 }} aria-hidden>
        {steps.map((s, k) => <span key={s.title} style={{ flex: 1, height: 4, borderRadius: 2, background: k <= i ? '#fff' : 'rgba(255,255,255,0.35)', transition: 'background 300ms' }} />)}
      </div>
      <button type="button" aria-label="דילוג על ההסבר" onClick={(e) => { e.stopPropagation(); onDone(); }}
        style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 28px)', left: 16, background: 'rgba(255,255,255,0.18)', color: '#fff', border: 0, borderRadius: 99, padding: '8px 16px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        דלג
      </button>

      <div ref={cardRef} style={{ position: 'absolute', left: 14, right: 14, bottom: `calc(${cardBottom}px + env(safe-area-inset-bottom, 0px))`, background: '#fff', borderRadius: 28, padding: '16px 16px 14px', boxShadow: '0 18px 44px rgba(0,0,0,0.28)', transition: 'bottom 420ms cubic-bezier(.3,1.1,.4,1)' }}>
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animation: 'lili-tour-in 320ms ease both' }}>
          <Mascot pose={step.pose} size={step.hero ? 88 : 66} />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.primaryStrong }}>{`${i + 1} מתוך ${steps.length}`}</span>
            <strong style={{ fontSize: step.hero ? 21 : 18, color: colors.ink, lineHeight: 1.25 }}>{step.title}</strong>
            <span style={{ fontSize: 15, lineHeight: 1.5, color: '#5B4353' }}>{step.text}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
              <button type="button" onClick={(e) => { e.stopPropagation(); next(); }}
                style={{ background: colors.primaryStrong, color: '#fff', border: 0, borderRadius: 99, padding: '11px 22px', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                {step.button ?? (i === steps.length - 1 ? 'סיום' : 'הבא')}
              </button>
              {i > 0 ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); back(); }}
                  style={{ background: 'none', color: '#6A6570', border: 0, padding: '10px 4px', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                  חזרה
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
