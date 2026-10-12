# Moving Goalposts — nebulaglow

A real-time music video for **Moving Goalposts**, rendered live in the browser and synced word by word to the song.

▶ **Watch:** https://pablodev-star.github.io/MovingGoalposts/

## How it works

- `index.html` plays `Moving Goalposts.mp3` and draws every frame on a `<canvas>` as a pure function of the song time, so seeking, pausing and frame-exact export all stay in sync.
- `js/sync.js` holds the analysis: tempo (91.28 BPM, 4/4, downbeat grid), section map, per-word lyric timings and 30 fps audio envelopes (kick, snare, hats, bass, mids).
- `js/engine.js` (timing + tiny 3D camera), `js/world.js` (pitch, goalposts, ball, floodlights…), `js/ui.js` (interface glyphs), `js/lyrics.js` (kinetic typography), `js/scenes.js` (the director), `js/main.js` (compositor, bloom, grain, player).

### Story

A creator's work (the glowing ball) chases goalposts that keep moving. The rules page becomes the pitch; the grind is a timeline of clips; the machine's little dance is a goal stepping on every beat; the wall of small numbers slides away when called; verse 2 is squeezed into a vertical feed; the bridge drops beneath the field to find no master switch — only the hand-made things you keep making, which float up on their own even when the feed stops.

### Lyric sync

Word timings come from two independent passes that agree within ~60 ms median:
1. NVIDIA Parakeet TDT (ONNX via sherpa-onnx) transcription with token timestamps, three overlapping window offsets, aligned to the known lyrics (`tools/asr_parakeet.py`, `tools/anchors.py`);
2. PocketSphinx forced alignment of the known lyrics (`tools/align_pocketsphinx.py`, `tools/align_chunks.py`).

`tools/build_sync.py` merges them and computes the envelopes (librosa).

## Controls

Space play/pause · ←/→ seek 5 s · F fullscreen · C toggle lyrics. Append `?t=84` to start at a given second.

`?capture=1&w=1920` exposes `window.__MG.renderAt(t)` for offline frame export.

Fonts: Archivo, JetBrains Mono, Caveat (SIL Open Font License).
