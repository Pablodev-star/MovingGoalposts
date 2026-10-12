/* Moving Goalposts — world props: sky, chalk field, goalposts, ball, floodlights,
   pages, cards, glass ceiling, wall of numbers, hand-made shapes… */
(function () {
  'use strict';
  const { W, H, clamp, lerp, ramp, ease, E, hash, hash2, vnoise, cam, seg3, poly3, fill3, roundRect, wobblePath, PAL, rgba, mix } = MG;

  // ---------- sky / horizon ----------
  function horizonY() {
    // screen y of the vanishing horizon (point infinitely far along the ground)
    const far = 1e5;
    const s = cam.p(cam.px + cam.fx * far, 0, cam.pz + cam.fz * far);
    if (!s) return -1e4;
    return clamp(s[1], -4000, 5000);
  }
  function sky(ctx, top, mid, bottom, glow, glowAmt = 0.6) {
    const hy = horizonY();
    const g = ctx.createLinearGradient(0, Math.min(hy - 900, -10), 0, Math.max(hy + 300, 10));
    g.addColorStop(0, top); g.addColorStop(0.72, mid); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (glow && hy > -300 && hy < H + 300) {
      const rg = ctx.createRadialGradient(W / 2, hy, 0, W / 2, hy, 1100);
      rg.addColorStop(0, rgba(glow, 0.55 * glowAmt)); rg.addColorStop(0.35, rgba(glow, 0.18 * glowAmt)); rg.addColorStop(1, rgba(glow, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, hy - 1100, W, 2200);
      // thin horizon line
      ctx.fillStyle = rgba(glow, 0.35 * glowAmt); ctx.fillRect(0, hy - 1, W, 2);
    }
    return hy;
  }
  function groundFill(ctx, color, hy) {
    if (hy > H) return;
    const g = ctx.createLinearGradient(0, Math.max(hy, -2000), 0, H);
    g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.08, rgba(color, 0.9)); g.addColorStop(1, color);
    ctx.fillStyle = g; ctx.fillRect(0, Math.max(hy, 0) - 2, W, H);
  }

  // ---------- chalk grid ----------
  // fogged grid on plane y. bands of distance get decreasing alpha.
  function grid(ctx, o) {
    const step = o.step || 4, x0 = o.x0 ?? -80, x1 = o.x1 ?? 80, z0 = o.z0 ?? -40, z1 = o.z1 ?? 200, y = o.y || 0;
    const color = o.color || PAL.chalk, alpha = o.alpha ?? 0.35, fog = o.fog || 140;
    const bands = 6, bandLen = fog / bands;
    ctx.lineWidth = o.lw || 1.2; ctx.strokeStyle = color;
    const czs = cam.pz;
    for (let b = 0; b < bands; b++) {
      const d0 = b * bandLen, d1 = (b + 1) * bandLen;
      ctx.globalAlpha = alpha * Math.pow(1 - b / bands, 1.6);
      ctx.beginPath();
      // lines parallel to z (constant x), clipped to band of z distance
      const za = Math.max(z0, czs - fog), zb = Math.min(z1, czs + fog);
      for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
        const dx = Math.abs(x - cam.px); if (dx > fog) continue;
        // distance band along z (approx using |z - camz|)
        const s1 = Math.max(za, czs + d0), e1 = Math.min(zb, czs + d1);
        if (e1 > s1) seg3(ctx, x, y, s1, x, y, e1);
        const s2 = Math.max(za, czs - d1), e2 = Math.min(zb, czs - d0);
        if (e2 > s2) seg3(ctx, x, y, s2, x, y, e2);
      }
      // lines parallel to x at z in band
      for (let z = Math.ceil(z0 / step) * step; z <= z1; z += step) {
        const dz = Math.abs(z - czs); if (dz < d0 || dz >= d1) continue;
        seg3(ctx, Math.max(x0, cam.px - fog), y, z, Math.min(x1, cam.px + fog), y, z);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // pitch markings around a goal at (gx, gz) facing -z
  function pitchMarks(ctx, gx, gz, alpha = 0.8, color = PAL.chalk) {
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 2;
    ctx.beginPath();
    // goal line
    seg3(ctx, gx - 34, 0, gz, gx + 34, 0, gz);
    // penalty box 40.3 x 16.5, goal box 18.3 x 5.5
    poly3(ctx, [[gx - 20.15, 0, gz], [gx - 20.15, 0, gz - 16.5], [gx + 20.15, 0, gz - 16.5], [gx + 20.15, 0, gz]]);
    poly3(ctx, [[gx - 9.15, 0, gz], [gx - 9.15, 0, gz - 5.5], [gx + 9.15, 0, gz - 5.5], [gx + 9.15, 0, gz]]);
    // penalty arc
    const arc = [];
    for (let i = 0; i <= 24; i++) { const a = -0.93 + i / 24 * 1.86; arc.push([gx + Math.sin(a) * 9.15, 0, gz - 11 - Math.cos(a) * 9.15]); }
    poly3(ctx, arc.filter((p) => p[2] < gz - 16.5));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ---------- goalposts ----------
  function thick(ctx, a, b, w, color) {
    const pa = cam.p(a[0], a[1], a[2]), pb = cam.p(b[0], b[1], b[2]);
    let d = pa && pb ? (pa[2] + pb[2]) / 2 : pa ? pa[2] : pb ? pb[2] : null;
    if (!d) return;
    ctx.lineWidth = Math.max(1.2, Math.min(60, w * cam.f / d));
    ctx.strokeStyle = color;
    ctx.beginPath(); seg3(ctx, a[0], a[1], a[2], b[0], b[1], b[2]); ctx.stroke();
  }
  // goal: center (x,z) on ground, facing -z (toward camera). build 0..1 draws it up from the ground
  function goal(ctx, x, z, o = {}) {
    const hw = (o.w || 7.32) / 2, h = o.h || 2.44, dp = o.depth || 2.0;
    const build = o.build ?? 1, color = o.color || PAL.chalk, a = o.alpha ?? 1, net = o.net ?? 0.5;
    if (build <= 0 || a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    const hh = h * ease.outCubic(clamp(build * 1.6));
    const cb = clamp(build * 1.6 - 0.6);
    // net (behind)
    if (net > 0 && cb > 0) {
      ctx.globalAlpha = a * net * cb; ctx.strokeStyle = color; ctx.lineWidth = 0.8;
      ctx.beginPath();
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const xx = x - hw + (2 * hw) * i / n;
        seg3(ctx, xx, h, z, xx, h * 0.85, z + dp * 0.6); seg3(ctx, xx, h * 0.85, z + dp * 0.6, xx, 0, z + dp);
      }
      for (let j = 0; j <= 5; j++) {
        const k = j / 5;
        // horizontal net lines along the back slope
        const yy = lerp(h * 0.85, 0, k), zz = lerp(z + dp * 0.6, z + dp, k);
        seg3(ctx, x - hw, yy, zz, x + hw, yy, zz);
        // sides
        seg3(ctx, x - hw, h * (1 - k), z, x - hw, h * (1 - k) * 0.85, z + dp * lerp(0.6, 1, k));
        seg3(ctx, x + hw, h * (1 - k), z, x + hw, h * (1 - k) * 0.85, z + dp * lerp(0.6, 1, k));
      }
      ctx.stroke();
      ctx.globalAlpha = a;
    }
    const pw = o.post || 0.12;
    thick(ctx, [x - hw, 0, z], [x - hw, hh, z], pw, color);
    thick(ctx, [x + hw, 0, z], [x + hw, hh, z], pw, color);
    if (cb > 0) thick(ctx, [x - hw, h, z], [x - hw + 2 * hw * ease.outCubic(cb), h, z], pw, color);
    ctx.restore();
  }

  // ---------- ball / orb ("the work") ----------
  function orb(ctx, x, y, z, r, o = {}) {
    const s = cam.p(x, y, z); if (!s) return null;
    const R = r * cam.f / s[2];
    const core = o.core || PAL.cream, glow = o.glow || PAL.orange, gl = o.glowAmt ?? 1;
    if (R > 0.3) {
      const g = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], R * 7);
      g.addColorStop(0, rgba(glow, 0.55 * gl)); g.addColorStop(0.2, rgba(glow, 0.18 * gl)); g.addColorStop(1, rgba(glow, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s[0], s[1], R * 7, 0, 7); ctx.fill();
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(s[0], s[1], Math.max(1.5, R), 0, 7); ctx.fill();
    }
    // ground shadow / contact light
    if (o.shadow !== false && y < 8) {
      const g0 = cam.p(x, 0, z);
      if (g0) {
        const Rs = r * 2.2 * cam.f / g0[2];
        ctx.save(); ctx.translate(g0[0], g0[1]); ctx.scale(1, 0.28);
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, Rs * 2);
        sg.addColorStop(0, rgba(glow, 0.35 * gl * (1 - y / 8))); sg.addColorStop(1, rgba(glow, 0));
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, Rs * 2, 0, 7); ctx.fill(); ctx.restore();
      }
    }
    return [s[0], s[1], R];
  }

  // ---------- floodlights ----------
  function floodlights(ctx, t, o = {}) {
    const color = o.color || PAL.chalk, I = o.intensity ?? 1, gz = o.gz ?? 40;
    const towers = o.towers || [[-46, gz + 6], [46, gz + 6], [-46, gz - 60], [46, gz - 60]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    towers.forEach(([x, z], i) => {
      const top = cam.p(x, 26, z), base = cam.p(x, 0, z);
      if (!top) return;
      // mast
      if (base) { ctx.strokeStyle = rgba(PAL.gray, 0.35); ctx.lineWidth = 1.5; ctx.beginPath(); seg3(ctx, x, 0, z, x, 25, z); ctx.stroke(); }
      const k = cam.f / top[2];
      const flick = 0.85 + 0.15 * Math.sin(t * 3 + i * 2);
      // lamp bank
      const Rg = clamp(1.4 * k, 5, 46);
      const g = ctx.createRadialGradient(top[0], top[1], 0, top[0], top[1], Rg * 3);
      g.addColorStop(0, rgba(color, 0.95 * I * flick)); g.addColorStop(0.18, rgba(color, 0.22 * I)); g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(top[0], top[1], Rg * 3, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(color, 0.9 * I); ctx.fillRect(top[0] - Rg * 0.5, top[1] - Rg * 0.18, Rg, Rg * 0.36);
      // beam towards field centre
      const tgt = cam.p(x * 0.15, 0, z * 0.3 + gz * 0.4);
      if (tgt) {
        const dx = tgt[0] - top[0], dy = tgt[1] - top[1];
        const L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, spread = Math.min(420, L * 0.16);
        const bg = ctx.createLinearGradient(top[0], top[1], tgt[0], tgt[1]);
        bg.addColorStop(0, rgba(color, 0.07 * I)); bg.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = bg; ctx.beginPath();
        ctx.moveTo(top[0] + nx * 6, top[1] + ny * 6); ctx.lineTo(tgt[0] + nx * spread, tgt[1] + ny * spread);
        ctx.lineTo(tgt[0] - nx * spread, tgt[1] - ny * spread); ctx.lineTo(top[0] - nx * 6, top[1] - ny * 6); ctx.fill();
      }
    });
    ctx.restore();
  }

  // ---------- dust motes ----------
  function dust(ctx, t, o = {}) {
    const n = o.n || 160, color = o.color || PAL.chalk, R = o.range || 40, a = o.alpha ?? 0.5;
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const bx = (hash(i * 3.1) - 0.5) * 2 * R, by = hash(i * 7.7) * (o.h || 12), bz = (hash(i * 1.3) - 0.5) * 2 * R;
      const x = cam.px + ((bx + vnoise(t * 0.1 + i) * 2 - cam.px) % (2 * R) + 3 * R) % (2 * R) - R;
      const z = cam.pz + ((bz + t * (o.drift || 0.4) - cam.pz) % (2 * R) + 3 * R) % (2 * R) - R;
      const y = (by + t * (o.rise || 0.15) * (0.5 + hash(i))) % (o.h || 12) + (o.y0 || 0);
      const s = cam.p(x, y, z); if (!s) continue;
      const r = Math.min(4, 0.03 * cam.f / s[2]);
      ctx.globalAlpha = a * clamp(1 - s[2] / R) * (0.4 + 0.6 * hash(i * 9.1));
      ctx.fillRect(s[0] - r / 2, s[1] - r / 2, r, r);
    }
    ctx.globalAlpha = 1;
  }

  // ---------- page ("rules") ----------
  // page lying in plane: center c, u-axis (width) and v-axis (height) vectors
  function page(ctx, t, c, u, v, o = {}) {
    const wv = (a, b) => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b];
    const corners = [wv(-1, -1), wv(1, -1), wv(1, 1), wv(-1, 1)];
    const a = o.alpha ?? 1;
    ctx.save(); ctx.globalAlpha = a;
    if (fill3(ctx, corners)) {
      ctx.fillStyle = o.paper || rgba(PAL.cream, 0.08); ctx.fill();
      ctx.strokeStyle = o.edge || PAL.cream; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // header rule
    ctx.strokeStyle = o.ink || PAL.cream; ctx.lineWidth = 1.2;
    ctx.beginPath(); seg3(ctx, ...wv(-0.82, 0.78), ...wv(0.82, 0.78)); ctx.stroke();
    // text lines (rules) — each line is a few word-bars; `shuffle` 0..n reorders them
    const lines = o.lines || 14, sh = o.shuffle || 0;
    ctx.lineWidth = o.textW || 3; ctx.lineCap = 'round';
    for (let i = 0; i < lines; i++) {
      const y = 0.62 - i * (1.45 / lines);
      const seed = i + Math.floor(sh) * 31;
      const fr = sh - Math.floor(sh);
      let x = -0.82;
      ctx.globalAlpha = a * (o.textAlpha ?? 0.55) * (o.reveal == null ? 1 : clamp(o.reveal * lines - i));
      ctx.beginPath();
      for (let k = 0; k < 6 && x < 0.82; k++) {
        const wlen = 0.1 + hash2(seed, k) * 0.28;
        const wlen2 = 0.1 + hash2(seed + 31, k) * 0.28;
        const L = lerp(wlen, wlen2, ease.inOutCubic(fr));
        const x2 = Math.min(0.82, x + L);
        // strike-through effect: some lines get "rewritten"
        seg3(ctx, ...wv(x, y), ...wv(x2, y));
        x = x2 + 0.06;
      }
      ctx.stroke();
      if (o.strike && hash2(i, Math.floor(sh)) < o.strike) {
        ctx.globalAlpha = a * 0.9; ctx.strokeStyle = PAL.red; ctx.lineWidth = 2;
        ctx.beginPath(); seg3(ctx, ...wv(-0.84, y), ...wv(-0.84 + 1.7 * clamp(fr * 2), y)); ctx.stroke();
        ctx.strokeStyle = o.ink || PAL.cream; ctx.lineWidth = o.textW || 3;
      }
    }
    ctx.restore();
    return wv;
  }

  // ---------- shoe print ----------
  // sneaker sole outline: [u along heel->toe, half width]
  const SOLE = (() => {
    const prof = [[-0.5, 0], [-0.48, 0.09], [-0.42, 0.13], [-0.3, 0.145], [-0.12, 0.125], [0.02, 0.135], [0.18, 0.185], [0.3, 0.19], [0.4, 0.165], [0.47, 0.11], [0.5, 0]];
    const right = prof.map(([u, w]) => [u, w]);
    const left = prof.slice(1, -1).reverse().map(([u, w]) => [u, -w * 0.92]);
    return right.concat(left);
  })();
  function shoe(ctx, x, z, ang, size, o = {}) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const m = o.mirror ? -1 : 1;
    // u runs heel->toe along the walking direction, v across the sole
    const P = (u, v) => [x + (u * s + v * m * c) * size, 0.01, z + (u * c - v * m * s) * size];
    const pts = SOLE.map(([u, v]) => P(u, v));
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    if (fill3(ctx, pts)) {
      ctx.fillStyle = o.fill || rgba(PAL.cream, 0.1); ctx.fill();
      ctx.strokeStyle = o.color || PAL.cream; ctx.lineWidth = 2; ctx.stroke();
    }
    // tread lines
    ctx.strokeStyle = o.color || PAL.cream; ctx.lineWidth = 1; ctx.globalAlpha *= 0.6; ctx.beginPath();
    for (let k = -4; k <= 4; k++) {
      const u = k * 0.1, w = 0.13;
      const a = P(u, -w), b = P(u + 0.03, w);
      seg3(ctx, ...a, ...b);
    }
    ctx.stroke(); ctx.restore();
  }

  // ---------- billboard card (a "post") standing in 3D ----------
  function card(ctx, x, y, z, w, h, o = {}) {
    // card faces camera along -z; yaw rotates around y
    const yaw = o.yaw || 0, c = Math.cos(yaw), s = Math.sin(yaw);
    const P = (u, v) => [x + u * c, y + v, z + u * s];
    const pts = [P(-w / 2, 0), P(w / 2, 0), P(w / 2, h), P(-w / 2, h)];
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    if (fill3(ctx, pts)) {
      ctx.fillStyle = o.fill || rgba(PAL.deep, 0.85); ctx.fill();
      ctx.strokeStyle = o.stroke || PAL.cyan; ctx.lineWidth = o.lw || 1.5; ctx.stroke();
      // inner "thumbnail" content: horizon + sun or play triangle
      if (o.content !== false) {
        ctx.beginPath(); poly3(ctx, [P(-w * 0.38, h * 0.62), P(w * 0.38, h * 0.62)]);
        ctx.globalAlpha *= 0.6; ctx.stroke();
        const cc = cam.p(...P(0, h * 0.4));
        if (cc) {
          const r = 0.12 * h * cam.f / cc[2];
          ctx.beginPath(); ctx.moveTo(cc[0] - r * 0.6, cc[1] - r); ctx.lineTo(cc[0] + r, cc[1]); ctx.lineTo(cc[0] - r * 0.6, cc[1] + r); ctx.closePath();
          ctx.fillStyle = o.stroke || PAL.cyan; ctx.fill();
        }
      }
    }
    ctx.restore();
    return pts;
  }

  // ---------- glass ceiling ----------
  function ceiling(ctx, t, y, o = {}) {
    const a = o.alpha ?? 1; if (a <= 0) return;
    const x0 = o.x0 ?? -18, x1 = o.x1 ?? 18, z0 = o.z0 ?? -4, z1 = o.z1 ?? 40, step = o.step || 3;
    ctx.save(); ctx.globalAlpha = a * 0.5; ctx.strokeStyle = o.color || PAL.cyan; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) seg3(ctx, x, y, z0, x, y, z1);
    for (let z = z0; z <= z1; z += step) seg3(ctx, x0, y, z, x1, y, z);
    ctx.stroke();
    // panes tint
    const pts = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
    if (fill3(ctx, pts)) { ctx.globalAlpha = a * 0.07; ctx.fillStyle = o.color || PAL.cyan; ctx.fill(); }
    // impact cracks
    if (o.hit && o.hitAmt > 0) {
      const [hx, hz] = o.hit; ctx.globalAlpha = a * clamp(o.hitAmt); ctx.strokeStyle = PAL.chalk; ctx.lineWidth = 1.6;
      ctx.beginPath();
      const g = clamp(o.grow ?? 1);
      for (let i = 0; i < 11; i++) {
        const ang = i / 11 * Math.PI * 2 + hash(i) * 0.4;
        let px = hx, pz = hz;
        const L = (1.5 + hash(i * 3) * 3.5) * g;
        const pts2 = [[px, y, pz]];
        for (let k = 1; k <= 4; k++) {
          const aa = ang + (hash2(i, k) - 0.5) * 0.6; const d = L / 4;
          px += Math.cos(aa) * d; pz += Math.sin(aa) * d; pts2.push([px, y, pz]);
        }
        poly3(ctx, pts2);
      }
      // ring
      const ring = []; for (let i = 0; i <= 20; i++) { const an = i / 20 * Math.PI * 2; ring.push([hx + Math.cos(an) * 1.2 * g, y, hz + Math.sin(an) * 1.2 * g]); }
      poly3(ctx, ring);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- wall of small numbers ----------
  function wall(ctx, t, z, o = {}) {
    const a = o.alpha ?? 1; if (a <= 0) return;
    const cols = o.cols || 12, rows = o.rows || 6, tw = o.tw || 1.4, th = o.th || 1.0, x0 = (o.x ?? 0) - cols * tw / 2;
    const rip = o.ripple || 0, ripT = o.ripT || 0, rise = o.rise ?? 1;
    ctx.save();
    ctx.font = '700 40px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const cx = x0 + c * tw + tw / 2, cy = r * th + th / 2;
      const d = Math.hypot(cx - (o.hitX || 0), cy - (o.hitY || 1));
      const wave = rip * Math.sin(d * 2.2 - ripT * 14) * Math.exp(-ripT * 3) * Math.exp(-d * 0.25);
      const appear = clamp(rise * (rows + cols) - (r + Math.abs(c - cols / 2)));
      if (appear <= 0) continue;
      const zz = z - wave * 0.6;
      const hy = cy - th / 2 + (1 - ease.outCubic(appear)) * -3;
      const pts = [[cx - tw / 2 + 0.05, hy, zz], [cx + tw / 2 - 0.05, hy, zz], [cx + tw / 2 - 0.05, hy + th - 0.05, zz], [cx - tw / 2 + 0.05, hy + th - 0.05, zz]];
      if (!fill3(ctx, pts)) continue;
      ctx.globalAlpha = a * appear * 0.75;
      ctx.fillStyle = rgba(o.fill || PAL.deep, 0.9); ctx.fill();
      ctx.strokeStyle = o.color || PAL.cyan; ctx.lineWidth = 1; ctx.globalAlpha = a * appear * (0.35 + 0.65 * clamp(Math.abs(wave))); ctx.stroke();
      const s = cam.p(cx, hy + th / 2, zz);
      if (s) {
        const k = cam.f / s[2] * 0.008 * (o.numScale || 1);
        ctx.save(); ctx.translate(s[0], s[1]); ctx.scale(k, k);
        ctx.globalAlpha = a * appear * 0.8; ctx.fillStyle = o.numColor || PAL.chalk;
        const n = Math.floor(hash2(r * 13 + c, Math.floor((o.seed || 0))) * (o.maxN || 40));
        ctx.fillText(String(n), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ---------- crown ----------
  function crown(ctx, x, y, z, size, o = {}) {
    const pts = [[-1, 0], [-1, 0.9], [-0.5, 0.45], [0, 1.1], [0.5, 0.45], [1, 0.9], [1, 0]].map(([u, v]) => [x + u * size, y + v * size, z]);
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || PAL.amber; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); poly3(ctx, pts, o.draw ?? 1, true); ctx.stroke(); ctx.restore();
  }

  // ---------- corner-bracket frame in 3D (vertical plane facing camera) ----------
  function frame3(ctx, x, y, z, w, h, o = {}) {
    const k = o.len ?? 0.28, a = o.alpha ?? 1, d = o.draw ?? 1;
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = o.color || PAL.cream; ctx.lineWidth = o.lw || 3; ctx.lineCap = 'square';
    const x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2;
    ctx.beginPath();
    if (o.full) poly3(ctx, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], d, true);
    else {
      const L = Math.min(w, h) * k * d;
      poly3(ctx, [[x0, y1 - L, z], [x0, y1, z], [x0 + L, y1, z]]);
      poly3(ctx, [[x1 - L, y1, z], [x1, y1, z], [x1, y1 - L, z]]);
      poly3(ctx, [[x1, y0 + L, z], [x1, y0, z], [x1 - L, y0, z]]);
      poly3(ctx, [[x0 + L, y0, z], [x0, y0, z], [x0, y0 + L, z]]);
    }
    ctx.stroke(); ctx.restore();
  }

  // ---------- hand-made shapes (bridge) ----------
  const SHAPES = {
    circle: Array.from({ length: 18 }, (_, i) => [Math.cos(i / 18 * 6.283), Math.sin(i / 18 * 6.283)]),
    tri: [[0, -1], [0.95, 0.75], [-0.95, 0.75]],
    square: [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]],
    house: [[-0.8, 0.9], [-0.8, -0.1], [0, -0.95], [0.8, -0.1], [0.8, 0.9]],
    star: Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.45 : 1; const a = i / 10 * 6.283 - 1.5708; return [Math.cos(a) * r, Math.sin(a) * r]; }),
    heart: Array.from({ length: 20 }, (_, i) => { const a = i / 20 * 6.283; return [0.06 * 16 * Math.pow(Math.sin(a), 3), -0.06 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]; }),
    moon: Array.from({ length: 22 }, (_, i) => { const a = i < 11 ? -1.8 + i / 10 * 3.6 : 1.8 - (i - 11) / 10 * 3.6; const r = i < 11 ? 1 : 0.75; const ox = i < 11 ? 0 : 0.35; return [Math.cos(a) * r + ox, Math.sin(a) * r]; }),
    wave: Array.from({ length: 14 }, (_, i) => [-1 + i / 6.5, Math.sin(i / 13 * 6.283) * 0.35]),
  };
  // draws a hand-drawn shape in screen space
  function handShape(ctx, kind, sx, sy, R, t, o = {}) {
    const pts = SHAPES[kind].map(([u, v]) => {
      const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
      return [sx + (u * c - v * s) * R, sy + (u * s + v * c) * R];
    });
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); wobblePath(ctx, pts, t, o.wob ?? Math.max(1.5, R * 0.05), o.seed || 0, kind !== 'wave');
    if (o.fill && kind !== 'wave') { ctx.fillStyle = o.fill; ctx.fill(); }
    ctx.strokeStyle = o.color || PAL.cream; ctx.lineWidth = o.lw || 3; ctx.stroke();
    ctx.restore();
  }

  window.MW = { horizonY, sky, groundFill, grid, pitchMarks, goal, thick, orb, floodlights, dust, page, shoe, card, ceiling, wall, crown, frame3, handShape, SHAPES };
})();
