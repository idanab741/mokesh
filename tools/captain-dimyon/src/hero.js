// The flashlight: a soft beam that reveals the illustration under the darkness.

export function initHero(opts, reduced) {
  const hero = document.querySelector('.hero');
  const art = hero.querySelector('.hero__art');
  const dark = hero.querySelector('.hero__dark');
  // darkness is drawn on a small canvas and scaled up: a soft gradient needs no resolution,
  // so each frame costs almost nothing
  const cv = document.createElement('canvas');
  cv.className = 'hero__beam';
  dark.append(cv);
  const ctx = cv.getContext('2d');
  const SCALE = 0.25;
  const grrr = hero.querySelector('.hero__grrr');
  const btn = hero.querySelector('.hero__light');
  const fine = matchMedia('(pointer: fine)').matches;

  const IMG_W = opts.img.w, IMG_H = opts.img.h;
  const wide = matchMedia('(min-width: 900px)');
  let focus = opts.focus;

  let W = 0, H = 0, eye = { x: 0, y: 0 }, R = 120;

  // Where are the eyes on screen, given object-fit: cover + object-position?
  // (eye is in hero coordinates; the art box may be shorter than the hero on phones)
  let artTop = 0, artH = 0;
  function measure() {
    W = hero.clientWidth; H = hero.clientHeight;
    focus = wide.matches ? opts.focusWide : opts.focus;
    art.style.setProperty('--focus-x', `${focus.x}%`);
    art.style.setProperty('--focus-y', `${focus.y}%`);
    const aw = art.clientWidth, ah = art.clientHeight;
    artTop = art.offsetTop; artH = ah;
    const s = Math.max(aw / IMG_W, ah / IMG_H);
    const iw = IMG_W * s, ih = IMG_H * s;
    const ox = (aw - iw) * (focus.x / 100);
    const oy = (ah - ih) * (focus.y / 100);
    const ex = ox + iw * (opts.eyes.x / 100), ey = oy + ih * (opts.eyes.y / 100);
    eye = { x: ex, y: ey + artTop };
    art.style.setProperty('--eye-x', `${ex}px`);
    // the monster jumps out from under the bed and stands on the rug in front of it
    art.style.setProperty('--mx', `${ex + iw * (opts.monster.dx || 0) / 100}px`);
    art.style.setProperty('--my', `${oy + ih * (opts.monster.floor / 100)}px`);
    art.style.setProperty('--mw', `${Math.max(120, iw * opts.monster.width / 100)}px`);
    art.style.setProperty('--eye-y', `${ey}px`);
    R = Math.max(100, Math.min(230, Math.min(W, ah) * 0.34));
    dark.style.setProperty('--r', `${R}px`);
    cv.width = Math.max(1, Math.round(W * SCALE));
    cv.height = Math.max(1, Math.round(H * SCALE));
  }

  function paint(x, y) {
    const w = cv.width, h = cv.height, sx = x * SCALE, sy = y * SCALE, r = R * SCALE;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(14,7,34,.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-out';
    let g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.45, 'rgba(0,0,0,1)');
    g.addColorStop(0.75, 'rgba(0,0,0,.42)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    // warm rim of the flashlight
    ctx.globalCompositeOperation = 'source-over';
    g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, 'rgba(255,181,71,.13)');
    g.addColorStop(0.7, 'rgba(255,181,71,.05)');
    g.addColorStop(1, 'rgba(255,181,71,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  measure();
  addEventListener('resize', measure);

  let lit = false;
  const lightOn = () => {
    if (lit) return;
    lit = true;
    hero.classList.add('is-lit');
    grrr.classList.remove('is-on');
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = '🔦 האור דולק';
  };
  btn.addEventListener('click', lightOn);

  if (reduced) { lightOn(); return; }
  hero.classList.add('has-beam');
  paint(W * 0.3, artTop + artH * 0.5);

  // ---- beam movement ----
  const pos = { x: W * 0.3, y: artTop + artH * 0.5 };
  const target = { ...pos };
  let mode = 'auto';             // 'auto' | 'pointer'
  let lastInput = 0;
  let grrrOn = false;
  let foundAt = 0;
  let tick = 0;
  let t0 = performance.now();

  // a gentle tour: across the room, over the bed, to the eyes, around and back
  const tour = () => [
    [W * 0.25, artTop + artH * 0.45], [W * 0.65, artTop + artH * 0.4], [eye.x - R * 0.2, eye.y - R * 0.1],
    [eye.x + R * 0.1, eye.y], [W * 0.3, artTop + artH * 0.62], [W * 0.75, artTop + artH * 0.55], [eye.x, eye.y],
  ];
  const ease = (k) => k * k * (3 - 2 * k);
  function autoPoint(t) {
    const pts = tour();
    const seg = 1100;
    const i = Math.floor(t / seg) % pts.length;
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const k = ease((t % seg) / seg);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  const set = (x, y) => { target.x = x; target.y = y; };
  const local = (e) => { const r = hero.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  hero.addEventListener('pointermove', (e) => {
    if (lit) return;
    if (e.pointerType === 'mouse' || e.buttons || e.pointerType === 'pen') {
      mode = 'pointer'; lastInput = performance.now(); set(...local(e));
    }
  });
  hero.addEventListener('pointerdown', (e) => {
    if (lit || e.target.closest('a, button')) return;
    mode = 'pointer'; lastInput = performance.now(); set(...local(e));
  });
  hero.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mode = 'auto'; });

  let visible = true, raf = -1; // -1: not started yet
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !lit && raf === 0) raf = requestAnimationFrame(frame);
  }).observe(hero);

  function frame(now) {
    raf = 0;
    if (lit || !visible) return;
    const t = Math.max(0, now - t0);

    if (mode === 'pointer' && !fine && now - lastInput > 2500) mode = 'auto';
    if (mode === 'auto') set(...autoPoint(t));

    const k = mode === 'pointer' ? 0.2 : 0.08;
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    // phones: draw at ~30fps; the beam is soft, so it still looks smooth and costs half
    if (fine || (tick++ & 1) === 0) paint(pos.x, pos.y);

    // the magic moment: the beam finds the eyes
    const d = Math.hypot(pos.x - eye.x, pos.y - eye.y);
    if (!grrrOn && d < R * 0.5) {
      grrrOn = true;
      grrr.classList.add('is-on');
      if (!foundAt) foundAt = now;
    } else if (grrrOn && d > R * 0.95) {
      grrrOn = false;
      grrr.classList.remove('is-on');
    }

    // touch: the light comes on by itself after a few seconds (later if they're still playing)
    // mouse: it comes on a little after they've found the eyes
    if (!fine && t > opts.autoLightMs && now - lastInput > 2500) return lightOn();
    if (fine && foundAt && now - foundAt > 2600) return lightOn();

    raf = requestAnimationFrame(frame);
  }
  // the beam starts moving once the page has finished loading
  const begin = () => { t0 = performance.now(); raf = requestAnimationFrame(frame); };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(begin, { timeout: 800 }) : setTimeout(begin, 200));
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}
