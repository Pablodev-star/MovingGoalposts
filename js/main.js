/* Moving Goalposts — compositor, HUD, post-processing, audio clock and player controls. */
(function () {
  'use strict';
  const { W, H, clamp, lerp, ramp, ease, E, hash, BEAT, barOf, beatOf, A, section, PAL, rgba, roundRect, DUR } = MG;
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('capture');

  const stage = document.getElementById('stage');
  const main = stage.getContext('2d');
  const world = document.createElement('canvas'), wctx = world.getContext('2d');
  const small = document.createElement('canvas'), sctx = small.getContext('2d');
  const tmpA = document.createElement('canvas'), actx = tmpA.getContext('2d');
  const tmpB = document.createElement('canvas'), bctx = tmpB.getContext('2d');
  const FILTER_OK = typeof main.filter === 'string';
  let k = 1; // device px per design px
  let quality = 1; // adaptive render scale (drops on slow devices)

  function resize() {
    let cw, ch;
    if (CAPTURE) { cw = +(params.get('w') || 1920); ch = Math.round(cw * 9 / 16); }
    else {
      const vw = window.innerWidth, vh = window.innerHeight;
      if (vw / vh > 16 / 9) { ch = vh; cw = vh * 16 / 9; } else { cw = vw; ch = vw * 9 / 16; }
      stage.style.width = cw + 'px'; stage.style.height = ch + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = Math.min(2560, Math.round(cw * dpr * quality)); ch = Math.round(cw * 9 / 16);
    }
    for (const c of [stage, world, tmpA, tmpB]) { c.width = cw; c.height = ch; }
    small.width = Math.max(64, Math.round(cw / 6)); small.height = Math.max(36, Math.round(ch / 6));
    k = cw / W;
  }
  resize();
  if (!CAPTURE) window.addEventListener('resize', () => { resize(); if (!playing) frame(); });

  // film grain tiles
  const GRAIN = [];
  for (let g = 0; g < 4; g++) {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const id = x.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); GRAIN.push(main.createPattern(c, 'repeat'));
  }

  // ------------------------------------------------------------------ HUD
  const CHAPTERS = {
    intro: '00 · RULES', verse1: '01 · THE GRIND', pre1: '02 · ONE MORE TWEAK', chorus1: "03 · THE MACHINE'S LITTLE DANCE", verse2: '04 · NEW FORMAT',
    pre2: '05 · ONE MORE TEST', chorus2: '06 · A WALL THAT MOVES', bridge: '07 · UNDERNEATH', finalA: '08 · A FAIR LITTLE FRAME', finalB: '08 · A FAIR LITTLE FRAME', outro: '09 · SAME PAGE',
  };
  // the "reach" metric tells its own small story
  function reach(t) {
    const d = MG.wt(8, 'drops');
    let v = 2400 + 300 * Math.sin(t * 0.7);
    if (t > d) v = lerp(v, 310, E(t, d, d + 0.4, ease.outExpo));
    if (t > MG.secT('chorus1')) v = 120 + 40 * Math.sin(t * 2.1) + 30 * Math.sin(t * 5.3);
    if (t > MG.secT('verse2')) v = 64 + 20 * Math.sin(t * 1.7);
    if (t > MG.wt(24, 'limit')) v = 12 + 4 * Math.sin(t * 3);
    if (t > MG.secT('chorus2')) v = 9 + 3 * Math.sin(t * 4);
    return Math.max(1, Math.round(v));
  }
  function made(t) {
    let n = 0; const tm = MG.wt(40, 'making');
    if (t < tm) return 0;
    n = Math.min(31, Math.floor((t - tm) / (BEAT / 2)) + 1);
    if (t > MG.secT('finalA')) n = 31 + Math.floor((t - MG.secT('finalA')) / BEAT);
    return n;
  }
  function hud(c, t, s) {
    const a = 0.62;
    c.save();
    c.font = '700 19px "JetBrains Mono", monospace'; c.fillStyle = PAL.chalk; c.globalAlpha = a; c.textBaseline = 'alphabetic';
    c.fillText('MOVING GOALPOSTS', 64, 70);
    c.font = '400 17px "JetBrains Mono", monospace'; c.globalAlpha = a * 0.75;
    c.fillText(CHAPTERS[s.name] || '', 64, 96);
    // registration corners
    c.strokeStyle = PAL.chalk; c.globalAlpha = 0.35; c.lineWidth = 2; c.beginPath();
    const m = 32, L = 26;
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [W - m, H - m, -1, -1], [m, H - m, 1, -1]]) { c.moveTo(x, y + sy * L); c.lineTo(x, y); c.lineTo(x + sx * L, y); }
    c.stroke();
    // top right metric
    c.textAlign = 'right'; c.globalAlpha = a;
    const late = t > MG.wt(40, 'making');
    c.font = '400 17px "JetBrains Mono", monospace'; c.globalAlpha = a * 0.75;
    c.fillText(late ? 'MADE' : 'REACH', W - 64, 70);
    c.font = '700 30px "JetBrains Mono", monospace'; c.globalAlpha = a;
    c.fillStyle = late ? PAL.amber : (t > MG.wt(8, 'drops') ? PAL.red : PAL.chalk);
    c.fillText(late ? String(made(t)) : reach(t).toLocaleString('en-US'), W - 64, 104);
    if (!late) {
      c.strokeStyle = c.fillStyle; c.lineWidth = 1.5; c.globalAlpha = a * 0.8; c.beginPath();
      for (let i = 0; i <= 40; i++) { const tt = t - (40 - i) * 0.12; const v = reach(Math.max(0, tt)); const y = 140 - Math.min(30, Math.log10(v + 1) * 9); i ? c.lineTo(W - 224 + i * 4, y) : c.moveTo(W - 224, y); }
      c.stroke();
    }
    // bottom: timecode + bar counter
    c.textAlign = 'left'; c.font = '400 18px "JetBrains Mono", monospace'; c.fillStyle = PAL.chalk; c.globalAlpha = a;
    const tc = Math.max(0, t), hh = Math.floor(tc / 3600), mm = Math.floor(tc / 60) % 60, ss = Math.floor(tc) % 60, ff = Math.floor((tc % 1) * 30);
    const p2 = (n) => String(n).padStart(2, '0');
    c.fillStyle = PAL.red; c.globalAlpha = Math.floor(t * 1.5) % 2 ? 0.9 : 0.3; c.beginPath(); c.arc(70, H - 70, 7, 0, 7); c.fill();
    c.fillStyle = PAL.chalk; c.globalAlpha = a; c.fillText(`${p2(hh)}:${p2(mm)}:${p2(ss)}:${p2(ff)}`, 88, H - 64);
    c.textAlign = 'right';
    const b = Math.max(0, beatOf(t));
    c.fillText(`BAR ${String(Math.floor(b / 4) + 1).padStart(2, '0')}.${Math.floor(b % 4) + 1}  ·  91.28 BPM`, W - 64, H - 64);
    // beat ticks
    for (let i = 0; i < 4; i++) { c.globalAlpha = (Math.floor(b % 4) === i ? 0.9 : 0.2); c.fillRect(W - 64 - 4 * 16 + i * 16, H - 52, 10, 3); }
    c.restore();
  }

  // ------------------------------------------------------------------ frame
  let showLyrics = true;
  function frame(tIn) {
    const t = tIn == null ? clock() : tIn;
    // world pass
    wctx.setTransform(k, 0, 0, k, 0, 0);
    wctx.globalAlpha = 1; wctx.globalCompositeOperation = 'source-over';
    wctx.fillStyle = PAL.ink; wctx.fillRect(0, 0, W, H);
    const fx = MS.render(wctx, t);
    if (fx.overlay2) { wctx.save(); fx.overlay2(wctx); wctx.restore(); }
    // bloom
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1;
    sctx.filter = FILTER_OK ? 'blur(3px) brightness(0.85) contrast(1.7)' : 'none';
    sctx.drawImage(world, 0, 0, small.width, small.height);
    sctx.filter = 'none';
    if (fx.bloom) {
      wctx.save(); wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.globalCompositeOperation = 'lighter'; wctx.globalAlpha = clamp(fx.bloom * 0.75, 0, 1);
      wctx.imageSmoothingQuality = 'high'; wctx.drawImage(small, 0, 0, world.width, world.height); wctx.restore();
    }

    // layout
    main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
    main.fillStyle = '#000'; main.fillRect(0, 0, stage.width, stage.height);
    const L = fx.layout || { type: 'full' };
    const zoom = fx.zoom || 1;
    if (L.type === 'panes') {
      const n = L.n, cols = n === 2 ? 2 : Math.round(Math.sqrt(n)), rows = Math.ceil(n / cols);
      const g = 6 * k, cw = (stage.width - g * (cols + 1)) / cols, ch = (stage.height - g * (rows + 1)) / rows;
      const pop = 1 - ease.outCubic(clamp(L.since / 0.2));
      const tints = [null, PAL.orange, PAL.cyan, PAL.violet, PAL.magenta, PAL.amber, PAL.teal, PAL.red, PAL.cream];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const i = r * cols + c; const x = g + c * (cw + g), y = g + r * (ch + g);
        main.save(); main.beginPath(); main.rect(x, y, cw, ch); main.clip();
        // each pane crops a slightly different window of the same scene
        const s = 1 + 0.25 * hash(i * 3 + n) + pop * 0.1, ox = (hash(i * 5 + n) - 0.5) * 0.2 * stage.width, oy = (hash(i * 7 + n) - 0.5) * 0.15 * stage.height;
        const dw = cw * s * (stage.width / cw) / cols * (cols === 1 ? 1 : 1), sc = Math.max(cw / stage.width, ch / stage.height) * s;
        main.drawImage(world, x + cw / 2 - stage.width * sc / 2 + ox * sc, y + ch / 2 - stage.height * sc / 2 + oy * sc, stage.width * sc, stage.height * sc);
        const tint = tints[(i + n) % tints.length];
        if (tint && i > 0) { main.globalCompositeOperation = 'overlay'; main.fillStyle = rgba(tint, 0.5); main.fillRect(x, y, cw, ch); main.globalCompositeOperation = 'source-over'; }
        main.restore();
      }
    } else if (L.type === 'phone') {
      // outside: the same picture, blurred and dimmed (vertical video on a horizontal screen)
      main.drawImage(small, -stage.width * 0.1, -stage.height * 0.1, stage.width * 1.2, stage.height * 1.2);
      main.fillStyle = `rgba(0,0,0,${0.55 * L.open})`; main.fillRect(0, 0, stage.width, stage.height);
      main.save(); main.scale(k, k);
      main.beginPath(); roundRect(main, L.x, L.y, L.w, L.h, L.r); main.clip();
      const s = L.h / H;
      const th = L.thumb || 0;
      main.fillStyle = '#000'; main.fillRect(L.x, L.y, L.w, L.h);
      const ts = lerp(1, 0.62, ease.outBack(th)), cxp = W / 2, cyp = L.y + L.h * lerp(0.5, 0.36, th);
      main.translate(cxp, cyp); main.scale(ts, ts); main.translate(-cxp, -cyp);
      const dw = W * s, dh = H * s;
      main.drawImage(world, W / 2 - dw / 2, L.y + L.h / 2 - dh / 2, dw, dh);
      if (th > 0) { main.strokeStyle = `rgba(255,255,255,${th})`; main.lineWidth = 10 / ts; main.strokeRect(W / 2 - L.w / 2, L.y, L.w, L.h); }
      main.restore();
      if (L.flash > 0) {}
    } else {
      const sk = fx.shake || 0;
      main.save(); main.translate(stage.width / 2, stage.height / 2); main.scale(zoom, zoom); main.translate(-stage.width / 2, -stage.height / 2);
      main.drawImage(world, 0, 0); main.restore();
    }

    // chromatic split
    const rgb = fx.rgb || 0;
    if (rgb > 0.6) {
      actx.setTransform(1, 0, 0, 1, 0, 0); bctx.setTransform(1, 0, 0, 1, 0, 0);
      actx.globalCompositeOperation = 'source-over'; actx.drawImage(stage, 0, 0);
      bctx.globalCompositeOperation = 'source-over'; bctx.fillStyle = '#ff0000'; bctx.fillRect(0, 0, tmpB.width, tmpB.height);
      bctx.globalCompositeOperation = 'multiply'; bctx.drawImage(tmpA, 0, 0);
      main.globalCompositeOperation = 'multiply'; main.fillStyle = '#00ffff'; main.fillRect(0, 0, stage.width, stage.height);
      main.globalCompositeOperation = 'lighter'; main.drawImage(tmpB, rgb * k, 0);
      main.globalCompositeOperation = 'source-over';
    }

    main.save(); main.scale(k, k);
    if (fx.overlay) fx.overlay(main);
    if (fx.lyrics && showLyrics) MLY.draw(main, t, fx.lyrics);
    if (fx.hud !== false) hud(main, t, fx.section);
    // flashes
    const fl = (fx.flash || 0) + (fx.whiteout || 0);
    if (fl > 0) { main.fillStyle = `rgba(240,250,248,${clamp(fl)})`; main.fillRect(0, 0, W, H); }
    // vignette
    const vg = main.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    main.fillStyle = vg; main.fillRect(0, 0, W, H);
    main.restore();
    // grain
    main.save(); main.globalCompositeOperation = 'overlay'; main.globalAlpha = 0.11;
    const gi = Math.floor(t * 24) % 4; main.fillStyle = GRAIN[gi];
    main.translate(Math.floor(hash(Math.floor(t * 24)) * 256), Math.floor(hash(Math.floor(t * 24) + 7) * 256));
    main.fillRect(-256, -256, stage.width + 512, stage.height + 512); main.restore();
    return t;
  }

  // ------------------------------------------------------------------ audio clock
  const audio = document.getElementById('song');
  let playing = false, lastAt = -1, lastPerf = 0, scrubT = 0;
  function clock() {
    if (!audio) return scrubT;
    const at = audio.currentTime;
    const now = performance.now();
    if (at !== lastAt) { lastAt = at; lastPerf = now; }
    if (!playing) return at;
    return at + Math.min(0.25, (now - lastPerf) / 1000);
  }

  // ------------------------------------------------------------------ capture API
  const fontsReady = Promise.all([
    '300 20px Archivo', '500 20px Archivo', '800 20px Archivo', '900 20px Archivo', '400 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '500 20px Caveat',
  ].map((f) => document.fonts.load(f))).catch(() => {});
  window.__MG = { renderAt: (t) => frame(t), ready: fontsReady.then(() => true), dur: DUR, canvas: stage };

  if (CAPTURE) { document.documentElement.classList.add('capture'); fontsReady.then(() => frame(0)); return; }

  // ------------------------------------------------------------------ player UI
  const ui = {
    start: document.getElementById('start'), play: document.getElementById('playBtn'), bar: document.getElementById('controls'),
    pp: document.getElementById('pp'), time: document.getElementById('time'), track: document.getElementById('track'), fill: document.getElementById('fill'),
    cc: document.getElementById('cc'), fs: document.getElementById('fs'), ticks: document.getElementById('ticks'),
  };
  MG.SECS.forEach((s) => { if (s.t <= 0 || s.s === 'end') return; const d = document.createElement('i'); d.style.left = (s.t / DUR * 100) + '%'; d.title = s.s; ui.ticks.appendChild(d); });
  const fmt = (x) => { x = Math.max(0, x); return Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0'); };

  let slow = 0, ema = 16;
  function loop() {
    const a = performance.now();
    const t = frame();
    ema = ema * 0.9 + (performance.now() - a) * 0.1;
    if (playing && ema > 24 && quality > 0.5 && ++slow > 45) { quality = Math.max(0.5, quality * 0.8); slow = 0; ema = 16; resize(); }
    ui.fill.style.width = (clamp(t / DUR) * 100) + '%';
    ui.time.textContent = fmt(t) + ' / ' + fmt(DUR);
    if (playing) requestAnimationFrame(loop);
  }
  function play() {
    fontsReady.then(() => {
      audio.play().then(() => { playing = true; document.body.classList.add('playing'); ui.start.classList.add('gone'); requestAnimationFrame(loop); poke(); })
        .catch((e) => { console.error(e); ui.start.querySelector('.hint').textContent = 'Tap again to start audio'; });
    });
  }
  function pause() { audio.pause(); playing = false; document.body.classList.remove('playing'); frame(); poke(); }
  const toggle = () => (playing ? pause() : play());
  ui.play.addEventListener('click', play);
  ui.pp.addEventListener('click', toggle);
  stage.addEventListener('click', () => { if (ui.start.classList.contains('gone')) toggle(); });
  audio.addEventListener('ended', () => { playing = false; document.body.classList.remove('playing'); ui.bar.classList.add('show'); frame(DUR); });
  audio.addEventListener('seeked', () => { if (!playing) loop(); });

  function seekTo(clientX) {
    const r = ui.track.getBoundingClientRect(); const p = clamp((clientX - r.left) / r.width);
    audio.currentTime = p * DUR; lastAt = -1; if (!playing) { requestAnimationFrame(loop); }
  }
  let dragging = false;
  ui.track.addEventListener('pointerdown', (e) => { dragging = true; ui.track.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  ui.track.addEventListener('pointermove', (e) => { if (dragging) seekTo(e.clientX); });
  ui.track.addEventListener('pointerup', () => { dragging = false; });
  ui.cc.addEventListener('click', () => { showLyrics = !showLyrics; ui.cc.classList.toggle('off', !showLyrics); if (!playing) frame(); });
  ui.fs.addEventListener('click', () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); else document.exitFullscreen && document.exitFullscreen();
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); if (!ui.start.classList.contains('gone')) play(); else toggle(); }
    else if (e.key === 'ArrowRight') { audio.currentTime = Math.min(DUR, audio.currentTime + 5); poke(); }
    else if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); poke(); }
    else if (e.key === 'f') ui.fs.click();
    else if (e.key === 'c') ui.cc.click();
  });
  let idle;
  function poke() { ui.bar.classList.add('show'); document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => { if (playing) { ui.bar.classList.remove('show'); document.body.classList.add('idle'); } }, 2600); }
  window.addEventListener('pointermove', poke);
  // poster frame behind the start screen
  fontsReady.then(() => { const sl = showLyrics; showLyrics = !!params.get('t'); frame(+(params.get('t') || 39.2)); showLyrics = sl; });
  if (params.has('t')) { audio.currentTime = +params.get('t'); }
})();
