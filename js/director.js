/* Moving Goalposts — the edit: which shot plays when, its events, transitions and grade. */
(function () {
  'use strict';
  const { barT, wt, A, beatOf, clamp, DUR } = MC;
  const b = barT;

  // [shader, variant, startBar, events(list of song times), transition-in, grade]
  // A new shot every two bars (= every two sung lines).
  const G = {
    night: { lift: [0.01, 0.015, 0.03], gain: [0.95, 1.0, 1.08], sat: 0.95 },
    warm: { lift: [0.02, 0.012, 0.0], gain: [1.08, 1.0, 0.9], sat: 1.05 },
    cold: { lift: [0.0, 0.015, 0.03], gain: [0.92, 1.0, 1.1], sat: 0.9 },
    neutral: { lift: [0.01, 0.01, 0.015], gain: [1, 1, 1], sat: 1 },
    vivid: { lift: [0.01, 0.0, 0.02], gain: [1.05, 0.98, 1.05], sat: 1.15 },
    faded: { lift: [0.04, 0.035, 0.03], gain: [0.95, 0.95, 0.92], sat: 0.8 },
  };
  const SHOTS = [
    ['room', 0, 0, [wt(0, 'rules'), wt(0, 'moved'), wt(1, 'goalposts'), wt(1, 'shift'), wt(1, 'changed'), wt(1, 'shoes')], 'fadein', G.night],
    ['city', 0, 4, [wt(2, 'dawn'), wt(2, 'night'), wt(3, 'trim'), wt(3, 'every'), wt(3, 'clip'), wt(3, 'frame'), wt(3, 'right')], 'flash', G.warm],
    ['nebula', 0, 6, [wt(4, 'read'), wt(4, 'thread'), wt(4, 'secret'), wt(4, 'chart'), wt(5, 'hook'), wt(5, 'start')], 'cut', G.vivid],
    ['tree', 0, 8, [wt(6, 'keep'), wt(6, 'watching'), wt(6, 'reason'), wt(7, 'cut'), wt(7, 'pause'), wt(7, 'pace'), wt(7, 'season')], 'whip', G.neutral],
    ['rain', 0, 10, [wt(8, 'reach'), wt(8, 'drops'), wt(8, 'canceled'), wt(8, 'train'), wt(9, 'same'), wt(9, 'same', 1), wt(9, 'different'), wt(9, 'windowpane')], 'cut', G.night],
    ['scope', 0, 12, [wt(10, 0), wt(10, 'tweak'), wt(10, 'one', 1), wt(10, 'test'), wt(11, 0), wt(11, 'guess'), wt(11, 'works'), wt(11, 'best')], 'glitch', G.cold],
    ['rings', 0, 14, [wt(12, 'learn'), wt(12, 'dance'), wt(13, 'still'), wt(13, 'ceiling'), wt(13, 'chance')], 'flash', G.warm],
    ['desert', 0, 16, [wt(14, 'change'), wt(14, 'change', 1), wt(15, 'draws'), wt(15, 'line'), wt(15, 'moves'), wt(15, 'line', 1)], 'cut', G.warm],
    ['gallery', 0, 18, [wt(16, 'crown'), wt(16, 'name'), wt(17, 'work'), wt(17, 'fair'), wt(17, 'frame')], 'cut', G.neutral],
    ['wall', 0, 20, [wt(18, 'knocking'), wt(18, 'numbers'), wt(18, 'small'), wt(19, 'wall'), wt(19, 'moves'), wt(19, 'call')], 'cut', G.cold],
    ['tv', 0, 22, [wt(20, 'format'), wt(20, 'cut'), wt(20, 'caption'), wt(21, 'brighter'), wt(21, 'thumbnail'), wt(21, 'quicker'), wt(21, 'phrase')], 'glitch', G.vivid],
    ['ocean', 0, 24, [wt(22, 'answer'), wt(22, 'comments'), wt(22, 'cue'), wt(23, 'same'), wt(23, 'eyes'), wt(23, 'drifting')], 'cut', G.night],
    ['forest', 0, 26, [wt(24, 'limit'), wt(24, 'appears'), wt(24, 'reason'), wt(25, 'quiet'), wt(25, 'restriction'), wt(25, 'reach'), wt(25, 'mismatch')], 'cut', G.cold],
    ['booth', 0, 28, [wt(26, 'warning'), wt(26, 'bell'), wt(26, 'human'), wt(26, 'reply'), wt(27, 'blank'), wt(27, 'graph'), wt(27, 'long'), wt(27, 'why')], 'cut', G.night],
    ['nixie', 0, 30, [wt(28, 0), wt(28, 'tweak'), wt(28, 'one', 1), wt(28, 'test'), wt(29, 0), wt(29, 'guess'), wt(29, 'works'), wt(29, 'best')], 'dissolve', G.warm],
    ['rings', 1, 32, [wt(30, 'learn'), wt(30, 'dance'), wt(31, 'still'), wt(31, 'ceiling'), wt(31, 'chance')], 'flash', G.vivid],
    ['desert', 1, 34, [wt(32, 'change'), wt(32, 'change', 1), wt(33, 'draws'), wt(33, 'line'), wt(33, 'moves'), wt(33, 'line', 1)], 'cut', G.cold],
    ['gallery', 1, 36, [wt(34, 'crown'), wt(34, 'name'), wt(35, 'work'), wt(35, 'fair'), wt(35, 'frame')], 'whip', G.neutral],
    ['wall', 1, 38, [wt(36, 'knocking'), wt(36, 'numbers'), wt(36, 'small'), wt(37, 'wall'), wt(37, 'moves'), wt(37, 'call')], 'cut', G.cold],
    ['map', 0, 40, [wt(38, 'maybe'), wt(38, 'not'), wt(38, 'maybe', 1), wt(38, 'map'), wt(38, 'incomplete')], 'burn', G.faded],
    ['under', 0, 42, [wt(39, 'master'), wt(39, 'switch'), wt(39, 'underneath'), wt(40, 'making'), wt(40, 'things'), wt(40, 'believe'), wt(40, 'true')], 'dissolve', G.cold],
    ['meadow', 0, 44, [wt(41, 'even'), wt(41, 'feed')], 'dissolve', G.night],
    ['river', 0, 46, [wt(41, "won't"), wt(41, 'carry'), wt(41, 'through')], 'dissolve', G.warm],
    ['room', 1, 48, [wt(42, 'learn'), wt(42, 'dance'), wt(43, 'ceiling'), wt(43, 'chance')], 'dissolve', G.warm],
    ['ink', 0, 50, [wt(44, 'change'), wt(44, 'change', 1), wt(45, 'draws'), wt(45, 'line'), wt(45, 'moves'), wt(45, 'line', 1)], 'cut', G.faded],
    ['city', 1, 52, [wt(46, 'crown'), wt(46, 'name'), wt(47, 'work'), wt(47, 'fair'), wt(47, 'frame')], 'flash', G.warm],
    ['planes', 0, 54, [wt(48, 'knocking'), wt(48, 'small'), wt(49, 'make'), wt(49, 'mean'), wt(49, 'call')], 'cut', G.warm],
    ['room', 2, 56, [wt(50, 'same'), wt(50, 'same', 1), wt(50, 'try')], 'burn', G.night],
    ['desert', 2, 58, [wt(51, 'rules'), wt(51, 'changing'), wt(51, 'still'), wt(51, 'why')], 'dissolve', G.faded],
    ['title', 0, 60, [], 'cut', G.neutral],
  ].map(([name, variant, bar, ev, trans, grade], i) => ({ name, variant, t0: i === 0 ? 0 : b(bar), ev, trans, grade, i }));
  SHOTS.forEach((s, i) => { s.t1 = i + 1 < SHOTS.length ? SHOTS[i + 1].t0 : DUR + 30; });

  const TRANS = { // [type for mix shader, duration before cut, duration after cut]
    cut: null, flash: null, fadein: null,
    whip: [1, 0.22, 0.22], glitch: [2, 0.12, 0.18], dissolve: [0, 0.9, 0.5], burn: [3, 0.5, 0.45],
  };

  function shotAt(t) { let i = 0; while (i < SHOTS.length - 1 && t >= SHOTS[i + 1].t0) i++; return SHOTS[i]; }

  function uniforms(s, t) {
    const ev = new Float32Array(12).fill(1e4);
    s.ev.forEach((x, i) => { if (i < 12) ev[i] = x - s.t0; });
    return {
      uT: t - s.t0, uDur: s.t1 - s.t0, uP: (t - s.t0) / (s.t1 - s.t0), uSong: t, uBeat: beatOf(t), uVar: s.variant, uSeed: s.i,
      uKick: A('kickD', t), uSnare: A('snareD', t), uBass: A('bassD', t), uMid: A('midS', t), uHat: A('hatD', t), uRms: A('rmsS', t),
      uKickS: A('kickS', t), uBassS: A('bassS', t), uEv: ev,
    };
  }

  // build the frame description for time t
  function frame(t) {
    const s = shotAt(t);
    const F = { time: t, a: { name: s.name, U: uniforms(s, t) }, mix: 0, type: 0 };
    const g = s.grade;
    const post = { bloom: 0.7, exposure: 1, flash: 0, letter: 0.12, ca: 0.0035, grain: 0.07, vig: 0.85, leak: 0, sat: g.sat, lift: g.lift, gain: g.gain, hal: 0.18, thresh: 0.85 };
    // transition into the next shot
    const nx = SHOTS[s.i + 1];
    if (nx && TRANS[nx.trans] && t > nx.t0 - TRANS[nx.trans][1]) {
      const [type, pre, postD] = TRANS[nx.trans];
      F.b = { name: nx.name, U: uniforms(nx, t) }; F.type = type;
      F.mix = clamp((t - (nx.t0 - pre)) / (pre + postD));
    }
    // transition out of the previous shot (second half)
    const pv = SHOTS[s.i - 1];
    if (pv && TRANS[s.trans] && t < s.t0 + TRANS[s.trans][2]) {
      const [type, pre, postD] = TRANS[s.trans];
      F.b = F.a; F.a = { name: pv.name, U: uniforms(pv, t) }; F.type = type; F.mix = clamp((t - (s.t0 - pre)) / (pre + postD));
    }
    if (s.trans === 'flash') post.flash = Math.max(0, 1 - (t - s.t0) / 0.35) * 0.85;
    if (s.trans === 'fadein') post.fade = clamp(1 - t / 2.2);
    if (s.trans === 'burn' && t - s.t0 < 1) post.leak = Math.max(0, 1 - (t - s.t0)) * 1.2;
    // hard cuts get a tiny exposure kick
    if (s.trans === 'cut' && t - s.t0 < 0.12) post.exposure = 1.25;
    // per-shot extras
    if (s.name === 'tv' || s.name === 'scope' || s.name === 'nixie') post.letter = 0.0;
    if (s.name === 'title') { post.letter = 0; post.bloom = 0.4; }
    if (s.name === 'room') post.exposure *= s.variant === 1 ? 1.4 : 1.5;
    // fade to black at the very end
    if (t > DUR - 0.6) post.fade = Math.max(post.fade || 0, clamp((t - (DUR - 0.6)) / 0.6) * 0.0);
    F.post = post;
    F.shot = s;
    return F;
  }

  window.MD = { SHOTS, frame, shotAt };
})();
