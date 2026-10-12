/* Moving Goalposts — screen-space interface glyphs (the "algorithm" layer). */
(function () {
  'use strict';
  const { W, H, clamp, lerp, ramp, ease, E, hash, hash2, PAL, rgba, roundRect } = MG;

  const mono = (s, w = 400) => `${w} ${s}px "JetBrains Mono", monospace`;

  function label(ctx, txt, x, y, o = {}) {
    ctx.save(); ctx.font = mono(o.size || 20, o.weight || 400); ctx.fillStyle = o.color || PAL.chalk; ctx.globalAlpha = o.alpha ?? 0.7;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.track) { ctx.letterSpacing = o.track + 'px'; }
    ctx.fillText(txt, x, y); ctx.restore();
  }

  // timeline of clips; trims: array of [time, clipIndex]
  function timeline(ctx, t, x, y, w, h, o = {}) {
    const n = o.clips || 9, a = o.alpha ?? 1;
    ctx.save(); ctx.globalAlpha = a;
    // track
    ctx.strokeStyle = rgba(PAL.cyan, 0.5); ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    const cw = w / n;
    for (let i = 0; i < n; i++) {
      let trim = 0;
      (o.trims || []).forEach(([tt, ci]) => { if (ci === i) trim = Math.max(trim, E(t, tt, tt + 0.18, ease.outExpo) * 0.42); });
      const appear = o.appear == null ? 1 : clamp(o.appear * n - i);
      if (appear <= 0) continue;
      const x0 = x + i * cw + 3, ww = (cw - 6) * (1 - trim) * appear;
      ctx.fillStyle = rgba(i % 3 === 0 ? PAL.teal : PAL.deep, 0.9); ctx.fillRect(x0, y + 4, ww, h - 8);
      ctx.strokeStyle = rgba(PAL.cyan, 0.8); ctx.strokeRect(x0, y + 4, ww, h - 8);
      // waveform marks
      ctx.fillStyle = rgba(PAL.cyan, 0.45);
      for (let k = 0; k < ww - 6; k += 6) { const hh = (0.2 + 0.8 * hash2(i, k)) * (h - 20) / 2; ctx.fillRect(x0 + 3 + k, y + h / 2 - hh, 2, hh * 2); }
      // trim flash line
      (o.trims || []).forEach(([tt, ci]) => {
        if (ci !== i) return; const f = 1 - ramp(t, tt, tt + 0.35);
        if (t >= tt && f > 0) { ctx.fillStyle = rgba(PAL.red, f); ctx.fillRect(x0 + ww - 2, y - 10, 4, h + 20); }
      });
    }
    // playhead
    if (o.play != null) {
      const px = x + w * clamp(o.play);
      ctx.fillStyle = PAL.orange; ctx.fillRect(px - 1.5, y - 16, 3, h + 32);
      ctx.beginPath(); ctx.moveTo(px - 9, y - 16); ctx.lineTo(px + 9, y - 16); ctx.lineTo(px, y - 6); ctx.fill();
    }
    ctx.restore();
  }

  // viewfinder corner brackets
  function brackets(ctx, cx, cy, w, h, o = {}) {
    const L = o.len || 40; ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = o.lw || 3;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const X = cx + sx * w / 2, Y = cy + sy * h / 2;
      ctx.moveTo(X, Y - sy * L); ctx.lineTo(X, Y); ctx.lineTo(X - sx * L, Y);
    }
    ctx.stroke();
    if (o.cross) { ctx.globalAlpha *= 0.6; ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.lineTo(cx + 14, cy); ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy + 14); ctx.stroke(); }
    ctx.restore();
  }

  // stream of comment bars (threads)
  function threads(ctx, t, x, y, w, h, o = {}) {
    const a = o.alpha ?? 1, speed = o.speed || 120;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.globalAlpha = a;
    const rowH = 62, off = (t * speed) % rowH;
    for (let i = -1; i < h / rowH + 2; i++) {
      const id = Math.floor(t * speed / rowH) + i;
      const yy = y + h - (i * rowH + off);
      const indent = (hash(id) < 0.4 ? 40 : 0);
      ctx.fillStyle = rgba(PAL.cyan, 0.5); ctx.beginPath(); ctx.arc(x + indent + 14, yy + 14, 11, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(PAL.chalk, 0.45);
      ctx.fillRect(x + indent + 36, yy + 6, (w - indent - 50) * (0.4 + 0.6 * hash(id * 3.3)), 8);
      ctx.fillStyle = rgba(PAL.chalk, 0.25);
      ctx.fillRect(x + indent + 36, yy + 22, (w - indent - 50) * (0.2 + 0.5 * hash(id * 7.1)), 8);
      if (indent) { ctx.strokeStyle = rgba(PAL.cyan, 0.3); ctx.beginPath(); ctx.moveTo(x + 14, yy - 20); ctx.lineTo(x + 14, yy + 14); ctx.lineTo(x + indent, yy + 14); ctx.stroke(); }
    }
    ctx.restore();
  }

  function pauseIcon(ctx, cx, cy, s, o = {}) {
    const cut = o.cut || 0; // 0..1 split
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = o.color || PAL.chalk;
    const bw = s * 0.28, bh = s, gap = s * 0.2;
    const drawBars = () => { ctx.fillRect(cx - gap / 2 - bw, cy - bh / 2, bw, bh); ctx.fillRect(cx + gap / 2, cy - bh / 2, bw, bh); };
    if (cut <= 0) { drawBars(); ctx.restore(); return; }
    // diagonal cut: upper-left half and lower-right half slide apart
    const d = cut * s * 0.6, fall = cut * cut * s * 1.4;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      if (side < 0) { ctx.moveTo(cx - s, cy - s * 0.7); ctx.lineTo(cx + s, cy - s * 0.7 - s * 0.6 + s * 0.6); ctx.lineTo(cx + s, cy + s * 0.1 - s * 0.6); ctx.lineTo(cx - s, cy + s * 0.5); ctx.closePath(); }
      ctx.beginPath();
      // cut line: y = cy + (x-cx)*-0.35
      const yl = (X) => cy - (X - cx) * 0.35;
      if (side < 0) { ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + s, yl(cx + s)); ctx.lineTo(cx - s, yl(cx - s)); }
      else { ctx.moveTo(cx - s, yl(cx - s)); ctx.lineTo(cx + s, yl(cx + s)); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx - s, cy + s); }
      ctx.closePath(); ctx.clip();
      ctx.translate(side * d, side * d * 0.35 + (side > 0 ? fall : -fall * 0.3));
      ctx.rotate(side * cut * 0.15);
      ctx.globalAlpha *= 1 - cut * 0.6;
      drawBars();
      ctx.restore();
    }
    // cut flash
    ctx.globalAlpha = (o.alpha ?? 1) * (1 - cut); ctx.strokeStyle = PAL.red; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - s * 1.2, cy + s * 1.2 * 0.35); ctx.lineTo(cx + s * 1.2, cy - s * 1.2 * 0.35); ctx.stroke();
    ctx.restore();
  }

  // vertical sliders bank
  function sliders(ctx, t, x, y, h, o = {}) {
    const n = o.n || 5, gap = o.gap || 54, a = o.alpha ?? 1, moves = o.moves || [];
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) {
      const X = x + i * gap;
      ctx.strokeStyle = rgba(PAL.chalk, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, y); ctx.lineTo(X, y + h); ctx.stroke();
      for (let k = 0; k <= 10; k++) { ctx.fillStyle = rgba(PAL.chalk, 0.25); ctx.fillRect(X - 8, y + k * h / 10, 5, 1.5); }
      // value: steps at each move time
      let v = hash2(i, 0.5), prev = v;
      moves.forEach((mt, mi) => { if (t >= mt) { prev = v; v = hash2(i, mi + 1); } });
      const lastMove = moves.filter((mt) => t >= mt).pop();
      const k = lastMove == null ? 1 : E(t, lastMove + i * 0.03, lastMove + i * 0.03 + 0.22, ease.outBack);
      const val = lerp(prev, v, k);
      const ky = y + h * (1 - val);
      ctx.fillStyle = rgba(PAL.cyan, 0.25); ctx.fillRect(X - 2, ky, 4, y + h - ky);
      ctx.fillStyle = PAL.chalk; roundRect(ctx, X - 16, ky - 8, 32, 16, 4); ctx.beginPath(); roundRect(ctx, X - 16, ky - 8, 32, 16, 4); ctx.fill();
      label(ctx, (val * 100).toFixed(0), X, y + h + 30, { align: 'center', size: 16, alpha: 0.6 * a });
    }
    ctx.restore();
  }

  // A/B test cards, flip on each time in flips
  function abCards(ctx, t, x, y, o = {}) {
    const flips = o.flips || [], a = o.alpha ?? 1;
    let nf = 0; let lastF = -10; flips.forEach((f) => { if (t >= f) { nf++; lastF = f; } });
    ctx.save(); ctx.globalAlpha = a;
    ['A', 'B'].forEach((L, i) => {
      const fk = E(t, lastF + i * 0.06, lastF + i * 0.06 + 0.3, ease.outCubic);
      const sx = Math.abs(Math.cos(fk * Math.PI));
      const X = x + i * 190, w = 160, h = 210;
      ctx.save(); ctx.translate(X + w / 2, y + h / 2); ctx.scale(Math.max(0.02, sx), 1);
      ctx.fillStyle = rgba(PAL.deep, 0.85); ctx.beginPath(); roundRect(ctx, -w / 2, -h / 2, w, h, 12); ctx.fill();
      ctx.strokeStyle = i ? PAL.orange : PAL.cyan; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = `900 84px Archivo, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = i ? PAL.orange : PAL.cyan;
      ctx.fillText(L, 0, 10);
      const pct = (0.8 + hash2(nf, i) * 2.6).toFixed(1) + '%';
      ctx.font = mono(24, 700); ctx.fillStyle = PAL.chalk; ctx.fillText(pct, 0, 70);
      ctx.restore();
    });
    ctx.restore();
  }

  function barChart(ctx, t, x, y, w, h, o = {}) {
    const n = o.n || 7, a = o.alpha ?? 1, grow = o.grow ?? 1;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = rgba(PAL.chalk, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
    const bw = w / n * 0.6;
    for (let i = 0; i < n; i++) {
      const v = (o.values ? o.values[i] : 0.08 + 0.1 * hash(i * 5.5)) * clamp(grow * n - i);
      const X = x + (i + 0.5) * w / n - bw / 2;
      ctx.fillStyle = i === o.hi ? PAL.orange : rgba(PAL.cyan, 0.7); ctx.fillRect(X, y + h - h * v, bw, h * v);
    }
    // the "best" line, unreachable
    if (o.target != null) { ctx.setLineDash([8, 8]); ctx.strokeStyle = rgba(PAL.red, 0.8); ctx.beginPath(); ctx.moveTo(x, y + h * (1 - o.target)); ctx.lineTo(x + w, y + h * (1 - o.target)); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
  }

  function eye(ctx, x, y, s, t, o = {}) {
    const blink = o.blink ?? 1; // 1 open
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = o.alpha ?? 1;
    ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.75 * blink, s, 0); ctx.quadraticCurveTo(0, s * 0.75 * blink, -s, 0); ctx.stroke();
    if (blink > 0.3) { ctx.fillStyle = o.color || PAL.chalk; ctx.beginPath(); ctx.arc((o.look || 0) * s * 0.3, 0, s * 0.26 * blink, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function modal(ctx, cx, cy, w, h, o = {}) {
    const k = o.k ?? 1; if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.translate(cx, cy); ctx.scale(lerp(0.85, 1, ease.outBack(k)), lerp(0.85, 1, ease.outBack(k)));
    ctx.globalAlpha *= clamp(k * 2);
    ctx.fillStyle = 'rgba(12,22,30,0.95)'; ctx.beginPath(); roundRect(ctx, -w / 2, -h / 2, w, h, 18); ctx.fill();
    ctx.strokeStyle = rgba(PAL.red, 0.9); ctx.lineWidth = 2; ctx.stroke();
    // warning triangle
    ctx.strokeStyle = PAL.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w / 2 + 50, -h / 2 + 70); ctx.lineTo(-w / 2 + 30, -h / 2 + 34 + 70 - 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 40, -h / 2 + 30); ctx.lineTo(-w / 2 + 62, -h / 2 + 68); ctx.lineTo(-w / 2 + 18, -h / 2 + 68); ctx.closePath(); ctx.stroke();
    ctx.font = `900 40px Archivo, sans-serif`; ctx.fillStyle = PAL.chalk; ctx.textAlign = 'left'; ctx.fillText(o.title || 'Limit', -w / 2 + 84, -h / 2 + 64);
    // blank reason lines (dashed placeholders)
    ctx.setLineDash([6, 10]); ctx.strokeStyle = rgba(PAL.chalk, 0.35); ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 34, -h / 2 + 120 + i * 34); ctx.lineTo(w / 2 - 34 - i * 60, -h / 2 + 120 + i * 34); ctx.stroke(); }
    ctx.setLineDash([]);
    // OK button
    ctx.fillStyle = rgba(PAL.chalk, 0.12); ctx.beginPath(); roundRect(ctx, w / 2 - 150, h / 2 - 76, 120, 50, 10); ctx.fill();
    ctx.font = mono(22, 700); ctx.fillStyle = PAL.chalk; ctx.textAlign = 'center'; ctx.fillText('OK', w / 2 - 90, h / 2 - 43);
    // paperclip with nothing attached
    if (o.clip) {
      ctx.globalAlpha *= o.clip; ctx.strokeStyle = PAL.cyan; ctx.lineWidth = 3; const X = -w / 2 + 50, Y = h / 2 - 52;
      ctx.beginPath(); ctx.moveTo(X, Y + 20); ctx.lineTo(X, Y - 18); ctx.arc(X + 9, Y - 18, 9, Math.PI, 0); ctx.lineTo(X + 18, Y + 14); ctx.arc(X + 12, Y + 14, 6, 0, Math.PI); ctx.lineTo(X + 6, Y - 10); ctx.stroke();
      ctx.font = mono(18); ctx.fillStyle = rgba(PAL.chalk, 0.5); ctx.textAlign = 'left'; ctx.fillText('0 attachments', X + 34, Y + 6);
    }
    ctx.restore();
  }

  function bell(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.5); ctx.quadraticCurveTo(-s * 0.55, s * 0.3, -s * 0.55, -s * 0.1); ctx.quadraticCurveTo(-s * 0.5, -s * 0.75, 0, -s * 0.78);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.75, s * 0.55, -s * 0.1); ctx.quadraticCurveTo(s * 0.55, s * 0.3, s * 0.7, s * 0.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, s * 0.62, s * 0.14, 0, Math.PI); ctx.stroke();
    if (o.slash) { ctx.strokeStyle = PAL.red; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.9); ctx.lineTo(-s * 0.9 + 1.8 * s * o.slash, -s * 0.9 + 1.8 * s * o.slash); ctx.stroke(); }
    ctx.restore();
  }

  function typing(ctx, t, x, y, o = {}) {
    const a = o.alpha ?? 1, frozen = o.frozen || 0;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(PAL.chalk, 0.14); ctx.beginPath(); roundRect(ctx, x, y, 130, 64, 32); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const b = Math.max(0, Math.sin(t * 9 - i * 0.9)) * (1 - frozen);
      ctx.fillStyle = frozen > 0.5 ? rgba(PAL.gray, 0.7) : PAL.chalk; ctx.beginPath(); ctx.arc(x + 35 + i * 30, y + 32 - b * 10, 8, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  function bubble(ctx, x, y, w, o = {}) {
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = o.mine ? rgba(PAL.cyan, 0.22) : rgba(PAL.chalk, 0.12); ctx.beginPath(); roundRect(ctx, x, y, w, 58, 18); ctx.fill();
    ctx.fillStyle = rgba(PAL.chalk, 0.6); ctx.fillRect(x + 18, y + 18, w * 0.6, 7); ctx.fillStyle = rgba(PAL.chalk, 0.35); ctx.fillRect(x + 18, y + 34, w * 0.4, 7);
    ctx.restore();
  }

  // empty chart axes (with optional curves)
  function axes(ctx, x, y, w, h, o = {}) {
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 2.5;
    const d = o.draw ?? 1;
    ctx.beginPath(); ctx.moveTo(x, y + h - h * d); ctx.lineTo(x, y + h); ctx.lineTo(x + w * d, y + h); ctx.stroke();
    ctx.lineWidth = 1; ctx.globalAlpha *= 0.35;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + 6, y + h - i * h / 5); ctx.lineTo(x + w * d, y + h - i * h / 5); ctx.stroke(); }
    ctx.restore();
  }

  function cueMark(ctx, x, y, r, a) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,240,220,0.95)'); g.addColorStop(0.6, 'rgba(255,200,150,0.5)'); g.addColorStop(1, 'rgba(255,160,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }

  // red circle + arrow (thumbnail trope)
  function thumbTrope(ctx, x, y, r, k) {
    if (k <= 0) return; ctx.save(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, -0.2, 0, Math.PI * 2 * clamp(k * 1.5)); ctx.stroke();
    const ak = clamp(k * 1.5 - 0.5);
    if (ak > 0) {
      const ax = x - r * 2.1, ay = y + r * 1.6;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, x - r * 1.05, ak), lerp(ay, y + r * 0.75, ak)); ctx.stroke();
      if (ak > 0.9) { ctx.beginPath(); ctx.moveTo(x - r * 1.05 - 34, y + r * 0.75 + 4); ctx.lineTo(x - r * 1.05, y + r * 0.75); ctx.lineTo(x - r * 1.05 - 4, y + r * 0.75 + 34); ctx.stroke(); }
    }
    ctx.restore();
  }

  function heart(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 3.5; ctx.globalAlpha = o.alpha ?? 1;
    ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.85, 0, -s * 0.35);
    ctx.bezierCurveTo(s * 0.45, -s * 0.85, s * 0.9, -s * 0.25, 0, s * 0.35); ctx.stroke(); ctx.restore();
  }
  function chatIcon(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 3.5; ctx.globalAlpha = o.alpha ?? 1;
    ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.6, s * 0.45, 0, 0.5, Math.PI * 2 + 0.2); ctx.lineTo(s * 0.45, s * 0.45); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  function shareIcon(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 3.5; ctx.globalAlpha = o.alpha ?? 1; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(s * 0.6, -s * 0.1); ctx.lineTo(0, -s * 0.6); ctx.lineTo(0, -s * 0.32); ctx.quadraticCurveTo(-s * 0.6, -s * 0.3, -s * 0.6, s * 0.45);
    ctx.quadraticCurveTo(-s * 0.35, s * 0.05, 0, s * 0.1); ctx.lineTo(0, s * 0.4); ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  function toggle(ctx, x, y, s, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = o.alpha ?? 1; ctx.strokeStyle = o.color || PAL.chalk; ctx.lineWidth = 4;
    ctx.beginPath(); roundRect(ctx, -s, -s * 0.5, s * 2, s, s * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(lerp(-s * 0.5, s * 0.5, o.on || 0), 0, s * 0.36, 0, 7); ctx.stroke();
    ctx.restore();
  }

  window.MU = { mono, label, timeline, brackets, threads, pauseIcon, sliders, abCards, barChart, eye, modal, bell, typing, bubble, axes, cueMark, thumbTrope, heart, chatIcon, shareIcon, toggle };
})();
