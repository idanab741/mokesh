// An open book with real page turns.
// Hebrew books read right-to-left: "next" turns the LEFT page over onto the right.
export function initFlip(reduced) {
  const root = document.querySelector('.flip');
  if (!root) return;
  const book = root.querySelector('.flip__book');
  const left = root.querySelector('.flip__half--left');
  const right = root.querySelector('.flip__half--right');
  const leaf = root.querySelector('.flip__leaf');
  const front = root.querySelector('.flip__face--front');
  const back = root.querySelector('.flip__face--back');
  const caption = root.querySelector('.flip__caption');
  const count = root.querySelector('.flip__count span');
  const prevBtn = root.querySelector('[data-dir="prev"]');
  const nextBtn = root.querySelector('[data-dir="next"]');
  const dotsBox = root.querySelector('.flip__dots');

  const spreads = [...root.querySelectorAll('.flip__list li')].map((li) => ({
    img: li.dataset.img, alt: li.dataset.alt, html: li.innerHTML,
  }));
  const size = () => (book.clientWidth * (devicePixelRatio || 1) > 1300 ? 2400 : 1200);
  const url = (i) => `url("${import.meta.env.BASE_URL}assets/illustrations/${spreads[i].img}-${size()}.webp")`;

  // preload neighbours so a turn never shows an empty page
  const cache = new Set();
  const preload = (i) => {
    if (i < 0 || i >= spreads.length) return;
    const src = `${import.meta.env.BASE_URL}assets/illustrations/${spreads[i].img}-${size()}.webp`;
    if (cache.has(src)) return;
    cache.add(src);
    const im = new Image(); im.decoding = 'async'; im.src = src;
  };

  const dots = spreads.map(() => { const d = document.createElement('i'); dotsBox.append(d); return d; });
  let index = 0;
  let busy = false;

  book.setAttribute('role', 'img');
  const show = (i) => {
    left.style.backgroundImage = right.style.backgroundImage = url(i);
    book.setAttribute('aria-label', spreads[i].alt);
    caption.innerHTML = spreads[i].html;
    caption.querySelectorAll('.sound--inline').forEach((s) => s.classList.add('is-in'));
    count.textContent = i + 1;
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === spreads.length - 1;
    preload(i + 1); preload(i - 1);
  };

  const swapCaption = (i) => {
    caption.classList.add('is-swap');
    setTimeout(() => { show(i); caption.classList.remove('is-swap'); }, reduced ? 0 : 380);
  };

  function turn(dir) {
    const to = index + dir;
    if (busy || to < 0 || to >= spreads.length) return;
    if (reduced) { index = to; show(index); return; }
    busy = true;
    const cur = url(index), nxt = url(to);
    leaf.classList.toggle('is-back', dir < 0);
    if (dir > 0) {
      // the left page lifts and lands on the right: underneath, the next spread's left page
      front.style.backgroundImage = cur; front.style.backgroundPosition = 'left center';
      back.style.backgroundImage = nxt; back.style.backgroundPosition = 'right center';
      left.style.backgroundImage = nxt;
    } else {
      // going back: the right page lifts and lands on the left
      front.style.backgroundImage = cur; front.style.backgroundPosition = 'right center';
      back.style.backgroundImage = nxt; back.style.backgroundPosition = 'left center';
      right.style.backgroundImage = nxt;
    }
    leaf.hidden = false;
    const end = dir > 0 ? 180 : -180;
    const anim = leaf.animate(
      [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${end * 0.5}deg) translateZ(1px)`, offset: 0.5 }, { transform: `rotateY(${end}deg)` }],
      { duration: 950, easing: 'cubic-bezier(.45,.05,.3,1)' },
    );
    const shade = [front, back].map((f) => f.animate(
      [{ '--shade': 0 }, { '--shade': 1 }, { '--shade': 0 }], { duration: 950 },
    ));
    swapCaption(to);
    anim.onfinish = () => {
      if (dir > 0) right.style.backgroundImage = nxt; else left.style.backgroundImage = nxt;
      leaf.hidden = true;
      shade.forEach((a) => a.cancel());
      index = to;
      busy = false;
    };
  }

  // RTL: the "next" arrow points left
  nextBtn.addEventListener('click', () => turn(1));
  prevBtn.addEventListener('click', () => turn(-1));
  book.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); turn(1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); turn(-1); }
  });
  // swipe: drag the left page toward the right = next
  let sx = null, sy = 0;
  book.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
  book.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      // a tap on the left half turns forward, on the right half back
      const r = book.getBoundingClientRect();
      turn(e.clientX < r.left + r.width / 2 ? 1 : -1);
    }
  });
  book.style.touchAction = 'pan-y';

  // load the first spread only when the book approaches the screen
  new IntersectionObserver((entries, io) => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    show(0);
  }, { rootMargin: '400px 0px' }).observe(root);
  count.textContent = 1;
}

if (typeof CSS !== 'undefined' && CSS.registerProperty) {
  try { CSS.registerProperty({ name: '--shade', syntax: '<number>', inherits: false, initialValue: '0' }); } catch {}
}
