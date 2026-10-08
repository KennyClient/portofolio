// Music widget: custom player UI driven by the Spotify iFrame API (loaded only after the first press of play).
(() => {
  const root = document.getElementById('music');
  if (!root) return;
  const $ = id => document.getElementById(id);

  const TRACKS = [
    { id: '5tDbyeaCvxjNCBcupQucGo', title: '#BrooklynBloodPop!', artist: 'SyKo', explicit: true },
    { id: '3IznIgmXtrUaoPWpQTy5jB', title: 'Not Allowed', artist: 'TV Girl', explicit: true },
    { id: '1UGD3lW3tDmgZfAVDh6w7r', title: 'Devil In A New Dress', artist: 'Kanye West, Rick Ross', explicit: true },
    { id: '7vgTNTaEz3CsBZ1N4YQalM', title: 'Ghost Town', artist: 'Kanye West, PARTYNEXTDOOR', explicit: true },
    { id: '1flloiRJOCenDSSjnuHGln', title: 'Big Bag', artist: 'Tyler, The Creator', explicit: false },
    { id: '3jHdKaLCkuNEkWcLVmQPCX', title: 'BEST INTEREST', artist: 'Tyler, The Creator', explicit: true },
    { id: '45J4avUb9Ni0bnETYaYFVJ', title: 'luther (with sza)', artist: 'Kendrick Lamar, SZA', explicit: false },
    { id: '0NfYAsKygCYwPA2BgTZ1qg', title: 'Now Or Never - Bonus Track', artist: 'Kendrick Lamar, Mary J. Blige', explicit: false },
  ].map((t, i) => ({ ...t, cover: `assets/music/${i + 1}.jpg`, url: `https://open.spotify.com/track/${t.id}`, uri: `spotify:track:${t.id}` }));

  const el = { cover: $('mCover'), title: $('mTitle'), artist: $('mArtist'), exp: $('mExplicit'), link: $('mLink'),
    prog: $('mProg'), play: $('mPlay'), prev: $('mPrev'), next: $('mNext'), list: $('mList'), shuffle: $('mShuffle'),
    queue: $('mQueue'), engine: $('mEngine') };

  let idx = 0, shuffle = false, playing = false, ctrl = null, apiState = 'idle', wantPlay = false, loadedUri = null;

  function render() {
    const t = TRACKS[idx];
    el.cover.src = t.cover; el.cover.alt = `${t.title} cover`;
    el.title.textContent = t.title; el.artist.textContent = t.artist;
    el.exp.hidden = !t.explicit; el.link.href = t.url;
    el.prog.style.width = '0%';
    [...el.queue.children].forEach((li, i) => li.classList.toggle('on', i === idx));
  }
  function setPlaying(v) {
    playing = v; root.classList.toggle('playing', v);
    el.play.setAttribute('aria-label', v ? 'Pause' : 'Play');
  }

  // queue sheet
  TRACKS.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<img src="${t.cover}" alt="" loading="lazy"><div><b></b><small></small></div><span class="n">${i + 1}</span>`;
    li.querySelector('b').textContent = t.title; li.querySelector('small').textContent = t.artist;
    li.addEventListener('click', () => { go(i, true); toggleList(false); });
    el.queue.appendChild(li);
  });
  function toggleList(force) {
    const open = force ?? el.queue.hidden;
    el.queue.hidden = !open; el.list.setAttribute('aria-expanded', String(open));
  }
  el.list.addEventListener('click', () => toggleList());
  document.addEventListener('click', e => { if (!el.queue.hidden && !e.target.closest('#mQueue,#mList')) toggleList(false); });

  // Spotify engine
  function loadApi() {
    if (apiState !== 'idle') return;
    apiState = 'loading';
    window.onSpotifyIframeApiReady = api => {
      api.createController(el.engine, { uri: TRACKS[idx].uri, width: 80, height: 80 }, c => {
        ctrl = c; apiState = 'ready'; loadedUri = TRACKS[idx].uri;
        c.addListener('playback_update', e => {
          const d = e.data; if (!d) return;
          setPlaying(!d.isPaused && !d.isBuffering);
          if (d.duration) el.prog.style.width = Math.min(100, (d.position / d.duration) * 100) + '%';
          if (d.duration && d.position >= d.duration - 400) step(1, true);   // roll to the next song
        });
        if (wantPlay) playCurrent();
      });
    };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1'; s.async = true;
    s.onerror = () => { apiState = 'failed'; };
    document.head.appendChild(s);
  }

  // Load only when the track actually changed (reloading the same URI is what made play feel slow).
  function playCurrent() {
    const uri = TRACKS[idx].uri;
    if (loadedUri !== uri) { loadedUri = uri; ctrl.loadUri(uri); }
    ctrl.play();
  }

  function go(i, autoplay) {
    idx = (i + TRACKS.length) % TRACKS.length; render();
    if (autoplay) { wantPlay = true; loadApi(); if (ctrl) playCurrent(); }
    else if (ctrl) { loadedUri = TRACKS[idx].uri; ctrl.loadUri(loadedUri); }
  }
  function step(dir, autoplay) {
    if (shuffle && TRACKS.length > 1) { let n; do { n = Math.floor(Math.random() * TRACKS.length); } while (n === idx); go(n, autoplay); }
    else go(idx + dir, autoplay);
  }

  el.play.addEventListener('click', () => {
    if (apiState === 'failed') { window.open(TRACKS[idx].url, '_blank', 'noopener'); return; }
    wantPlay = true; loadApi();
    if (ctrl) { if (playing) ctrl.pause(); else playCurrent(); }
  });
  el.next.addEventListener('click', () => step(1, playing || wantPlay));
  el.prev.addEventListener('click', () => step(-1, playing || wantPlay));
  el.shuffle.addEventListener('click', () => { shuffle = !shuffle; el.shuffle.setAttribute('aria-pressed', String(shuffle)); });

  render();
  // Warm up the Spotify engine in the background so the first press of play is instant.
  const warm = () => loadApi();
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 2500 }); else setTimeout(warm, 1500);
})();
