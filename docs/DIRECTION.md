# Bot Studio — launch film v2 · Director's brief

**One sentence:** a sci-fi, ultra high-tech, cinematic product film in which Bot Studio's real interface is rebuilt as translucent glass and holographic layers floating in deep 3D space. Every cut, impact and swoosh lands on the music, and the audience should believe a top motion-design studio made it.

References in spirit: Apple product films, Linear and Raycast launch reels, *Tron: Legacy* and *Oblivion* UI sequences, Vercel Ship openers. The style is fast, confident and luminous. There is **no narration**: music plus designed sound effects only.

---

## 1. What the film must make people feel

1. **The old way is a black box.** One giant prompt, and nobody knows why the bot said what it said.
2. **Bot Studio lets you see it think.** Signals, decisions, states, prompts and tools are all visible and live.
3. **It is built, not prompted.** You describe the bot, and a whole system assembles in front of you: states, judgments, policies, functions and BotScript.
4. **It is alive.** Everything pulses with real signals, reacts instantly, runs in the background, and is traced to the millisecond.
5. **It is new.** Not another chatbot: a studio for bots that think in the open, and a bot that builds bots.

## 2. Product truth (do not violate)

- **Judge** (Jev/TypeSafe) measures meaning and returns typed signals: Noul (yes/no), Score, Choice.
- **Speaker** writes the language.
- **Clerk** extracts fields and runs functions **asynchronously**.
- The **Runtime** combines everything through explicit **policies** (When … AND … Then …, with Global or state scope).
- **States** form a directed graph with branches, cycles and return paths.
- **Prompt chunks** are assembled into the Speaker prompt.
- **BotScript** is the single, portable source of truth for people and coding agents.
- **Live Dashboard** shows the Signal Wall (dozens of bars, coloured by threshold), the Speaker prompt, Clerk activity, decisions and a turn timeline (Message sent 0 ms → Last token 1,240 ms). These timings are **illustrative**: never present a number as a benchmark claim.
- Brand palette, Lilac Pop: canvas `#F1EDF8`, plum `#39294B`, purple `#8C6BEA` / `#6A45E0`, pistachio `#E7F4B9`, green `#36997D` (threshold pass), amber `#ECAF42` (waiting). There is a friendly winking robot avatar (`Avatar` in `src/ui/kit.tsx`).
- **No people.** No human faces, figures, bodies or photos anywhere. Users appear only as the generic user icon. Names stay neutral (Alex Morgan).

## 3. Visual style bible

**World.** Near-black violet space (`#04020A` → `#120726`) with depth: volumetric light shafts, drifting dust and bokeh, a holographic grid floor that fades into fog, and distant soft nebula glows in violet, with an occasional electric-cyan accent (`#7FE7FF`) for "tech" highlights and flares. Pistachio `#E7F4B9` is the rare warm accent.

**Glass UI.** Product windows are **translucent glass** in two looks:
- **frost:** light translucent Lilac Pop, true to the product. Content is still readable, and you can see the layers behind through frosted panels.
- **holo:** dark smoked glass with luminous lilac/cyan content, for sci-fi close-ups and HUD moments.

Every pane has a 1px luminous rim (gradient lilac → cyan → transparent), a top specular highlight, an inner glow, a soft outer bloom and a reflection on the floor where it makes sense. Panels **explode apart in Z** and re-assemble, and light passes through them.

**Light.** Anamorphic lens flares (horizontal cyan/violet streaks plus ghosts) on reveals and impacts. Light sweeps across glass on accents, god rays behind the logo, bloom on everything bright, and occasional light leaks on transitions.

**Typography.** Inter Display 800–900 for big statements: tight tracking (−0.04em), gradient fills (white → lilac → pistachio), mask/blur reveals and occasional per-letter tracking-in. Small HUD labels are uppercase Inter 600 with +0.3em tracking. Monospace is DejaVu Sans Mono. Statements are at most ~6 words on screen at a time.

**HUD garnish** (sparingly): corner brackets, thin rule lines, frame and timecode readouts, tiny data tickers and targeting reticles that lock onto UI elements.

## 4. Camera and editing language

- **Cinematic angles:** low-angle hero shots looking up at panels, Dutch tilts (5–12°), extreme macro close-ups with shallow depth of field (rack focus between layers), top-down "god" shots onto the graph, long lateral tracking shots along the Signal Wall, and fly-throughs between and *through* transparent layers.
- **Speed ramps:** fast–slow–fast. Whip in, glide in slow motion through the hero moment, then snap out on the next beat. Never use linear motion; use expo/quint easing and time remapping.
- **Pace:** in drops, a new angle or shot **every 1–2 beats** (≈27–54 frames), sometimes half-beat strobe cuts. In builds and breakdowns, slower moves that breathe. Every cut lands **exactly** on a beat frame `B(k)` (or a half beat).
- **Transitions:** whip pans with directional motion blur, zoom-throughs (fly into a panel and out of the next scene), flash cuts on impacts, glitch cuts, light-leak dissolves and shockwave wipes. Each transition gets a matching SFX cue.
- **Life:** subtle constant camera drift and handheld micro-motion, kick-synced micro-push or shake (`kick(f)`), and audio-reactive glow (`band(f, i)`, `rms(f)`).

## 5. Music map (fixed; do not re-time)

134 BPM. One beat = 0.44776 s ≈ 26.87 frames at 60 fps. `B(k)` (in `src/lib.ts`) is the global frame of beat k. The film is 4,591 frames (76.5 s).

| Beats | Frames | Music |
| --- | --- | --- |
| 0–16 | 0–430 | Intro: soft, atmospheric, no kick |
| 16–24 | 430–645 | Build: half-time kicks (every 2 beats) |
| 24–30 | 645–806 | Snare roll / riser accelerating |
| 30–32 | 806–860 | **Near silence** (the suck-in before the drop) |
| **32** | **860** | **DROP 1**: full kick every beat |
| 32–96 | 860–2579 | Drop 1 groove (fills around beat 88–95) |
| 96–104 | 2579–2794 | **Breakdown**: almost silent, riser into 104 |
| **104** | **2794** | **DROP 2** |
| 104–160 | 2794–4298 | Drop 2 groove (small gaps at ~beats 141, 145) |
| **160** | **4298** | **Final hit** + reverb tail to 4591 |

Audio helpers: `kick(f, decay)` (a pulse after each detected kick), `band(f, 0..4)` (sub → air energy), `rms(f)`. `f` is the **global** frame (`local + from`).

## 6. Scenes, story and copy

| Scene | Beats | Story | On-screen copy |
| --- | --- | --- | --- |
| s01 | 0–16 | The black box: a lone dull chat window adrift; a colossal monolith of prompt text; the camera cranes up it; glitch | "You know chatbots." → "One giant prompt." → "Why did it say that?" |
| s02 | 16–32 | Tension: "What if you could see it think?" Half-time pulses, then micro-flash teasers of signals, nodes and code on the snare roll; silence at 30–31 with a single glint charging | "What if you could see it think?" → "Introducing" |
| s03 | 32–40 | **Drop reveal**: flare explosion, shockwave, avatar logo forms from light; the app materializes as exploding glass layers that stack together | "Bot Studio" · "Bots that think in the open." |
| s04 | 40–52 | Build with AI: holographic prompt typing, button → energy burst; the bot assembles (4 states / 6 judgments / 5 policies slam in); proposal rows | "Describe it. Get a whole bot." |
| s05 | 52–64 | States: a 3D holographic graph of glowing glass orbs and light-trail edges; low-angle fly-through; a light token travels; branches and cycles | "Map every step. Branch anywhere." |
| s06 | 64–80 | Judge · Speaker · Clerk monoliths fire energy into one runtime core; then the Judgment editor in macro: Score selected, measurement bar fills, typed-signal chips orbit | "Three minds. One runtime." · "Measure meaning. Get typed signals." |
| s07 | 80–96 | Policies assemble like a circuit (When/AND/Then); Clerk laser-scans fields; function runs in a background lane while the chat continues; ✓ result | "Decide in rules you can read." · "Real tools. Running in the background." |
| s08 | 96–120 | Breakdown in near silence: "Not another chatbot." → "A bot studio." Riser charge → **DROP 2**: the Live Dashboard hero; the Signal Wall pulses to the music, exploded glass layers, tracking shots, decisions light up, timeline | "Not another chatbot." · "A bot studio." · "See every signal. Live." · "Every decision, explained." |
| s09 | 120–140 | Conversation in 3D: instant reaction burst, paced messages, background booking; timeline 0 → 1,240 ms; BotScript streams in 3D and projects into UI pieces | "Reacts instantly. Talks naturally." · "Every millisecond, traced." · "One script. For people and agents." |
| s10 | 140–end | A bot that builds bots: an infinite wall of glass bot cards; montage 152–160 of the real designs (`public/designs/*.png`), one word per 2 beats; **final hit 160**: logo, flare, tagline; fade at the end | "A bot that builds bots." · "Describe." "Build." "See." "Ship." · "Bot Studio" · "Bots that think in the open." |

Scene agents own the shots *inside* their range and may refine copy slightly (keep the meaning and brevity).

## 7. Technical contract

- **Stack:** Remotion 4 + React 18, rendered in headless Chromium. Use **CSS 3D, SVG and Canvas2D only** (no WebGL; there is no GPU). Fonts installed: Inter, Inter Display, DejaVu Sans Mono, Noto Color Emoji. No network at render time.
- **Determinism:** no `Math.random()` or `Date`. Use `rand(seed)` from `src/lib.ts`. Every frame must be a pure function of the frame number.
- **Resolution:** 1920×1080 at 60 fps. Keep key text inside the safe area x 120–1800, y 130–950; a global letterbox may cover the top and bottom ~70 px.
- **Performance budget:** aim for under ~1.2 s per frame at full resolution. Prefer gradients over `filter: blur` on large areas. Never stack more than a few full-frame blur or backdrop filters. Check with `--scale 1` on a couple of frames.
- **File ownership:** edit only the files you own. If you need something from a shared module that isn't there, implement it locally in your own file.
  - `src/vfx/**`: VFX agent.
  - `src/cine/**`: camera/transition agent.
  - `src/ui/**`: glass UI agent. Existing exports must keep working.
  - `sfx/*.py`, `sfx/CATALOG.md`: SFX agent.
  - `src/scenes/sNN.tsx` + `sfx/cues/sNN.json`: scene agent NN.
  - `src/Root.tsx`, `src/scenes/registry.ts`, `src/lib.ts`, `docs/DIRECTION.md`: director/integration only.
- **Scene component:** `export const Scene: React.FC<SceneProps> = ({from, dur}) => …`. `useCurrentFrame()` is local; global frame = local + `from`.
- **Preview:** `node tools/preview.mjs sNN [--beats 33,34.5 | --frames 900,950 | --range 860-1070:13] [--scale 0.5] [--grade]` writes stills and a labelled `sheet.jpg` to `out/preview/sNN/`. **Look at your sheets** (Read the jpg) and iterate. Typecheck with `npx tsc -p .`.
- **SFX cue sheet** (`sfx/cues/sNN.json`): `{"scene":"sNN","cues":[{"frame":<GLOBAL int>,"sfx":"<catalog name>","gain_db":-6,"pan":0,"params":{}}]}`. Names and params come from `sfx/CATALOG.md`. `python3 sfx/mix.py` renders `public/mix.wav` (music + all cues).
- **v1 reference:** `src/v1/` holds the previous version's scenes. Reuse ideas and code freely, but the v2 bar is far higher.
