/* Moving Goalposts — core engine: math, timing, 3D projection, drawing helpers.
   Everything is a pure function of the song time `t`, so seeking and frame-exact
   export both work. */
(function () {
  'use strict';
  const W = 1920, H = 1080;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ease = {
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: (x) => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  };
  // eased 0..1 window between a and b
  const E = (t, a, b, fn = ease.outCubic) => fn(ramp(t, a, b));
  // in-hold-out envelope
  const env = (t, a, b, fin = 0.25, fout = 0.25) => Math.min(ramp(t, a - fin, a), 1 - ramp(t, b, b + fout));

  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
  function hash2(a, b) { return hash(a * 17.17 + b * 91.31); }
  function vnoise(x) { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }
  function fbm(x) { return vnoise(x) * 0.6 + vnoise(x * 2.03 + 7) * 0.3 + vnoise(x * 4.1 + 13) * 0.1; }

  // ---------- timing ----------
  const S = window.SYNC;
  const BEAT = 60 / S.bpm, BAR = BEAT * 4, B0 = S.beat0;
  const beatOf = (t) => (t - B0) / BEAT;
  const barOf = (t) => (t - B0) / BAR;
  const barT = (bar) => B0 + bar * BAR;
  const beatT = (beat) => B0 + beat * BEAT;
  // decays from 1 at each beat
  function beatPulse(t, k = 6, div = 1) {
    const b = beatOf(t) * div; if (b < 0) return 0;
    return Math.exp(-(b - Math.floor(b)) * BEAT / div * k);
  }

  // envelopes (30 fps, 0..255) -> float arrays with a decayed "hit" variant
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
  function A(name, t) {
    const a = envs[name]; const x = t * fps; const i = Math.floor(x);
    if (i < 0) return a[0]; if (i >= a.length - 1) return a[a.length - 1];
    return lerp(a[i], a[i + 1], x - i);
  }

  // sections
  const SECS = S.sections;
  function section(t) {
    let i = 0; while (i < SECS.length - 1 && t >= SECS[i + 1].t) i++;
    const s = SECS[i], e = i + 1 < SECS.length ? SECS[i + 1].t : S.dur;
    return { name: s.s, t0: s.t, t1: e, i, local: t - s.t, p: (t - s.t) / (e - s.t) };
  }
  const secT = (name) => { const s = SECS.find((x) => x.s === name); return s ? s.t : 0; };

  // lyrics lookup
  const LINES = S.lines;
  const norm = (w) => w.toLowerCase().replace(/[^a-z']/g, '').replace(/’/g, "'");
  LINES.forEach((L, li) => { L.i = li; L.w.forEach((w, wi) => { w.n = norm(w.w.replace(/’/g, "'")); w.li = li; w.wi = wi; }); });
  // time of the k-th occurrence of word `word` in line li
  function wt(li, word, k = 0) {
    const L = LINES[li]; if (!L) return 1e9;
    if (typeof word === 'number') return L.w[Math.max(0, Math.min(word, L.w.length - 1))].t;
    const n = norm(word); let c = 0;
    for (const w of L.w) if (w.n === n || w.n.startsWith(n)) { if (c === k) return w.t; c++; }
    console.warn('word not found', li, word); return L.t;
  }
  function we(li, word, k = 0) {
    const L = LINES[li]; const n = norm(word); let c = 0;
    for (const w of L.w) if (w.n === n || w.n.startsWith(n)) { if (c === k) return w.e; c++; }
    return L.e;
  }

  // ---------- 3D camera ----------
  const cam = {
    px: 0, py: 2, pz: -10, fx: 0, fy: 0, fz: 1, rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, f: 900, near: 0.15, roll: 0,
    set(pos, tgt, fovDeg = 50, roll = 0) {
      this.px = pos[0]; this.py = pos[1]; this.pz = pos[2];
      let fx = tgt[0] - pos[0], fy = tgt[1] - pos[1], fz = tgt[2] - pos[2];
      const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
      // left-handed world: x right, y up, z forward. right = up x f, up' = f x right
      let rx = fz, ry = 0, rz = -fx;
      let rl = Math.hypot(rx, rz);
      if (rl < 1e-5) { rx = 1; rz = 0; rl = 1; }
      rx /= rl; rz /= rl;
      let ux = fy * rz - fz * ry, uy = fz * rx - fx * rz, uz = fx * ry - fy * rx;
      if (roll) {
        const c = Math.cos(roll), s = Math.sin(roll);
        const nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s;
        ux = ux * c - rx * s; uy = uy * c - ry * s; uz = uz * c - rz * s;
        rx = nrx; ry = nry; rz = nrz;
      }
      this.rx = rx; this.ry = ry; this.rz = rz;
      this.ux = ux; this.uy = uy; this.uz = uz;
      this.fx = fx; this.fy = fy; this.fz = fz;
      this.f = (H / 2) / Math.tan((fovDeg * Math.PI / 180) / 2);
    },
    // camera-space coords
    toCam(x, y, z, out) {
      const dx = x - this.px, dy = y - this.py, dz = z - this.pz;
      out[0] = dx * this.rx + dy * this.ry + dz * this.rz;
      out[1] = dx * this.ux + dy * this.uy + dz * this.uz;
      out[2] = dx * this.fx + dy * this.fy + dz * this.fz;
      return out;
    },
    // returns [sx, sy, depth] or null if behind
    p(x, y, z) {
      const c = this.toCam(x, y, z, _c);
      if (c[2] < this.near) return null;
      return [W / 2 + c[0] * this.f / c[2], H / 2 - c[1] * this.f / c[2], c[2]];
    },
    scale(depth) { return this.f / depth; },
  };
  const _c = [0, 0, 0], _a = [0, 0, 0], _b = [0, 0, 0];

  // add a clipped 3D segment to the current path
  function seg3(ctx, x1, y1, z1, x2, y2, z2) {
    const a = cam.toCam(x1, y1, z1, _a), b = cam.toCam(x2, y2, z2, _b);
    const n = cam.near;
    if (a[2] < n && b[2] < n) return false;
    let ax = a[0], ay = a[1], az = a[2], bx = b[0], by = b[1], bz = b[2];
    if (az < n) { const k = (n - az) / (bz - az); ax += (bx - ax) * k; ay += (by - ay) * k; az = n; }
    if (bz < n) { const k = (n - bz) / (az - bz); bx += (ax - bx) * k; by += (ay - by) * k; bz = n; }
    const f = cam.f;
    ctx.moveTo(W / 2 + ax * f / az, H / 2 - ay * f / az);
    ctx.lineTo(W / 2 + bx * f / bz, H / 2 - by * f / bz);
    return true;
  }
  // polyline through 3D points (array of [x,y,z]); draws fraction `frac` of its length
  function poly3(ctx, pts, frac = 1, closed = false) {
    const P = closed ? pts.concat([pts[0]]) : pts;
    if (frac >= 1) { for (let i = 0; i < P.length - 1; i++) seg3(ctx, ...P[i], ...P[i + 1]); return; }
    let L = 0; const ls = [];
    for (let i = 0; i < P.length - 1; i++) { const d = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1], P[i + 1][2] - P[i][2]); ls.push(d); L += d; }
    let rem = L * clamp(frac);
    for (let i = 0; i < P.length - 1 && rem > 0; i++) {
      const k = Math.min(1, rem / (ls[i] || 1e-9));
      const a = P[i], b = P[i + 1];
      seg3(ctx, a[0], a[1], a[2], a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      rem -= ls[i];
    }
  }
  // filled polygon of 3D points (all must be in front of camera; otherwise skipped)
  function fill3(ctx, pts) {
    const q = [];
    for (const p of pts) { const s = cam.p(p[0], p[1], p[2]); if (!s) return false; q.push(s); }
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath(); return true;
  }

  // ---------- 2D helpers ----------
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // hand-drawn ("boiling") line: jitter changes at 12 fps
  function wobblePath(ctx, pts, t, amp = 3, seed = 0, closed = true) {
    const fr = Math.floor(t * 12);
    const n = pts.length;
    for (let i = 0; i <= (closed ? n : n - 1); i++) {
      const p = pts[i % n];
      const jx = (hash2(fr + seed, i * 2) - 0.5) * 2 * amp, jy = (hash2(fr + seed, i * 2 + 1) - 0.5) * 2 * amp;
      if (i === 0) ctx.moveTo(p[0] + jx, p[1] + jy); else ctx.lineTo(p[0] + jx, p[1] + jy);
    }
  }

  const PAL = {
    ink: '#03080c',
    night: '#06121a',
    deep: '#0a1d28',
    teal: '#2b7a86',
    cyan: '#7ff5e0',
    chalk: '#e9f3ef',
    cream: '#f1e4c6',
    orange: '#ff8a3d',
    amber: '#ffb347',
    red: '#ff3d55',
    magenta: '#ff4fa3',
    violet: '#8b7bff',
    gray: '#7d8b92',
  };
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const mix = (h1, h2, k) => {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, k)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)), bl = Math.round(lerp(a & 255, b & 255, k));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };

  window.MG = {
    W, H, clamp, lerp, ramp, smooth, ease, E, env, hash, hash2, vnoise, fbm,
    BEAT, BAR, B0, beatOf, barOf, barT, beatT, beatPulse, A, section, secT, SECS,
    LINES, wt, we, norm, cam, seg3, poly3, fill3, roundRect, wobblePath, PAL, rgba, mix, DUR: S.dur,
  };
})();
