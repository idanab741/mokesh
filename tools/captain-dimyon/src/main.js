import { config } from './config.js';
import { initSky } from './sky.js';
import { initHero } from './hero.js';
import { initFlip } from './flip.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

initSky(reduced);
initHero(config.hero, reduced);
applyConfig();
initReveal();
initFlip(reduced);
initBook();
initDust();
initFriends();
initWorld();
initNext();
initClub();
pauseOffscreen();

/* ---------- content from config ---------- */
function applyConfig() {
  const { names, social, story } = config;
  if (names.monster) $('[data-name="monster"]').textContent = `המפלצת – ${names.monster}`;
  if (names.bunny) $('[data-name="bunny"]').textContent = `השפן – ${names.bunny}`;

  const labels = { instagram: 'קפטן דמיון באינסטגרם', tiktok: 'קפטן דמיון בטיקטוק', facebook: 'קפטן דמיון בפייסבוק' };
  const tpl = $('#social-icons').content;
  $$('.social').forEach((ul) => {
    for (const [net, url] of Object.entries(social)) {
      if (!url) continue;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', labels[net]);
      a.append(tpl.querySelector(`[data-net="${net}"]`).cloneNode(true));
      li.append(a);
      ul.append(li);
    }
  });

  if (story.length) {
    const body = $('.story__body');
    story.forEach((t) => { const p = document.createElement('p'); p.textContent = t; body.append(p); });
    $('#story').hidden = false;
  }

  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

/* ---------- soft entrances ---------- */
function initReveal() {
  const els = $$('.reveal, .sound--inline');
  if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  els.forEach((e) => io.observe(e));
}

/* ---------- the 3D book opens on tap too (hover does it on desktop) ---------- */
function initBook() {
  const b = $('.book3d');
  if (!b) return;
  const toggle = () => b.classList.toggle('is-open');
  b.addEventListener('click', toggle);
  b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
}

/* ---------- gold dust drifts once the page has loaded ---------- */
function initDust() {
  if (reduced) return;
  const go = () => setTimeout(() => { $('.dust').classList.add('is-live'); document.documentElement.classList.add('is-loaded'); }, 1500);
  if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
}

/* ---------- friends ---------- */
function initFriends() {
  $$('.friend__btn').forEach((btn) => {
    const card = btn.closest('.friend');
    let t;
    btn.addEventListener('click', () => {
      card.classList.remove('is-acting');
      void card.offsetWidth; // restart the animation
      card.classList.add('is-acting');
      clearTimeout(t);
      t = setTimeout(() => card.classList.remove('is-acting'), 1900);
    });
  });
}

/* ---------- world: parallax + fireflies ---------- */
function initWorld() {
  const sec = $('#world');
  const bg = $('.world__bg', sec);
  const flies = $('.world__flies', sec);
  const n = innerWidth < 600 ? 10 : 18;
  const r = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < n; i++) {
    const f = document.createElement('span');
    f.className = 'fly';
    f.style.cssText = `left:${r(4, 96)}%;top:${r(20, 92)}%;--d:${r(7, 13)}s;--delay:${-r(0, 10)}s;` +
      `--dx1:${r(-40, 40)}px;--dy1:${r(-50, 10)}px;--dx2:${r(-60, 60)}px;--dy2:${r(-80, -20)}px;--dx3:${r(-40, 40)}px;--dy3:${r(-120, -40)}px;` +
      `width:${r(4, 8)}px;height:${r(4, 8)}px`;
    flies.append(f);
  }

  let visible = false;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    sec.classList.toggle('is-visible', visible);
    if (visible) tick();
  }, { rootMargin: '10% 0px' }).observe(sec);

  if (reduced) return;
  let queued = false;
  function tick() {
    if (queued || !visible) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const rect = sec.getBoundingClientRect();
      const off = (innerHeight / 2 - (rect.top + rect.height / 2)) * 0.14;
      bg.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
  }
  addEventListener('scroll', tick, { passive: true });
}

/* ---------- next adventures ---------- */
function initNext() {
  const ul = $('.next__grid');
  config.teasers.filter(Boolean).forEach((name) => {
    const li = document.createElement('li');
    li.className = 'reveal is-in';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'locked';
    b.setAttribute('aria-label', `${name}: בקרוב`);
    b.innerHTML = '<span class="locked__soon" aria-hidden="true">בְּקָרוֹב...</span><span class="locked__q" aria-hidden="true">?</span><span class="locked__name" aria-hidden="true"></span>';
    b.querySelector('.locked__name').textContent = name;
    let t;
    b.addEventListener('click', () => {
      b.classList.add('is-lit');
      clearTimeout(t);
      t = setTimeout(() => b.classList.remove('is-lit'), 2400);
    });
    li.append(b);
    ul.append(li);
  });
}

/* ---------- club form ---------- */
function initClub() {
  const form = $('.club__form');
  const input = $('#club-email');
  const msg = $('.club__msg');
  const done = $('.club__done');
  const button = $('button[type="submit"]', form);

  input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); msg.textContent = ''; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.checkValidity()) {
      input.setAttribute('aria-invalid', 'true');
      msg.textContent = input.value ? 'נראה שחסר משהו בכתובת המייל.' : 'כתבו כאן את כתובת המייל שלכם.';
      input.focus();
      return;
    }
    button.disabled = true;
    try {
      await send(new FormData(form));
      form.hidden = true;
      done.hidden = false;
      done.focus();
    } catch {
      msg.textContent = 'אופס, משהו לא עבד. נסו שוב בעוד רגע.';
      button.disabled = false;
    }
  });

  async function send(data) {
    const url = config.formEndpoint;
    if (!url) return new Promise((r) => setTimeout(r, 500)); // no backend yet
    const netlify = url === '/';
    const res = await fetch(url, netlify
      ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() }
      : { method: 'POST', body: data, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
  }
}

/* ---------- pause looping animations off screen ---------- */
function pauseOffscreen() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-offscreen', !en.isIntersecting));
  }, { rootMargin: '100px 0px' });
  $$('main > section, .footer').forEach((s) => { s.classList.add('is-offscreen'); io.observe(s); });
}
