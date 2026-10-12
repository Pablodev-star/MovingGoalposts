/* Moving Goalposts — player: audio clock, adaptive quality, titles, optional subtitles, capture API. */
(function () {
  'use strict';
  const { clamp, DUR, LINES, envs, ENVN } = MC;
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('capture');

  const glc = document.getElementById('gl');
  const ov = document.getElementById('ov'), octx = ov.getContext('2d');
  let R;
  try { R = new MGRenderer(glc, { preserve: CAPTURE }); }
  catch (e) { document.getElementById('nogl').hidden = false; throw e; }

  // envelope texture: kick, snare, bass, mid
  const env = new Uint8Array(ENVN * 4);
  for (let i = 0; i < ENVN; i++) { env[i * 4] = envs.kick[i] * 255; env[i * 4 + 1] = envs.snare[i] * 255; env[i * 4 + 2] = envs.bass[i] * 255; env[i * 4 + 3] = envs.mid[i] * 255; }
  R.setEnv(env, ENVN);

  // compile every shot's shader up front
  const names = [...new Set(MD.SHOTS.map((s) => s.name))];
  const errors = [];
  for (const n of names) {
    try { R.addScene(n, MGSH[n]); } catch (e) { errors.push(e.message); console.error(e.message); }
  }

  const treeCanvas = MGPaint.tree();
  R.setSceneTexture('tree', treeCanvas);
  R.setSceneTexture('planes', MGPaint.plane());
  R.setSceneTexture('meadow', treeCanvas);

  // ---------------------------------------------------------------- sizing / quality
  let quality = +(params.get('q') || (matchMedia('(pointer: coarse)').matches ? 0.5 : 0.72));
  const W0 = +(params.get('w') || 1280);
  function resize() {
    let cw, ch;
    if (CAPTURE) { cw = W0; ch = Math.round(W0 * 9 / 16); }
    else {
      const vw = innerWidth, vh = innerHeight;
      if (vw / vh > 16 / 9) { ch = vh; cw = vh * 16 / 9; } else { cw = vw; ch = vw * 9 / 16; }
      for (const c of [glc, ov]) { c.style.width = cw + 'px'; c.style.height = ch + 'px'; }
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cw = Math.min(1920, Math.round(cw * dpr)); ch = Math.round(cw * 9 / 16);
    }
    R.resize(cw, ch, CAPTURE ? +(params.get('q') || 1) : quality);
    ov.width = cw; ov.height = ch;
  }
  resize();

  // ---------------------------------------------------------------- overlay: titles + optional subtitles
  let subs = params.has('cc');
  function overlay(t) {
    const w = ov.width, h = ov.height, k = w / 1920;
    octx.clearRect(0, 0, w, h);
    octx.save(); octx.scale(k, k); octx.textAlign = 'center'; octx.textBaseline = 'alphabetic';
    // opening title, over the push-in of the first shot
    const ta = Math.min(clamp((t - 7.6) / 0.9), 1 - clamp((t - 10.2) / 0.45));
    if (ta > 0) {
      octx.globalAlpha = ta; octx.fillStyle = '#efe9df';
      octx.font = 'italic 400 104px "Instrument Serif", serif'; octx.letterSpacing = '2px';
      octx.fillText('Moving Goalposts', 960, 560);
      octx.font = '400 20px "JetBrains Mono", monospace'; octx.letterSpacing = '12px'; octx.globalAlpha = ta * 0.75;
      octx.fillText('NEBULAGLOW', 960, 620);
    }
    // end card
    const te = MD.SHOTS[MD.SHOTS.length - 1].t0;
    const ea = clamp((t - te - 0.3) / 1.2);
    if (ea > 0) {
      octx.globalAlpha = ea; octx.fillStyle = '#efe9df';
      octx.font = 'italic 400 132px "Instrument Serif", serif'; octx.letterSpacing = '2px';
      octx.fillText('Moving Goalposts', 960 + Math.sin((t - te) * 0.9) * 8, 545);
      octx.globalAlpha = ea * 0.7; octx.font = '400 22px "JetBrains Mono", monospace'; octx.letterSpacing = '14px';
      octx.fillText('NEBULAGLOW', 960, 615);
    }
    // optional subtitles (off by default — press C)
    if (subs) {
      let li = -1; for (let i = 0; i < LINES.length; i++) if (t >= LINES[i].t - 0.1) li = i;
      const L = LINES[li];
      if (L && t < L.e + 0.6 && (!LINES[li + 1] || t < LINES[li + 1].t)) {
        octx.globalAlpha = 0.92; octx.letterSpacing = '0px'; octx.font = 'italic 400 46px "Instrument Serif", serif';
        const txt = L.w.map((x) => x.w).join(' ');
        octx.lineWidth = 6; octx.strokeStyle = 'rgba(0,0,0,.55)'; octx.strokeText(txt, 960, 1000); octx.fillStyle = '#f3efe6'; octx.fillText(txt, 960, 1000);
      }
    }
    octx.restore();
  }

  function render(t) {
    const F = MD.frame(clamp(t, 0, DUR + 30));
    R.frame(F);
    overlay(t);
    return F;
  }

  // ---------------------------------------------------------------- capture API (offline export / previews)
  const fontsReady = Promise.all(['italic 400 40px "Instrument Serif"', '400 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))).catch(() => {});
  const comp = document.createElement('canvas');
  window.__MG = {
    ready: fontsReady.then(() => true), errors, dur: DUR,
    renderAt(t) { render(t); R.gl.finish(); },
    snapshot(type = 'image/jpeg', q = 0.92) {
      comp.width = glc.width; comp.height = glc.height; const c = comp.getContext('2d');
      c.drawImage(glc, 0, 0); c.drawImage(ov, 0, 0); return comp.toDataURL(type, q);
    },
  };
  if (CAPTURE) { document.documentElement.classList.add('capture'); return; }

  // ---------------------------------------------------------------- audio clock + player
  const audio = document.getElementById('song');
  let playing = false, lastAt = -1, lastPerf = 0;
  function clock() {
    const at = audio.currentTime, now = performance.now();
    if (at !== lastAt) { lastAt = at; lastPerf = now; }
    return playing ? at + Math.min(0.25, (now - lastPerf) / 1000) : at;
  }
  addEventListener('resize', () => { resize(); if (!playing) render(clock()); });
  const ui = {
    start: document.getElementById('start'), play: document.getElementById('playBtn'), bar: document.getElementById('controls'),
    pp: document.getElementById('pp'), time: document.getElementById('time'), track: document.getElementById('track'), fill: document.getElementById('fill'),
    cc: document.getElementById('cc'), fs: document.getElementById('fs'), hint: document.querySelector('#start .hint'),
  };
  ui.cc.classList.toggle('off', !subs);
  const fmt = (x) => { x = Math.max(0, x); return Math.floor(x / 60) + ':' + String(Math.floor(x % 60)).padStart(2, '0'); };

  // adaptive render scale: keep the frame time under ~22 ms
  let last = 0, acc = 0, nfr = 0, cool = 0;
  function adapt(now) {
    if (last) { acc += now - last; nfr++; }
    last = now;
    if (nfr >= 40) {
      const dt = acc / nfr; acc = 0; nfr = 0;
      if (cool > 0) { cool--; return; }
      if (dt > 24 && quality > 0.3) { quality = Math.max(0.3, quality * 0.82); resize(); cool = 1; }
      else if (dt < 15 && quality < 1) { quality = Math.min(1, quality * 1.1); resize(); cool = 2; }
    }
  }
  function loop(now) {
    const t = clock();
    render(t);
    ui.fill.style.width = (clamp(t / DUR) * 100) + '%';
    ui.time.textContent = fmt(t) + ' / ' + fmt(DUR);
    if (playing) { adapt(now); requestAnimationFrame(loop); }
  }
  function play() {
    fontsReady.then(() => audio.play()).then(() => {
      playing = true; last = 0; document.body.classList.add('playing'); ui.start.classList.add('gone'); requestAnimationFrame(loop); poke();
    }).catch((e) => { console.error(e); ui.hint.textContent = 'Tap again to start the sound'; });
  }
  function pause() { audio.pause(); playing = false; document.body.classList.remove('playing'); render(clock()); poke(); }
  const toggle = () => (playing ? pause() : play());
  ui.play.addEventListener('click', play);
  ui.pp.addEventListener('click', toggle);
  ov.addEventListener('click', () => { if (ui.start.classList.contains('gone')) toggle(); });
  audio.addEventListener('ended', () => { playing = false; document.body.classList.remove('playing'); ui.bar.classList.add('show'); });
  audio.addEventListener('seeked', () => { if (!playing) render(clock()); });
  function seekTo(x) { const r = ui.track.getBoundingClientRect(); audio.currentTime = clamp((x - r.left) / r.width) * DUR; lastAt = -1; if (!playing) requestAnimationFrame(() => loop(performance.now())); }
  let drag = false;
  ui.track.addEventListener('pointerdown', (e) => { drag = true; ui.track.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  ui.track.addEventListener('pointermove', (e) => { if (drag) seekTo(e.clientX); });
  ui.track.addEventListener('pointerup', () => { drag = false; });
  ui.cc.addEventListener('click', () => { subs = !subs; ui.cc.classList.toggle('off', !subs); if (!playing) render(clock()); });
  ui.fs.addEventListener('click', () => { const el = document.documentElement; if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); else document.exitFullscreen && document.exitFullscreen(); });
  addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.key === 'k') { e.preventDefault(); if (!ui.start.classList.contains('gone')) play(); else toggle(); }
    else if (e.key === 'ArrowRight') { audio.currentTime = Math.min(DUR, audio.currentTime + 5); poke(); }
    else if (e.key === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); poke(); }
    else if (e.key === 'f') ui.fs.click();
    else if (e.key === 'c') ui.cc.click();
  });
  let idle;
  function poke() { ui.bar.classList.add('show'); document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => { if (playing) { ui.bar.classList.remove('show'); document.body.classList.add('idle'); } }, 2400); }
  addEventListener('pointermove', poke);
  if (params.has('t')) audio.currentTime = +params.get('t');
  // poster frame behind the start screen
  fontsReady.then(() => { const sv = subs; subs = false; render(+(params.get('t') || 40.6)); subs = sv; });
})();
