/* Moving Goalposts — procedural illustrations painted once on 2D canvases and handed to shaders.
   Channels are used as masks: R = bark/structure, G = foliage/cover, B = shading/variation. */
(function () {
  'use strict';
  function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // a lone, slightly windswept tree
  function tree() {
    const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'); const r = rng(7);
    x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
    const tips = [];
    function branch(px, py, ang, len, w, depth) {
      const bend = (r() - 0.5) * 0.35;
      const ex = px + Math.sin(ang) * len, ey = py - Math.cos(ang) * len;
      const mx = px + Math.sin(ang + bend) * len * 0.5, my = py - Math.cos(ang + bend) * len * 0.5;
      // tapered stroke in a few segments
      const steps = 6;
      let lx = px, ly = py;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, it = 1 - t;
        const qx = it * it * px + 2 * it * t * mx + t * t * ex, qy = it * it * py + 2 * it * t * my + t * t * ey;
        x.strokeStyle = 'rgb(255,0,0)'; x.lineWidth = Math.max(1, w * (1 - t * 0.35));
        x.beginPath(); x.moveTo(lx, ly); x.lineTo(qx, qy); x.stroke(); lx = qx; ly = qy;
      }
      if (depth === 0 || len < 9) { tips.push([ex, ey, depth]); return; }
      const n = depth > 6 ? 2 : (r() < 0.35 ? 3 : 2);
      for (let k = 0; k < n; k++) {
        const spread = (0.32 + 0.25 * r()) * (k === 0 ? -1 : 1) * (n === 3 && k === 2 ? 0.1 : 1);
        const lean = 0.06; // prevailing wind
        branch(ex, ey, ang + spread + lean + (r() - 0.5) * 0.25, len * (0.68 + 0.16 * r()), w * 0.66, depth - 1);
      }
      if (depth < 6 && r() < 0.5) tips.push([ex, ey, depth]);
    }
    branch(S / 2, S - 30, -0.03, 210, 30, 9);
    // foliage: clusters of leaf blobs; blue = light from the upper left
    x.globalCompositeOperation = 'lighter';
    for (const [tx, ty, d] of tips) {
      const nb = 16 + Math.floor(r() * 10);
      for (let i = 0; i < nb; i++) {
        const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 34;
        const lx = tx + Math.cos(a) * rad, ly = ty + Math.sin(a) * rad * 0.8;
        const sh = Math.max(0, Math.min(1, 0.55 - (Math.cos(a) * 0.35 + Math.sin(a) * 0.45) * (rad / 34) + (r() - 0.5) * 0.4));
        x.fillStyle = `rgba(0,${90 + Math.floor(r() * 60)},${Math.floor(sh * 255)},0.55)`;
        x.beginPath(); x.ellipse(lx, ly, 4 + r() * 5, 2.5 + r() * 3, r() * Math.PI, 0, Math.PI * 2); x.fill();
      }
    }
    return c;
  }

  // paper planes, flock sprite sheet (one plane silhouette with light side/dark side)
  function plane() {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    x.translate(S / 2, S / 2);
    x.fillStyle = 'rgb(255,0,0)'; x.beginPath(); x.moveTo(110, 0); x.lineTo(-90, -70); x.lineTo(-60, 0); x.closePath(); x.fill();
    x.fillStyle = 'rgb(0,255,0)'; x.beginPath(); x.moveTo(110, 0); x.lineTo(-60, 0); x.lineTo(-90, 55); x.closePath(); x.fill();
    x.fillStyle = 'rgb(0,0,255)'; x.beginPath(); x.moveTo(110, 0); x.lineTo(-60, 0); x.lineTo(-70, 18); x.closePath(); x.fill();
    return c;
  }

  window.MGPaint = { tree, plane };
})();
