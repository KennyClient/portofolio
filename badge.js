// Draggable lanyard badge: verlet rope + rigid card, with a 3D flip driven by sideways motion.
// Works inside any `.badge-layer`. If the layer's page has a `.badge-slot`, the card hangs into that slot at rest.
(() => {
  const layer = document.getElementById('badgeLayer');
  if (!layer) return;
  const card = layer.querySelector('.card-wrap');
  const card3d = layer.querySelector('.card-3d');
  const strapPath = layer.querySelector('#strapPath');
  const strapEdge = layer.querySelector('#strapEdge');
  const slotEl = document.querySelector('.badge-slot');
  const page = layer.closest('.page');          // null on the standalone page
  const hint = document.getElementById('hint');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 7;                       // rope segments
  const GRAVITY = 2200;              // px/s^2
  const STEP = 1 / 120;
  let AY = -30;                      // anchor sits above the top edge (higher if the rope would be too short)
  let W, H, ax, cardW, cardH, hookOff, segLen, d;
  let P = [];                        // 0 anchor, 1..N rope (N = hook), N+1 card centre
  let spin = 0, spinVel = 0;
  let drag = null;
  let acc = 0, last = performance.now();

  const particle = (x, y, w) => ({ x, y, px: x, py: y, w });
  const active = () => !page || page.classList.contains('on');

  function layout() {
    const lr = layer.getBoundingClientRect();
    W = lr.width; H = lr.height;
    let hookY;
    if (slotEl) {
      const sr = slotEl.getBoundingClientRect();
      cardW = sr.width; ax = sr.left - lr.left + sr.width / 2;
      hookY = sr.top - lr.top + cardW * 0.07;
    } else {
      cardW = Math.min(300, W * 0.78, H * 0.42); ax = W / 2;
      hookY = Math.max(120, H * 0.78 - cardW * 1.45) + cardW * 0.07;
    }
    cardH = cardW * 1.45;
    hookOff = cardW * 0.07;
    d = cardH / 2 - hookOff;
    AY = Math.min(-30, hookY - Math.max(260, cardW * 0.9));
    segLen = (hookY - AY) / N;
    card.style.setProperty('--w', cardW + 'px');
    card.style.setProperty('--h', cardH + 'px');

    const side = reduce ? 0 : Math.min(160, W * 0.2);   // start off to the side so it swings in
    P = [particle(ax, AY, 0)];
    for (let i = 1; i <= N; i++) P.push(particle(ax + side * (i / N), AY + segLen * i * 0.9, 1));
    const hk = P[N];
    P.push(particle(hk.x + side * 0.15, hk.y + d, 0.8));
    spin = 0; spinVel = reduce ? 0 : 260;
  }

  function constrain(a, b, len) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    const wsum = a.w + b.w;
    if (!wsum) return;
    const diff = (dist - len) / dist / wsum;
    a.x += dx * diff * a.w; a.y += dy * diff * a.w;
    b.x -= dx * diff * b.w; b.y -= dy * diff * b.w;
  }

  function step(dt) {
    const c = P[N + 1];
    for (let i = 1; i < P.length; i++) {
      const p = P[i];
      const vx = (p.x - p.px) * 0.993, vy = (p.y - p.py) * 0.993;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + GRAVITY * dt * dt;
    }
    if (drag) {                      // pin the grabbed point to the pointer, limiting how far it can jump per step
      const gx = drag.tx - drag.dx - c.x, gy = drag.ty - drag.dy - c.y, gd = Math.hypot(gx, gy), cap = 40;
      const k = gd > cap ? cap / gd : 1;
      c.x += gx * k; c.y += gy * k;
    }
    for (let k = 0; k < 30; k++) {
      for (let i = 0; i < N; i++) constrain(P[i], P[i + 1], segLen);
      constrain(P[N], P[N + 1], d);
      P[0].x = ax; P[0].y = AY;
    }
    // the card may swing high but can't flip over its own hook
    const hk = P[N], minDy = d * 0.05;
    if (c.y - hk.y < minDy) {
      const dx = Math.sqrt(Math.max(0, d * d - minDy * minDy)) * (c.x >= hk.x ? 1 : -1);
      c.x = hk.x + dx; c.y = hk.y + minDy;
    }
    c.x = Math.max(cardW * 0.35, Math.min(W - cardW * 0.35, c.x));
    c.y = Math.min(H - cardH * 0.35, c.y);

    // 3D spin: sideways motion twists the card; a spring brings the front face back
    const vx = (c.x - c.px) / dt;
    const twist = drag ? drag.dx / cardW : 0;
    spinVel += (vx * (0.55 + twist * 0.8)) * dt;
    spinVel += -(spin - Math.round(spin / 360) * 360) * 55 * dt;
    spinVel *= Math.exp(-1.35 * dt);
    spin += spinVel * dt;
  }

  function draw() {
    const h = P[N], c = P[N + 1];
    const ang = Math.atan2(-(c.x - h.x), c.y - h.y);
    card.style.transform = `translate3d(${h.x - cardW / 2}px, ${h.y - hookOff}px, 0) rotate(${ang}rad)`;
    card.style.transformOrigin = `${cardW / 2}px ${hookOff}px`;
    card3d.style.transform = `rotateY(${spin}deg)`;
    const a = ((spin % 360) + 360) % 360;
    card.style.setProperty('--sh', (50 + Math.sin((a * Math.PI) / 180) * 70 - ang * 40) + '%');

    let dPath = `M ${P[0].x} ${P[0].y}`;
    for (let i = 1; i < N; i++) {
      dPath += ` Q ${P[i].x} ${P[i].y} ${(P[i].x + P[i + 1].x) / 2} ${(P[i].y + P[i + 1].y) / 2}`;
    }
    dPath += ` L ${P[N].x} ${P[N].y}`;
    strapPath.setAttribute('d', dPath);
    strapEdge.setAttribute('d', dPath);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!active()) return;           // paused while another page is showing
    acc += dt;
    while (acc >= STEP) { step(STEP); acc -= STEP; }
    draw();
  }

  /* ---- pointer interaction (coordinates in layer space) ---- */
  const local = e => { const r = layer.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  card.addEventListener('pointerdown', e => {
    const c = P[N + 1], [x, y] = local(e);
    drag = { tx: x, ty: y, dx: x - c.x, dy: y - c.y, id: e.pointerId };
    card.setPointerCapture(e.pointerId);
    card.classList.add('drag');
    hint?.classList.add('gone');
  });
  card.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) [drag.tx, drag.ty] = local(e); });
  const release = e => { if (drag && e.pointerId === drag.id) { drag = null; card.classList.remove('drag'); } };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);

  // Re-hang the badge every time its page opens, and when the window changes size.
  if (page) new MutationObserver(() => { if (active()) { acc = 0; layout(); } }).observe(page, { attributes: true, attributeFilter: ['class'] });
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(layout, 150); });
  layout();
  requestAnimationFrame(frame);
})();

