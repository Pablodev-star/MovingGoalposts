/* Moving Goalposts — the director. One function per section draws the world for time t
   and returns compositor instructions (layout, bloom, flashes, overlay, lyric style). */
(function () {
  'use strict';
  const { W, H, clamp, lerp, ramp, smooth, ease, E, env, hash, hash2, vnoise, fbm, BEAT, BAR, B0, beatOf, barOf, barT, beatT, beatPulse, A,
    section, secT, LINES, wt, we, cam, seg3, poly3, fill3, roundRect, wobblePath, PAL, rgba, mix } = MG;
  const { sky, groundFill, grid, pitchMarks, goal, thick, orb, floodlights, dust, page, shoe, card, ceiling, wall, crown, frame3, handShape } = MW;

  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const shake = (t, amp, f = 7) => [fbm(t * f) * amp, fbm(t * f + 50) * amp, fbm(t * f + 99) * amp];
  // time since the most recent of a list of times (Infinity if none yet)
  const since = (t, times) => { let s = Infinity; for (const x of times) if (t >= x) s = Math.min(s, t - x); return s; };

  // ======================================================================= INTRO
  function intro(ctx, t) {
    const tMoved = wt(0, 'moved'), tGoal = wt(1, 'goalposts'), tShift = wt(1, 'shift'), tChanged = wt(1, 'changed'), tShoes = wt(1, 'shoes');
    const fx = { bloom: 0.55, lyrics: { style: 'page' } };
    // camera: top-down on the page, then tilt down to the pitch
    const tilt = E(t, 3.0, 4.6, ease.inOutCubic);
    const push = E(t, 8.0, 10.71, ease.inCubic);
    const top = [0.15 * Math.sin(t * 0.3), 5.2 - t * 0.25, -0.7], topT = [0, 0, 0];
    const look = env(t, tChanged - 0.25, tShoes + 0.45, 0.45, 0.7);
    const low = [0, lerp(1.6, 2.3, look), -7 + push * 6], lowT = lerp3([0, 1.2, 20], [0, 0, -2.2], ease.inOutCubic(look));
    const p = lerp3(top, low, tilt), q = lerp3(topT, lowT, tilt);
    const sh = shake(t, 0.03);
    cam.set([p[0] + sh[0], p[1] + sh[1], p[2]], q, lerp(48, 56, tilt) + push * 10, lerp(-0.12 + t * 0.02, 0, tilt));
    const hy = sky(ctx, PAL.ink, PAL.night, PAL.deep, PAL.teal, 0.5 * tilt);
    groundFill(ctx, '#040a0e', hy);
    // grid emerges as the page's rules unfold
    grid(ctx, { alpha: 0.32 * E(t, 3.2, 5.0), step: 2, fog: 70, lw: 1 + A('kickD', t) * 1.5 });
    // the page of rules
    const slide = E(t, tMoved, tMoved + 0.5, ease.outExpo);
    const pa = 1 - E(t, 3.6, 4.8);
    if (pa > 0) {
      const c = [0.9 * slide, 0.02, 0.4 * slide];
      MW.page(ctx, t, c, [1.5, 0, 0], [0, 0, 2.1], {
        alpha: pa * E(t, 0.0, 0.7), shuffle: lerp(0, 1, E(t, tMoved, tMoved + 0.6)), reveal: E(t, 0.6, 2.8), strike: slide > 0.5 ? 0.35 : 0, textW: 3,
      });
      // header label
      const hs = cam.p(-1.25 + c[0], 0.02, 1.85 + c[2]);
      if (hs) MU.label(ctx, 'RULES  v1.' + (t < tMoved ? '0' : '1'), hs[0], hs[1], { size: 22, alpha: 0.85 * pa, color: PAL.cream });
    }
    // goalposts rise, then shift
    const gx = lerp(0, 9, E(t, tShift, tShift + 0.35, ease.outExpo)) + lerp(0, -15, E(t, 9.45, 9.75, ease.outExpo));
    const build = E(t, tGoal - 0.1, tGoal + 0.6);
    if (build > 0) {
      // motion ghosts during the shift
      for (let g = 1; g <= 4; g++) {
        const tg = t - g * 0.035; const gxg = lerp(0, 9, E(tg, tShift, tShift + 0.35, ease.outExpo)) + lerp(0, -15, E(tg, 9.45, 9.75, ease.outExpo));
        if (Math.abs(gxg - gx) > 0.05) goal(ctx, gxg, 24, { build, alpha: 0.25 / g, net: 0 });
      }
      goal(ctx, gx, 24, { build, net: 0.35 });
      pitchMarks(ctx, gx, 24, 0.35 * build);
    }
    // footprints: old shoes then new shoes
    const st = E(t, tChanged - 0.05, tChanged + 0.15, ease.outBack);
    if (st > 0) {
      const nw = E(t, tShoes, tShoes + 0.25);
      const col = mix(PAL.cream, PAL.orange, nw);
      [[-0.32, -3.0, false], [0.32, -2.35, true]].forEach(([x, z, m], i) => {
        const a = clamp(st * 1.2 - i * 0.2);
        shoe(ctx, x, z, lerp(0.05, -0.12, nw) * (m ? -1 : 1), lerp(0.58, 0.6, nw) * lerp(1.25, 1, st), { mirror: m, alpha: a, color: col, fill: rgba(col, 0.12 + 0.1 * nw) });
      });
    }
    dust(ctx, t, { n: 90, alpha: 0.35 * tilt, range: 30, h: 6 });
    fx.flash = 0.0;
    fx.zoom = 1 + push * 0.04;
    return fx;
  }

  // ======================================================================= VERSE 1
  const V1 = secT('verse1');
  const v1camX = (t) => (t - V1) * 0.9;
  function verse1(ctx, t) {
    const fx = { bloom: 0.5, lyrics: { style: 'verse' } };
    const cx = v1camX(t), bob = Math.sin(beatOf(t) * Math.PI) * 0.03;
    const sh = shake(t, 0.04);
    cam.set([cx + sh[0], 1.55 + bob + sh[1], -6], [cx + 1.6, 1.1, 12], 52);
    // sky: dawn -> night, then "season" colour cycle
    const tDawn = wt(2, 'dawn'), tNight = wt(2, 'night'), tSeason = wt(7, 'season'), tPace = wt(7, 'pace');
    const dawn = E(t, V1, tDawn + 0.1) * (1 - E(t, tNight - 0.1, tNight + 0.5));
    const seasonK = ramp(t, tSeason - 0.1, tSeason + 1.4);
    let glow = mix(PAL.teal, PAL.orange, dawn);
    if (seasonK > 0 && seasonK < 1) glow = [PAL.teal, PAL.amber, PAL.magenta, PAL.violet, PAL.teal][Math.min(4, Math.floor(seasonK * 5))];
    const topC = mix(PAL.ink, '#2a1630', dawn), midC = mix(PAL.night, '#5a2a2a', dawn);
    const hy = sky(ctx, topC, midC, mix(PAL.deep, '#ff9a5a', dawn * 0.6), glow, 0.7 + dawn * 0.6);
    groundFill(ctx, '#040a0e', hy);
    // secret chart drawn across the sky
    const tChart = wt(4, 'secret');
    const ck = E(t, tChart, tChart + 0.9, ease.inOutCubic);
    if (ck > 0) {
      const base = v1camX(tChart) + 1.6;
      const pts = [[-34, 3], [-26, 5], [-20, 4.2], [-14, 7], [-8, 6], [-3, 13], [1, 9.5], [5, 10.5], [11, 7], [18, 7.8], [26, 5]].map(([x, y]) => [base + x, y + 2, 75]);
      ctx.strokeStyle = PAL.cyan; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85 * (1 - 0.6 * E(t, tChart + 2, tChart + 4));
      ctx.beginPath(); poly3(ctx, pts, ck); ctx.stroke();
      ctx.fillStyle = PAL.cyan;
      pts.forEach((p, i) => { if (i / (pts.length - 1) <= ck) { const s = cam.p(...p); if (s) { ctx.beginPath(); ctx.arc(s[0], s[1], 4, 0, 7); ctx.fill(); } } });
      ctx.globalAlpha = 1;
    }
    // ground
    const pacePulse = (t > tPace - 0.3 && t < tSeason + 1.2) ? beatPulse(t, 5) : 0;
    grid(ctx, { alpha: 0.28 + 0.25 * A('kickD', t) + pacePulse * 0.3, step: 2, fog: 70, color: pacePulse > 0.01 ? mix(PAL.chalk, glow, 0.6) : PAL.chalk });
    // posts: cards rising out of the pitch
    const posts = [[wt(2, 'post'), 2.6, 7], [wt(2, 'post', 1), 4.8, 12], [wt(3, 0), -1.5, 16], [wt(4, 0), 7.5, 20], [wt(5, 0), 10.5, 11], [wt(6, 0), 12.8, 18], [wt(7, 0), 15.5, 9]];
    posts.forEach(([tp, ox, z], i) => {
      const k = E(t, tp, tp + 0.45, ease.outBack); if (k <= 0) return;
      const x = v1camX(tp) + ox;
      const dim = 1 - 0.55 * E(t, wt(8, 'canceled') + i * 0.05, wt(8, 'canceled') + i * 0.05 + 0.2);
      card(ctx, x, 0, z, 2.4, 3.2 * k, { stroke: i % 2 ? PAL.cyan : PAL.cream, alpha: 0.9 * dim, yaw: (hash(i) - 0.5) * 0.4 });
    });
    // the work: a ball rolling alongside, pace rings on beats
    const bx = cx + 1.3, bz = 4.2, by = 0.35 + Math.abs(Math.sin(beatOf(t) * Math.PI)) * 0.35;
    orb(ctx, bx, by, bz, 0.3);
    if (pacePulse > 0.01) {
      const r = (1 - pacePulse) * 3 + 0.4; ctx.strokeStyle = glow; ctx.globalAlpha = pacePulse; ctx.lineWidth = 2;
      const ring = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * 6.283; ring.push([bx + Math.cos(a) * r, 0.01, bz + Math.sin(a) * r]); }
      ctx.beginPath(); poly3(ctx, ring); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // the canceled train along the horizon
    const tTrain0 = wt(8, 0) - 0.3, tCanc = wt(8, 'canceled'), tTrain = wt(8, 'train');
    const trainA = env(t, tTrain0, wt(9, 0) + 0.4, 0.3, 0.5);
    if (trainA > 0) {
      const head = cx + 36 - 34 * E(t, tTrain0, tTrain + 0.2, ease.outCubic);
      for (let i = 0; i < 8; i++) {
        const off = E(t, tCanc + i * 0.07, tCanc + i * 0.07 + 0.12);
        const x = head + i * 3.0;
        card(ctx, x, 0.2, 34, 2.7, 1.7, { stroke: off > 0.5 ? PAL.red : PAL.cyan, fill: rgba(off > 0.5 ? '#1a0a0e' : PAL.deep, 0.9), alpha: trainA * (1 - 0.5 * off), content: off < 0.5 });
        if (off > 0.5) {
          ctx.strokeStyle = PAL.red; ctx.lineWidth = 2; ctx.globalAlpha = trainA; ctx.beginPath();
          seg3(ctx, x - 0.9, 0.5, 33.9, x + 0.9, 1.6, 33.9); seg3(ctx, x - 0.9, 1.6, 33.9, x + 0.9, 0.5, 33.9); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      // departure board
      const s = cam.p(head + 10, 3.2, 34);
      if (s && t > tCanc - 0.05) {
        const txt = 'CANCELED', n = Math.floor(clamp((t - tCanc) / 0.35) * txt.length);
        const shown = txt.split('').map((ch, i) => (i < n ? ch : '·#%&@'[Math.floor(hash2(Math.floor(t * 30), i) * 5)])).join('');
        MU.label(ctx, shown, s[0], s[1], { size: 44, weight: 700, color: PAL.red, alpha: trainA, align: 'center', track: 6 });
      }
    }
    dust(ctx, t, { n: 120, alpha: 0.3, range: 30, h: 6 });

    // ---- screen-space interface layer
    fx.overlay2 = (c) => {
      // timeline of clips (L3..L7)
      const tl0 = wt(3, 0) - 0.4, tl1 = wt(8, 0) + 0.2;
      const ta = env(t, tl0, tl1, 0.3, 0.4);
      if (ta > 0) {
        const trims = [[wt(3, 'trim'), 6], [wt(3, 'every'), 2], [wt(3, 'clip'), 7], [wt(7, 'pause'), 4]];
        MU.timeline(c, t, 360, 120, 1200, 70, { alpha: ta * 0.9, clips: 9, trims, appear: E(t, tl0, tl0 + 0.5), play: ramp(t, tl0, tl1) });
        // hook at the very start
        const tHook = wt(5, 'hook'), hk = E(t, tHook - 0.05, tHook + 0.35);
        if (hk > 0) {
          c.save(); c.strokeStyle = PAL.orange; c.lineWidth = 6; c.lineCap = 'round'; c.globalAlpha = ta;
          c.beginPath(); c.moveTo(372, 92); c.lineTo(372, 92 + 70 * hk);
          if (hk > 0.6) c.arc(352, 92 + 70, 20, 0, Math.PI * clamp((hk - 0.6) / 0.4));
          c.stroke(); c.restore();
        }
        const tStart = wt(5, 'start');
        if (t > tStart - 0.05) MU.label(c, '00:00:00', 360, 108, { size: 18, color: PAL.orange, alpha: ta * (0.5 + 0.5 * (Math.floor((t - tStart) * 6) % 2)) });
        // retention curve ("keep them watching")
        const rk = E(t, wt(6, 'watching') - 0.2, wt(6, 'reason') + 0.3, ease.inOutCubic);
        if (rk > 0) {
          c.save(); c.globalAlpha = ta; c.strokeStyle = PAL.orange; c.lineWidth = 3; c.beginPath();
          for (let i = 0; i <= 60 * rk; i++) { const u = i / 60; const y = 130 + 50 * (1 - Math.exp(-u * 3.2)) + Math.sin(u * 40) * 2; i ? c.lineTo(360 + u * 1200, y) : c.moveTo(360, y); }
          c.stroke(); c.restore();
        }
      }
      // viewfinder: "till the frame sits right"
      const tFr = wt(3, 'frame'), tRight = wt(3, 'right');
      const fa = env(t, tFr - 0.1, tRight + 0.7, 0.1, 0.3);
      if (fa > 0) {
        const k = E(t, tFr, tRight + 0.05, ease.inOutCubic);
        MU.brackets(c, 960 + (1 - k) * 60, 470 - (1 - k) * 30, lerp(980, 640, k), lerp(560, 360, k), { alpha: fa, color: t > tRight ? PAL.orange : PAL.chalk, cross: true, len: 46 });
      }
      // threads
      const tTh = wt(4, 0);
      const tha = env(t, tTh - 0.2, wt(5, 0) + 0.2, 0.25, 0.4);
      if (tha > 0) MU.threads(c, t, 80, 240, 380, 470, { alpha: tha * 0.85, speed: 260 });
      // quotes
      const qa = env(t, wt(6, 0) - 0.1, wt(7, 0), 0.2, 0.3);
      if (qa > 0) {
        c.save(); c.font = '900 420px Archivo, sans-serif'; c.fillStyle = PAL.chalk; c.globalAlpha = 0.1 * qa;
        c.fillText('“', 70 - 30 * (1 - qa), 560); c.textAlign = 'right'; c.fillText('”', W - 70 + 30 * (1 - qa), 560); c.restore();
      }
      // pause icon, cut
      const tCut = wt(7, 'cut'), tP = wt(7, 0);
      const pa = env(t, tP - 0.15, tCut + 1.2, 0.15, 0.2);
      if (pa > 0) MU.pauseIcon(c, 960, 420, 150, { alpha: pa, cut: E(t, tCut, tCut + 0.8, ease.outCubic), color: PAL.chalk });
    };
    // windowpanes
    const tSame = wt(9, 'same'), tSame2 = wt(9, 'same', 1), tDiff = wt(9, 'different'), tWin = wt(9, 'windowpane');
    const panes = t >= tWin ? 16 : t >= tDiff ? 9 : t >= tSame2 ? 4 : t >= tSame ? 2 : 1;
    if (panes > 1) fx.layout = { type: 'panes', n: panes, since: since(t, [tSame, tSame2, tDiff, tWin]) };
    fx.rgb = Math.max(0, 1 - since(t, [wt(8, 'drops'), tCanc, wt(7, 'cut')]) / 0.25) * 6;
    return fx;
  }

  // ======================================================================= PRE-CHORUS
  function pre(ctx, t, second) {
    const la = second ? 28 : 10, lb = la + 1;
    const s0 = second ? secT('pre2') : secT('pre1'), s1 = second ? secT('chorus2') : secT('chorus1');
    const local = t - s0, dur = s1 - s0;
    const fx = { bloom: 0.45, lyrics: { style: 'pre', accent: second ? PAL.magenta : PAL.cyan } };
    const rise = E(t, s0, s1, ease.inCubic);
    cam.set([Math.sin(local * 0.4) * 1.5, 3 + local * 1.4, -8 + local * 0.6], [0, 0, 10], 54 - rise * 14, Math.sin(local * 0.5) * 0.05);
    const hy = sky(ctx, PAL.ink, PAL.ink, '#071219', second ? PAL.magenta : PAL.teal, 0.35);
    groundFill(ctx, '#03070a', hy);
    grid(ctx, { alpha: 0.18 + 0.12 * A('snareD', t), step: 2, fog: 60 });
    goal(ctx, 0, 26, { alpha: 0.4, net: 0.2 });
    orb(ctx, 0, 0.35, 0, 0.3, { glowAmt: 0.6 + rise });
    const moves = [wt(la, 0), wt(la, 'tweak'), wt(la, 'one', 1), wt(la, 'test'), wt(lb, 0), wt(lb, 'guess'), wt(lb, 'works'), wt(lb, 'best')];
    fx.overlay2 = (c) => {
      const ua = env(t, s0 + 0.05, s1 - 0.2, 0.25, 0.2);
      MU.sliders(c, t, 130, 650, 260, { n: second ? 6 : 5, gap: 56, alpha: ua * 0.85, moves });
      MU.abCards(c, t, 1390, 690, { alpha: ua * 0.85, flips: [wt(la, 'test'), wt(lb, 'guess'), wt(lb, 'best')] });
      const tg = wt(lb, 'guess'); const qk = E(t, tg - 0.05, tg + 0.5);
      if (qk > 0) {
        c.save(); c.font = '900 760px Archivo, sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = second ? PAL.magenta : PAL.cyan;
        c.globalAlpha = 0.22 * qk * ua; c.setLineDash([2400 * qk, 9999]); c.strokeText('?', 960, 760); c.setLineDash([]); c.restore();
      }
      const tw = wt(lb, 'works');
      if (t > tw - 0.1) MU.barChart(c, t, 760, 800, 400, 150, { alpha: ua * 0.8, grow: E(t, tw - 0.1, tw + 0.4), target: 0.9, hi: Math.floor(t * 8) % 7 });
      MU.label(c, second ? 'ITERATION 0' + (48 + Math.floor(local * 4)) : 'ITERATION 0' + (12 + Math.floor(local * 4)), 120, 610, { size: 18, alpha: 0.6 * ua, color: PAL.cyan });
    };
    fx.zoom = 1 + 0.12 * E(t, s1 - 0.7, s1, ease.inExpo);
    fx.whiteout = E(t, s1 - 0.18, s1, ease.inQuad) * 0.9;
    if (second) fx.rgb = Math.max(0, 1 - since(t, moves) / 0.2) * 7;
    return fx;
  }

  // ======================================================================= CHORUS (x3)
  // shot k in 0..7 = bar within the chorus. c0 = first lyric line index of that chorus
  function chorus(ctx, t, variant) {
    const cfg = {
      c1: { c0: 12, bar0: 14, accent: PAL.orange, light: PAL.chalk, glow: PAL.teal, kOff: 0 },
      c2: { c0: 30, bar0: 32, accent: PAL.magenta, light: '#ffd6ec', glow: PAL.magenta, kOff: 0 },
      f: { c0: 42, bar0: 48, accent: PAL.amber, light: '#ffe2b0', glow: PAL.amber, kOff: 0 },
    }[variant];
    const bar = Math.floor(barOf(t) + 1e-6);
    const k = clamp(bar - cfg.bar0, 0, 7);
    const u = barOf(t) - bar; // 0..1 within bar
    const li = cfg.c0 + k;
    const T = (w, n = 0) => wt(li, w, n);
    const fx = { bloom: 0.75, lyrics: { style: 'chorus', accent: cfg.accent } };
    const kick = A('kickD', t), bass = A('bassS', t);

    // ---- state of goal / ball / props (function of t, valid for all shots)
    const cb = barT(cfg.bar0);
    // the machine's little dance: goal steps on beats during bar 0
    const pat = [0, 5, -4, 6, -6, 3, -2, 4, 0];
    const bt = beatOf(t) - beatOf(cb);
    let gx = 0;
    if (bt < 4.5 && bt >= 0) { const i = Math.floor(bt * 2); gx = lerp(pat[i], pat[i + 1], ease.outBack(clamp((bt * 2 - i) * 2.5))); }
    let gz = 26;
    // draws a line / moves the line (k=3) – goal retreats with the line
    const L3 = cfg.c0 + 3;
    const tDraw = wt(L3, 'draws'), tMoves = wt(L3, 'moves');
    const lineZ = lerp(10, 20, E(t, tMoves, tMoves + 0.45, ease.outBack));
    gz += 14 * E(t, tMoves, tMoves + 0.45, ease.outBack);
    // wall that moves when I call (k=7)
    const L6 = cfg.c0 + 6, L7 = cfg.c0 + 7;
    const isFinal = variant === 'f';
    const tWallUp = barT(cfg.bar0 + 6) - 0.1, tWallMove = isFinal ? 1e9 : wt(L7, 'moves', 0), tCall = wt(L7, 'call');
    let wallZ = 6 + 9 * E(t, tWallMove, tWallMove + 0.5, ease.outBack) + 18 * E(t, tCall, tCall + 0.7, ease.outExpo);
    const wallA = isFinal ? env(t, tWallUp, wt(L7, 0), 0.2, 0.6) * 0.6 : env(t, tWallUp, barT(cfg.bar0 + 8) - 0.1, 0.2, 0.2) * (1 - E(t, tCall + 0.3, tCall + 0.9));
    // ball
    let bx = 0, by = 0.35, bz = 0;
    if (k === 0) { bx = 0.35 * (bt < 4.5 ? lerp(pat[Math.max(0, Math.floor((bt - 0.5) * 2))] || 0, 0, 0) : 0); by = 0.35 + Math.abs(Math.sin(beatOf(t) * Math.PI)) * 0.6; }
    const L1 = cfg.c0 + 1, tHit = wt(L1, 'hit'), tCeil = wt(L1, 'ceiling'), tChance = wt(L1, 'chance');
    if (k === 1) {
      if (t < tHit) by = 0.35;
      else if (t < tCeil + 0.05) by = lerp(0.35, 5.7, ease.outQuad(ramp(t, tHit, tCeil + 0.05)));
      else { const f = ramp(t, tCeil + 0.05, tChance + 0.15); by = lerp(5.7, 0.35, ease.inQuad(f)); if (f >= 1) by = 0.35 + Math.abs(Math.sin((t - tChance - 0.15) * 9)) * 0.6 * Math.exp(-(t - tChance) * 4); }
    }
    if (k === 6 && !isFinal) { const bp = beatPulse(t, 9); bz = 4.3 + 0.9 * bp; }
    if (k === 6 && isFinal) { bz = 2; }
    if (k === 7 && !isFinal) { bz = 4.3 + lerp(0, 6, E(t, tWallMove, tWallMove + 0.8)); }
    if (isFinal && k === 7) bz = lerp(0, 4, E(t, barT(cfg.bar0 + 7), barT(cfg.bar0 + 8)));

    // ---- camera per shot
    const shots = [
      () => ({ p: [lerp(-1.2, 1.2, u) + gx * 0.1, 1.3, -6.5 + u * 1.5], q: [gx * 0.4, 1.4, 22], f: 50 }),
      () => ({ p: [5.5 - u * 1.5, 0.5, -3.5], q: [0, 3.8, 7], f: 62 }),
      () => { const half = t >= T('change', 1) ? 1 : 0; return half ? { p: [-7 + u, 3.5, 2], q: [0, 0.8, 9], f: 52 } : { p: [4, 1.0 + u * 0.5, -5], q: [-1, 1.2, 14], f: 48 }; },
      () => ({ p: [-11 + u * 2, 9.5 - u * 1.5, -6], q: [0, 0, 13], f: 54 }),
      () => ({ p: [1.8 - u * 0.6, 1.25, -3.2 + u * 0.4], q: [0, 1.25, 0], f: 48 }),
      () => ({ p: [0.6, 1.4, 5.5 - u * 1.0], q: [0, 0.75, 0], f: 50 }),
      () => ({ p: [-13 + u, 3.6, -6], q: [0, 1.4, 5.5], f: 46 }),
      () => ({ p: [0, 2.2 + u * 4, -8 - u * 10], q: [0, 1.2, 18], f: 52 }),
    ];
    const sh = isFinal && k === 7 ? { p: [2.6 - u, 1.7, -3.2 - u * 0.8], q: [0, 0.8, 2], f: 50 } : shots[k]();
    const sk = shake(t, 0.05 + kick * 0.08, 6);
    cam.set([sh.p[0] + sk[0], sh.p[1] + sk[1], sh.p[2] + sk[2]], sh.q, sh.f - kick * 2, sk[0] * 0.03);

    // ---- draw
    const hy = sky(ctx, PAL.ink, mix(PAL.night, cfg.glow, isFinal ? 0.06 : 0.12), mix(PAL.deep, cfg.glow, isFinal ? 0.12 : 0.25), cfg.glow, isFinal ? 0.45 + bass * 0.3 : 0.9 + bass * 0.6);
    groundFill(ctx, '#03080b', hy);
    floodlights(ctx, t, { color: cfg.light, intensity: 0.7 + kick * 0.6, gz: 30 });
    // grid colour flips on each "change"
    const L2 = cfg.c0 + 2, ch1 = wt(L2, 'change'), ch2 = wt(L2, 'change', 1);
    const gridC = t >= ch2 && t < barT(cfg.bar0 + 3) ? cfg.accent : t >= ch1 && t < barT(cfg.bar0 + 3) ? PAL.cyan : PAL.chalk;
    grid(ctx, { alpha: 0.3 + kick * 0.35, step: 2, fog: 90, color: gridC });
    pitchMarks(ctx, gx, gz, 0.55);
    // extra goals (chorus 2: a whole field of moving goalposts)
    if (variant === 'c2') {
      for (let i = 0; i < 7; i++) {
        const ox = (hash(i) - 0.5) * 60, oz = 40 + hash(i * 3) * 50; const sway = Math.sin(t * (0.8 + hash(i * 5)) + i) * 6;
        goal(ctx, ox + sway, oz, { alpha: 0.45, net: 0.15, color: hash(i * 7) < 0.4 ? PAL.magenta : PAL.chalk });
      }
    }
    // dance ghosts
    if (k === 0) for (let g = 1; g <= 3; g++) {
      const tg = t - g * 0.04, b2 = beatOf(tg) - beatOf(cb); if (b2 < 0 || b2 >= 4.5) continue;
      const i = Math.floor(b2 * 2); const gg = lerp(pat[i], pat[i + 1], ease.outBack(clamp((b2 * 2 - i) * 2.5)));
      if (Math.abs(gg - gx) > 0.05) goal(ctx, gg, gz, { alpha: 0.3 / g, net: 0, color: cfg.accent });
    }
    goal(ctx, gx, gz, { net: 0.5, color: PAL.chalk });
    // the line (k=3 onwards inside this chorus)
    if (t > tDraw - 0.05 && t < barT(cfg.bar0 + 6)) {
      const dk = E(t, tDraw, wt(L3, 'line') + 0.15, ease.inOutCubic);
      ctx.strokeStyle = cfg.accent; ctx.lineCap = 'round';
      const glowW = 4 + kick * 3;
      ctx.lineWidth = glowW; ctx.beginPath(); poly3(ctx, [[-22, 0.02, lineZ], [22, 0.02, lineZ]], dk); ctx.stroke();
      // old position ghost
      if (t > tMoves) { ctx.globalAlpha = 0.35 * (1 - E(t, tMoves, tMoves + 1.2)); ctx.setLineDash([10, 12]); ctx.lineWidth = 2; ctx.beginPath(); seg3(ctx, -22, 0.02, 10, 22, 0.02, 10); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    }
    // glass ceiling (k=1)
    const ceilA = env(t, barT(cfg.bar0 + 1) - 0.05, barT(cfg.bar0 + 2), 0.15, 0.3);
    if (ceilA > 0) ceiling(ctx, t, 6, { alpha: ceilA, hit: [0, 0], hitAmt: t > tCeil ? 1 - E(t, tCeil + 0.8, tCeil + 1.6) : 0, grow: E(t, tCeil, tCeil + 0.25, ease.outExpo), color: variant === 'c2' ? PAL.magenta : PAL.cyan });
    // wall of small numbers (k=6,7)
    if (wallA > 0) {
      const knocks = [];
      for (let b = 0; b < 4; b++) knocks.push(beatT(Math.round(beatOf(barT(cfg.bar0 + 6))) + b));
      const sk2 = since(t, knocks);
      wall(ctx, t, wallZ, { cols: 9, rows: 5, alpha: wallA, rise: E(t, tWallUp, tWallUp + 0.6), ripple: isFinal ? 0 : 1, ripT: sk2 === Infinity ? 9 : sk2, hitX: bx, hitY: 0.6, seed: Math.floor(beatOf(t)), maxN: 30, numScale: lerp(1, 0.55, E(t, wt(L6, 'small'), wt(L6, 'small') + 0.4)), color: variant === 'c2' ? PAL.magenta : PAL.cyan });
    }
    // crown (k=4) and frame (k=5)
    const L4 = cfg.c0 + 4, tCrown = wt(L4, 'crown'), tName = wt(L4, 'name');
    const crA = env(t, tCrown - 0.05, tName + 0.1, 0.05, 0.6);
    if (crA > 0) {
      const dis = E(t, tName, tName + 0.6);
      crown(ctx, bx, by + 0.55 + dis * 0.4, bz, 0.32, { alpha: crA, draw: E(t, tCrown - 0.05, tCrown + 0.3), color: PAL.amber });
      if (dis > 0) for (let i = 0; i < 24; i++) { const s = cam.p(bx + (hash(i) - 0.5) * dis * 1.6, by + 0.7 + hash(i * 2) * dis * 1.2, bz + (hash(i * 3) - 0.5) * dis); if (s) { ctx.fillStyle = rgba(PAL.amber, 1 - dis); ctx.fillRect(s[0], s[1], 3, 3); } }
    }
    const L5 = cfg.c0 + 5, tFair = wt(L5, 'fair'), tFrame = wt(L5, 'frame');
    const frA = env(t, tFair - 0.2, barT(cfg.bar0 + 6) + (isFinal ? 99 : 0.3), 0.1, 0.3);
    if (frA > 0) frame3(ctx, bx, by + 0.15, bz, 1.5, 1.2, { alpha: frA, draw: E(t, tFrame - 0.1, tFrame + 0.25, ease.outBack), color: cfg.accent, lw: 3 + kick * 2 });
    // handmade things orbit in the final chorus
    if (isFinal) madeOrbit(ctx, t, bx, by, bz, 1);
    // final: the hand-drawn goal of your own (k=7)
    if (isFinal && t > barT(cfg.bar0 + 7) - 0.2) ownGoal(ctx, t, bx, bz, E(t, wt(L7, 'make'), wt(L7, 'call') + 0.3, ease.inOutCubic), cfg.accent);
    // the ball — the work
    const ballGlow = 1 + (t > tFair - 0.1 && t < barT(cfg.bar0 + 6) ? 0.8 * E(t, tFair - 0.1, tFair + 0.3) : 0) + kick * 0.4;
    orb(ctx, bx, by, bz, 0.3, { glowAmt: ballGlow, glow: cfg.accent });
    // call: ring pulse from ball
    if (!isFinal) { const cs = t - tCall; if (cs > 0 && cs < 1) { const r = cs * 9; ctx.strokeStyle = cfg.accent; ctx.lineWidth = 3; ctx.globalAlpha = 1 - cs; const ring = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.283; ring.push([bx + Math.cos(a) * r, 0.02, bz + Math.sin(a) * r]); } ctx.beginPath(); poly3(ctx, ring); ctx.stroke(); ctx.globalAlpha = 1; } }
    dust(ctx, t, { n: 160, alpha: 0.4, range: 30, h: 10, color: cfg.light });
    // compositor
    const cutTimes = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => barT(cfg.bar0 + b)).concat([ch2]);
    const sc = since(t, cutTimes);
    fx.flash = Math.max(0, 1 - sc / 0.18) * (k === 0 && sc < 0.2 ? 0.55 : 0.12);
    fx.rgb = Math.max(0, 1 - since(t, [ch1, ch2, tCeil, tMoves]) / 0.25) * 9 + kick * 2;
    fx.zoom = 1 + kick * 0.012;
    return fx;
  }

  // the hand-made things (bridge onwards) orbiting a point
  const MADE = ['circle', 'tri', 'square', 'star', 'heart', 'house', 'moon', 'wave', 'circle', 'tri', 'star', 'square'];
  function madeOrbit(ctx, t, x, y, z, amt, n = 9) {
    for (let i = 0; i < n; i++) {
      const a = t * 0.6 + i / n * Math.PI * 2, r = 1.3 + 0.25 * Math.sin(t + i);
      const s = cam.p(x + Math.cos(a) * r, y + 0.6 + Math.sin(a * 2 + i) * 0.35, z + Math.sin(a) * r);
      if (!s) continue;
      const R = 0.16 * cam.f / s[2];
      handShape(ctx, MADE[i % MADE.length], s[0], s[1], R, t, { alpha: amt * clamp(R / 6), color: i % 3 ? PAL.cream : PAL.amber, lw: Math.max(1.5, R * 0.12), rot: t * 0.5 + i, seed: i * 7 });
    }
  }
  // a goal drawn by hand around the ball
  function ownGoal(ctx, t, x, z, k, col) {
    if (k <= 0) return;
    const pts = [[-1.6, 0], [-1.6, 1.3], [1.6, 1.3], [1.6, 0]].map(([u, v]) => cam.p(x + u, v, z + 1.2));
    if (pts.some((p) => !p)) return;
    // draw progressively with wobble
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const seg = 3, tot = k * seg;
    ctx.beginPath();
    const fr = Math.floor(t * 12);
    for (let i = 0; i < seg; i++) {
      const f = clamp(tot - i); if (f <= 0) break;
      const a = pts[i], b = pts[i + 1];
      const steps = 8;
      for (let s = 0; s <= steps * f; s++) {
        const q = s / steps; const jx = (hash2(fr, i * 20 + s) - 0.5) * 4, jy = (hash2(fr + 9, i * 20 + s) - 0.5) * 4;
        const X = lerp(a[0], b[0], q) + jx, Y = lerp(a[1], b[1], q) + jy;
        if (s === 0 && i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
    }
    ctx.stroke(); ctx.restore();
  }

  // ======================================================================= VERSE 2 (the feed)
  const V2 = secT('verse2'), V2E = secT('pre2');
  function scroll2(t) {
    // feed scroll distance; the "quicker first phrase" runs at 4x
    const q0 = wt(21, 'quicker'), q1 = wt(21, 'phrase') + 0.3;
    const base = (t - V2) * 2.2;
    const fast = clamp(t - q0, 0, q1 - q0) * 2.2 * 3;
    return base + fast;
  }
  function verse2(ctx, t) {
    const fx = { bloom: 0.55, lyrics: false };
    const z0 = scroll2(t);
    const tCut = wt(20, 'cut');
    const alt = t >= tCut && t < wt(21, 0) - 0.1; // "new cut": different angle
    if (alt) cam.set([6, 9, z0 - 3], [0, 0, z0 + 6], 50, 0.15);
    else cam.set([0, 15, z0 - 5.5], [0, 0, z0 + 4.5], 52);
    const bright = 1 - ramp(t, wt(21, 'brighter'), wt(21, 'brighter') + 0.6);
    const hy = sky(ctx, PAL.ink, PAL.night, PAL.deep, PAL.teal, 0.6);
    groundFill(ctx, '#050c11', hy);
    grid(ctx, { alpha: 0.3 + 0.3 * A('kickD', t), step: 2, fog: 70, z0: z0 - 40, z1: z0 + 120 });
    // pitch marks scrolling past every 30 m — the goal always stays 14 m ahead
    const gz = z0 + 13 + Math.sin(t * 1.3) * 0.6, gxx = Math.sin(t * 0.9) * 2.2;
    pitchMarks(ctx, gxx, gz, 0.5);
    goal(ctx, gxx, gz, { net: 0.4 });
    for (let k = Math.floor((z0 - 30) / 30); k < Math.floor((z0 + 90) / 30); k++) {
      const z = k * 30; ctx.strokeStyle = PAL.chalk; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); seg3(ctx, -34, 0.01, z, 34, 0.01, z);
      const ring = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * 6.283; ring.push([Math.cos(a) * 9.15, 0.01, z + Math.sin(a) * 9.15]); } poly3(ctx, ring); ctx.stroke(); ctx.globalAlpha = 1;
    }
    const bxx = Math.sin(t * 2.1) * 1.2;
    orb(ctx, bxx, 0.35 + Math.abs(Math.sin(beatOf(t) * Math.PI)) * 0.5, z0 + 2.5, 0.3, { glowAmt: 1.2 });
    dust(ctx, t, { n: 90, alpha: 0.3, range: 30, h: 6 });
    if (bright < 1) { ctx.fillStyle = `rgba(255,250,235,${(1 - bright) * 0.0})`; }

    // ---- phone layout & overlay
    const enter = E(t, wt(20, 'format') - 0.25, wt(20, 'format') + 0.1, ease.inOutCubic);
    const leave = E(t, V2E - 0.45, V2E - 0.02, ease.inOutCubic);
    const open = enter * (1 - leave);
    const ph = { w: lerp(W, 562, open), h: lerp(H, 1000, open), r: lerp(0, 46, open) };
    ph.x = (W - ph.w) / 2; ph.y = (H - ph.h) / 2;
    // thumbnail freeze
    const tTh = wt(21, 'thumbnail'), thK = env(t, tTh, wt(21, 'a', 1) - 0.05, 0.18, 0.18);
    fx.layout = { type: 'phone', ...ph, open, thumb: thK, flash: (1 - bright) };
    fx.overlay = (c) => phoneUI(c, t, ph, open, thK);
    fx.rgb = Math.max(0, 1 - since(t, [tCut, wt(25, 'restriction'), wt(25, 'mismatch')]) / 0.25) * 8;
    fx.flash = Math.max(0, 1 - since(t, [tCut, wt(20, 'caption')]) / 0.15) * 0.15;
    return fx;
  }

  function phoneUI(c, t, ph, open, thK) {
    const { x, y, w, h } = ph;
    const ia = clamp(open * 2 - 1);
    if (ia <= 0) { MLY.draw(c, t, { style: 'caption', y: 760 }); return; }
    c.save();
    c.beginPath(); roundRect(c, x, y, w, h, ph.r); c.clip();
    // brighter thumbnail: exposure flash
    const tB = wt(21, 'brighter'); const fl = Math.max(0, 1 - ramp(t, tB, tB + 0.7));
    if (t >= tB && fl > 0) { c.fillStyle = `rgba(255,248,230,${fl * 0.55})`; c.fillRect(x, y, w, h); }
    // top tabs
    c.globalAlpha = ia;
    MU.label(c, 'FEED', x + w / 2, y + 62, { size: 22, weight: 700, align: 'center', alpha: 0.9 * ia, track: 4 });
    c.fillStyle = rgba(PAL.chalk, 0.9); c.fillRect(x + w / 2 - 22, y + 74, 44, 3);
    // right action column, numbers stay small
    const icx = x + w - 52;
    const counts = [7 + Math.floor(clamp((t - V2) / 20) * 3), 2 + (t > wt(22, 'comments') ? 3 : 0), 1];
    [[MU.heart, 0], [MU.chatIcon, 1], [MU.shareIcon, 2]].forEach(([fn, i]) => {
      const yy = y + h * 0.5 + i * 110;
      fn(c, icx, yy, 40, { alpha: 0.9 * ia, color: i === 1 && t > wt(22, 'answer') && t < wt(23, 0) ? PAL.amber : PAL.chalk });
      MU.label(c, String(counts[i]), icx, yy + 52, { size: 18, align: 'center', alpha: 0.8 * ia });
    });
    // progress bar
    const pr = clamp((t - V2) / (V2E - V2));
    c.fillStyle = rgba(PAL.chalk, 0.2); c.fillRect(x + 24, y + h - 34, w - 48, 4);
    c.fillStyle = PAL.chalk; c.fillRect(x + 24, y + h - 34, (w - 48) * pr, 4);
    // speed lines for "quicker first phrase"
    const q0 = wt(21, 'quicker'), q1 = wt(21, 'phrase') + 0.3;
    const sp = env(t, q0, q1, 0.1, 0.2);
    if (sp > 0) {
      c.strokeStyle = rgba(PAL.chalk, 0.5 * sp); c.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const yy = y + ((hash(i) * h + t * 2400 * (0.5 + hash(i * 3))) % h); const xx = x + hash(i * 7) * w; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy - 80 - 120 * hash(i * 9)); c.stroke(); }
      MU.label(c, '⏩ 2×', x + 40, y + 130, { size: 30, weight: 700, alpha: sp, color: PAL.amber });
    }
    // thumbnail tropes
    if (thK > 0) MU.thumbTrope(c, x + w / 2 + 40, y + h * 0.36, 90, E(t, wt(21, 'thumbnail'), wt(21, 'thumbnail') + 0.45));
    // comments sliding in
    const cms = [wt(22, 'answer'), wt(22, 'the'), wt(22, 'comments'), wt(22, 'show')];
    const ca = env(t, cms[0], wt(23, 0) + 0.2, 0.05, 0.3);
    cms.forEach((ct, i) => {
      const k = E(t, ct, ct + 0.3, ease.outBack); if (k <= 0) return;
      MU.bubble(c, x + 30 + (i % 2) * 70 + (1 - k) * 300, y + 210 + i * 76, 330 - (i % 2) * 40, { alpha: ca, mine: i === 1 || i === 3 });
    });
    // eyes drifting through
    const tE = wt(23, 'few'), eyeA = env(t, tE - 0.2, wt(24, 0) + 0.1, 0.2, 0.3);
    if (eyeA > 0) for (let i = 0; i < 3; i++) {
      const p = (t - tE + i * 0.6) / 3.2;
      const ex = x + lerp(-60, w + 60, p), ey = y + 260 + i * 150 + Math.sin(t * 2 + i) * 20;
      const blink = Math.abs(Math.sin(t * 1.3 + i * 2)) > 0.97 ? 0.1 : 1;
      MU.eye(c, ex, ey, 44, t, { alpha: eyeA * 0.9, blink, look: Math.sin(t + i) });
    }
    // limit modal
    const tL = wt(24, 'limit'), tAtt = wt(24, 'attached');
    const ma = env(t, tL, wt(25, 0), 0.05, 0.2);
    if (ma > 0) MU.modal(c, x + w / 2, y + h * 0.42, w - 70, 300, { k: E(t, tL - 0.05, tL + 0.3), alpha: ma, clip: E(t, tAtt, tAtt + 0.3) });
    // quiet restriction: marching dashed red border, shrinking
    const tR = wt(25, 'restriction'), ra = env(t, tR - 0.1, wt(26, 0) + 0.1, 0.1, 0.3);
    if (ra > 0) {
      const ins = 16 + 40 * E(t, tR, tR + 1.6);
      c.strokeStyle = PAL.red; c.lineWidth = 4; c.globalAlpha = ra; c.setLineDash([18, 12]); c.lineDashOffset = -t * 60;
      c.beginPath(); roundRect(c, x + ins, y + ins, w - 2 * ins, h - 2 * ins, 30); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
      // reach mismatch mini graph
      const tM = wt(25, 'reach'); const mk = E(t, tM - 0.1, tM + 0.8);
      if (mk > 0) {
        const gx0 = x + 70, gy0 = y + 200, gw = w - 160, gh = 180;
        MU.axes(c, gx0, gy0, gw, gh, { alpha: ra, draw: mk });
        c.lineWidth = 3; c.globalAlpha = ra;
        c.strokeStyle = PAL.cyan; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(gx0, gy0 + gh * 0.8); c.lineTo(gx0 + gw * mk, gy0 + gh * (0.8 - 0.7 * mk)); c.stroke(); c.setLineDash([]);
        c.strokeStyle = PAL.red; c.beginPath(); c.moveTo(gx0, gy0 + gh * 0.8); for (let i = 1; i <= 20 * mk; i++) { const q = i / 20; c.lineTo(gx0 + gw * q, gy0 + gh * (0.8 - 0.12 * Math.sin(q * 3) + 0.1 * q)); } c.stroke();
        c.globalAlpha = 1;
      }
    }
    // no warning bell, no human reply
    const tBell = wt(26, 'bell'), ba = env(t, wt(26, 0) - 0.1, wt(27, 0), 0.1, 0.3);
    if (ba > 0) MU.bell(c, x + w / 2, y + 300, 70, { alpha: ba, slash: E(t, tBell, tBell + 0.25) });
    const tHum = wt(26, 'no', 1), tRep = wt(26, 'reply');
    const tya = env(t, tHum - 0.1, wt(27, 0) + 0.2, 0.1, 0.3);
    if (tya > 0) MU.typing(c, t, x + 60, y + 460, { alpha: tya, frozen: E(t, tRep, tRep + 0.4) });
    // blank little graph
    const tG = wt(27, 'blank'), gA = env(t, tG - 0.1, V2E - 0.3, 0.15, 0.3);
    if (gA > 0) MU.axes(c, x + 70, y + 180, w - 150, 380, { alpha: gA, draw: E(t, tG - 0.1, wt(27, 'graph') + 0.3) });
    c.restore();
    // captions
    c.save(); c.beginPath(); roundRect(c, x, y, w, h, ph.r); c.clip();
    MLY.draw(c, t, { style: 'caption', cx: x + w / 2 - 20, y: y + h - 190, maxW: w - 150, size: 46 });
    c.restore();
    // phone edge
    c.save(); c.strokeStyle = rgba(PAL.chalk, 0.35 * ia); c.lineWidth = 2; c.beginPath(); roundRect(c, x - 1, y - 1, w + 2, h + 2, ph.r); c.stroke(); c.restore();
    // film cue marks: "I show up on cue"
    const tCue = wt(22, 'cue'), tShow = wt(22, 'show');
    MU.cueMark(c, W - 150, 140, 46, (t >= tShow && t < tShow + 0.12 ? 0.5 : 0) + (t >= tCue && t < tCue + 0.2 ? 1 : 0));
  }

  // ======================================================================= BRIDGE (underneath)
  const BR = secT('bridge'), FA = secT('finalA');
  function bridge(ctx, t) {
    const fx = { bloom: 0.8, lyrics: { style: 'hand' } };
    const tMaster = wt(39, 'master'), tSwitch = wt(39, 'switch'), tUnder = wt(39, 'underneath');
    const tMaking = wt(40, 'making');
    const dive = E(t, wt(39, 0), tMaster + 0.3, ease.inOutCubic);
    // top-down map, then plunge beneath the ground plane
    const camY = lerp(34 - (t - BR) * 1.2, -7, dive);
    const camZ = lerp(-4, -10, dive);
    const tg = dive < 0.5 ? [0, 0, 0] : [0, lerp(0, -10, ease.inOutCubic(clamp(dive * 2 - 1))), lerp(0, 12, dive)];
    const rise = E(t, tMaking - 1, FA, ease.inOutCubic);
    cam.set([Math.sin(t * 0.2) * 2, camY + rise * 3, camZ], [tg[0], tg[1] + rise * 2, tg[2]], 55, dive < 0.5 ? (t - BR) * 0.03 : 0);
    // background: void with stars below ground, map above
    ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, W, H);
    const below = dive > 0.5;
    // map tiles
    const mapA = 1 - E(t, tMaster - 0.3, tMaster + 0.6);
    if (mapA > 0) {
      const inc = E(t, wt(38, 'maybe', 1), wt(38, 'incomplete') + 0.6);
      for (let i = -6; i < 6; i++) for (let j = -6; j < 6; j++) {
        const x0 = i * 6, z0 = j * 6;
        const missing = hash2(i * 3 + 100, j * 7) < 0.15 + 0.5 * inc + 0.15 * Math.sin(t * 2 + i * j) * inc;
        const pts = [[x0, 0, z0], [x0 + 6, 0, z0], [x0 + 6, 0, z0 + 6], [x0, 0, z0 + 6]];
        if (!fill3(ctx, pts)) continue;
        if (missing) {
          ctx.fillStyle = rgba(PAL.gray, 0.08 * mapA); ctx.fill();
          ctx.strokeStyle = rgba(PAL.gray, 0.25 * mapA); ctx.setLineDash([4, 6]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
          // checkerboard of an unloaded tile
          ctx.fillStyle = rgba(PAL.gray, 0.08 * mapA);
          for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if ((a + b) % 2 === 0 && fill3(ctx, [[x0 + a * 2, 0, z0 + b * 2], [x0 + a * 2 + 2, 0, z0 + b * 2], [x0 + a * 2 + 2, 0, z0 + b * 2 + 2], [x0 + a * 2, 0, z0 + b * 2 + 2]])) ctx.fill();
        } else {
          ctx.fillStyle = rgba(PAL.teal, 0.08 * mapA); ctx.fill();
          ctx.strokeStyle = rgba(PAL.chalk, 0.35 * mapA); ctx.lineWidth = 1; ctx.stroke();
          // contour squiggles
          ctx.strokeStyle = rgba(PAL.cyan, 0.25 * mapA); ctx.beginPath();
          for (let c = 0; c < 3; c++) { const pts2 = []; for (let s = 0; s <= 8; s++) pts2.push([x0 + s * 0.75, 0, z0 + 1.5 + c * 1.5 + Math.sin(s + i + j + c) * 0.4]); poly3(ctx, pts2); }
          ctx.stroke();
        }
      }
      // route to a goal that isn't there
      ctx.strokeStyle = PAL.orange; ctx.globalAlpha = mapA; ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); poly3(ctx, [[0, 0.02, 0], [4, 0.02, 6], [3, 0.02, 14], [10, 0.02, 22], [14, 0.02, 28]], 1 - 0.55 * E(t, wt(38, 'incomplete'), wt(38, 'incomplete') + 0.5)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // you are here
      const s = cam.p(0, 0, 0);
      if (s) { const pr = (t * 1.2) % 1; ctx.strokeStyle = PAL.orange; ctx.globalAlpha = mapA * (1 - pr); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s[0], s[1], 10 + pr * 60, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // under the ground: the grid seen from below + the void
    if (below) {
      grid(ctx, { alpha: 0.25 * (1 - E(t, tMaking, tMaking + 3)), step: 3, fog: 60, y: 0 });
      // stars in the void
      for (let i = 0; i < 220; i++) {
        const sx = (hash(i * 1.7) - 0.5) * 120, sy = -6 - hash(i * 2.3) * 60, sz = hash(i * 3.1) * 120 - 10;
        const s = cam.p(sx, sy, sz); if (!s) continue;
        ctx.fillStyle = PAL.chalk; ctx.globalAlpha = 0.25 + 0.5 * hash(i * 9) * (0.6 + 0.4 * Math.sin(t * 2 + i)); ctx.fillRect(s[0], s[1], 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    // the master switch that isn't there
    const swA = env(t, tSwitch - 0.15, tUnder + 0.4, 0.1, 0.6);
    let swScreen = null;
    if (swA > 0) {
      const s = cam.p(0, -4, 8);
      if (s) {
        swScreen = s; const R = 1.6 * cam.f / s[2]; const dis = E(t, tUnder, tUnder + 0.8);
        if (dis < 1) MU.toggle(ctx, s[0], s[1], R, { alpha: swA * (1 - dis), on: 0, color: PAL.chalk });
        for (let i = 0; i < 70 * dis; i++) { const a = hash(i) * 6.283, d = dis * R * (1 + 2 * hash(i * 3)); ctx.fillStyle = rgba(PAL.chalk, (1 - dis) * 0.9); ctx.fillRect(s[0] + Math.cos(a) * d, s[1] + Math.sin(a) * d + dis * dis * 60, 3, 3); }
      }
    }
    // things I believe are true — hand-made shapes bloom in the void
    const spawns = [[wt(40, 'making'), 'circle', -3.5, -5, 10], [wt(40, 'things'), 'tri', 3.2, -6, 11], [wt(40, 'things') + 0.18, 'square', 0.5, -3.5, 12], [wt(40, 'believe'), 'star', -1.8, -7.5, 9],
      [wt(40, 'true'), 'heart', 2.2, -4.2, 8.5]];
    // bass-driven multiplication in the instrumental bars
    for (let i = 0; i < 26; i++) { const tt = wt(40, 'true') + 0.6 + i * (BEAT / 2); if (tt < wt(41, 'feed') + 4) spawns.push([tt, MADE[i % MADE.length], (hash(i * 4) - 0.5) * 16, -3 - hash(i * 5) * 9, 6 + hash(i * 6) * 14]); }
    let made = 0;
    spawns.forEach(([ts, kind, x, y, z], i) => {
      const k = E(t, ts, ts + 0.5, ease.outBack); if (k <= 0) return; made++;
      const yy = y + (t - ts) * 0.35; // they rise on their own
      const s = cam.p(x, yy, z); if (!s) return;
      const R = 0.85 * cam.f / s[2] * k;
      const glow = ctx.createRadialGradient(s[0], s[1], 0, s[0], s[1], R * 2.4);
      glow.addColorStop(0, rgba(PAL.orange, 0.22)); glow.addColorStop(1, rgba(PAL.orange, 0));
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(s[0], s[1], R * 2.4, 0, 7); ctx.fill();
      handShape(ctx, kind, s[0], s[1], R, t, { color: i % 3 === 0 ? PAL.amber : PAL.cream, lw: Math.max(2, R * 0.08), rot: Math.sin(t * 0.7 + i) * 0.3, seed: i * 13, alpha: clamp(k * 1.2), fill: rgba(PAL.orange, 0.06) });
    });
    // the ball sits among them once we are underneath
    if (below) orb(ctx, 0, -4.5 + rise * 2, 8, 0.32, { shadow: false, glowAmt: 1.3 });
    // the feed that won't carry them
    const tFeed = wt(41, 'feed'), tWont = wt(41, "won't");
    const fa = env(t, wt(41, 0) - 0.3, FA - 0.6, 0.4, 0.6);
    fx.overlay2 = (c) => {
      if (fa > 0) {
        const x = 1500, w = 300, y0 = 60, h = 960;
        c.save(); c.globalAlpha = fa; c.strokeStyle = rgba(PAL.chalk, 0.35); c.lineWidth = 2; c.beginPath(); roundRect(c, x, y0, w, h, 26); c.stroke();
        c.beginPath(); roundRect(c, x, y0, w, h, 26); c.clip();
        const stop = E(t, tWont, tWont + 0.6, ease.outCubic);
        const scrollT = (t - (wt(41, 0) - 0.3)) - stop * (t - tWont) * 1; // decelerates to a halt
        const sp = 520, off = (Math.max(0, scrollT) * sp) % 190;
        for (let i = -1; i < 7; i++) {
          const yy = y0 + h - (i * 190 + off);
          c.fillStyle = rgba(stop > 0.5 ? PAL.gray : PAL.deep, 0.9); c.beginPath(); roundRect(c, x + 22, yy, w - 44, 160, 14); c.fill();
          c.strokeStyle = stop > 0.5 ? rgba(PAL.gray, 0.6) : rgba(PAL.cyan, 0.7); c.lineWidth = 2; c.stroke();
          c.fillStyle = rgba(PAL.chalk, 0.3); c.fillRect(x + 42, yy + 112, (w - 90) * (0.4 + 0.5 * hash(i + Math.floor(scrollT * sp / 190))), 10);
        }
        if (stop > 0.3) MU.label(c, 'NOT RECOMMENDED', x + w / 2, y0 + h / 2, { size: 22, weight: 700, color: PAL.red, align: 'center', alpha: stop, track: 3 });
        c.restore();
      }
    };
    fx.made = made;
    fx.flash = Math.max(0, 1 - since(t, [BR]) / 0.3) * 0.4;
    fx.rgb = Math.max(0, 1 - since(t, [tUnder, tWont]) / 0.3) * 7;
    fx.bloom = 0.7 + 0.5 * A('bassS', t);
    return fx;
  }

  // ======================================================================= FINAL (stripped half)
  function finalA(ctx, t) {
    const fx = { bloom: 0.85, lyrics: { style: 'quiet' } };
    const local = t - FA;
    const a = local * 0.12;
    cam.set([Math.sin(a) * 4.5, 1.4 + local * 0.04, -Math.cos(a) * 4.5], [0, 0.9, 0], 46);
    ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, W, H);
    sky(ctx, PAL.ink, PAL.ink, '#05090c', PAL.amber, 0.25);
    grid(ctx, { alpha: 0.08 + 0.08 * A('midS', t), step: 2, fog: 30 });
    goal(ctx, 0, 26, { alpha: 0.18, net: 0 });
    // faint ceiling and faint line on cue
    const tC = wt(43, 'ceiling');
    if (t > tC - 0.1 && t < wt(44, 0)) ceiling(ctx, t, 4, { alpha: 0.35 * env(t, tC, wt(44, 0), 0.1, 0.3), hit: [0, 0], hitAmt: 0.7, grow: E(t, tC, tC + 0.3), color: PAL.amber, x0: -8, x1: 8, z0: -8, z1: 8, step: 2 });
    const tD = wt(45, 'draws'), tMv = wt(45, 'moves');
    if (t > tD - 0.05) {
      const z = lerp(3, 7, E(t, tMv, tMv + 0.4, ease.outBack));
      ctx.strokeStyle = PAL.amber; ctx.lineWidth = 3; ctx.beginPath(); poly3(ctx, [[-6, 0.02, z], [6, 0.02, z]], E(t, tD, wt(45, 'line') + 0.2)); ctx.stroke();
    }
    madeOrbit(ctx, t, 0, 0.35, 0, 0.9, 7);
    orb(ctx, 0, 0.35, 0, 0.3, { glowAmt: 1.1, glow: PAL.amber });
    dust(ctx, t, { n: 80, alpha: 0.35, range: 14, h: 5, color: PAL.cream });
    fx.whiteout = E(t, secT('finalB') - 0.12, secT('finalB'), ease.inQuad) * 0.8;
    return fx;
  }

  // ======================================================================= OUTRO
  const OU = secT('outro'), END = secT('end');
  function outro(ctx, t) {
    const fx = { bloom: 0.7, lyrics: { style: 'page', y: 900, minLine: 50 } };
    const local = t - OU;
    const tChanging = wt(51, 'changing'), tWhy = wt(51, 'why'), tTry = wt(50, 'try');
    const ang = local * 0.09;
    const up = E(t, wt(51, 'still') - 0.4, END + 0.6, ease.inOutCubic);
    cam.set([Math.sin(ang) * 2.2, 5.4 + up * 6 + A('kickD', t) * 0.08, -2.4 - up * 2], [0, 0, 0.3], 50, -0.2 + ang * 0.3);
    const hy = sky(ctx, PAL.ink, PAL.night, PAL.deep, PAL.amber, 0.4);
    groundFill(ctx, '#03080b', hy);
    grid(ctx, { alpha: 0.2 + 0.3 * A('kickD', t), step: 2, fog: 50 });
    // the same page, with what we've made in its margins
    const shuffle = t < tChanging - 0.2 ? 0 : Math.floor((t - (tChanging - 0.2)) / (BEAT / 2)) + E(t, tChanging - 0.2, tChanging, ease.outQuad);
    const wv = MW.page(ctx, t, [0, 0.02, 0], [1.5, 0, 0], [0, 0, 2.1], { alpha: E(t, OU, OU + 0.6), shuffle, strike: t > tChanging ? 0.45 : 0, textW: 3, reveal: E(t, OU, OU + 1.2) });
    // hand-made doodles on the page margin
    const doodles = [['star', 1.25, 1.75], ['heart', -1.2, -1.75], ['circle', 1.2, -1.6], ['house', -1.25, 1.65]];
    doodles.forEach(([kind, u, v], i) => {
      const k = E(t, OU + 0.3 + i * 0.4, OU + 0.8 + i * 0.4); if (k <= 0) return;
      const s = cam.p(u, 0.03, v * 1); if (!s) return;
      handShape(ctx, kind, s[0], s[1], 0.18 * cam.f / s[2], t, { color: PAL.amber, lw: 2.5, alpha: k, seed: i * 5 });
    });
    // the goal drawn on the page keeps moving: once per beat after "changing"
    const gStep = t < tChanging ? 0 : Math.floor((t - tChanging) / BEAT) + 1;
    const gK = t < tChanging ? 0 : E(t, tChanging + (gStep - 1) * BEAT, tChanging + (gStep - 1) * BEAT + 0.2, ease.outBack);
    const gx0 = (hash(gStep - 1) - 0.5) * 1.6, gx1 = (hash(gStep) - 0.5) * 1.6;
    const gpx = gStep ? lerp(gx0, gx1, gK) : 0;
    ctx.strokeStyle = PAL.chalk; ctx.lineWidth = 2.5; ctx.beginPath();
    poly3(ctx, [[gpx - 0.4, 0.03, 1.5], [gpx - 0.4, 0.03, 1.75], [gpx + 0.4, 0.03, 1.75], [gpx + 0.4, 0.03, 1.5]]); ctx.stroke();
    // one more try: the ball rolls onto the page
    const roll = E(t, tTry - 0.6, tTry + 0.4, ease.outCubic);
    orb(ctx, lerp(2.8, 0, roll), 0.12, lerp(-2.6, -0.8, roll), 0.12, { glowAmt: 1.2 });
    floodlights(ctx, t, { color: '#ffe2b0', intensity: 0.4 + A('kickD', t) * 0.5, gz: 0, towers: [[-30, 30], [30, 30], [-30, -30], [30, -30]] });
    fx.flash = Math.max(0, 1 - since(t, [OU]) / 0.25) * 0.5;
    fx.rgb = t > tChanging ? beatPulse(t, 10, 2) * 4 : 0;
    fx.zoom = 1 + up * 0.02;
    return fx;
  }

  // ======================================================================= END CARD
  function endCard(ctx, t) {
    ctx.fillStyle = PAL.ink; ctx.fillRect(0, 0, W, H);
    const k = E(t, END, END + 0.9);
    ctx.save();
    ctx.textAlign = 'center'; ctx.font = '900 150px Archivo, sans-serif'; ctx.fillStyle = PAL.chalk; ctx.globalAlpha = k;
    ctx.fillText('MOVING', W / 2, 470);
    // GOALPOSTS keeps sliding a little, forever
    const sl = Math.sin((t - END) * 1.3) * 30 * k;
    ctx.fillStyle = PAL.orange; ctx.fillText('GOALPOSTS', W / 2 + sl, 620);
    ctx.font = '400 30px "JetBrains Mono", monospace'; ctx.fillStyle = PAL.chalk; ctx.globalAlpha = k * 0.75;
    ctx.letterSpacing = '8px';
    ctx.fillText('nebulaglow', W / 2, 720);
    ctx.restore();
    // chalk line under
    ctx.strokeStyle = PAL.chalk; ctx.globalAlpha = 0.5 * k; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 360 * k, 660); ctx.lineTo(W / 2 + 360 * k, 660); ctx.stroke(); ctx.globalAlpha = 1;
    return { bloom: 0.6, lyrics: t < END + 1.2 ? { style: 'page', y: 900, x: W / 2 - 560 } : false, hud: false };
  }

  // ======================================================================= dispatch
  function render(ctx, t) {
    const s = section(t);
    ctx.save();
    let fx;
    switch (s.name) {
      case 'intro': fx = intro(ctx, t); break;
      case 'verse1': fx = verse1(ctx, t); break;
      case 'pre1': fx = pre(ctx, t, false); break;
      case 'chorus1': fx = chorus(ctx, t, 'c1'); break;
      case 'verse2': fx = verse2(ctx, t); break;
      case 'pre2': fx = pre(ctx, t, true); break;
      case 'chorus2': fx = chorus(ctx, t, 'c2'); break;
      case 'bridge': fx = bridge(ctx, t); break;
      case 'finalA': fx = finalA(ctx, t); break;
      case 'finalB': fx = chorus(ctx, t, 'f'); break;
      case 'outro': fx = outro(ctx, t); break;
      default: fx = endCard(ctx, t);
    }
    ctx.restore();
    fx.section = s;
    // section cut flash
    const cut = t - s.t0;
    if (cut >= 0 && cut < 0.2 && s.i > 0 && fx.flash == null) fx.flash = (1 - cut / 0.2) * 0.35;
    return fx;
  }

  window.MS = { render };
})();
