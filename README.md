# Moving Goalposts — nebulaglow

A music video for **Moving Goalposts**, rendered in real time in the browser (WebGL2) and cut to the song.

▶ **Watch:** https://pablodev-star.github.io/MovingGoalposts/

## The film

Thirty shots, a new one every two bars (every two sung lines), each cut on a downbeat:

| Section | Shots |
| --- | --- |
| Intro | A night desk like the cover: laptop glow, a worn sneaker, rain on the city behind the window |
| Verse 1 | Rooftops in time-lapse (dawn → night) · a chart drawn in constellations · one tree racing through the seasons · a night-train window in the rain that slows and splits into panes |
| Pre-chorus | A green oscilloscope re-tuned on every word |
| Chorus 1 | A gyroscope of brass rings stepping on each beat, then a glass ceiling · goalposts in a salt desert: the sun jumps on "I change the time", a line is drawn in the sand and moved · an empty gold frame that finally holds the work · a colossal wall that slides away on "call" |
| Verse 2 | Channel-surfing on an old CRT · a night sea with a few lanterns drifting · a misty forest crossed by red laser limits · a phone booth in the snow; the street lamp dies on "why" |
| Pre-chorus 2 | Nixie tubes counting attempts |
| Chorus 2 | The same places, changed: crimson rings, a moonlit row of drifting goals, an endless corridor of frames, the wall in a storm |
| Bridge | A relief map running out into blank paper · sinking underwater to find no switch, only glowing things · the tree at night among fireflies · a river of light that stalls while lanterns rise on their own |
| Final chorus | The desk at dawn · ink on paper: a goal, a line, the line dragged elsewhere · the rooftop at sunrise with a glowing frame · paper planes above the clouds |
| Outro | The screen again, a new line rising · twilight in the desert as the goals keep moving · title |

Rendering: raymarched and 2D procedural fragment shaders → HDR targets → bloom, halation, ACES tone map, grade, grain, gate weave and letterbox. Animation follows the song's kick/snare/bass envelopes; key moments are keyed to word times from the lyric analysis. Lyrics are optional (CC button, off by default).

## Code

- `js/sync.js` — analysis: 91.28 BPM grid, sections, word-level lyric times, 30 fps audio envelopes (see `tools/`).
- `js/core.js` — timing helpers. `js/director.js` — the edit (shots, events, transitions, grade).
- `js/gl.js` — WebGL2 renderer and post-processing. `js/paint.js` — illustrations painted once to textures.
- `js/shaders/scenes*.js` — one fragment shader per location.
- `js/main.js` — player, audio clock, adaptive resolution, titles, capture API (`?capture=1&w=1280` exposes `__MG.renderAt(t)` / `__MG.snapshot()`).

Keys: Space play/pause · ←/→ seek · F fullscreen · C subtitles. `?t=84` starts at a given second, `?q=0.5` forces a render scale.

Fonts: Instrument Serif, JetBrains Mono (SIL Open Font License).
