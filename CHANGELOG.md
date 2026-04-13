# Changelog

A running log of what was built and the design decisions behind each change.
Each entry is added in the same commit as the code change. Most recent entries
are at the top.

The convention and update workflow are documented in `CLAUDE.md` under
"Changelog".

---

## v9 — Phase 3 interaction richness: multi-stage reactions, secrets, world responses, mouse personality (`TBD`)

**What changed**

- **Multi-stage hotspot reactions (Unit 9):** Replaced all single-event hotspot reactions with a `REACTIONS` registry and stage-based state machine (`startReaction`, `reactionTick`, `cancelReaction`). Each hotspot now runs a multi-stage vignette: food bowl (sniff → eat with crumb beats → lick → sit), milk (sniff → lap with rhythmic sounds → lick), bed (step up → curl → sleep loop with Z floaters + night toggle → stretch → sit), pond/frog (lean in → frog hop + ribbit → watch), crab (cock head → scuttle → watch), waves (paw water → splash with spray + giggle → shake), mouse (wave → meow back → treat offer → retreat), self-pet (purr loop with hearts every 24 frames). Reactions can be interrupted by tapping elsewhere. Hard timeout at 8 seconds.
- **Discoverable secrets (Unit 10):** Added 2 hidden tap-surprises per room (8 total). Each requires 3 taps within 1.5 seconds: garden (bush bird, rock snail), kitchen (tile spider, rug coin), bedroom (toy box teddy, window birds), beach (baby crab, pearl shell). Once found, re-triggerable on single tap. Taps below threshold fall through to normal walk.
- **Environmental responses (Unit 11):** Paw prints now color-match the surface (grass=dark green, sand=sandy, wood=lavender, tile=nearly invisible). Walking on dirt/sand spawns dust puffs. Walking near the pond spawns water ripples. Flower decoration tiles sway 2px when the kitten walks past, decaying back smoothly.
- **Mouse personality + portrait windows (Unit 12):** The kitchen mouse gets a random mood per session (shy/playful/sleepy) that varies its reaction — shy is brief and quick, playful has double waves and a star flourish, sleepy opens with a yawn. Added a generic `drawPortraitWindow` system with fade-in/out; the mouse portrait is procedural with mood-specific eyes. Portrait appears during mouse reaction beats. System is reusable for frog/crab in future.

**Why**

Phase 3 turns every interaction from a one-shot event into a little vignette the child can watch unfold. The reaction state machine is the load-bearing system — it replaces scattered `setTimeout` and `hs.state` timers with a declarative stage list that sets animations, spawns effects, and plays sounds at precise beats. The secrets reward curiosity without blocking normal play. The environmental responses make the kitten feel grounded in the world (her paw prints match the floor, flowers notice her). The mouse personality means repeat sessions feel different — the kitchen has character now, not just mechanics.

Browser-verified: food bowl multi-stage reaction completes, bed triggers dusk→night, mouse reaction runs with mood-specific behavior, all reactions cancel cleanly on interrupt, no console errors.

---

## v8 — Phase 2 visual upgrade: sprite kitten, tile map rooms, ambient life (`d547ad0`)

**What changed**

- Replaced the old `drawKittenSprite` (50+ lines of manual `fillRect` calls) with a data-driven 24×24 multi-frame sprite. 22 unique frames covering: walkDown/Up/Right (3 each, walkLeft mirrored via flipX), idleBreathe, sit, sitTailTwitch, sleepCurl, eat, purr, and happyDance. All authored as ASCII art via `defineSprite` and rendered through `renderSprite`.
- Wired the kitten into the Phase 1 animation state machine: `updateKitten` now calls `playAnim`/`updateAnim` based on movement state, and `drawKitten` uses `getAnimSpriteFrame` + `renderSprite`. Walk animation cycles visibly in all 4 directions, idle-breathe plays when stopped.
- Added `flipX` support to `renderSprite` so walkLeft reuses walkRight frames without duplicating sprite data.
- Converted all 4 rooms from hand-painted `fillRect` backgrounds to tile map declarations using the Phase 1 tile system. Registered ~30 tile types: grass variants (gA-gD), stone path, water, dirt, kitchen floor, rug, bedroom planks, carpet, sea, wet/dry sand, rock, decorative flowers, bush, mouse hole, and tree foliage overlay.
- Each room now has a `map` property with 3-layer tile data (ground/decoration/overlay). Tree foliage in the garden draws OVER the kitten via the overlay layer.
- Kitchen and bedroom get `indoor: true` for the lighting pass.
- Added per-room ambient life (Unit 8): garden has bird flyby, frog blink, fish jump; kitchen has steam wisps, mouse peek, dust mote; bedroom has cozy floating particles, yarn wobble, pillow puff; beach has seabird, wave spray, sand puffs trailing the kitten.
- All ambient effects use gentle motion (1-4px entities, 0.1-0.6 px/frame), randomized intervals, and capped particle arrays.

**Why**

This is where the game goes from "programmer art demo" to "a world that feels alive." The data-driven sprite replaces ~80 lines of imperative fillRect code with a ~600-line sprite data table that supports 22 animation frames — the trade-off is more data but the kitten now has smooth multi-frame walk cycles, idle breathing, and distinct poses for every interaction. The tile maps give each room visual density and variety that hand-painted fillRect backgrounds couldn't achieve (4 grass variants vs. one flat green). The ambient life means the world moves even when the child isn't tapping — birds fly, frogs blink, steam rises. Together these changes address the core Stardew-gap identified in the plan: density, life, and idle animation.

Browser-verified: all 4 rooms render correctly, kitten walks and animates in all directions, night mode + weather work over the new tiles, hotspots and collectibles still function, no console errors.

---

## v7 — Phase 1 foundation: sprite renderer, animation, tile maps, lighting (`e7c5de1`)

**What changed**

- Added `renderSprite(ctx, sprite, frameIdx, x, y, opts)` — a generic pixel-art sprite renderer that draws color-indexed grids with optional outline, shadow, and flash effects. Sprites are defined via `defineSprite(w, h, palette, framesAsStrings)` using readable ASCII-art strings.
- Added a sprite registry (`SPRITES` map) with `getSprite(name)` fallback that generates deterministic HSL placeholder sprites for any unregistered name — the game never shows a missing-texture error.
- Added a per-entity animation state machine: `playAnim(entity, name)`, `updateAnim(entity, dt)`, `getAnimSpriteFrame(entity)`. Supports looping, non-looping with `next` state transition, and `pingPong` mode. Animation declarations are data (`{ frames, frameMs, loop, pingPong, next }`).
- Added a tile map renderer: `TILES` registry with `{ surface, draw(ctx, x, y, seed, neighbors) }`, `drawTileLayer(ctx, map, layerName)` for 3-layer maps (ground/decoration/overlay), deterministic per-cell `tileSeed()`, and `surfaceAt(map, px, py)` for surface-type lookups.
- Added `drawLightingPass(ctx)` — a single `globalCompositeOperation = 'multiply'` full-screen tint that handles day/dusk/night × clear/rain/snow × indoor/outdoor combinations. Replaces the old inline `rgba(40,30,90,0.32)` night overlay.
- Added `world.timeOfDay` (`day`/`dusk`/`night`) and `world.fx` (centralized screen-effects state). Bed-tap now triggers `day → dusk → night` with a smooth ~1-second fade instead of an instant flip.
- Added shared math helpers: `TAU`, `clamp`, `dist`, `rand`, `randi`.
- Kitten state extended with `animState`, `animFrame`, `animTimer`, `flash` fields for Phase 2 sprite conversion.

**Why**

These are the four foundation systems that every subsequent phase depends on. Without a data-driven sprite renderer, re-authoring the kitten as a multi-frame sprite (Phase 2) would mean hundreds more `fillRect` calls. Without a tile map system, converting rooms from hand-painted backgrounds to tile-based compositions would be impossible. Without a proper animation state machine, multi-stage reactions (Phase 3) would need ad-hoc frame-counting everywhere. And without a lighting pass that understands time-of-day + weather + indoor/outdoor, the visual polish would regress the existing night mode.

The existing game is visually unchanged — all old rendering paths still run. Phase 2 will start replacing them one at a time.

---

## v6 — Stardew-level visual polish plan + prior-art deepening (`b143afe`)

**What changed**

- New plan: `docs/plans/2026-04-11-002-feat-stardew-level-visual-polish-plan.md` proposing how to upgrade Tiny Kitty Garden from chunky procedural rectangles to a Stardew-adjacent top-down pixel-art game while keeping every existing constraint (single-file, no images, no engines, all-procedural Canvas + Web Audio).
- The plan went through two deepening passes after the initial draft:
  - First pass: cross-referenced against `/last30days` research across r/gamedev, r/IndieDev, r/proceduralgeneration, GitHub, and the open web. Surfaced industry-wide validation (SitePoint "Engine-Free Renaissance") and several concrete prior-art references (`Everrest`, `verdictzero/azet`, `mr1charles/Abil`, `Amalzybu/ecommerce`).
  - Second pass: actually fetched the source code of the prior-art repos and extracted concrete API patterns to borrow verbatim — `class Entity` base class from Abil, `drawPixelArtWindow` API from azet, `generatePlaceholderPortrait` deterministic-HSL pattern from azet, ENDESGA-32 palette anchor from the pixel-art spec, plus `pingPong` animation flag, Bayer dithering, Wang autotile categorization, and the centralized `world.fx` screen-effects state pattern.
- Plan now includes a "Concrete Patterns Borrowed From Prior Art" subsection with ~30 specific patterns each tied to a named PR or repo by URL.
- Phase 3 Unit 12 (mouse personality + dialogue portraits) is the biggest beneficiary: the deterministic-HSL placeholder pattern *eliminates ~6 hand-authored NPC portrait sprites* and replaces them with a single ~50-line procedural function — biggest single time saving in the entire plan.

**Why**

The original plan was sound but argued from first principles. The deepening passes turned every "we'll figure it out in implementation" into "here's the API shape that already shipped in a 2026 single-file canvas game." Concrete prior art is much stronger than generic best practices: it shows the project's identity (single-file, no engines, all-procedural) is *not* eccentric — there's a recognizable category of single-file HTML5 game projects with active 2026 PRs, and the patterns we need are already battle-tested in them. The new "Concrete Patterns" section is the highest-leverage section of the plan because each pattern collapses an open question into a decision.

The version bump to v6 keeps the per-push versioning convention from CLAUDE.md even though this commit is plan-only (no game code changes).

---

## v5 — Add CHANGELOG.md and document the convention in CLAUDE.md (`fe83894`)

**What changed**

- New `CHANGELOG.md` at the repo root with backfilled entries for v1-v4.
- `CLAUDE.md` now documents the changelog convention: every commit that
  makes a meaningful change must add a new entry in the same commit,
  using the **What changed / Why** format.

**Why**

Without a running log, the "why" behind each decision lives only in
commit messages and PR descriptions, which are easy to lose context on
when you're revisiting the code months later. The git history shows
*what* changed; the changelog captures *why*, plus the rejected
alternatives and the bugs that were caught along the way. Tying the
update to the commit means it can never drift from the code.

---

## v4 — True top-down rooms + proximity-gated interactions (`616e3a1`)

**What changed**

- Garden, kitchen, and bedroom backgrounds now full-fill the play area
  instead of splitting into sky/ground or wall/floor strips.
- `drawTree` redrawn as a round canopy seen from above (was a side-view
  trunk with foliage). `drawBush` is fluffier with a cast shadow.
  `drawToyBox` is now a top-down chest.
- Pond, crab, and mouse hotspots converted to walk-and-arrive — tapping
  them queues a walk and the reaction (frog hop, crab scuttle, mouse wave +
  treat drop) only fires once the kitten arrives.
- Removed the auto-wave on kitchen entry; the mouse only greets when the
  kitten chooses to come over.
- Collectibles spread vertically across the new top-down field.

**Why**

The previous side-view rooms (sky strip + grass strip) felt wrong for a
top-down tap-to-walk game — the kitten visually "floated in the sky" when
positioned in the upper half. Once everything is grass, every position is
walkable surface and the spatial logic is consistent.

The proximity gate matters because the design pillar is *the kitten
inhabits the world*. Triggering the frog from across the room broke that
feeling. Walking up to things is also a more natural fit for a 3 year
old's mental model of cause and effect.

---

## v3 — Browser tab title (`6e6554e`)

**What changed**

`<title>Arcade Game</title>` → `<title>Tiny Kitty Garden</title>` in
`src/template.html`.

**Why**

Trivial polish — the tab/bookmark name was still the template default
after the v2 ship.

---

## v2 — Tiny Kitty Garden full implementation (`13893dd`)

**What changed**

Replaces the placeholder Block Dodge game with the full Tiny Kitty
Garden world: one kitten, four single-screen rooms (Garden, Kitchen,
Bedroom, Beach), tap-anywhere-to-walk, tap-things-to-delight,
collectible shelf with 6 categories, weather (clear/rain/snow), night
mode, full-shelf celebration. No fail state, no text during play, all
procedural Canvas + Web Audio.

Adds two minimal, backwards-compatible template extensions so the
engine can host games with different idioms:

- `gameTap(x, y)` optional hook fired on canvas taps during active play
- `GAME.hideUI` flag suppresses the score/heart HUD, the default title
  text, and the DOM scoreboard/instructions blocks

Existing template games (`hideUI` unset, no `gameTap`) are unaffected.

**Key design decisions**

- **Single-file game.** All new code lives in `src/game.js` rather than
  new source files, because adding files would require editing
  `build.js`. The template's bundler is intentionally simple.
- **No fail state via `health = 1, maxHealth = 0`.** The engine's
  game-over check is `health <= 0`, so keeping it pinned at 1 is enough
  and requires no engine edit.
- **In-memory world state only.** No `localStorage` — every play
  session starts fresh, matching the spec ("Everything respawns the
  next play session").
- **Procedural pixel-art kitten.** Drawn with `fillRect` blocks, not
  loaded from an image. 4 facing directions, 2-frame walk cycle, snow
  hat / umbrella accessory layered on top.
- **Hotspot reactions queue a walk and fire on arrival** (instead of
  firing from anywhere on tap). Initially applied to food, milk, bed,
  waves; extended to pond/crab/mouse in v4.
- **Floaters carry an `onArrive` callback** that writes to the shelf
  when a collectible "lands." Used for all 6 categories.

**Critical bugs caught and fixed in the v2 commit (during ce:review)**

- **Bed and waves arrival check were geometrically impossible.** The
  reach test compared the kitten's landed position to the *hotspot
  center* with a `< 14` threshold, but for the bed the actual reach was
  `sqrt(200) ≈ 14.14` (just over) and for the waves it was 26+. Night
  mode and beach splash were both completely dead. Fix: introduced
  `queueHotspotWalk(hs, x, y)` which stores the *exact queued target*
  on the hotspot, and the arrival check uses a tight `< 4` epsilon
  against those coordinates.
- **In-flight collection floaters wiped on room transition without
  firing onArrive.** Floater life was 60 frames, transition fadeout was
  24, so any collectible in flight when the player tapped an edge arrow
  was discarded mid-fly. For fixed-slot collectibles (flowers, shells,
  yarn) the source was already marked `collected: true`, so the shelf
  slot became permanently unreachable and the celebration was blocked.
  Fix: `flushFloatersOnArrive()` runs before the transition clears the
  floater array.
- Stale `queued` flags on hotspots could fire on later free-space taps
  near the original hotspot center. Hardened by the
  `queueHotspotWalk` rewrite plus a defensive clear in the plain-walk
  branch of `gameTap`.

Cleanups in the same pass: removed dead `flower.bloom` field,
`SOUNDS.splash`, `kitchenVisits` counter, `drawSparkle` + sparkle
floater branch; added a treat-dispense race guard inside the
`setTimeout` callback; reset butterfly `onKitten` on room transition.

---

## v1 — Initial template copy (`583181f`)

Cloned the arcade-game-template repo with the placeholder Block Dodge
game. No changes — this is the starting point.
