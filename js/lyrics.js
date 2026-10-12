/* Moving Goalposts — kinetic, word-synced typography. */
(function () {
  'use strict';
  const { W, H, clamp, lerp, ramp, ease, E, hash, hash2, LINES, BEAT, beatOf, PAL, rgba, mix } = MG;

  const mcache = new Map();
  function mw(ctx, font, s) {
    const k = font + '|' + s; let v = mcache.get(k);
    if (v === undefined) { ctx.font = font; v = ctx.measureText(s).width; mcache.set(k, v); }
    return v;
  }

  // active line at time t (with lead-in), and the previous one
  function activeLine(t, lead = 0.25) {
    let idx = -1;
    for (let i = 0; i < LINES.length; i++) if (t >= LINES[i].t - lead) idx = i; else break;
    return idx;
  }

  const SCR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&?!<>/';
  const scramble = (word, t, t0, dur = 0.28) => {
    const k = clamp((t - t0) / dur);
    if (k >= 1) return word;
    const n = word.length; const fixed = Math.floor(k * n); let out = '';
    const fr = Math.floor(t * 30);
    for (let i = 0; i < n; i++) out += i < fixed || /[^A-Za-z]/.test(word[i]) ? word[i] : SCR[Math.floor(hash2(fr, i) * SCR.length)];
    return out;
  };

  // ---- layout a line into rows of words ----
  function layout(ctx, words, font, maxW, sizePx, spaceK = 0.28) {
    const sp = sizePx * spaceK;
    const rows = [[]]; let x = 0;
    words.forEach((w) => {
      const ww = mw(ctx, font, w.txt);
      if (x > 0 && x + ww > maxW) { rows.push([]); x = 0; }
      rows[rows.length - 1].push({ ...w, x, ww }); x += ww + sp;
    });
    rows.forEach((r) => { const last = r[r.length - 1]; r.w = last ? last.x + last.ww : 0; });
    return rows;
  }

  // style presets per section
  function styleFor(sec) {
    switch (sec) {
      case 'intro': case 'outro': return 'page';
      case 'verse1': return 'verse';
      case 'pre1': case 'pre2': return 'pre';
      case 'chorus1': case 'chorus2': case 'finalB': return 'chorus';
      case 'verse2': return 'caption';
      case 'bridge': return 'hand';
      case 'finalA': return 'quiet';
      default: return 'verse';
    }
  }

  // Which section a line belongs to (by its start time)
  function secOfLine(L) { return MG.section(L.t + 0.01).name; }

  function draw(ctx, t, opts = {}) {
    const li = activeLine(t, 0.3);
    if (li < 0 || li < (opts.minLine || 0)) return;
    const L = LINES[li];
    const next = LINES[li + 1];
    const endT = next ? Math.min(next.t - 0.3, L.e + 2.6) : L.e + 3;
    const sec = secOfLine(L);
    let style = opts.style || styleFor(sec);
    const out = clamp((t - endT) / 0.35);
    if (out >= 1 && style !== 'verse') { /* still allow previous-line ghosts in verse */ }
    const ctxA = 1 - out;
    if (ctxA <= 0 && style !== 'verse') return;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    const fn = STYLES[style] || STYLES.verse;
    fn(ctx, t, L, li, ctxA, opts);
    ctx.restore();
  }

  // ------------------------------------------------------------------ styles
  const STYLES = {};

  // typewriter on the page (intro / outro)
  STYLES.page = function (ctx, t, L, li, alpha, o) {
    const size = 50, font = `400 ${size}px "JetBrains Mono", monospace`;
    ctx.font = font;
    const words = L.w.map((w) => ({ txt: w.w.replace(/[“”]/g, ''), t: w.t, e: w.e }));
    const rows = layout(ctx, words, font, 1250, size, 0.6);
    const x0 = o.x ?? 150, y0 = o.y ?? 860 - (rows.length - 1) * 66;
    // prompt glyph
    ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = PAL.cyan; ctx.fillText('>', x0 - 48, y0);
    let lastX = x0, lastY = y0, lastDone = true;
    rows.forEach((row, ri) => {
      row.forEach((w) => {
        const n = w.txt.length; const k = clamp((t - w.t) / Math.max(0.08, Math.min(0.45, (w.e - w.t) * 0.8)));
        const shown = Math.floor(k * n + 0.0001);
        const y = y0 + ri * 66;
        if (t >= w.t - 0.02) {
          ctx.globalAlpha = alpha; ctx.fillStyle = (t < w.e + 0.05) ? PAL.cream : rgba(PAL.cream, 0.82);
          ctx.fillText(w.txt.slice(0, Math.max(shown, 0)), x0 + w.x, y);
          lastX = x0 + w.x + mw(ctx, font, w.txt.slice(0, shown)); lastY = y; lastDone = shown >= n;
        } else {
          ctx.globalAlpha = alpha * 0.1; ctx.fillStyle = PAL.cream; ctx.fillText(w.txt, x0 + w.x, y);
        }
      });
    });
    // block cursor
    if (Math.floor(t * 2.6) % 2 === 0 || !lastDone) { ctx.globalAlpha = alpha * 0.9; ctx.fillStyle = PAL.cyan; ctx.fillRect(lastX + 6, lastY - size * 0.78, size * 0.55, size * 0.95); }
  };

  // editorial verse: light weight, rhyme word heavy; previous line drifts up
  STYLES.verse = function (ctx, t, L, li, alpha, o) {
    const size = 74;
    const draw1 = (Lx, a, yOff, scale) => {
      const words = Lx.w.map((w, i) => ({ txt: w.w, t: w.t, e: w.e, last: i === Lx.w.length - 1 }));
      const fl = `300 ${size}px Archivo, sans-serif`, fb = `900 ${size}px Archivo, sans-serif`;
      // layout with mixed fonts
      let x = 0; const sp = size * 0.26; const items = [];
      words.forEach((w) => { const f = w.last ? fb : fl; const ww = mw(ctx, f, w.txt); items.push({ ...w, x, ww, f }); x += ww + sp; });
      const x0 = 130, y0 = 905 + yOff;
      ctx.save(); ctx.translate(x0, y0); ctx.scale(scale, scale);
      items.forEach((w) => {
        const k = E(t, w.t - 0.05, w.t + 0.16);
        const ghost = 0.12;
        const act = t >= w.t && t < w.e + 0.08;
        ctx.font = w.f;
        ctx.globalAlpha = a * lerp(ghost, 1, k);
        ctx.fillStyle = w.last ? (k > 0 ? PAL.orange : PAL.chalk) : (act ? '#ffffff' : PAL.chalk);
        ctx.fillText(w.txt, w.x, (1 - k) * 22);
      });
      // underline sweeping the sung portion
      const first = items[0], last = items[items.length - 1];
      const prog = clamp((t - first.t) / Math.max(0.1, last.e - first.t));
      ctx.globalAlpha = a * 0.5; ctx.fillStyle = PAL.cyan;
      ctx.fillRect(0, 22, (last.x + last.ww) * prog, 3);
      ctx.restore();
    };
    const prev = LINES[li - 1];
    const tin = E(t, L.t - 0.3, L.t + 0.1, ease.outCubic);
    if (prev && MG.section(prev.t + 0.01).name === MG.section(L.t + 0.01).name) draw1(prev, alpha * 0.32 * (1 - 0.0 * tin), -100 * tin, lerp(1, 0.78, tin));
    draw1(L, alpha, 0, 1);
  };

  // pre-chorus: stacked, slamming uppercase
  STYLES.pre = function (ctx, t, L, li, alpha, o) {
    const size = o.size || 140, font = `900 ${size}px Archivo, sans-serif`;
    ctx.font = font; ctx.textAlign = 'left';
    // phrases split at commas, each phrase may wrap; all rows stacked and centred
    const parts = [[]]; L.w.forEach((w) => { parts[parts.length - 1].push(w); if (/,$/.test(w.w)) parts.push([]); });
    const rows = [];
    parts.filter((p) => p.length).forEach((p) => {
      const words = p.map((w) => ({ txt: w.w.replace(/,$/, '').toUpperCase(), t: w.t, e: w.e }));
      layout(ctx, words, font, 1500, size, 0.22).forEach((r) => rows.push(r));
    });
    const lh = size * 0.98;
    const yC = o.y ?? 470;
    rows.forEach((row, ri) => {
      const y = yC - (rows.length - 1) * lh / 2 + ri * lh + size * 0.36;
      const x0 = W / 2 - row.w / 2;
      row.forEach((w) => {
        const k = ramp(t, w.t - 0.03, w.t + 0.12);
        if (k <= 0) { ctx.globalAlpha = alpha * 0.06; ctx.fillStyle = PAL.chalk; ctx.fillText(w.txt, x0 + w.x, y); return; }
        const s = lerp(1.5, 1, ease.outExpo(k));
        const act = t >= w.t && t < w.e + 0.1;
        ctx.save(); ctx.translate(x0 + w.x + w.ww / 2, y - size * 0.35); ctx.scale(s, s);
        ctx.globalAlpha = alpha * k;
        ctx.fillStyle = act ? (o.accent || PAL.cyan) : PAL.chalk;
        ctx.fillText(w.txt, -w.ww / 2, size * 0.35);
        ctx.restore();
      });
    });
  };

  // chorus: big, centered, word FX
  STYLES.chorus = function (ctx, t, L, li, alpha, o) {
    const sec = MG.section(L.t + 0.01).name;
    const accent = o.accent || (sec === 'finalB' ? PAL.amber : sec === 'chorus2' ? PAL.magenta : PAL.orange);
    const size = o.size || 106, font = `900 ${size}px Archivo, sans-serif`;
    ctx.font = font;
    const words = L.w.map((w) => ({ txt: w.w.toUpperCase().replace(/[“”]/g, ''), n: w.n, t: w.t, e: w.e, wi: w.wi }));
    const rows = layout(ctx, words, font, 1660, size, 0.24);
    const lh = size * 1.0;
    const yC = o.y ?? 300;
    const y0 = yC - (rows.length - 1) * lh / 2 + size * 0.36;
    // line exit (pushed up by next line)
    const nxt = LINES[li + 1];
    const exitK = nxt ? E(t, nxt.t - 0.3, nxt.t - 0.05, ease.inCubic) : 0;
    rows.forEach((row, ri) => {
      const x0 = W / 2 - row.w / 2, y = y0 + ri * lh - exitK * 60;
      row.forEach((w) => {
        const k = ramp(t, w.t - 0.04, w.t + 0.14);
        const act = t >= w.t && t < w.e + 0.06;
        let txt = w.txt, dx = 0, dy = 0, sx = 1, sy = 1, col = act ? accent : PAL.chalk, perLetter = null, a = alpha * (1 - exitK);
        if (k <= 0) { ctx.globalAlpha = a * 0.08; ctx.fillStyle = PAL.chalk; ctx.fillText(txt, x0 + w.x, y); return; }
        const sPop = lerp(1.35, 1, ease.outExpo(k));
        const n = w.n;
        if (n === 'change' || n === 'words' || n === 'time') txt = scramble(txt, t, w.t, 0.32);
        if (n === 'dance') perLetter = (i) => [0, Math.sin(beatOf(t) * Math.PI * 2 + i * 0.9) * 14 * clamp((t - w.t) * 3)];
        if (n === 'ceiling') { const h = E(t, w.t, w.t + 0.12, ease.outQuad) - E(t, w.t + 0.12, w.t + 0.5, ease.outBack); dy = -60 * h; sy = 1 - 0.25 * Math.max(0, h - 0.6); }
        if (n === 'knocking') { const bp = MG.beatPulse(t, 10, 2); dx = (hash(Math.floor(t * 24)) - 0.5) * 18 * bp; }
        if (n === 'small') { sx = sy = lerp(1, 0.42, E(t, w.t, w.t + 0.4)); }
        if (n === 'moves') { dx = 0; }
        if (n === 'line' && L.w.filter((q) => q.n === 'line').indexOf(L.w[w.wi]) === 1) dx = 140 * E(t, w.t, w.t + 0.35, ease.outBack);
        if (n === 'crown') col = act ? PAL.amber : mix(PAL.chalk, PAL.amber, 0.5);
        if (n === 'name') { const kk = E(t, w.t + 0.25, w.t + 0.8); txt = txt.split('').map((c, i) => (hash(i + 3) < kk ? '_' : c)).join(''); }
        if (n === 'wall') col = act ? PAL.cyan : PAL.chalk;
        ctx.save();
        ctx.translate(x0 + w.x + w.ww / 2 + dx, y - size * 0.36 + dy);
        ctx.scale(sPop * sx, sPop * sy);
        ctx.globalAlpha = a * clamp(k * 1.5);
        ctx.fillStyle = col;
        if (perLetter) {
          let xx = -w.ww / 2;
          txt.split('').forEach((c, i) => { const [ox, oy] = perLetter(i); ctx.fillText(c, xx + ox, size * 0.36 + oy); xx += mw(ctx, font, c); });
        } else ctx.fillText(txt, -w.ww / 2, size * 0.36);
        if (n === 'frame' && t > w.t) {
          const fk = E(t, w.t, w.t + 0.35);
          const bw = w.ww / 2 + 26, bh = size * 0.62, Lk = 26 * fk;
          ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.beginPath();
          [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx2, sy2]) => {
            ctx.moveTo(sx2 * bw, sy2 * bh - sy2 * Lk); ctx.lineTo(sx2 * bw, sy2 * bh); ctx.lineTo(sx2 * bw - sx2 * Lk, sy2 * bh);
          });
          ctx.stroke();
        }
        if (n === 'line' && L.w.filter((q) => q.n === 'line').indexOf(L.w[w.wi]) === 0 && t > w.t) {
          ctx.fillStyle = accent; ctx.fillRect(-w.ww / 2, size * 0.45, w.ww * E(t, w.t, w.t + 0.3), 7);
        }
        ctx.restore();
      });
    });
  };

  // verse 2: social-video burned-in captions (inside phone frame)
  STYLES.caption = function (ctx, t, L, li, alpha, o) {
    const size = o.size || 50, font = `800 ${size}px Archivo, sans-serif`;
    ctx.font = font;
    const words = L.w.map((w) => ({ txt: w.w.replace(/[“”]/g, ''), n: w.n, t: w.t, e: w.e }));
    const rows = layout(ctx, words, font, o.maxW || 470, size, 0.26);
    const cx = o.cx ?? W / 2, y0 = (o.y ?? 760) - (rows.length - 1) * size * 1.15;
    rows.forEach((row, ri) => {
      const x0 = cx - row.w / 2, y = y0 + ri * size * 1.15;
      row.forEach((w) => {
        const k = ramp(t, w.t - 0.03, w.t + 0.08);
        if (k <= 0) return;
        const act = t >= w.t && t < w.e + 0.05;
        let sx = 1;
        if (w.n === 'why') sx = lerp(1, 2.6, E(t, w.t, w.t + 0.9, ease.outCubic));
        const s = lerp(1.25, 1, ease.outBack(clamp(k))) ;
        ctx.save(); ctx.translate(x0 + w.x + w.ww / 2, y - size * 0.35); ctx.scale(s * sx, s);
        ctx.globalAlpha = alpha;
        if (act) { ctx.fillStyle = PAL.amber; ctx.beginPath(); MG.roundRect(ctx, -w.ww / 2 - 10, -size * 0.62, w.ww + 20, size * 1.14, 8); ctx.fill(); }
        ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round';
        if (!act) ctx.strokeText(w.txt, -w.ww / 2, size * 0.35);
        ctx.fillStyle = act ? '#101010' : '#ffffff';
        ctx.fillText(w.txt, -w.ww / 2, size * 0.35);
        ctx.restore();
      });
    });
  };

  // bridge: handwriting revealed left->right with each word
  STYLES.hand = function (ctx, t, L, li, alpha, o) {
    const size = 96, font = `500 ${size}px Caveat, cursive`;
    ctx.font = font;
    const words = L.w.map((w) => ({ txt: w.w, t: w.t, e: w.e }));
    const rows = layout(ctx, words, font, 1400, size, 0.3);
    const y0 = (o.y ?? 900) - (rows.length - 1) * size;
    rows.forEach((row, ri) => {
      const x0 = W / 2 - row.w / 2, y = y0 + ri * size;
      row.forEach((w) => {
        const k = E(t, w.t - 0.02, Math.min(w.e, w.t + 0.45), ease.outQuad);
        if (k <= 0) return;
        ctx.save(); ctx.beginPath(); ctx.rect(x0 + w.x - 10, y - size, (w.ww + 20) * k, size * 1.4); ctx.clip();
        ctx.globalAlpha = alpha; ctx.fillStyle = PAL.cream; ctx.fillText(w.txt, x0 + w.x, y);
        ctx.restore();
      });
    });
  };

  // final chorus, stripped half: small, spaced, intimate
  STYLES.quiet = function (ctx, t, L, li, alpha, o) {
    const size = 54, font = `500 ${size}px Archivo, sans-serif`;
    ctx.font = font;
    const words = L.w.map((w) => ({ txt: w.w.toLowerCase(), t: w.t, e: w.e }));
    const rows = layout(ctx, words, font, 1400, size, 0.45);
    rows.forEach((row, ri) => {
      const x0 = W / 2 - row.w / 2, y = (o.y ?? 860) + ri * size * 1.3;
      row.forEach((w) => {
        const k = E(t, w.t - 0.05, w.t + 0.35);
        ctx.globalAlpha = alpha * lerp(0.1, 1, k);
        ctx.fillStyle = t >= w.t && t < w.e ? PAL.amber : PAL.chalk;
        ctx.fillText(w.txt, x0 + w.x, y + (1 - k) * 10);
      });
    });
  };

  window.MLY = { draw, activeLine, styleFor, scramble };
})();
