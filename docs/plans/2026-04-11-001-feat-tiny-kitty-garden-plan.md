---
title: "feat: Tiny Kitty Garden — cozy tap-to-play game for a 3 year old"
type: feat
status: active
date: 2026-04-11
---

# feat: Tiny Kitty Garden

## Overview

Replace the template's placeholder "Block Dodge" game with **Tiny Kitty Garden**: a gentle, no-fail, tap-to-play top-down world for a 3 year old. One kitten, four single-screen rooms (Garden, Kitchen, Bedroom, Beach), tap anywhere to walk there, tap things to make cute events happen, and a pictorial shelf that fills up with collectibles across a session. No score, no timer, no text, no fail state.

This is the first real game built from the arcade template, so a small, well-bounded set of template extensions is required so the engine can host a game with different idioms (no hearts/score overlay, tap-to-walk instead of button input, fully custom title screen).

## Problem Frame

The player is a 3 year old with a finger and a tablet. The arcade template is built for score-chasing action games (button input, health bar, high score leaderboard, game-over restart loop). None of that is age-appropriate. Every assumption the template makes about controls, UI, loss state, and text needs to be replaced or hidden without rewriting the template engine.

The work must produce a self-contained single-file HTML game (per template convention) that:

- Accepts only tap input on the canvas
- Has no fail state and no visible numbers or letters
- Rewards every tap with a visible and/or audible event
- Uses entirely procedural art and audio (no assets)
- Runs at 384x216 in the existing responsive canvas container
- Builds with `node build.js` to `dist/index.html` and root `index.html`

## Requirements Trace

- **R1.** Single tap-to-walk control scheme — tap anywhere, kitten walks there. No buttons, no joystick, no menus during play.
- **R2.** Four single-screen rooms (Garden, Kitchen, Bedroom, Beach) connected by edge arrows; tap an arrow to move between rooms.
- **R3.** No fail state — the game cannot end, the kitten cannot "die," there is no timer and no score display.
- **R4.** No text during play — only pictures. The title screen's only copy is the game name (art) and a tap prompt.
- **R5.** Kitten sprite walks in 4 directions, leaves fading paw prints, is always smiling, and is procedurally drawn at chunky 32x32-ish scale.
- **R6.** Collectible shelf across the top of the screen, pictorially showing today's finds. Categories:
  - 5 flower colors (Garden, tap → sniff → pressed flower)
  - Butterflies (Garden, approach-to-catch → sit on head → fly to shelf jar)
  - 6 seashells (Beach, walk over → pick up → chirp)
  - 4 yarn balls (one per room, rolled into Bedroom toy box)
  - 12 stars (3 per room, night only — appear after bed is tapped at least once this session)
  - Treats (Kitchen, mouse gives one per visit, fills a jar)
- **R7.** Delight interactions that don't collect but still reward a tap:
  - Pond → frog hops out and ribbits (Garden)
  - Food bowl → kitten eats and wiggles (Kitchen)
  - Milk saucer → kitten laps it up (Kitchen)
  - Bed → kitten curls up with floating Zs, stretches awake, toggles night (Bedroom)
  - Waves → kitten taps back and giggles (Beach)
  - Crab → scuttles sideways (Beach)
  - Kitten herself → purrs, heart floats up (any room)
- **R8.** Weather: each session randomly picks clear / gentle rain / gentle snow. Rain → kitten carries tiny umbrella. Snow → kitten wears jacket and hat.
- **R9.** Full-shelf celebration: when every category is complete, kitten does a happy dance, confetti falls, and the shelf resets so it can happen again.
- **R10.** Session reset — every new play session starts fresh (flowers re-bloom, butterflies return, etc.). Persistence is not required; reloads or new-session state should repopulate the world.
- **R11.** Soft chiptune lullaby loop, different gentle melody per room, mrrp/prrr/mew/giggle procedural sounds, sparkle chime when something is collected.
- **R12.** 90s Game Boy Color palette but softer (butter yellow, mint, peach, lavender, sky blue). Chunky sprites, thick outlines, rounded shapes, everything slightly bouncy.
- **R13.** Title screen is a single tap-to-start. Preserve the engine's title-screen entry point, but all on-screen copy and art is custom.
- **R14.** No high score leaderboard, no name entry, no score/heart HUD, no instructions div — the child never sees them.
- **R15.** Builds via the existing `node build.js` pipeline to `dist/index.html` and root `index.html`.

## Scope Boundaries

- No backend, no Firebase, no telemetry.
- No image or audio assets — everything is Canvas API + Web Audio API.
- No text-dependent onboarding, no name entry flow, no on-screen keyboard.
- No persistence across sessions (`localStorage`) is required. If the shelf is mid-fill when the tab closes, that's fine — next play is fresh.
- No difficulty, no progression across sessions, no unlocks.
- No multi-touch, no gestures beyond single tap.
- No internationalization — there is no copy to translate.

### Deferred to Separate Tasks

- Custom daughter-name flow (per spec: "or skips and she's just Kitten"). Default to "Kitten" and omit naming UI in this plan. A future iteration could add a grown-up-friendly name entry on first run.
- Firebase / high-score cleanup at the HTML level beyond what's needed to hide the DOM chrome — leaving the Firebase SDK `<script>` tags in place is acceptable for this plan, since they're inert when no config is provided.

## Context & Research

### Relevant Code and Patterns

- `src/game-config.js` — GAME object: title, colors, controls array, instructions. Edited per game. Controls array may be empty.
- `src/game-sounds.js` — SOUNDS object, functions that receive the Sound engine `S`. Engine automatically plays `start` and `gameOver`.
- `src/game.js` — Required exports: `gameInit()`, `gameUpdate(dt)`, `gameRender(ctx, w, h)`. Optional: `gameTitleRender(ctx, w, h, time)`, `gameOverRender(ctx, w, h)`. This entire file is replaced per game.
- `src/engine/loop.js` — Main loop. Calls `drawTitleScreen` on title, else calls `gameUpdate` → `gameRender` → `drawUI` → `drawGameOverScreen`. Game-over fires when `Engine.state.health <= 0`. Keeping health above zero is sufficient to never game-over.
- `src/engine/input.js` — `setupInput()` attaches one canvas click/touchstart handler (`handleCanvasInteraction`) that only acts on title-screen and game-over states. To get a tap-to-walk control during play, we need a minimal template-engine hook: either dispatch an unused branch of that handler to a `gameTap(x, y)` callback, or let `game.js` attach its own listener. The former is cleaner and is the pattern established by `gameTitleRender` / `gameOverRender`.
- `src/engine/screens.js` — `drawTitleScreen` calls `gameTitleRender` first and then always draws the default title text, subtitle, prompt, and version on top. For a text-free title we need `gameTitleRender` to be able to fully replace the default (not just draw behind it). `drawUI` always renders "SCORE: 000000" and hearts during play — we need to suppress it.
- `src/engine/particles.js` — Particle system with position/velocity/color/life. Reuse for confetti, paw prints, hearts, sparkles, rain/snow drops.
- `src/engine/sound.js` — `playTone(start, end, dur, type, vol)`, `playNoise(dur, startFreq, endFreq)`, `init()` on first user gesture.
- `src/template.html` — HTML shell. Contains `#highScores` and `#instructions` divs unconditionally. Both can be hidden with a single CSS override or a small JS hide.
- `build.js` — Concatenates JS files in a fixed order into `dist/index.html` and root `index.html`. Adding new files to the bundle requires editing this list. Prefer folding new code into `src/game.js` to avoid changing the bundle.
- `README.md` — Documents the game contract. Any new optional hook (`gameTap`, `hideUI`, custom-title override) should be described here briefly so the template stays self-documenting.
- `CLAUDE.md` — "Prefer action over questions," "age-appropriate and fun for a 6-year-old," "procedural graphics — no image files," "all sounds are procedural — no audio files," and "increment `version` in the GAME config and start the commit message with it."

### Institutional Learnings

No `docs/solutions/` directory exists yet. This is the first real game built from the template, so there are no prior learnings to carry forward.

### External References

None required. The game is simple procedural Canvas/Web Audio work and the spec is fully-formed.

## Key Technical Decisions

- **Tap-to-walk via a new optional `gameTap(x, y)` engine hook.** Mirror the existing pattern of `gameTitleRender` / `gameOverRender`. Wire it into `src/engine/input.js`'s canvas handler so it fires only during active gameplay (not title, not game-over). Rationale: keeps the template-engine abstraction clean, enables this game plus any future "tap the world" game, and avoids `game.js` attaching a second canvas listener that could double-fire.
- **Suppress default HUD with a `GAME.hideUI` config flag**, honored in `src/engine/loop.js` (skip `drawUI`) and `src/engine/screens.js` (skip default title-screen text if `gameTitleRender` is present — simplest: if `GAME.hideUI`, treat `gameTitleRender` as authoritative). Rationale: the HUD is baked into the engine and needs an explicit off-switch; a single flag is less invasive than per-screen rewrites.
- **Never let `Engine.state.health` reach 0.** Set `maxHealth = 0` in `gameInit` so the UI would draw zero hearts even if `hideUI` somehow weren't honored, and keep `health = 1` permanently. Rationale: the loop's game-over check is `health <= 0`, so keeping it at 1 is sufficient and requires no engine edit.
- **Hide DOM chrome (`#highScores`, `#instructions`) via CSS in `src/template.html`**, gated on a body class set at boot when `GAME.hideUI` is true. Rationale: keeps the HTML shell generic, keeps per-game suppression declarative, avoids JS-side element removal.
- **All new game code lives in `src/game.js`.** No new source files. Rationale: avoids editing `build.js`; one-file game code matches the template's philosophy; keeps the bundle simple.
- **No persistence.** Session state is in-memory only. Reloading the tab is a fresh session. Rationale: the spec explicitly wants "respawns the next play session," the child has no concept of save-state, and avoiding `localStorage` simplifies the implementation.
- **Procedural kitten sprite at logical 32x32**, drawn from a hand-tabulated pixel grid as a nested array of color indexes, with a 4-direction set (down, up, left, right) and a 2-frame walk cycle. Rationale: matches the spec's "chunky pixel sprite, big head" direction, keeps source readable, avoids the fragility of long stacks of `fillRect` calls.
- **Rooms are plain data** — each room is an object with `id`, `name`, `palette`, `draw(ctx)` for static scenery, an array of interactable hotspots, an array of collectible spawn definitions, and a melody seed. Room-to-room navigation swaps the active room by id. Rationale: keeps room logic uniform and extension-friendly without needing a class hierarchy.
- **Shelf is rendered on top of the game world**, not on the engine UI layer, so `GAME.hideUI` can suppress the engine HUD without losing the shelf. Rationale: the shelf is part of the game's world, not engine chrome.
- **Kitten movement is point-to-point with a constant speed.** Tapping re-targets. Facing direction is derived from the larger of `|dx|` and `|dy|`. Rationale: simplest model for a 3 year old — tap anywhere, kitten heads there, re-tap to redirect.
- **Room transition arrows are tap hotspots at screen edges.** Tapping an arrow fades the room (simple 15-frame crossfade via `globalAlpha`) and loads the adjacent room with the kitten spawning at the opposite edge. Rationale: visually communicates the transition without needing text, and avoids adding a physical "exit zone" the kitten has to walk into.
- **Weather is chosen once per session in `gameInit`** with a simple probability split (60% clear, 20% rain, 20% snow). Rain and snow are particle streams layered over all rooms. The kitten's accessory overlay is drawn after the base sprite. Rationale: spec calls for "gentle" rain/snow, once-per-session keeps it from feeling noisy, and particle system already exists.
- **Night mode is a per-session boolean** flipped the first time the bed is tapped. When true, all rooms tint darker (multiply overlay), stars spawn in every room (3 each), and melodies shift to a slightly slower variant. Rationale: the spec ties stars to "after tapping the bed once," making it a global session toggle is the simplest interpretation that survives room changes.

## Open Questions

### Resolved During Planning

- **Do we need `localStorage` for the shelf?** No — spec says everything respawns next session.
- **Does the template need a new `gameTap` hook or can `game.js` attach its own listener?** Use the new hook. Cleaner, matches existing `gameTitleRender` / `gameOverRender` pattern, avoids two handlers racing on the same canvas event.
- **Do we hide the score/hearts HUD via CSS on the canvas or an engine flag?** Engine flag (`GAME.hideUI`). The HUD is drawn inside the canvas, not in the DOM, so CSS can't hide it.
- **Is the name-entry flow needed?** No — default the name to "Kitten" and skip the naming UI entirely (see deferred scope).
- **Should we replace the template engine's title-screen text?** Yes. The child can't read, so the engine's default title text must be suppressed. `gameTitleRender` must be able to fully own the title screen when `GAME.hideUI` is true.
- **How many collectibles in total?** 5 flowers + ~6 butterflies + 6 seashells + 4 yarn balls + 12 stars + (one treat-jar fill per kitchen visit, capped at say 5) ≈ 38. Fits comfortably on a top-screen shelf with small pictures.

### Deferred to Implementation

- Exact pixel grids for kitten / mouse / frog / crab / butterfly / shell sprites. Planned as pixel-art data tables but the actual grids will be tuned visually while implementing.
- Exact melody note sequences per room. Planned as tone-sequenced lullabies; the precise note lists will be tuned by ear in implementation.
- Exact shelf layout geometry — rows vs. columns, icon size — tuned to fit all categories visibly at 384 px wide.
- Whether the frog pond is a tap-the-pond hotspot or a walk-onto-it trigger. Plan assumes tap-the-pond, but may change for feel.
- Rain / snow particle density — tuned in playtest.
- Crossfade vs. slide for room transitions — plan assumes crossfade, may change if a slide looks cozier.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

**World state shape (conceptual):**

```
World = {
  kitten: { x, y, targetX, targetY, facing, walkFrame, accessory },
  room: 'garden' | 'kitchen' | 'bedroom' | 'beach',
  rooms: {
    garden:  { hotspots[], collectibles[], collectedIds[], melody },
    kitchen: { ... },
    bedroom: { ... },
    beach:   { ... }
  },
  shelf: {
    flowers: [boolean x5],
    butterflies: [boolean xN],
    shells: [boolean x6],
    yarnBalls: [boolean x4],
    stars: [boolean x12],
    treats: [boolean x5]
  },
  weather: 'clear' | 'rain' | 'snow',
  night: boolean,
  pawPrints: [],
  floaters: []  // Zs, hearts, sparkles, "mrrp" indicators
}
```

**Frame loop (conceptual):**

```
gameUpdate(dt):
  advance kitten toward target
  spawn paw print every N pixels of travel
  update pawPrints (fade), floaters, hotspot animations, collectibles
  if shelf is full and not already celebrating → start celebration
  if celebrating → advance dance + confetti; when done, reset shelf

gameRender(ctx):
  draw current room background + static scenery
  draw collectibles + hotspots
  draw paw prints
  draw kitten sprite (facing + walk frame + accessory overlay)
  draw floaters (hearts, Zs, sparkles)
  draw room-edge arrows
  draw weather particles (rain/snow)
  draw night overlay
  draw shelf strip across top
  if celebrating: draw happy dance + confetti

gameTap(x, y):
  if shelf full / celebrating → absorb tap
  if tap hits edge arrow → begin room transition
  if tap hits a hotspot → trigger its reaction
  if tap hits a collectible → collect it (sniff/chase/pickup per type)
  if tap hits kitten → purr + heart floater
  else → set kitten walk target
```

## Output Structure

This plan modifies existing files rather than creating a new directory hierarchy. No new source files are added under `src/`.

## Implementation Units

- [ ] **Unit 1: Template hooks and HUD suppression**

**Goal:** Add the minimum template-engine extensions the game needs: an optional `gameTap(x, y)` hook called during active gameplay, a `GAME.hideUI` flag that suppresses the default HUD and lets `gameTitleRender` fully own the title screen, and a CSS hook to hide DOM chrome (`#highScores`, `#instructions`).

**Requirements:** R1, R3, R4, R13, R14

**Dependencies:** None

**Files:**
- Modify: `src/engine/input.js` — in `handleCanvasInteraction`, after the title/game-over branches, call `gameTap(canvasX, canvasY)` if it exists and the game is actively running (not title, not game-over).
- Modify: `src/engine/loop.js` — skip `drawUI(ctx)` when `GAME.hideUI` is true.
- Modify: `src/engine/screens.js` — in `drawTitleScreen`, when `GAME.hideUI` is true and `gameTitleRender` exists, skip the engine's default title text / subtitle / prompt / version so `gameTitleRender` can own the frame.
- Modify: `src/template.html` — add a CSS rule that hides `#highScores` and `#instructions` when `body` has class `game-no-ui`, and in the inline boot script (or via a new one-liner hook) add that body class when `GAME.hideUI` is true.
- Modify: `README.md` — document the new `gameTap` hook and `GAME.hideUI` flag in the "How to Create a New Game" section.

**Approach:**
- `gameTap` mirrors `gameTitleRender` / `gameOverRender`: a well-known function name, called if defined, never required.
- `handleCanvasInteraction` currently returns early on title and game-over. Add a final branch: `if (typeof gameTap === 'function') gameTap(canvasX, canvasY)`.
- `GAME.hideUI` defaults to undefined/false; existing games are unaffected.
- CSS hook is a single `body.game-no-ui #highScores, body.game-no-ui #instructions { display: none; }` rule. The body class is added in `Engine.init()` (or just before) when `GAME.hideUI` is true.

**Patterns to follow:**
- The existing optional-hook pattern for `gameTitleRender` and `gameOverRender` in `src/engine/loop.js` and `src/engine/screens.js`.
- The existing style of small, localized engine changes guarded by config lookups.

**Test scenarios:**
- Happy path: with `GAME.hideUI = true` and a `gameTap` defined, clicking anywhere on the canvas during play calls `gameTap` with the canvas-space coordinates. Title and game-over flows are unchanged (still route to `startGame` / `restartGame`).
- Happy path: with `GAME.hideUI = true`, `drawUI` is not called — no score text or hearts appear on the canvas during play.
- Happy path: with `GAME.hideUI = true` and `gameTitleRender` defined, the engine does not draw "Press any key or tap to start" or the default title text on the title screen.
- Edge case: with `GAME.hideUI = false` (or unset), an existing game like the Block Dodge placeholder would still render its HUD identically — verify by toggling the flag off in the template file and confirming no regression in the old behavior. (This unit only needs to preserve backwards compatibility for existing game entry points; the Block Dodge code itself is replaced in later units.)
- Edge case: tapping the canvas with no `gameTap` defined is a no-op during play (no throw).
- Integration: the body class `game-no-ui` is applied at boot when `GAME.hideUI` is true, hiding `#highScores` and `#instructions` in the DOM.

**Verification:**
- Running `node build.js` produces an HTML that, when loaded with a minimal `GAME.hideUI = true` stub game, shows no score/heart HUD, no DOM scoreboard, no DOM instructions, and routes mid-play canvas taps to a `gameTap` callback.

---

- [ ] **Unit 2: Game config, palette, room data, and world scaffolding**

**Goal:** Replace `src/game-config.js` with the Tiny Kitty Garden configuration, define the soft-GBC palette and room manifest, and stand up an empty `gameInit` / `gameUpdate` / `gameRender` skeleton in `src/game.js` that draws a blank room background and does nothing else.

**Requirements:** R2, R3, R4, R10, R12, R13, R14, R15

**Dependencies:** Unit 1

**Files:**
- Modify: `src/game-config.js` — replace `GAME` object entirely:
  - `title: 'Tiny Kitty Garden'`
  - `subtitle: ''`
  - `version: 'v1'`
  - `bgColor` = a soft pastel like `#fff3d6`
  - `firebase` left blank
  - `firebasePath: 'tiny-kitty-garden'` (unused but kept for template compat)
  - `localStoragePrefix: 'tinyKittyGarden'`
  - `width: 384, height: 216`
  - `controls: []` (no buttons, no keyboard mappings)
  - `instructions: []`
  - `hideUI: true`
- Modify: `src/game.js` — replace the Block Dodge implementation entirely. Add:
  - Palette constant (butter yellow, mint, peach, lavender, sky blue, soft pink, warm white, soft brown outline, night indigo).
  - Room manifest (four room ids with placeholder `draw(ctx)` functions that fill a pastel background).
  - `world` object with `kitten`, `room`, `rooms`, `shelf`, `weather`, `night`, `pawPrints`, `floaters`.
  - `gameInit()` initializing the world, setting `Engine.state.health = 1`, `Engine.state.maxHealth = 0`, `Engine.state.score = 0`.
  - `gameUpdate(dt)` that is a no-op for now (keeps `Engine.state.health = 1`).
  - `gameRender(ctx, w, h)` that calls the current room's `draw`.
  - `gameTitleRender(ctx, w, h, time)` that fills the background with the title palette and draws the game name as a single piece of hand-drawn pixel art (no typographic text from the engine default).
  - Stub `gameTap(x, y)` that does nothing yet.

**Approach:**
- Define the palette once at the top so every subsequent unit references the same constants.
- Establish the room manifest shape now so Units 3-6 can add scenery, hotspots, and collectibles incrementally.
- Keep `Engine.state.health = 1` forever to make the game un-losable (`loop.js` triggers game-over on `health <= 0`). `maxHealth = 0` doubles as defense-in-depth for the heart display.
- The custom title "logo" can be a very simple pixel-art rendering of the word "Kitty" (or a kitten face icon) — the spec says it's the only copy, so keeping it shaped like art, not typeset text, reinforces the no-reading rule.

**Patterns to follow:**
- `const GAME = { ... }` shape in the existing `src/game-config.js`.
- Existing game-contract shape (`gameInit`, `gameUpdate`, `gameRender`) from `src/game.js`.
- Pixel-grid rendering via a single `fillRect` per pixel, as used in the placeholder Block Dodge player sprite.

**Test scenarios:**
- Happy path: loading the built page shows a pastel title screen with no engine-default text, a custom kitten/title logo, and a tap prompt that is art (e.g., a pulsing paw), not letters.
- Happy path: tapping the title screen transitions into play and renders the garden room background with nothing in it.
- Happy path: no HUD (score, hearts) is visible at any point.
- Edge case: `GAME.controls` being empty produces no touch buttons and no keyboard-map entries (confirm no errors in `setupInput`).
- Edge case: `gameUpdate` never lowers `Engine.state.health`, so game-over is never triggered.

**Verification:**
- `node build.js` succeeds and `dist/index.html` loads. Title screen shows only custom art. Tapping starts play. The garden background renders. No HUD anywhere. No JavaScript errors.

---

- [ ] **Unit 3: Kitten sprite, tap-to-walk movement, paw prints, and self-pet**

**Goal:** Implement the kitten: procedural pixel-art sprite with 4 facing directions and 2-frame walk cycle, tap-anywhere movement, fading paw prints behind her, and a purr+heart reaction when the kitten herself is tapped.

**Requirements:** R1, R5, R7 (kitten self-tap)

**Dependencies:** Unit 2

**Files:**
- Modify: `src/game.js` — add kitten sprite data table, draw helper, movement update in `gameUpdate`, paw-print spawn + decay, heart floater system, and wire kitten hit-testing into `gameTap`.

**Approach:**
- Sprite is a color-index grid (e.g., ~16x16 pixels at 2x-scale on a 384x216 canvas). Four directions — down, up, left, right — each with frame A/B. Palette indices reference the shared palette constant.
- Movement: `kitten.targetX/Y` is set by `gameTap`. Each frame, kitten moves toward target by a fixed speed × `dt`, updating `facing` from the dominant axis. On arriving (within a small epsilon), velocity is zero.
- Walk frame advances while moving: every ~8 pixels of travel, flip between frames A and B.
- Paw prints: every ~12 pixels of travel, append `{x, y, life: 90}` to `world.pawPrints`. Drawn as small cross-hatched marks; alpha scales with remaining life; expired prints are spliced out.
- Kitten hit-test: roughly a 24x24 box centered on the kitten's position. On tap-hit, play the purr sound and spawn a heart floater rising from above the kitten's head.
- Heart floater is a small upward-drifting pixel heart that fades over ~60 frames.

**Patterns to follow:**
- Engine particle system in `src/engine/particles.js` — can be reused for paw prints and hearts, or a dedicated per-game floater array can be used for tighter control over draw order. Prefer the per-game array so floaters render on top of the kitten but below the shelf.
- The existing Block Dodge sprite is a useful reference for the "fillRect per pixel, reading from a color grid" style.

**Test scenarios:**
- Happy path: tapping anywhere moves the kitten to that point at a constant speed.
- Happy path: kitten facing changes to match primary movement axis (down/up/left/right).
- Happy path: walk-cycle frame alternates while moving and freezes on the A frame when idle.
- Happy path: paw prints appear behind the kitten as she walks and fade out over ~1.5 seconds.
- Happy path: tapping directly on the kitten triggers a purr sound and a floating heart; it does *not* also set a new walk target.
- Edge case: tapping the exact spot the kitten already occupies is a no-op for movement but still triggers the self-pet.
- Edge case: tapping while the kitten is mid-walk re-targets her smoothly to the new point without snapping.
- Edge case: rapid repeated taps on the kitten spawn multiple hearts without leaking (floater list stays bounded because old hearts are spliced out on expiry).
- Integration: paw prints and hearts render under the shelf and over the room scenery (to be wired up in Unit 5 when the shelf exists; for now, verify they render over the room).

**Verification:**
- In the built game, the kitten walks to any tapped point in the garden room, leaves fading paw prints, flips facing direction naturally, and responds to a tap on her own body with a purr + heart.

---

- [ ] **Unit 4: Room rendering and room-to-room navigation**

**Goal:** Fill in the four rooms (Garden, Kitchen, Bedroom, Beach) with static procedural scenery and implement tap-to-transition via edge arrows.

**Requirements:** R2, R12

**Dependencies:** Unit 3

**Files:**
- Modify: `src/game.js` — flesh out each room's `draw(ctx)` with scenery appropriate to the room's theme; add an `exits` map per room (e.g., `{ left: 'beach', right: 'kitchen' }`); add edge-arrow rendering and hit-testing in `gameTap`; implement a short crossfade on transition; add per-room spawn positions so the kitten enters from the opposite edge of the arrow she tapped.

**Approach:**
- **Garden:** butter-yellow sky, mint grass, a round pond (will hold the frog hotspot in Unit 5), a few trees/bushes in soft greens and browns, stylized background flowers (separate from the collectible flowers added in Unit 6).
- **Kitchen:** peach floor, lavender wall, a food bowl and milk saucer (hotspots in Unit 5), a cozy rug, a mouse hole in the baseboard.
- **Bedroom:** sky-blue floor, pale lavender wall, a cozy bed (hotspot in Unit 5), a toy box in one corner (Unit 6 yarn-ball target), a window.
- **Beach:** butter-yellow sand, sky-blue sea at the top, gentle wave line, scattered beach decor (rocks, a starfish), crab spawn area.
- **Edge arrows:** glowing pastel arrows at the left and right edges (and maybe top/bottom as appropriate) drawn with a soft pulsing outline. Layout them so the four rooms form a cycle: Garden ↔ Kitchen ↔ Bedroom ↔ Beach ↔ Garden (or a 2x2 loop — final layout is a detail decided during implementation).
- **Transitions:** when a tap hits an arrow, start a ~15-frame crossfade: interpolate `globalAlpha` from the old room out and the new room in. Freeze input and movement during the crossfade. Spawn the kitten at the opposite edge of the new room, already facing inward.
- **Arrow hit-testing:** each room's arrow hotspot is a rectangle at the screen edge. Arrow tap supersedes walk-target setting.

**Patterns to follow:**
- Per-room `draw(ctx)` functions keep each room self-contained and make adding interactables trivial.
- Use the existing particle system for optional ambient scenery (e.g., a few drifting petals or dust motes) if it adds life without being noisy.

**Test scenarios:**
- Happy path: tapping an edge arrow crossfades to the next room and spawns the kitten on the arrival edge.
- Happy path: every room is reachable from every other room through the arrow cycle (at most 2 transitions).
- Happy path: during the transition, tapping is ignored (the crossfade runs uninterrupted).
- Edge case: tapping near but not on an arrow sets a walk target as normal — the arrow hit-box should feel forgiving but not dominate.
- Edge case: the kitten's current walk target from the previous room is cleared on transition (she doesn't inherit a stale target).
- Edge case: paw prints and floaters from the previous room are cleared on transition (they don't bleed across rooms).
- Integration: the engine title → gameplay entry flows into the starting room (Garden) with no visible seam.

**Verification:**
- All four rooms render with distinct scenery and palette-appropriate colors. Arrows are visible at the edges. Tapping an arrow transitions rooms smoothly. The kitten always enters from the opposite edge of the arrow she used.

---

- [ ] **Unit 5: Interactive delight hotspots**

**Goal:** Add the non-collecting tap-for-delight interactions: pond/frog, food bowl, milk saucer, bed (including the night toggle), waves, crab, mouse wave. Every tap on one of these plays a sound and triggers a small animation. (Kitten self-tap already implemented in Unit 3.)

**Requirements:** R7, plus the night-toggle dependency for R6 stars

**Dependencies:** Unit 4

**Files:**
- Modify: `src/game.js` — per-room hotspot arrays with `{x, y, w, h, kind, state}` entries, hit-testing in `gameTap`, per-frame state advancement in `gameUpdate`, and per-frame rendering in each room's `draw`.

**Approach:**
- Each hotspot has a lightweight state machine (idle → animating → back to idle) with a frame timer. Tapping an idle hotspot kicks it into its animation; tapping again while animating either re-triggers (for most) or is ignored (for the bed).
- **Frog in pond (Garden):** tap the pond → frog sprite jumps out of the water, mid-air "ribbit" sound, lands back in.
- **Food bowl (Kitchen):** tap → kitten walks to it (reuse movement), eats animation (little bobbing + munch sound), small food particles.
- **Milk saucer (Kitchen):** tap → kitten walks to it, laps animation (tongue flick), lap sound.
- **Bed (Bedroom):** tap → kitten walks to it, curls up with floating Zs for ~2 seconds, then stretches awake. First bed-tap of the session also flips `world.night = true`, spawning stars in every room (Unit 6 handles the stars themselves; this unit just flips the flag and plays a twinkle chime).
- **Waves (Beach):** tap on the wave line → kitten taps back (small paw splash) + giggle sound.
- **Crab (Beach):** tap → crab scuttles sideways a short distance, then stops.
- **Mouse (Kitchen):** whenever the kitchen is entered, the mouse briefly waves (no tap needed — it's a greeting). Tapping the mouse during the wave is optional delight (extra mrrp).
- **Tap-to-walk redirection:** hotspot hits should set a walk target *toward* the hotspot, so the kitten moves to it, then run the hotspot's animation on arrival. This feels more natural than a teleport.

**Patterns to follow:**
- Kitten movement queue from Unit 3 — reuse to walk the kitten to the hotspot before the reaction runs.
- Floater system from Unit 3 — reuse for Zs, food bits, splashes, mrrps.

**Test scenarios:**
- Happy path: tapping the pond triggers a frog hop and a ribbit sound.
- Happy path: tapping the food bowl walks the kitten to it, plays an eat animation, and loops the kitten back to idle.
- Happy path: tapping the bed walks the kitten to it, sleeps for ~2 seconds, wakes, and flips `world.night` to true on the first tap.
- Happy path: tapping the waves plays a splash sound and a paw-splash animation.
- Happy path: tapping the crab makes it scuttle sideways a short distance.
- Happy path: the first time the kitchen is visited in a session, the mouse waves automatically.
- Edge case: tapping a hotspot that is already mid-animation does the right thing for its type — most hotspots re-trigger, the bed ignores taps while sleeping.
- Edge case: tapping the frog pond from across the room spawns a walk target then fires the animation — the animation does not fire until the kitten arrives. Alternatively, the frog hops regardless (it's not waiting for the kitten); this is a design choice — plan is: the *frog* hops immediately, the *kitten* walks toward the pond if she's far.
- Edge case: leaving a room mid-animation resets the hotspot to idle on re-entry (no frozen state).
- Integration: every hotspot plays the correct sound from the SOUNDS map (wired up in Unit 7).

**Verification:**
- Each room's hotspots produce their intended delight reactions on tap, with sounds wired up in Unit 7, and the bed correctly toggles night mode on first tap.

---

- [ ] **Unit 6: Collectibles, shelf UI, weather, day/night, and full-shelf celebration**

**Goal:** Add the full collection system — flowers, butterflies, shells, yarn balls, stars, treats — plus the pictorial shelf across the top, weather (clear/rain/snow) with kitten accessory, the night-mode star spawn tied to the bed, and the full-shelf happy dance + confetti + reset celebration.

**Requirements:** R6, R8, R9, R10

**Dependencies:** Unit 5

**Files:**
- Modify: `src/game.js` — extend `world.shelf`, add per-room collectible spawn logic, collection animations per collectible type, shelf rendering above the game world, weather initialization in `gameInit`, night-mode star spawning when `world.night` flips true, full-shelf celebration state machine.

**Approach:**
- **Flowers (Garden, 5 colors):** 5 flower sprites at fixed garden positions, each a distinct pastel color. Tap a flower → kitten walks to it, sniffs (brief nuzzle animation), flower blooms bigger then shrinks into a "pressed flower" floater that arcs up into the shelf's flower slot. The flower slot for that color lights up.
- **Butterflies (Garden, N=6):** 2 at a time drifting in slow sine paths. Tap a butterfly → kitten walks to it; on arrival, butterfly lands on the kitten's head for ~1 second then flutters up into the shelf jar, filling one slot. Respawn periodically until the session cap is reached.
- **Shells (Beach, 6 shapes):** 6 shell sprites at fixed beach positions. Walking the kitten onto one (or tapping one — simplest: tap) picks it up with a happy chirp. Shell flies to the shelf slot.
- **Yarn balls (one per room, 4 total):** tap a yarn ball → kitten walks to it, pushes it toward the nearest exit (animated roll). If the kitten is in the bedroom, the ball rolls into the toy box and fills a bedroom shelf slot. If in another room, the ball rolls to the room edge and "follows" the kitten to the bedroom next time she transitions (simplest model: collecting a yarn ball in any room queues it in `shelf.yarnBalls`, which is displayed on the shelf unconditionally; the toy box is visual flavor).
- **Stars (all rooms, 3 per room, only at night):** after the bed is tapped and `world.night` flips true, 3 small twinkling stars appear at fixed positions in each room. Tap a star → sparkle chime + star flies up to the shelf.
- **Treats (Kitchen, via mouse):** each time the kitchen is entered, the mouse offers one treat after its wave animation. Tap the treat → kitten walks to it, eats, and one slot in the treat jar on the shelf fills. Capped at ~5 slots per session.
- **Shelf rendering:** a soft pastel rounded rectangle at the top of the screen (~20 px tall), subdivided into icon slots for each category. Each slot is a tiny pixel-art icon (greyed when empty, in-color when collected). Drawn last in `gameRender` so it sits above the world.
- **Weather:** chosen in `gameInit` with a 60/20/20 split. Clear = nothing extra. Rain = particles falling softly, kitten draws with a tiny umbrella overlay. Snow = particles falling more slowly, kitten draws with a jacket + hat overlay. The accessory overlay is a small extra pixel-art grid layered onto the kitten sprite in her draw function.
- **Night mode:** when `world.night` is true, all rooms render with a dark indigo multiply-style overlay (`ctx.fillStyle = 'rgba(50,50,120,0.25)'` over the world before UI layers), and stars are present. Melodies shift to their slower variants (Unit 7 handles this).
- **Full-shelf celebration:** once every slot is filled, `world.celebrating = true`. The kitten runs a short dance routine (3 seconds of hops and spins), confetti particles fall across the screen, a happy chime plays. When done, the shelf empties, collectibles respawn at their starting positions, and the session continues.

**Patterns to follow:**
- Floater pattern from Unit 3 for "collectible flies to the shelf."
- Engine particle system for rain, snow, and confetti.
- Fixed-position spawn tables per room keep the world static and familiar, which matters for a 3 year old learning the geography.

**Test scenarios:**
- Happy path: tapping a flower results in a pressed-flower icon appearing in the shelf's flower row.
- Happy path: catching all 5 flower colors fills that row entirely; the 6th attempted flower collection is a no-op (nothing to collect because all are already collected).
- Happy path: tapping a butterfly results in a butterfly riding the kitten's head briefly, then flying to the shelf jar.
- Happy path: tapping shells on the beach fills the shell row in order of tap.
- Happy path: tapping a yarn ball fills one yarn-ball slot on the shelf.
- Happy path: after tapping the bed, stars appear in every room; tapping each star fills the star row.
- Happy path: entering the kitchen triggers the mouse wave; tapping the treat fills a treat-jar slot.
- Happy path: filling every slot triggers the happy dance, confetti, and a reset — all slots are greyed again and collectibles respawn.
- Happy path: a session started with "rain" draws rain particles and a kitten-with-umbrella overlay; "snow" draws snow particles and a jacket/hat overlay; "clear" draws neither.
- Edge case: tapping a collectible that is already mid-collection (e.g., in its fly-to-shelf animation) is a no-op — no double-count.
- Edge case: changing rooms while a floater is in flight ends the floater on room exit so it doesn't render in the wrong room.
- Edge case: stars only spawn after night toggles on, and only once per room entry while `world.night` is true.
- Edge case: the celebration does not re-fire if the player taps during the happy dance.
- Integration: the shelf always reflects the true `world.shelf` state, including after a full-shelf reset.

**Verification:**
- Every collectible category is reachable and visibly fills its shelf slot. Weather draws correctly and modifies the kitten sprite. Night mode toggles on bed-tap and spawns stars. Full shelf triggers the celebration and resets cleanly.

---

- [ ] **Unit 7: Sound — chiptune lullabies per room and cat sounds**

**Goal:** Replace `src/game-sounds.js` with a set of soft procedural sounds: a short looping chiptune lullaby per room, cat sounds (mrrp, prrr, mew, giggle), a sparkle chime for collections, and supporting reaction sounds (ribbit, splash, lap, eat, twinkle, dance cheer).

**Requirements:** R11

**Dependencies:** Unit 6 (collectibles and hotspots must exist for sound hooks to fire)

**Files:**
- Modify: `src/game-sounds.js` — define the full `SOUNDS` map including:
  - `start` (soft "hello" chime on title → play transition — engine auto-plays)
  - `gameOver` (unused in practice since the game never ends, but set to a harmless silent no-op so the engine doesn't throw if ever called)
  - `mrrp`, `prrr`, `mew`, `giggle` (tone sequences in sine/triangle waves)
  - `sparkle` (collection chime)
  - `twinkle` (star chime + night toggle)
  - `ribbit`, `splash`, `lap`, `eat`, `waveBack`, `scuttle`
  - `celebrate` (full-shelf happy chime)
  - Per-room lullaby tones: not a continuous melody manager, but a short note sequence played occasionally while in that room (e.g., every ~6 seconds a new 3-4 note phrase plays softly).
- Modify: `src/game.js` — fire the right sound at the right moment in hotspots, collectibles, transitions, and celebration. Add a small per-frame "lullaby scheduler" that picks the current room's phrase and queues it at a soft interval.

**Approach:**
- Each lullaby is implemented as a small list of notes (frequency + duration) that is iterated with `setTimeout` calls, similar to the existing `start` and `gameOver` sound definitions in `src/game-sounds.js`. Keep volumes low (0.1-0.2).
- The lullaby scheduler lives in `game.js` so it can react to the current room and night mode. It tracks `lastLullabyTime` and, when more than N seconds have elapsed, plays the room's phrase. Pauses during celebrations.
- Night-mode variants are the same note list played slightly slower (longer durations) and pitched down a fifth.
- Cat sounds are short 2-3 tone phrases that evoke the named emotion:
  - `mrrp` = rising triangle chirp, ~120ms
  - `prrr` = soft low sawtooth with quick amplitude wobble, ~400ms
  - `mew` = rising sine, ~180ms
  - `giggle` = 3-4 quick ascending sine blips

**Patterns to follow:**
- The existing `SOUNDS` shape in `src/game-sounds.js` and the timed-`setTimeout` pattern for multi-note sound functions.
- Volumes and wave types already proven pleasant in the template (`square` / `sine` / `triangle` / `sawtooth` with volumes in the 0.2-0.3 range).

**Test scenarios:**
- Happy path: entering each room starts playing that room's lullaby phrase at a soft interval.
- Happy path: every hotspot and collectible plays its associated sound when interacted with (pond → ribbit, food bowl → eat, waves → splash, crab → scuttle, kitten self-tap → prrr, flower → sparkle, butterfly → mew + sparkle, shell → mrrp + sparkle, yarn → mew, star → twinkle, treat → eat + sparkle, full shelf → celebrate).
- Happy path: night mode shifts the lullaby to its slower variant.
- Happy path: the title-screen tap triggers the `start` sound (template already does this).
- Edge case: rapid taps on collectibles don't overlap lullaby phrases chaotically — the lullaby only plays on its own timer, and reaction sounds play inline.
- Edge case: the game never calls `gameOver` in practice, but if the engine ever fires it (e.g., debugging), it is a silent no-op.
- Edge case: muting the sound via the engine mute button silences all lullabies and reaction sounds.
- Integration: all sound fire points actually exist in the game code added in Units 3-6.

**Verification:**
- Playing the built game produces gentle per-room chiptune, cat-like reactions for every interaction, and a happy celebration chime on full-shelf. Muting silences everything.

---

- [ ] **Unit 8: Title screen polish, build, and manual test**

**Goal:** Finalize the title screen art, wire the tap-to-start flow through the custom title, run a full manual test pass across every room and interaction, bump the version string, and produce a built `dist/index.html` + root `index.html`.

**Requirements:** R13, R15, plus a final pass against all other requirements

**Dependencies:** Unit 7

**Files:**
- Modify: `src/game.js` — polish `gameTitleRender` (custom logo, pulsing paw "tap here" prompt that is art, not text), and ensure the first `gameInit` after title-tap starts the kitten in the Garden room with a friendly pose.
- Modify: `src/game-config.js` — bump `version` from `v1` to the next version before push.
- Run: `node build.js` to produce `dist/index.html` and root `index.html`.

**Approach:**
- Title screen features: pastel background, kitten-face logo, kitten sprite at rest in the middle, a gently pulsing paw-print icon as the "tap to start" cue.
- Manual test matrix:
  - All 4 rooms reachable from all other rooms
  - Every hotspot reacts on tap
  - Every collectible category reachable and fills its shelf slot
  - Night mode toggles after bed tap; stars appear in every room
  - Full shelf triggers celebration and resets
  - Weather modes each tested by forcing via a temporary override (then reverted)
  - All sounds play, lullabies cycle, mute button silences everything
  - Nothing readable on screen during play — no HUD, no score, no instructions DOM, no default title text, no game-over text
  - No JavaScript errors in the console at any point
- Final version bump: `version: 'v1'` → bump per `CLAUDE.md` guidance ("Before each push, increment version").

**Patterns to follow:**
- Existing `node build.js` CI-sync pattern: `dist/index.html` and root `index.html` should both be produced and should match.
- Existing versioning rule from `CLAUDE.md`: bump version before pushing and prefix the commit message with it.

**Test scenarios:**
- Happy path: title screen shows custom art only — no engine-default text.
- Happy path: tapping the title screen starts the game in the Garden with the kitten idle.
- Happy path: manual test matrix above passes end to end with no visual or audio glitches.
- Happy path: `node build.js` reports success and both output files are updated.
- Edge case: opening the built file directly from `file://` renders correctly (sans Firebase, which is unused here).
- Edge case: nothing readable appears at any point. If the default engine title text or score HUD sneaks back in, the test fails.
- Integration: the full session loop — title → play → fill shelf → celebration → continue playing — works end to end.

**Verification:**
- `node build.js` exits 0. Opening `dist/index.html` loads the game. Playing through the full manual test matrix produces no errors, no readable text during play, and all delight reactions + collections + celebration work as specified.

## System-Wide Impact

- **Interaction graph:** The only new template-engine change is a `gameTap` hook in `src/engine/input.js` and a `GAME.hideUI` check in `src/engine/loop.js` / `src/engine/screens.js` / `src/template.html`. Both are backwards-compatible: existing games that don't define `gameTap` or `hideUI` are unaffected.
- **Error propagation:** Template engine errors bubble to the browser console; the game has no server or external dependencies. Sound failures are already swallowed by the template's sound engine. No new error surfaces.
- **State lifecycle risks:** `world` is in-memory only and is re-created on each `gameInit`. Floaters, paw prints, and hotspot states must be cleared on room transition to avoid cross-room artifacts (called out in Unit 4). The full-shelf celebration state machine must not double-trigger (called out in Unit 6).
- **API surface parity:** No external API surface. Internal API changes: `gameTap` added as an optional engine-called game function; `GAME.hideUI` added as an optional config flag. Both are documented in `README.md` in Unit 1.
- **Integration coverage:** Manual playtest in Unit 8 is the integration check. There is no automated test suite in this template today; adding one is out of scope.
- **Unchanged invariants:**
  - The game contract (`gameInit`, `gameUpdate`, `gameRender`, optional `gameTitleRender`, optional `gameOverRender`) remains as it was. `gameTap` is an *additional* optional hook.
  - The build pipeline (`node build.js` concatenates fixed JS files into `dist/index.html` and root `index.html`) is unchanged. No new source files are added to the bundle list.
  - The HTML shell's `#gameContainer`, canvas, mute button, and Firebase script tags remain as-is. Only the CSS rule set and the boot-time body class are touched.
  - The existing Block Dodge behavior would still render correctly if the new engine flags and hook were back-ported with `hideUI` unset. (Unit 1 verifies this before Block Dodge is replaced.)
  - `Engine.state.health` and `Engine.state.maxHealth` remain the same fields; we set them to `1` and `0` respectively but don't change their meaning.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| The default title-screen text and HUD are baked into the engine in ways that can't be cleanly overridden. | Unit 1 addresses this with a `GAME.hideUI` flag that suppresses the default in `loop.js` and `screens.js`. Verified in Unit 1's test scenarios before any game code depends on it. |
| Tap-to-walk collides with existing canvas click handler that steals clicks on title / game-over. | The new `gameTap` hook is only fired when both `showTitleScreen` and `gameOver` are false, so it cannot collide with the existing flows. |
| `game.js` becomes a single enormous file as all systems land there. | Organize `game.js` with a clear top-to-bottom order — constants/palette, room data, kitten, rooms, hotspots, collectibles, shelf, weather, night, celebration, sound scheduler — separated by banner comments. Do not create new source files (would require editing `build.js`). |
| Procedural pixel-art kitten / mouse / frog / crab look bad on first pass. | Plan reserves visual tuning as a deferred implementation concern. Sprites are grid-of-indices so they're cheap to iterate on without reshuffling code. |
| Lullaby scheduler competes with reaction sounds and becomes noisy. | Lullaby plays on a long interval (several seconds) at low volume. Reaction sounds play inline. A simple "don't schedule a new lullaby phrase for N seconds after a reaction sound" rule can be added if playtesting reveals overlap. |
| The child re-taps before an animation finishes and breaks a hotspot's state machine. | Unit 5 calls out per-hotspot re-trigger semantics explicitly (most re-trigger, bed ignores taps while sleeping). All state machines reset to idle on room exit. |
| Full-shelf celebration fires more than once. | Celebration sets a `world.celebrating` flag that disables collection until the celebration completes and the shelf is reset. Unit 6 calls this out. |
| Browser autoplay policy silences the Web Audio engine until first user gesture. | The template already initializes sound on first gesture (see `Sound.init()` in `src/engine/sound.js`). The title-screen tap is the first gesture, so lullabies and reactions are live by the time the child enters a room. |
| Rain / snow particle counts cause frame drops on low-end tablets. | Keep particle density low (a handful at any time) and cull off-screen. Engine already handles particle lifetime. Tune in Unit 8 playtest. |
| Future games built from this template don't want `gameTap` or `hideUI`. | Both are opt-in. The default behavior of the template is unchanged. |

## Documentation / Operational Notes

- Update `README.md` in Unit 1 to describe `gameTap` and `GAME.hideUI` under "How to Create a New Game," mirroring the existing treatment of `gameTitleRender` / `gameOverRender`.
- Bump `version` in `src/game-config.js` before each push per `CLAUDE.md`. Commit messages should begin with that version (e.g., `v2: Tiny Kitty Garden core world`).
- No rollout / monitoring concerns — this is a static HTML page served by GitHub Pages. The existing `.github/workflows/build.yml` rebuilds and commits `index.html` on push automatically.

## Sources & References

- Feature description from the user-supplied spec (inline in this plan — no separate requirements doc exists in `docs/brainstorms/`).
- Template contract: `src/engine/engine.js`, `src/engine/loop.js`, `src/engine/input.js`, `src/engine/screens.js`, `src/engine/sound.js`, `src/engine/particles.js`.
- Game contract and versioning rules: `CLAUDE.md`.
- Template documentation and API reference: `README.md`.
- Build pipeline: `build.js`, `.github/workflows/build.yml`.
