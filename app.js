(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const seg = $('#seg'), thumb = $('.seg-thumb', seg);
  const items = [...seg.querySelectorAll('.seg-item')];
  const pages = [...document.querySelectorAll('.page')];
  const welcome = $('#welcome'), pagesWrap = $('#pages');
  const valid = new Set(items.map(i => i.dataset.page));
  let current = null;

  /* ---- thumb positioning ---- */
  const geom = el => ({ x: el.offsetLeft, w: el.offsetWidth });
  function place(el, { follow = false, dx = 0 } = {}) {
    const { x, w } = geom(el);
    thumb.classList.toggle('follow', follow);
    thumb.style.setProperty('--x', (x + dx) + 'px');
    thumb.style.setProperty('--w', w + 'px');
  }
  const activeEl = () => items.find(i => i.dataset.page === current) || items[0];

  // Hover: the glass thumb flies to the hovered tab and leans toward the cursor,
  // like the iOS segmented control / tab bar.
  let mouseOver = false;   // true only while a real mouse is over the control (touch leaves :hover stuck)
  seg.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mouseOver = true;
    const el = e.target.closest('.seg-item');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const lean = ((e.clientX - (r.left + r.width / 2)) / r.width) * 14; // px toward cursor
    seg.classList.add('hovering');
    items.forEach(i => i.classList.toggle('hot', i === el));
    place(el, { follow: true, dx: lean });
  });
  seg.addEventListener('pointerleave', () => {
    mouseOver = false;
    seg.classList.remove('hovering');
    items.forEach(i => i.classList.remove('hot'));
    place(activeEl());
  });
  seg.addEventListener('pointerdown', e => {
    thumb.classList.add('press');
    const el = e.target.closest('.seg-item');
    if (el) place(el);          // move the glass the instant a finger/mouse presses, before the page swaps
  });
  addEventListener('pointerup', () => thumb.classList.remove('press'));

  /* ---- typing animation for the About heading ---- */
  const hello = $('.about-text .hello');
  const helloText = hello.textContent.trim();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let typeTimer;
  const aboutText = hello.closest('.about-wrap');
  function typeHello() {
    clearTimeout(typeTimer);
    aboutText.classList.remove('reveal');
    void aboutText.offsetWidth;                 // restart the fade each time About opens
    aboutText.classList.add('reveal');
    hello.setAttribute('aria-label', helloText);
    if (reduceMotion) { hello.textContent = helloText; return; }
    hello.innerHTML = '<span aria-hidden="true"></span><i class="caret" aria-hidden="true"></i>';
    const out = hello.firstChild;
    let n = 0;
    const tick = () => {
      out.textContent = helloText.slice(0, ++n);
      if (n < helloText.length) typeTimer = setTimeout(tick, 85 + Math.random() * 70);
      else { typeTimer = setTimeout(() => hello.querySelector('.caret')?.classList.add('done'), 1600); }
    };
    typeTimer = setTimeout(tick, 450);
  }

  // Touch: handle the tap ourselves. Cancelling touchstart removes the browser's tap-highlight box
  // and its click delay; we move the glass on touch-down and switch pages on touch-up.
  let touched = null;
  seg.addEventListener('touchstart', e => {
    const el = e.target.closest('.seg-item');
    if (!el) return;
    e.preventDefault();
    touched = el; thumb.classList.add('press'); place(el);
  }, { passive: false });
  const endTouch = go => {
    thumb.classList.remove('press');
    if (go && touched && location.hash.slice(1) !== touched.dataset.page) location.hash = touched.dataset.page;
    else place(activeEl());
    touched = null;
  };
  seg.addEventListener('touchend', e => { if (touched) { e.preventDefault(); endTouch(true); } }, { passive: false });
  seg.addEventListener('touchcancel', () => endTouch(false));
  /* ---- routing ---- */
  function show(name, instant) {
    if (!valid.has(name)) name = 'about';
    if (name === 'about' && current !== 'about') typeHello();
    current = name;
    pages.forEach(p => p.classList.toggle('on', p.id === name));
    items.forEach(i => {
      const on = i.dataset.page === name;
      i.classList.toggle('active', on);
      i.setAttribute('aria-current', on ? 'page' : 'false');
    });
    if (instant) { thumb.classList.add('init'); place(activeEl()); void thumb.offsetWidth; thumb.classList.remove('init'); }
    else place(activeEl());
    document.title = (items.find(i => i.dataset.page === name).textContent) + ' · Kenny Clint Hutahaean';
  }
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  addEventListener('resize', () => place(mouseOver ? (items.find(i => i.classList.contains('hot')) || activeEl()) : activeEl()));
  // Re-measure whenever the control changes size (web fonts loading, viewport changes).
  new ResizeObserver(() => { if (!seg.hidden && current) { thumb.classList.add('init'); place(mouseOver ? (items.find(i => i.classList.contains('hot')) || activeEl()) : activeEl()); void thumb.offsetWidth; thumb.classList.remove('init'); } }).observe(seg);

  /* ---- copy-to-clipboard (Discord username) ---- */
  const toast = $('#toast');
  let toastTimer;
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-copy]');
    if (!el) return;
    e.preventDefault();
    const text = el.dataset.copy;
    try { await navigator.clipboard.writeText(text); }
    catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    toast.textContent = `Discord username “${text}” copied`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  });

  /* ---- work lightbox ---- */
  const lb = $('#lightbox'), lbImg = $('img', lb), lbLabel = $('figcaption span', lb), lbLink = $('figcaption a', lb);
  const closeLb = () => { lb.classList.remove('show'); setTimeout(() => { lb.hidden = true; lbImg.removeAttribute('src'); }, 350); };
  document.addEventListener('click', e => {
    const th = e.target.closest('.thumb');
    if (th) {
      e.preventDefault();
      lbImg.src = th.getAttribute('href'); lbImg.alt = th.querySelector('img').alt;
      lbLabel.textContent = th.dataset.label;
      if (th.dataset.open) { lbLink.href = th.dataset.open; lbLink.hidden = false; } else { lbLink.removeAttribute('href'); lbLink.hidden = true; }
      lb.hidden = false; setTimeout(() => lb.classList.add('show'), 20);
    } else if (!lb.hidden && (e.target === lb || e.target.closest('.lb-close'))) closeLb();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

  /* ---- welcome ---- */
  function enter() {
    if (welcome.classList.contains('out')) return;
    welcome.classList.add('out');
    seg.hidden = false; pagesWrap.hidden = false;
    show(location.hash.slice(1) || 'about', true);
    sessionStorage.setItem('entered', '1');
    setTimeout(() => welcome.remove(), 800);
  }
  welcome.addEventListener('click', enter);
  welcome.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') enter(); });
  if (sessionStorage.getItem('entered') || location.hash) { welcome.remove(); seg.hidden = false; pagesWrap.hidden = false; show(location.hash.slice(1) || 'about', true); }
  else {
    welcome.focus();
    // Enter on its own once the script font is ready and the title has played its intro.
    const fontReady = Promise.race([document.fonts.load('1em "Birds of Paradise"'), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
    fontReady.then(() => setTimeout(enter, 2200));
  }
})();
