# Bot Studio — launch film

A 76-second, music-only launch video built entirely in code with [Remotion](https://www.remotion.dev/). Every screen is a live re-creation of the Lilac Pop designs in `outputs/designs/`, animated in 3D and cut to the beat of the soundtrack.

## Edit map

The soundtrack is cut to a strict 134 BPM grid (one beat = 0.44776 s, ≈26.9 frames at 60 fps). `B(k)` in `src/lib.ts` returns the frame of beat `k`, and every cut and pop in the film uses it.

| Beats | Time | Scene |
| --- | --- | --- |
| 0–16 | 0:00 | The black box: an ordinary chatbot, one giant prompt, "Why did it say that?" |
| 16–32 | 0:07 | Build-up: "What if you could see it think?", strobe teasers, silent gap, "Introducing" |
| 32–40 | 0:14 | **Drop 1** — logo reveal, app assembles in 3D |
| 40–52 | 0:18 | Build with AI: prompt typed, proposal generated |
| 52–64 | 0:23 | States graph draws itself, branches, cycles, live token |
| 64–72 | 0:29 | Judge · Speaker · Clerk → one runtime |
| 72–80 | 0:32 | Judgments with typed signals |
| 80–88 | 0:36 | Policies: When / AND / Then |
| 88–96 | 0:39 | Clerk extracts fields; function runs async while the chat continues |
| 96–104 | 0:43 | Breakdown: "Not another chatbot." → "A bot studio." |
| 104–120 | 0:47 | **Drop 2** — Live Dashboard hero; Signal Wall bars driven by the music's spectrum |
| 120–128 | 0:54 | Rich conversation: reactions, paced messages, background booking |
| 128–132 | 0:57 | Turn timeline |
| 132–140 | 0:59 | BotScript: one source of truth |
| 140–152 | 1:03 | A bot that builds bots: an endless wall of bots |
| 152–160 | 1:08 | Montage of the real designs: Describe. Build. See. Ship. |
| 160–end | 1:12 | Final hit: logo and tagline |

Timeline and metric values shown in the film are illustrative demo values, not measured performance.

## Render

```sh
cd launch-video
npm ci
npm run check        # typecheck
npm run stills -- 900 2900   # preview individual frames into out/stills
npm run render       # → out/bot-studio-launch.mp4 (1920×1080, 60 fps)
```

Set `BROWSER_EXECUTABLE` to use an existing Chromium headless shell instead of letting Remotion download one.

## Sources

- `public/music.mp3` — the instrumental launch track, edited to the film. Per-frame band energies and detected kicks live in `src/audio.json`; the Signal Wall, glows and camera pulses read them.
- `src/ui/` — design-system kit (avatar, icons, cards, 3D stage, backgrounds, kinetic type) and the screen re-creations.
- `src/scenes/` — the 17 scenes.
