/* Moving Goalposts — timing core: beat grid, sections, word times, audio envelopes. */
(function () {
  'use strict';
  const S = window.SYNC;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const BEAT = 60 / S.bpm, BAR = BEAT * 4, B0 = S.beat0;
  const beatOf = (t) => (t - B0) / BEAT;
  const barT = (bar) => B0 + bar * BAR;

  // envelopes (30 fps, 0..255) -> float arrays, plus decayed ("hit") and smoothed variants
  const fps = S.env.fps;
  const envs = {};
  for (const k of Object.keys(S.env)) {
    if (k === 'fps') continue;
    const a = Float32Array.from(S.env[k], (v) => v / 255);
    envs[k] = a;
    const d = new Float32Array(a.length); let m = 0;
    for (let i = 0; i < a.length; i++) { m = Math.max(a[i], m * 0.8); d[i] = m; }
    envs[k + 'D'] = d;
    const sm = new Float32Array(a.length); let s = a[0];
    for (let i = 0; i < a.length; i++) { s += (a[i] - s) * 0.12; sm[i] = s; }
    envs[k + 'S'] = sm;
  }
  const ENVN = envs.rms.length;
  function A(name, t) {
    const a = envs[name]; const x = t * fps; const i = Math.floor(x);
    if (i < 0) return a[0]; if (i >= a.length - 1) return a[a.length - 1];
    return lerp(a[i], a[i + 1], x - i);
  }

  const LINES = S.lines;
  const norm = (w) => w.toLowerCase().replace(/’/g, "'").replace(/[^a-z']/g, '');
  LINES.forEach((L) => L.w.forEach((w) => { w.n = norm(w.w); }));
  // time of the k-th occurrence of `word` in line li (or word index if number)
  function wt(li, word, k = 0) {
    const L = LINES[li];
    if (typeof word === 'number') return L.w[Math.max(0, Math.min(word, L.w.length - 1))].t;
    const n = norm(word); let c = 0;
    for (const w of L.w) if (w.n === n || w.n.startsWith(n)) { if (c === k) return w.t; c++; }
    console.warn('word not found', li, word); return L.t;
  }

  window.MC = { S, clamp, lerp, BEAT, BAR, B0, beatOf, barT, A, envs, ENVN, LINES, wt, DUR: S.dur };
})();
