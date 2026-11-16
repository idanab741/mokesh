// Living night sky, drawn once and then animated only with opacity/transform
// (compositor work), so it costs almost nothing on phones.
//  - two far layers that twinkle out of phase (CSS opacity)
//  - one near layer that drifts with scroll (parallax, transform only)
export function initSky(reduced) {
  const host = document.querySelector('.sky');
  const colors = ['255,251,244', '255,213,74', '201,182,242', '111,211,255'];
  let w = 0, h = 0, near;

  function layer(cls, height) {
    const c = document.createElement('canvas');
    c.className = `sky__layer ${cls}`;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    c.width = Math.round(w * dpr);
    c.height = Math.round(height * dpr);
    c.style.height = `${height}px`;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    host.append(c);
    return ctx;
  }
  const dot = (ctx, x, y, r, col, a) => {
    ctx.fillStyle = `rgba(${col},${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  };

  function build() {
    host.replaceChildren();
    w = innerWidth; h = innerHeight;
    const area = w * h;
    for (const cls of ['sky__far-a', 'sky__far-b']) {
      const ctx = layer(cls, h);
      const n = Math.min(90, Math.round(area / 12000));
      for (let i = 0; i < n; i++) {
        dot(ctx, Math.random() * w, Math.random() * h, Math.random() * 1.1 + 0.35,
          Math.random() < 0.85 ? colors[0] : colors[2], (0.5 + Math.random() * 0.5).toFixed(2));
      }
    }
    // near layer: a tile of one screen height, drawn twice so it can loop
    const ctx = layer('sky__near', h * 2);
    const n = Math.min(36, Math.round(area / 30000));
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 1.4 + 0.9;
      const col = colors[(Math.random() * colors.length) | 0];
      for (const yy of [y, y + h]) {
        dot(ctx, x, yy, r, col, 0.85);
        if (r > 1.8) {
          ctx.strokeStyle = `rgba(${col},.4)`; ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x - r * 3, yy); ctx.lineTo(x + r * 3, yy);
          ctx.moveTo(x, yy - r * 3); ctx.lineTo(x, yy + r * 3);
          ctx.stroke();
        }
      }
    }
    near = host.querySelector('.sky__near');
    scroll();
  }

  let queued = false;
  function scroll() {
    if (reduced || !near) return;
    const off = (scrollY * 0.18) % h;
    near.style.transform = `translate3d(0, ${(-off).toFixed(1)}px, 0)`;
  }
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scroll(); });
  };

  const go = () => {
    build();
    // the twinkle starts on the first interaction or after a few seconds, never during load
    const live = () => host.classList.add('is-live');
    for (const ev of ['scroll', 'pointerdown', 'keydown']) addEventListener(ev, live, { once: true, passive: true });
    setTimeout(live, 6000);
    addEventListener('scroll', onScroll, { passive: true });
    let rt;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (Math.abs(innerWidth - w) > 40 || Math.abs(innerHeight - h) > 160) build(); }, 250);
    });
  };
  // after first paint, so it never competes with the hero
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 300));
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}
