---
title: "feat: Stardew-level visual polish + richer cuter interactions"
type: feat
status: active
date: 2026-04-11
deepened: 2026-04-11
---

# feat: Stardew-level visual polish + richer cuter interactions

## Overview

Upgrade Tiny Kitty Garden from "chunky procedural rectangles" to a polished, top-down pixel-art game in the spirit of Stardew Valley — without breaking the project's hard constraints (single-file game, no image files, all-procedural Canvas + Web Audio). The work is split into four phases: a rendering foundation, a visual upgrade pass, an interaction-richness pass, and a polish pass.

The end goal is that a 3-year-old (and any adult who picks up the tablet) sees a world that feels alive, hand-illustrated, and lovingly detailed — not a programmer-art demo.

**Re-evaluated 2026-04-11 against external evidence** — a `/last30days` research pass across r/gamedev, r/IndieDev, r/proceduralgeneration, r/PixelArt, and GitHub confirmed every major architectural decision in this plan and surfaced two refinements: the `azet` project's *NPC dialogue portrait windows* are a small high-leverage personality feature worth folding into Unit 12, and the `Everrest` roguelike's *templates + connection rules + decoration scripts* approach to procedural rooms is a directly transferable pattern that validates Unit 3. See "Audience and Ecosystem Signal" below.

## Problem Frame

Today the game looks like procedural shapes glued together. Trees are circles with brown dots. The kitten is a chunky 18×18 box with a face. Rooms are flat color fields with a few decorations. Hotspot reactions are single-shot events. There's no idle life in the world — everything is static unless tapped.

Stardew Valley's appeal isn't just pixel resolution; it's *density and life*: every tile has personality, characters have multi-frame idle animations, the environment reacts to the player, and there are little secrets everywhere. To get there with our constraints (no image files), we need to:

1. **Treat sprites as data, not drawing code.** Today every visual is a manual sequence of `fillRect` calls. That doesn't scale to dozens of characters with multi-frame animations. We need a sprite renderer that takes a 2D color-index grid and a palette and draws it in one call.
2. **Treat rooms as tile maps, not hand-painted backgrounds.** Today each room is a giant `draw(ctx)` function. Tile maps let us compose detail (grass varieties, flowers, paths, dirt patches, water edges) without drowning in code.
3. **Build the animation system once.** Frame cycling, timing, transitions between states — solve these for the kitten and reuse for every animated entity.
4. **Add idle life.** Frogs blink. Fish jump. Butterflies flap with phase variation. Birds fly across. The world has weather *and* ambient particles (dust motes, fireflies at night, pollen drifting).
5. **Make every hotspot a multi-stage reaction.** Tapping the food bowl shouldn't just play one sound. The kitten walks over, sniffs, eats, meows, swishes tail, scatters crumbs, sits back, tail twitches — a little vignette.

## Requirements Trace

- **R1.** Build a reusable pixel-art sprite renderer that takes a color-index grid + palette and draws it. All sprites in the game use this single code path.
- **R2.** Build a tile map renderer with named tile types, layered drawing (ground / decoration / overlay), and per-tile procedural draw functions. Each room becomes a tile map declaration.
- **R3.** Build an animation system with multi-frame sprite cycling, per-frame timing, and named state transitions (idle, walk, sit, sleep, eat, etc.).
- **R4.** Build a lighting / tinting layer for day/night shifts, indoor warm-light, and weather mood (overcast vs. sunny).
- **R5.** Re-author the kitten as a multi-frame sprite with at least: walk (4 dirs × 4 frames = 16), idle breathe (2 frames), sit (1), sleep curl (2), eat (3), tail-twitch (2), purr-sit (2). All in one sprite definition data structure.
- **R6.** Re-author all four rooms as tile maps with at least 3-4 tile varieties per surface (grass A/B/C, dirt A/B, sand A/B, etc.) so the eye stops seeing repetition.
- **R7.** Add idle / ambient world life: at least three independent ambient loops per room (e.g., garden = bird flying through, fish jumping in pond, butterflies with phase variation, flowers swaying when kitten passes).
- **R8.** Convert every hotspot to a multi-stage reaction sequence (walk → arrive → action animation → secondary anim → settle), not a single sound + state flip.
- **R9.** Add at least 2 discoverable surprises per room (tap a bush three times → bird flies out; tap a rock → small creature peeks; etc.).
- **R10.** Add environmental responses: water ripples when the kitten passes near the pond, flowers sway as she walks past, dust puffs under her paws on dirt tiles.
- **R11.** Layer ambient sound (per-room loop + reaction sounds + footstep variations on different surface types).
- **R12.** Maintain 60 fps on a mid-tier tablet. The added detail must not push the game into frame drops.
- **R13.** Honor the existing constraints: single-file `src/game.js`, no new source files (no `build.js` edit), no image files, no audio files, no external dependencies.

## Scope Boundaries

- **No image files.** Sprite data lives inline in `src/game.js` as JS color-index arrays. This is the core constraint that defines the rest of the plan; if it's relaxed in a future iteration, the plan changes substantially (see "Alternative Approaches Considered").
- **No new source files.** Everything continues to live in `src/game.js`. The build pipeline is unchanged.
- **No external libraries.** No Phaser, no PixiJS, no sprite-sheet loaders, no asset pipelines.
- **No persistence.** Sessions still start fresh — this plan doesn't introduce save state, achievements, or progression across sessions.
- **No new rooms.** Still four rooms (Garden, Kitchen, Bedroom, Beach). Stardew-level *quality* doesn't require Stardew-level *content volume*.
- **No new collectible categories.** The shelf stays at 6 bins. Visual richness, not gameplay sprawl.
- **No mouse-driven editor.** Tile maps are hand-authored as JS data, not built in a visual editor.
- **No physics.** Kitten still walks freely and doesn't collide with objects (objects are decorative, not blocking).
- **3-year-old appropriate.** Polish must stay gentle. No fast motion, no flashing, no sudden surprises that could startle. Stardew-level *cozy*, not Stardew-level *combat*.

### Deferred to Separate Tasks

- **Image-based sprite pipeline.** If we ever allow image files, we'd want a sprite-sheet builder (e.g., Aseprite export → JSON manifest → `src/assets/`). Out of scope here; would be a separate plan.
- **Camera scrolling / larger rooms.** Stardew rooms scroll. Ours stay 384×216 single-screen. Scrolling and a viewport camera would be a separate plan.
- **Save state and progression.** Future iteration if the game becomes more than a "play for ten minutes, fill the shelf, do it again" toy.
- **Editor tooling.** A visual tile-map editor would speed up authoring but is its own project.

## Context & Research

### Relevant Code and Patterns

- `src/game.js` — single source file, ~2050 lines. Today contains the world state, kitten, rooms, hotspots, collectibles, shelf, weather, transitions, celebration, sound scheduler, and all draw routines. The new sprite/tile/animation systems live in this same file (no new files).
- `drawKittenSprite(ctx, x, y, facing, frame, accessory)` — current kitten draw routine. Series of `fillRect` calls per body part. To be replaced by a generic sprite renderer that reads a per-frame color-index grid.
- `drawTree`, `drawBush`, `drawToyBox`, `drawBed`, `drawFlower`, `drawButterfly`, `drawShell`, `drawYarnBall`, `drawTreat`, `drawHeartIcon`, `drawPawIcon`, `drawMoon`, `drawFrog`, `drawMouse`, `drawCrab`, `drawPond` — every per-object drawer. All are candidates for re-authoring as data-driven sprites.
- `drawGarden`, `drawKitchen`, `drawBedroom`, `drawBeach` — current room draw routines. Each is a sequence of `fillRect` + helper calls. To be replaced by a tile map declaration + a renderer that walks the map.
- `world.kitten` — current kitten state object: `x, y, tx, ty, facing, walkFrame, walkDist, busy`. Animation state needs to extend this with `animState` (current named state), `animFrame` (current frame index), `animTimer` (frame timer).
- `world.floaters` — current ad-hoc floater system (hearts, Zs, sparkles, fly-to-shelf). Still useful but should be normalized once we have proper animation primitives.
- `Engine.particles` — engine-side particle system (already used for confetti and weather). Worth reusing for ambient particles (dust, fireflies, pollen).
- `gameTap`, `triggerHotspot`, `queueHotspotWalk`, `updateHotspots` — existing hotspot pipeline. Still the right shape; per-hotspot reactions just become richer multi-stage sequences instead of one-shot state flips.
- `PAL` — current global palette constant. Will grow significantly (probably 32-48 entries) and become the single source of truth for the sprite renderer's color indices.
- `CHANGELOG.md` — every commit in this plan must add an entry per the project convention documented in `CLAUDE.md`.

### Institutional Learnings

- The original v2 review caught two P0 bugs in the geometric "kitten arrival" check. The lesson: when a hotspot reaction depends on a precise arrival point, the check should compare against the exact queued target, not a derived center. Carry forward into multi-stage reactions — every stage transition that depends on position should use precise stored coordinates, not "kitten is roughly close to the hotspot center."
- The original review also caught in-flight floaters being wiped by room transitions, causing the shelf to become permanently unfillable. The lesson: any new "in-flight to a destination" thing (animation transitions, queued sound playback, scheduled reactions) needs an explicit drain on transition. The new animation system must default to draining state on transition.
- Procedural drawing with `fillRect` per body part scales poorly past ~5 entities. The kitten alone is currently ~50 lines of `fillRect` calls. A 6-frame walk cycle in the same style would balloon that to ~300 lines and become unmaintainable. The sprite-as-data approach is the load-bearing decision that makes the rest of the plan affordable.

### External References

A `/last30days` research pass on 2026-04-11 across Reddit (gamedev, IndieDev, IndieGaming, PixelArt, proceduralgeneration), GitHub, and the open web found 38 items in the last 30 days that bear on this plan. The most directly relevant:

- **SitePoint, "Game Dev Without an Engine: The 2025/2026 Renaissance"** — explicitly names the engine-free trend the project is already on. Backs up the "no PixiJS / no Phaser" decision with named industry signal: Unity's 2023 pricing controversy is still pushing devs toward vanilla Canvas, and a working dev recently shipped 120 classic browser games using nothing but pure HTML5 Canvas + vanilla JS. https://www.sitepoint.com/game-dev-without-an-engine-the-2025-2026-renaissance/
- **Belén Albeza, "Retro, crisp pixel art in HTML 5 games"** — the canonical reference for `image-rendering: pixelated`, integer scaling, and integer-aligned coordinates. Already applied in `src/template.html` via `image-rendering: pixelated` on `#gameCanvas`. https://www.belenalbeza.com/articles/retro-crisp-pixel-art-in-html-5-games/
- **r/proceduralgeneration — "Seed-based procedural biome generation for a 2D isometric roguelike. Hand-designed templates, connection rules, decoration scripts"** (105 upvotes, 2026-03-13). The team building *Everrest* (a Godot 2D pixel-art roguelike) describes their approach as: *"room templates (land pieces of different sizes), each with connectors that define where and how they can link to other scenes. A seed controls the layout. Max scenes controls density. Each room can be hand-designed or given connectors that open up to almost infinite combinations."* This is the *exact* shape of Unit 3 (tile maps with named tile types, layered drawing, deterministic per-cell seeds) and Unit 6/7 (per-room tile map declarations). Validates the architectural choice with a shipping game in the same idiom. https://www.reddit.com/r/proceduralgeneration/comments/1rt1az4/seedbased_procedural_biome_generation_for_a_2d/
- **r/gamedev — "Four game development patterns I've found consistently useful over the last 10 years"** (408 upvotes, 2026-04-07). Lead programmer/designer of *Tangledeep* and *Flowstone Saga* sharing patterns from shipping multiple pixel-art roguelikes. Worth reading directly when sitting down to architect Phase 1. https://www.reddit.com/r/gamedev/comments/1sf409c/four_game_development_patterns_ive_found/
- **r/gamedev — "AI art vs AI code"** (600 upvotes, 2026-04-01). Top-of-thread consensus: *"AI art is universally hated by players and devs to the point that people will be completely turned off from a steam capsule or a minority of the art being AI generated. It really feels like AI art ruins the whole vibe of a game, making it feel lazy and unoriginal."* This is *direct audience signal* validating the "no AI art, all hand-tuned procedural pixel art" stance. The procedural-data-table approach in Unit 1 is not a workaround for the no-image-files constraint — it's what cozy-game audiences are actively voting for. https://www.reddit.com/r/gamedev/comments/1s9mkt1/ai_art_vs_ai_code/
- **r/gamedev — "Stardew Valley has an edge most cozy games don't"** (600 upvotes, 2026-04-06). *"Storylines about trauma from war, addiction, affairs, growing older, and secrets. The people in the game are messy humans, and when other cozy games try to add an edge, it ends up being done in a way that doesn't land."* Directly informs Unit 12 (mouse personality system) — for a 3-year-old game we can't add trauma, but the *principle* — every NPC has a personality beat that feels real, not just an animation trick — is the load-bearing insight. https://www.reddit.com/r/gamedev/comments/1se3k2g/stardew_valley_may_have_been_a_major_contributor/
- **GitHub `verdictzero/azet` PR #226 / #227 — "Add pixel art window system for portraits and battle sprites"** (2026-04-01). A merged feature that *"adds a pixel art rendering layer that composites on top of the ASCII character grid. NPC portraits appear in bordered windows (bright grey outer stroke, dark inner stroke) during dialogue, with text panels shifted."* This is a small, concrete pattern that maps directly to Unit 12 and is folded into that unit's approach below. Bordered portrait windows during NPC reactions = high personality payoff for low implementation cost. https://github.com/verdictzero/azet/pull/227
- **GitHub `mr1charles/Abil` PR #1 — "Add single-file HTML5 Kael engine with gacha, enemies, boss, and UI"** (2026-03-29). PR description: *"a complete, modular single-file HTML5 game engine that implements the Kael gameplay vision (movement, abilities, passive systems) and serves as a platform for future modes and expansions."* Direct prior art for the "single-file HTML5 game engine" pattern this project lives in. Confirms the pattern is real and shipping in 2026, not a quirky one-off. https://github.com/mr1charles/Abil/pull/1
- **GitHub `Amalzybu/ecommerce` PR #37 — "Add pixel art asset generator skill document"** (2026-03-14). A 610-line spec covering *"template-based, procedural (Perlin noise + symmetry)"* sprite generation modes. Nearly verbatim the architecture in Unit 1 (sprite-as-data + ASCII-string author helper). Worth reading before authoring `defineSprite` to see if any ideas transfer. https://github.com/Amalzybu/ecommerce/pull/37
- **MDN — "2D breakout game using pure JavaScript"** — the canonical "build a game in vanilla Canvas" tutorial. Worth re-reading if any team member is new to the loop pattern. https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript

The Stardew Valley visual reference still stands — we're not copying its art, we're capturing its *qualities* (density, life, idle animation, multi-stage reactions). The references above are validators, not assets to copy.

### Concrete Patterns Borrowed From Prior Art

A code-level review of the three highest-signal repos surfaced specific API shapes worth copying directly. These supersede the generic "we'll figure it out" notes in the original plan with battle-tested patterns that already shipped in single-file canvas projects.

**From `mr1charles/Abil` (merged 1,015-line single-file HTML5 game engine):**

- **`class Entity` base class.** All game objects in Abil extend a 5-line `Entity` with `x, y, vx, vy, r, alive, flash`. Concrete classes (`Player`, `Enemy`, `Boss`, `Projectile`, `Clone`) override `update(dt, world) / draw(ctx)`. We adopt this for TKG: `world.kitten` becomes `class Kitten extends Entity`, and the frog/mouse/crab/butterflies/birds in Unit 8 become their own `Entity` subclasses. Cleaner than the current "everything in `world.*`" bag-of-properties approach, and a natural home for the per-creature animation state added in Unit 2.
- **Centralized `world.fx` for screen-effects state.** Abil's `world.fx = { shake, hitFlash, glitchPulse, damageFlash }` is one object that every system reads from and writes to. Damage flashes, screen shakes, and color overlays are coordinated through it instead of scattered across per-event flags. We adopt this for TKG's celebration shake, weather mood fade, lighting-transition alpha, and "kitten just ate" feedback flash.
- **Per-entity `flash` timer for instant feedback.** When an Abil entity takes damage, `this.flash = 0.08` for one frame; `draw()` does `ctx.fillStyle = this.flash > 0 ? '#fff' : this.col`. We repurpose this for positive feedback in TKG: every successful hotspot interaction sets a brief flash on the kitten or the interacted object (the food bowl flashes white the moment she eats from it, the mouse flashes the moment it waves). Free, instant, recognizable.
- **Aggressive but readable inline density.** Abil fits a complete game with 60+ characters, multi-phase boss, gacha system, and combat AI in 1,015 lines via terse classes, `Object.assign(this, {...})` for property assignment, and single-line methods where the body is one statement. This matches TKG's identity as "a single ~100 KB file you can read end-to-end." Phase 1+ should follow this style — *don't* expand to multi-file modules.
- **Top-of-file shared math helpers.** Abil declares `TAU = Math.PI * 2`, `clamp`, `lerp`, `dist`, `rand`, `randi` once at the top of `index.html` and reuses them everywhere. We already have `lerp` and `easeOut`; add the rest in the Phase 1 foundation pass.
- **⚠️ Anti-pattern: duplicated classes from AI-generated merges.** Abil's file has a merge artifact where lines 25-200 are a near-duplicate of lines 207-630 — two versions of the engine glued together. **Lesson for TKG:** when an AI tool produces a large single-file refactor, grep for duplicate class names and constant names before merging. Add this to the Phase 1 review checklist (specifically Unit 1 where the sprite system is first introduced and tempting to author with AI assistance).

**From `verdictzero/azet` PR #227 (`js/sprites.js`, `js/engine.js` — merged pixel-art window system):**

- **`drawPixelArtWindow(img, col, row, w, h, outerColor, innerColor)`** — verbatim API for Unit 12's dialogue portrait windows. The implementation is ~25 lines: outer-stroke fill, inner-stroke fill, then `imageSmoothingEnabled = false` + integer-rounded `drawImage`. Default colors `'#b0b0b8'` (bright grey outer) and `'#1a1a2a'` (dark inner) are tuned to read against any background. We adapt the colors to TKG's pastel palette but keep the API shape verbatim — it's already proven.
- **Border thickness scales with cell size.** `const outerPx = Math.max(2, Math.round(cw * 0.3))` keeps borders looking right at any zoom level. We apply this to the shelf bin borders and the portrait window so visual weight stays consistent.
- **`generatePlaceholderPortrait(role)` — deterministic HSL from a string seed.** This is the highest-leverage pattern we found. Hash the role/name string into a stable seed; derive `hue, skinHue, hairHue, eyeHue, clothHue` from the seed; render a procedural pixel-art body with those colors. Every NPC gets a unique-looking portrait *with stable colors per identity* without any hand-authoring. For TKG: the mouse's `mood` (`shy / playful / sleepy`) seeds a portrait that varies across sessions but stays consistent within a session. The frog and crab can use the same trick. This *replaces* hand-authoring 6+ NPC portrait sprites with a single procedural function — significant Phase 3 effort savings.
- **Three-tier sprite registry: cache → loading → procedural placeholder.** Azet's `SpriteManager` tries the cache first, then a loading promise, then falls back to a procedural placeholder. We adapt this for TKG: `getSprite(name)` checks the `SPRITES` registry, then falls back to a procedural-placeholder function if the sprite isn't defined yet. This means **sprites can be authored in any order**, and the game keeps running with placeholders if a sprite is missing — which dramatically smooths the iterative authoring of 30+ multi-frame sprites in Phase 2.
- **Document the render layer order at the top of `gameRender`.** Azet's PR description specifies pixel art is rendered "between `endFrame()` and `postProcess()` so CRT effects apply." The lesson: TKG should pin the layer order in a top-of-`gameRender` comment block: `tile.ground → tile.decoration → ambient → hotspots → collectibles → paw prints → kitten → floaters → tile.overlay → weather → lighting pass → portrait windows → shelf`. Document it once, decide-once-don't-rethink.

**From `Amalzybu/ecommerce` PR #37 (the 610-line `pixel-asset-generator-skill.md` spec):**

- **Animation clip schema with `pingPong: true`.** A 4-frame walk cycle authored as `[0, 1, 2, 1]` becomes a 3-frame ping-pong `[0, 1, 2]` with `pingPong: true`. Saves authoring time and storage. **Adopt in Unit 2's animation registry.**
- **Reference palette: ENDESGA-32 (32-color cozy palette) and LOSPEC.** Both are well-known curated palettes for cozy pixel art. We reference ENDESGA-32 as inspiration for the TKG `PAL` constant — 32 colors is the right scale, the proportions are tuned (warm skin tones, soft greens, gentle blues, true blacks), and it has years of community validation in cozy games. **Reference in Key Technical Decisions.**
- **47-tile Wang autotile set as a categorization.** When tiles need to blend with neighbors (grass-touching-dirt, sand-touching-water), the Wang taxonomy enumerates the 47 distinct corner/edge/T-junction states. We don't need all 47 in TKG, but **the categorization is the right mental model** for Unit 3's `neighbors` parameter and the tile blending logic.
- **Directional shading rule** for sprites: lighten top pixels, darken bottom pixels. One-line trick for any sprite that wants to look 3D. **Mention in Unit 5 sprite authoring approach.**
- **Bayer 4×4 dithering matrix** for soft gradient transitions in a low-color palette. Classic pixel-art technique, cheap, looks cozy. **Mention in Unit 4 (lighting pass) as deferred-implementation idea for blending night/day transitions.**
- **Outline pass:** trace non-transparent pixels and draw a 1-pixel border. Already implicit in our sprite design (the kitten has a brown outline). Worth making it a *built-in renderer feature* (`renderSprite(sprite, frame, x, y, { outline: PAL.outline })`) instead of authoring outline pixels into every frame. **Add to Unit 1's renderer API.**
- **Generic `PixelCanvas` API:** `setPixel`, `getPixel`, `fill`, `addOutline`, `addShadow`. We don't need this much abstraction — direct `ctx.fillRect` is fine — but the **method names are good vocabulary** for the helper functions in Unit 1 (`addOutline`, `addShadow` as renderer options).

These patterns are the difference between "we'll design the API in implementation" and "here's the API shape that already worked in a 2026 single-file canvas game." Each one collapses an open question in the plan into a concrete decision.

### Audience and Ecosystem Signal

The research pass surfaced three independent signals worth weighing in addition to the technical references above:

1. **Solo and 2-person teams are shipping cozy pixel-art games successfully right now.** *Tangy TD* (solo dev, $250K in a week, 14K upvotes on r/gaming), *Sefton Asylum* (2-person hobby team, 1000 wishlists in 7 days), *Home Sweet Gnome* (small Swedish studio doing a Nordic-folklore cozy hotel game), *POLLYANNA* (solo pixel-art evolution over years). The phasing in this plan is calibrated to a one-person hobby team, and that calibration is in line with what's shipping on Steam in 2026. Phase boundaries should be treated as legitimate ship points — *don't wait until Phase 4 to call something done*.

2. **The `/last30days` research found zero direct competitors in the "no-fail tap-to-play single-file HTML5 cozy game for toddlers" niche.** Cozy + pixel art is crowded; cozy + pixel art + 3-year-old + tap-only + browser is genuinely empty. The visual-quality bar set by this plan (Stardew-adjacent density on a 384×216 canvas) would put Tiny Kitty Garden in a meaningful position-of-one if executed well.

3. **The pattern of "single-file procedural HTML5 games" is now an actual GitHub category with active PRs in 2026.** This was the most surprising finding — until the research pass, it was reasonable to assume the constraint was an idiosyncratic project choice. It isn't. There are real shipping projects using exactly the same pattern (`mr1charles/Abil`, `verdictzero/azet`), and the SitePoint piece names the trend explicitly. The "no images, no engine, single file" stance is no longer eccentric — it's a recognizable approach to game dev in 2025/2026.

## Key Technical Decisions

- **Sprites are color-index grids stored inline as JS arrays.** Each sprite is an object: `{ w, h, palette, frames: [grid0, grid1, ...] }`, where each grid is a 2D array of palette indices (0 = transparent). The renderer walks the grid and emits one `fillRect` per non-transparent pixel. This gives us the flexibility of pixel art without an asset pipeline. A 24×24 4-frame walk cycle is ~2,304 entries per direction × 4 directions ≈ 9,200 numbers — manageable in JS source. **Rationale:** keeps the single-file constraint, avoids any build-step or asset-loading complexity, lets us hand-tune each frame, and matches the project's "everything procedural" philosophy. The trade-off is hand-authoring time, mitigated by reusing the same grids across animation frames with small per-frame deltas. **Validated by prior art:** the `Amalzybu/ecommerce` PR #37 ships a 610-line spec for procedural pixel-art generation in exactly this shape (template-based, Perlin noise, symmetry — see External References), and the r/gamedev consensus that audiences actively reject AI art (600 upvotes on the "AI art vs AI code" thread) confirms hand-authored procedural data is the *correct* play for the cozy-game audience, not a workaround.
- **Palette inspired by ENDESGA-32, not invented from scratch.** ENDESGA-32 is a well-known 32-color cozy pixel-art palette with years of community validation: warm skin tones, soft greens, gentle blues, intentional darks. We adapt the *proportions and tone* (not the exact hex values, since our palette is pastel-shifted toward Game Boy Color softness) but keep the size around 32-48 entries. **Rationale:** anchoring the palette to a known-good reference avoids the "every color is slightly off" problem that procedural-from-scratch palettes hit. Reference: see `Amalzybu/ecommerce` PR #37 spec section "Palette Manager" for the broader cozy-palette catalog (PICO-8, NES, ENDESGA-32, LOSPEC).
- **All entities are subclasses of `class Entity`.** Borrowed verbatim from `mr1charles/Abil`. Base class holds `x, y, vx, vy, r, alive, flash` plus `update(dt, world) / draw(ctx)` stubs. The kitten, frog, mouse, crab, butterflies, and any new ambient creatures (birds, fish jumps, etc.) all extend `Entity`. The current `world.kitten` bag-of-properties becomes `class Kitten extends Entity` in Phase 2. **Rationale:** this is a clean refactor that the prior art proves works in a single-file canvas project (Abil ships 6+ entity classes in 1,015 total lines). Keeps the per-entity animation state (`animState, animFrame, animTimer`) co-located with the entity's other state. Eliminates the "where does this field live" question for ambient creatures added in Unit 8.
- **Centralized `world.fx` for screen-effects state.** Borrowed from Abil. One object holds `shake, hitFlash, glitchPulse, lightingFade, weatherFade`. Every system reads/writes this object. **Rationale:** without this, the celebration shake, weather fade, lighting transition alpha, and "kitten just ate" feedback flash all need their own coordination state and become a tangle. With it, every screen-level effect is in one place and the lighting pass / render order can read whatever it needs from a single object.
- **Per-entity `flash` timer for instant feedback.** Borrowed from Abil. When something good happens to an entity (kitten eats, mouse waves, crab scuttles), set `entity.flash = 0.08` for one frame; the entity's `draw()` does `if (this.flash > 0) ctx.fillStyle = '#fff'` (or a brighter pastel). **Rationale:** free, instant, recognizable positive feedback. Costs nothing to add, and matches what shipped games already do.
- **Sprites are authored at logical pixel scale.** Game canvas is 384×216 logical pixels. A 24×24 sprite is 24×24 of those logical pixels and takes up about 1/16th of the screen height. Don't confuse logical pixels with viewport pixels — the existing canvas already pixelates correctly via CSS `image-rendering: pixelated`. **Rationale:** keeps everything in one coordinate system; the sprite renderer doesn't need to know about scaling.
- **Tile maps are 24×9 grids of named tile types** (24 tiles wide × 9 tiles tall, ~16 logical pixels per tile, fitting the 384×144 play area below the shelf). Each tile name maps to a draw function that takes `(ctx, x, y, neighbors)` so tiles can blend with their neighbors (e.g., grass-with-flower-A, dirt-edge-touching-grass). **Rationale:** 16-pixel tiles match Stardew's resolution; 24×9 is a comfortable density for a single-screen room; named tiles let us reuse the same type across rooms. **Validated by prior art:** the *Everrest* roguelike (r/proceduralgeneration, 105 upvotes) ships exactly this pattern in Godot — *"room templates with connectors that define where and how they can link to other scenes. A seed controls the layout. Each room can be hand-designed or given connectors."* Same shape, different engine. The pattern is proven in a shipping cozy-pixel-art roguelike.
- **Tile maps are layered.** Three layers: `ground` (grass/dirt/sand/water), `decoration` (flowers, rocks, paths, small static props), and `overlay` (things drawn after entities so they appear "in front" of the kitten — tree foliage that overlaps the kitten as she walks behind it). **Rationale:** layering is what makes pixel-art worlds feel three-dimensional even though they're flat.
- **Animation state lives on the entity.** `kitten.animState` is a string like `'walkDown'`, `'idleBreathe'`, `'sitTailTwitch'`, `'sleepCurl'`. `animFrame` is the current frame index. `animTimer` counts down to the next frame. A small `playAnim(entity, name)` helper sets the state and resets the frame counter. **Rationale:** keeps animation orthogonal to gameplay logic. The kitten's walk loop drives `walkDown` regardless of *why* she's walking.
- **Animation states are declarative.** A `KITTEN_ANIMS` object maps state names to `{ frames: [spriteFrameIdx0, ...], frameMs: 120, loop: true|false, next: 'idleBreathe' }`. The animation system advances frames based on elapsed time and transitions to `next` when a non-looping animation finishes. **Rationale:** pulling this out of imperative code makes it easy to add new states without touching the loop.
- **Lighting is a single full-screen multiply pass.** No per-light radius math (which would require shader-like compositing). Just a global tint color + alpha that varies with time-of-day or weather. **Rationale:** good enough for cozy and orders of magnitude cheaper than per-light. We can layer in subtle radial gradients for warm-windows or moonlight if needed but keep them rare.
- **Tile draw functions are small and deterministic.** Each tile type is a tiny function that draws into a 16×16 region from `(x, y)`. They use the global `PAL` and may sample a `seed` value derived from tile coordinates so the same coordinates always render the same variant. **Rationale:** deterministic seeding means every play session sees the same room composition (consistent for the child), but the variety comes from tile *types* not from runtime randomness.
- **Hotspot reactions become small state machines instead of single events.** Each hotspot has a `react(stage, timer)` function that the engine calls each frame while reacting. Stages: `walk → arrive → preAnim → action → postAnim → settle → done`. The state machine sets the kitten's animation state, spawns floaters, plays sounds at the right beats. **Rationale:** captures the "vignette" feel without building an animation language.
- **Ambient world life runs on a per-room ambient ticker.** Each room has an `ambient(dt)` function called every frame. It can spawn birds flying across, fish jumping in the pond, butterflies updating phase, flowers swaying when the kitten is near. **Rationale:** keeps ambient life decoupled from gameplay; each room owns its mood.
- **No per-frame allocation in the hot path.** Sprite rendering and tile rendering must avoid `new`/array creation per call. Use shared scratch buffers if needed. **Rationale:** to hold 60 fps on a tablet with much more on screen, GC pressure must stay low.
- **Layered audio uses time-shifted oscillators, not real audio loops.** A "ambient bird" effect is a Web Audio sine sweep scheduled every N seconds with random pitch jitter, not a sample loop. **Rationale:** procedural audio constraint stands; this lets us add ambient layers without files.
- **Each phase ships independently.** Phase 1 (foundation) ships behind a `WORLD_V2 = false` flag if needed, with the existing rendering still working. As each room is converted in Phase 2, the flag gets flipped per room. This avoids a giant atomic rewrite. **Rationale:** the prior work proved that big atomic rewrites in this codebase land safely *with* a thorough smoke test, but incremental shipping reduces risk and gives the user something to look at after every commit.

## Open Questions

### Resolved During Planning

- **Should we relax the "no image files" constraint?** No — `CLAUDE.md` says no, and the data-driven sprite approach can hit a high enough bar. Alternative noted in "Alternative Approaches Considered."
- **Should we switch to PixiJS or Phaser?** No — same reason. The single-file Canvas constraint is load-bearing for the project's "deploy a static HTML file to GitHub Pages" simplicity.
- **Should we add new source files?** No — `build.js` is intentionally simple and adding files means editing the bundler. The single-file game convention is explicit. All the new systems live in `src/game.js`.
- **Should the canvas resolution change?** No — 384×216 is fine. Stardew is roughly 640×360 internally, so we're at lower resolution but the difference is mostly tile density per screen, not pixel-art quality.
- **Should we increase the kitten sprite size?** Yes — bump from 18×18 to 24×24. Gives us enough pixels for expressive faces, accessory layers, and recognizable animations.

### Deferred to Implementation

- **Exact tile width:** Plan assumes 16 logical pixels per tile (24×9 grid for 384×144 play area). Final value may shift to 12 or 18 based on visual playtest.
- **Exact frame counts per animation state:** Plan estimates (4 walk frames per direction, 2 idle frames, etc.) but these get tuned visually.
- **Exact palette size:** Plan estimates 32-48 entries. Final number depends on how many distinct tile colors and creature colors we need; likely settles around 40.
- **Whether to use a generic sprite renderer or specialized renderers per entity class:** Plan starts with one generic renderer; if performance demands, specialized fast paths can be added.
- **Whether ambient particles use the existing `Engine.particles` array or a new per-room buffer:** Defer to implementation; depends on whether we want particles to survive room transitions.
- **How discoverable secrets are tracked:** A `seen[]` per room? Per session? Persistent? Plan leaves the storage decision open.
- **How surface-aware footstep sounds map to tiles:** Plan assumes each tile type carries a `surface` tag (`grass`, `wood`, `tile`, `sand`, `stone`) and footsteps look it up. Final taxonomy decided in implementation.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

**Sprite definition shape (conceptual):**

```
Sprite = {
  w: 24, h: 24,
  palette: [PAL.cream, PAL.outline, PAL.pink, PAL.eye, ...],
  frames: [
    [
      [0,0,0,1,1,1,1,1,1,0,0,0, ...],  // row 0 (24 entries)
      [0,0,1,2,2,2,2,2,2,1,0,0, ...],  // row 1
      ...
    ],
    [ /* frame 1 */ ],
    ...
  ]
}

renderSprite(ctx, sprite, frameIdx, x, y, accessoryLayer):
  for row in sprite.frames[frameIdx]:
    for col in row:
      if col === 0: continue  # transparent
      ctx.fillStyle = sprite.palette[col]
      ctx.fillRect(x + colIdx, y + rowIdx, 1, 1)
  if accessoryLayer:
    renderSprite(ctx, accessoryLayer, ..., x, y)
```

**Animation declaration (conceptual):**

```
KITTEN_ANIMS = {
  walkDown:    { frames: [0, 1, 2, 1], frameMs: 110, loop: true },
  walkUp:      { frames: [3, 4, 5, 4], frameMs: 110, loop: true },
  walkLeft:    { frames: [6, 7, 8, 7], frameMs: 110, loop: true },
  walkRight:   { frames: [9,10,11,10], frameMs: 110, loop: true },
  idleBreathe: { frames: [0, 12],     frameMs: 600, loop: true },
  sit:         { frames: [13],        frameMs: 0,   loop: false, next: 'sitTailTwitch' },
  sitTailTwitch: { frames: [13, 14],  frameMs: 700, loop: true },
  sleepCurl:   { frames: [15, 16],    frameMs: 900, loop: true },
  eat:         { frames: [17, 18, 17, 19], frameMs: 130, loop: false, next: 'idleBreathe' },
  purr:        { frames: [20, 21],    frameMs: 350, loop: true },
}
```

**Tile map declaration (conceptual):**

```
GARDEN_MAP = {
  ground: [
    ['gA','gB','gA','gA','gC','gA',...],  // 24 wide × 9 tall
    ['gA','gA','gB','gA','gA','gA',...],
    ...
  ],
  decoration: [
    [null, null, 'flowerWhiteA', null, ...],
    [null, null, null, 'rockSmall', null, ...],
    ...
  ],
  overlay: [
    [null, null, 'treeFoliageL', 'treeFoliageR', ...],
    ...
  ],
}

TILES = {
  gA: { surface: 'grass', draw: (ctx, x, y, seed) => { /* grass variant A */ } },
  gB: { surface: 'grass', draw: (ctx, x, y, seed) => { /* grass variant B */ } },
  ...
}
```

**Hotspot reaction sequence (conceptual):**

```
FOOD_BOWL_REACTION = {
  stages: [
    { name: 'arrive',   onEnter: () => playAnim(kitten, 'sniff') },
    { name: 'sniffPause', durationMs: 400 },
    { name: 'eat',       onEnter: () => playAnim(kitten, 'eat'), durationMs: 1200, beats: [
        { atMs: 100, do: () => Sound.play('munch') },
        { atMs: 200, do: () => spawnCrumbs() },
        { atMs: 600, do: () => Sound.play('munch') },
    ]},
    { name: 'lickLips',  onEnter: () => playAnim(kitten, 'lickLips'), durationMs: 600 },
    { name: 'sit',       onEnter: () => playAnim(kitten, 'sit'), durationMs: 1500 },
    { name: 'done',      onEnter: () => kitten.busy = null }
  ]
}
```

**Frame loop layering (conceptual):**

```
gameRender(ctx):
  drawTileLayer(ctx, room.map, 'ground')
  drawTileLayer(ctx, room.map, 'decoration')
  drawAmbientLayer(ctx, room)            # birds, fish jumps, swaying flowers
  drawHotspots(ctx, room)                # food bowl, bed, etc.
  drawCollectibles(ctx, room)
  drawPawPrints(ctx)
  drawKitten(ctx)                        # uses sprite renderer + current anim state
  drawFloaters(ctx)
  drawTileLayer(ctx, room.map, 'overlay') # tree tops, awnings
  drawWeather(ctx)
  drawLightingPass(ctx)                  # multiply tint
  drawShelf(ctx)
```

## Implementation Units

Phases group units that share a theme. Inside each phase, units land in order. Between phases, ship a CHANGELOG entry and a working build.

### Phase 1 — Foundation: sprite + tile + animation + lighting systems

- [ ] **Unit 1: Sprite renderer**

**Goal:** Add `renderSprite(ctx, sprite, frameIdx, x, y, accessoryLayer)` that draws a color-indexed sprite from a data table. Add the sprite definition shape (`{ w, h, palette, frames }`).

**Requirements:** R1, R13

**Dependencies:** none

**Files:**
- Modify: `src/game.js` (add sprite renderer + sprite definition format near the top, just below `PAL`)

**Approach:**
- Renderer is a single function that walks the 2D color-index grid and emits one `fillRect` per non-transparent pixel. Coordinates are integer-rounded before rendering and `imageSmoothingEnabled = false` is asserted (mirroring the `verdictzero/azet` `drawPixelArt` discipline — see Concrete Patterns Borrowed From Prior Art).
- Index 0 is reserved for transparency.
- Accessory layer is an optional second sprite drawn after the base, for things like the kitten's snow hat or umbrella.
- Add a tiny `defineSprite(w, h, palette, framesAsStrings)` helper that lets sprite frames be authored as multi-line ASCII strings (one character per palette index, `'.'` = transparent) and converts them to the grid form. This makes hand-authoring readable.
- **Sprite registry with fallback.** Sprites are registered into a `SPRITES` map by name (`SPRITES.kitten`, `SPRITES.frog`, etc.). A `getSprite(name)` lookup first checks the registry, then falls back to a procedural-placeholder generator if the sprite hasn't been authored yet. Mirrors the three-tier `azet/SpriteManager` pattern (cache → loading → procedural placeholder). **Why it matters:** Phase 2 will author 30+ multi-frame sprites; the fallback means the game keeps running with placeholders if a sprite is missing, so iterative authoring doesn't break the build.
- **Optional renderer features pulled from the `Amalzybu/ecommerce` spec:** `renderSprite(sprite, frame, x, y, opts)` accepts `opts.outline` (color) and `opts.shadow` (`{ direction, offset, color }`). These become *built-in* renderer features rather than per-sprite hand-authored details — outline and shadow are too repetitive to author into every sprite frame.
- **`generatePlaceholderSprite(name)` deterministic-HSL fallback.** Borrow the `azet/generatePlaceholderPortrait` pattern verbatim: hash the sprite name into a stable seed, derive HSL colors from the seed, render a small body shape. Used for any sprite name that hasn't been registered yet. Means a child can never see a "missing texture" pink-and-black checkerboard — only a soft procedural blob.

**Patterns to follow:**
- Existing `PAL` global pattern in `src/game.js`.
- The current `drawKittenSprite`'s ordering of body-part draws (build outline first, then fills, then face details).
- `mr1charles/Abil` for the inline-density coding style (terse `Object.assign(this, {...})`, single-line methods where possible).
- `verdictzero/azet/js/sprites.js` for the registry-with-fallback pattern (see lines 250-302 of the file in the PR — three-tier cache/loading/placeholder lookup).

**Test scenarios:**
- Happy path: a 4×4 sprite with all-1s draws 16 colored pixels in a 4×4 block at the requested position.
- Happy path: a sprite with index 0 entries leaves those pixels untouched (transparency works).
- Happy path: an accessory layer drawn after the base composites correctly (accessory pixels overwrite base pixels where they overlap).
- Edge case: a sprite with frameIdx out of range falls back to frame 0 instead of throwing.
- Edge case: drawing a sprite at negative x/y or partially off-screen draws only the visible portion (or relies on Canvas clipping — pick one and document it).
- Integration: replace the current `drawKittenSprite` with one that calls `renderSprite` against a hand-authored kitten sprite data structure; visual diff should be approximately equivalent.

**Verification:**
- The current Block Dodge-style chunky kitten can be re-authored as a sprite data structure and rendered through `renderSprite` with no visual regression. The renderer is reused by every subsequent unit.

---

- [ ] **Unit 2: Animation state machine**

**Goal:** Add a per-entity animation system with named states, frame timing, and `playAnim(entity, stateName)`.

**Requirements:** R3, R13

**Dependencies:** Unit 1

**Files:**
- Modify: `src/game.js` (add animation state machinery; extend `world.kitten` shape with `animState`, `animFrame`, `animTimer`)

**Approach:**
- Each entity that animates carries `animState`, `animFrame`, `animTimer`. (After the `class Entity` refactor — see Key Technical Decisions — these live on the entity instance.)
- `playAnim(entity, name)` sets `animState`, resets `animFrame=0`, resets `animTimer` to the state's `frameMs`.
- A per-frame `updateAnim(entity, dt)` decrements timer; when it hits zero, advance frame; if past the end, either loop or transition to `next` state.
- An `ANIM_REGISTRY` (e.g., `KITTEN_ANIMS`) maps state names to `{ frames, frameMs, loop, pingPong, next }`. The `pingPong: true` flag (borrowed from the `Amalzybu/ecommerce` animation-clip schema — see Concrete Patterns) bounces the frame index back through the sequence so a 4-frame walk cycle can be authored as 3 frames `[0, 1, 2]` instead of 4 `[0, 1, 2, 1]`. Saves authoring time and storage for any symmetric animation.
- The render path looks up the current sprite frame index via `entity.animState → ANIM_REGISTRY[name].frames[entity.animFrame]`.

**Patterns to follow:**
- The existing `kitten.walkFrame` two-state toggle is the simplest version of what this generalizes.

**Test scenarios:**
- Happy path: playing a 4-frame loop animation cycles through frames 0→1→2→3→0 at the configured frame interval.
- Happy path: playing a non-looping animation with `next: 'idle'` transitions to idle after the last frame.
- Edge case: calling `playAnim` with the same state name as the current state doesn't reset the frame counter (so calling it every tick is a no-op).
- Edge case: switching states mid-animation cleanly resets the frame counter.
- Error path: an unknown state name falls back to `idle` and logs nothing — never throws.
- Integration: the kitten's walk loop, currently driven by `walkDist`-based frame flipping, now drives `playAnim(kitten, 'walkDown'/'walkUp'/'walkLeft'/'walkRight')` and idle states.

**Verification:**
- The kitten plays a recognizable walk loop that smoothly transitions to an idle state when she stops walking. Switching directions while walking flips to the new direction's animation without a one-frame snap.

---

- [ ] **Unit 3: Tile map renderer**

**Goal:** Add a tile-map system: a tile registry, a 3-layer map declaration (`ground`, `decoration`, `overlay`), and a renderer that walks each layer and calls each tile's `draw` function.

**Requirements:** R2, R13

**Dependencies:** Unit 1

**Files:**
- Modify: `src/game.js` (add `TILES` registry, `drawTileLayer(ctx, map, layerName)`, and the room map declaration shape)

**Approach:**
- 16 logical pixels per tile, 24 tiles wide × 9 tall (the play area below the 28-pixel shelf).
- `TILES` is an object mapping tile names to `{ surface, draw(ctx, x, y, seed, neighbors) }`.
- `seed` is `(tileX * 73856093) ^ (tileY * 19349663)` so each cell has a stable per-coord pseudo-random value the draw function can use to pick deterministic variants.
- `neighbors` is `{ n, s, e, w }` so a tile can blend with adjacent tiles (e.g., grass-edge-touching-dirt draws a soft edge). **Categorization reference:** the **47-tile Wang autotile set** is the established taxonomy for tile-edge transitions (corners, edges, T-junctions, isolated, etc.). We don't need all 47 variants in TKG — most rooms use 3-5 — but the Wang categorization is the right *mental model* for which neighbor combinations need a custom blend tile vs. which can use a default. See `Amalzybu/ecommerce` PR #37 for the broader spec.
- A room's tile map is `{ ground: [[...]], decoration: [[...]], overlay: [[...]] }` where each layer is a 9×24 array of tile names or `null`.
- `drawTileLayer` walks the map and calls each non-null tile's draw function at the right pixel coordinate.

**Patterns to follow:**
- The current per-room `draw(ctx)` functions in `src/game.js` (`drawGarden`, `drawKitchen`, etc.) for what kind of art each room needs.

**Test scenarios:**
- Happy path: a tile map with all `'gA'` ground tiles renders a uniform grass field across the play area.
- Happy path: a decoration layer with one `'flowerWhiteA'` at coord (3,4) draws that flower at pixel (48, 92).
- Happy path: drawing the overlay layer after the kitten causes overlay tiles to appear in front of the kitten.
- Edge case: a `null` cell in any layer is skipped (no draw).
- Edge case: a tile name not in the `TILES` registry is skipped and a one-time console warning is emitted.
- Edge case: a tile draw function that uses `seed` produces the same variant on every render (determinism check).
- Integration: a single garden tile map is declared and rendered, replacing the existing `drawGarden`'s background fill + decoration. The kitten can walk over it, and overlay tiles correctly appear in front of her.

**Verification:**
- A test garden map with grass + scattered flowers + a tree (foliage in overlay) renders correctly. The kitten visually walks "behind" the tree foliage when she moves under it.

---

- [ ] **Unit 4: Lighting / tinting layer**

**Goal:** Add a global lighting pass that tints the world based on time-of-day, weather, and indoor/outdoor flags.

**Requirements:** R4, R13

**Dependencies:** Units 1-3 (the lighting pass runs over the rendered world)

**Files:**
- Modify: `src/game.js` (add `drawLightingPass(ctx)`, lighting state in `world`, per-room indoor/outdoor flag)

**Approach:**
- A single full-screen `globalCompositeOperation = 'multiply'` `fillRect` over the play area, with a color and alpha that depend on `world.timeOfDay` (`day | dusk | night`), `world.weather`, and `room.indoor`. The transition alpha lives on `world.fx.lightingFade` (the centralized screen-effects state — see Key Technical Decisions, borrowed from Abil), so the `dusk → night` interpolation is one shared variable instead of inline state.
- Day outdoor: clear, no tint (alpha 0).
- Day indoor: very subtle warm cream tint (low alpha ~0.05).
- Dusk: peach/pink tint, alpha ~0.15.
- Night outdoor: deep indigo, alpha ~0.35 (current night mode is similar; consolidate).
- Night indoor: warm yellow tint with low alpha (suggesting candlelight).
- Rain: slight cool blue, alpha ~0.10.
- Snow: slight cool white-blue, alpha ~0.08.
- Time-of-day starts at `day` and advances on bed-tap (which currently flips `night` directly). New flow: bed-tap → `dusk` for ~1 second of transition → `night`. Future morning transition deferred.
- *(Deferred-implementation idea, not required for v1 of this unit:)* **Bayer 4×4 dithering** for the dusk transition. Instead of a flat alpha tint during `dusk`, dither the multiply layer with a 4×4 Bayer matrix so the color rolls in as a soft pixel-art gradient across the screen. Classic technique from the 8-bit/16-bit era, looks distinctly cozy. Only worth implementing if the flat tint feels "modern smooth" instead of "pixel art crisp" during playtest. Reference: `Amalzybu/ecommerce` PR #37 spec section "Bayer Dithering."

**Patterns to follow:**
- Existing `if (world.night) { ctx.fillStyle = 'rgba(40,30,90,0.32)'; ctx.fillRect(...) }` block in `gameRender`. This unit consolidates that and the weather tints into one pass.

**Test scenarios:**
- Happy path: at `day`, no visible tint is applied (alpha 0 → no draw).
- Happy path: at `night` outdoor, a deep indigo multiply tint covers the play area (matches current night look).
- Happy path: switching to `dusk` mid-frame applies a peach tint of the right alpha.
- Edge case: rain + night layers correctly (one tint, blended color), not two stacked passes (decide which one wins or how they combine).
- Integration: bed-tap triggers `day → dusk → night` transition with the lighting pass smoothly interpolating alpha and color over ~1 second.

**Verification:**
- Toggling `world.timeOfDay` and `world.weather` produces visibly distinct lighting moods. Night mode looks consistent with the existing implementation but is now driven by the new lighting pass instead of the inline indigo overlay.

---

### Phase 2 — Visual upgrade: kitten + rooms + ambient life

- [ ] **Unit 5: Re-author the kitten as a multi-frame sprite**

**Goal:** Replace the current `drawKittenSprite` with a data-table sprite at 24×24 with at least these animation states: walkDown, walkUp, walkLeft, walkRight (4 frames each), idleBreathe (2 frames), sit (1), sitTailTwitch (2), sleepCurl (2), eat (3), lickLips (2), purr (2), happyDance (4 frames). All in one `KITTEN_SPRITE` definition with `KITTEN_ANIMS` registry.

**Requirements:** R5, R13

**Dependencies:** Units 1, 2

**Files:**
- Modify: `src/game.js` (add `KITTEN_SPRITE`, `KITTEN_ANIMS`; replace the body of `drawKitten` to call the sprite renderer with the current animState; remove the old per-part `fillRect` code from `drawKittenSprite`)

**Approach:**
- Author the sprite as a multi-line ASCII string per frame (via the `defineSprite` helper from Unit 1) so each frame is editable in plain text.
- Palette indices: 0 = transparent, 1 = cream body, 2 = outline, 3 = pink (nose, inner ear, blush), 4 = eye, 5 = warm white highlight (top-pixel directional shading), 6 = warm beige shadow (bottom-pixel directional shading), 7 = blanket pink for sleep state.
- 24×24 gives enough room for: head with two ears, two distinct eyes, nose, mouth, body with four legs (or two from the side view), a tail that wags, optional accessory slot for hat/umbrella.
- **Directional shading rule** (borrowed from the `Amalzybu/ecommerce` spec — see Concrete Patterns): when authoring each frame, lighten the top row of body pixels (palette index 5) and darken the bottom row (palette index 6) to imply a soft top-down light source. Doesn't add complexity but gives every sprite an immediate sense of volume.
- The accessory layer is a separate sprite drawn after the base — `KITTEN_ACCESSORIES.umbrella`, `.winterHat`, `.scarf`. Same `renderSprite` call.
- **`class Kitten extends Entity`**: as part of this unit, refactor the current `world.kitten` bag-of-properties into a real `Kitten` class extending the `Entity` base from Key Technical Decisions. The new class owns `x, y, vx, vy, facing, animState, animFrame, animTimer, busy, accessory, flash` plus `update(dt, world)` and `draw(ctx)`. This is the *actual* application of the Entity-class decision and lands here, not in a separate refactor unit. **Why now:** this unit is already touching the kitten draw path, so the refactor cost is contained and the rest of Phase 2 can rely on the new shape.
- Kitten state machine in update: when walking, `playAnim(walkX)`; when idle, `playAnim('idleBreathe')`; when busy with a hotspot, the hotspot's reaction sets the anim state.

**Patterns to follow:**
- Current `drawKittenSprite` body for what features the kitten needs (smile, blush, ears, tail).
- Existing `kitten.facing` axis derivation in `updateKitten`.

**Test scenarios:**
- Happy path: walking the kitten in each of 4 directions plays the corresponding 4-frame walk animation visibly cycling.
- Happy path: stopping mid-walk transitions to `idleBreathe`, which is a slow 2-frame loop.
- Happy path: tapping the food bowl runs the eat animation (3 frames) and transitions back to idle.
- Happy path: tapping the bed transitions to `sleepCurl` and stays in that loop until the bed reaction releases the kitten.
- Happy path: tapping the kitten herself plays the `purr` 2-frame loop for the duration of the heart floater.
- Edge case: an accessory sprite (umbrella) drawn over the kitten composites without erasing her face.
- Edge case: switching directions while walking does not snap-reset the walk frame to 0 (keep the cadence so the animation feels continuous).
- Integration: the celebration `happyDance` state runs through 4 frames repeatedly throughout the celebration window.

**Verification:**
- Visually compare against the current kitten: the new kitten reads as recognizably the same character but with smooth multi-frame animation and cuter detail. No fillRect art remains in the kitten draw path.

---

- [ ] **Unit 6: Garden room as a tile map**

**Goal:** Re-author the garden room as a tile map declaration. Add at least 4 grass varieties, 3 flower varieties (decoration), 2 dirt-path tile types, a stone pavement variant, a tree tile (split foliage across `decoration` and `overlay`), and water tiles for the pond edge. Reposition collectibles and hotspots to match the new map's logical layout.

**Requirements:** R2, R6, R13

**Dependencies:** Units 1, 3

**Files:**
- Modify: `src/game.js` (add `GARDEN_MAP`, register garden tiles in `TILES`, replace `drawGarden` body to call `drawTileLayer` for each layer, update `garden.collectibles` / `hotspots` positions if needed)

**Approach:**
- Author the garden as a 24×9 tile grid by hand. Pond is a cluster of 4-6 water tiles in one quadrant. Stone-path tiles arc across the field. Trees occupy 1×1 footprint cells with their canopies in the overlay layer.
- Grass tile variants: 4 distinct micro-textures (plain, with-blade, with-clover, with-tiny-flower) selected by the deterministic `seed`.
- The pond hotspot's `(x, y, w, h)` is updated to match the new tile-pixel position.
- Background micro-flowers (decorative) become decoration-layer tiles, no longer hand-placed.

**Patterns to follow:**
- Current `drawGarden` for the *look* of garden elements.
- The new tile renderer + layer order from Unit 3.

**Test scenarios:**
- Happy path: the garden map renders with grass everywhere, scattered decorative flowers, a stone path arcing across, and trees (foliage in overlay).
- Happy path: the kitten can walk anywhere on the grass; tree foliage draws over her when she walks "behind" a tree.
- Happy path: the pond renders as connected water tiles in the lower-left, and the pond hotspot still triggers the frog reaction on tap.
- Edge case: every collectible and hotspot is still reachable and visible (none accidentally hidden by an overlay tile).
- Integration: the existing garden flower collectibles, butterflies, and yarn ball still render and collect correctly on the new map.

**Verification:**
- The garden looks visibly richer than the current version — multiple grass varieties, denser decoration, trees with proper layering. Existing gameplay (flower collection, butterflies, yarn ball, pond/frog hotspot) still works.

---

- [ ] **Unit 7: Kitchen, bedroom, beach as tile maps**

**Goal:** Re-author the remaining three rooms as tile map declarations with the same level of detail as the garden.

**Requirements:** R2, R6, R13

**Dependencies:** Units 3, 6 (so the garden conversion is proven first)

**Files:**
- Modify: `src/game.js` (add `KITCHEN_MAP`, `BEDROOM_MAP`, `BEACH_MAP`; register kitchen/bedroom/beach tiles in `TILES`; replace each room's `draw` function body)

**Approach:**
- **Kitchen tiles:** floor-tile-A/B/C variants (wood plank vs. patterned tile), rug-edge tiles for the rug, mouse-hole tile, food-area tiles. Walls eliminated entirely (top-down only).
- **Bedroom tiles:** wood-plank floor variants (with grain seams as deterministic per-tile variants), small carpet tiles for the rug, bed-base tiles, toy-box tile, plus a few "sleeping cat hair tuft" decoration tiles for whimsy.
- **Beach tiles:** sand variants (flat, rippled, with-pebble, with-shell-fragment), wet-sand strip, sea tiles (multiple variants for wave animation), seaweed-on-sand decoration, rock-on-sand decoration.
- For each room, hotspots and collectibles get their positions adjusted to align with logical tile coordinates.
- Indoor rooms (kitchen, bedroom) get `room.indoor = true` so the lighting pass tints them appropriately.

**Patterns to follow:**
- The garden conversion in Unit 6.
- Existing per-room aesthetics (peach kitchen, lavender bedroom, sand beach).

**Test scenarios:**
- Happy path: each room renders with multiple tile varieties (no obvious repetition seam).
- Happy path: each room's hotspots still trigger correctly (food bowl, milk, bed, waves, crab, mouse).
- Happy path: each room's collectibles still render, are tappable, and fly to the shelf.
- Edge case: the kitten's spawn position on entry is on a walkable tile, not visually inside a tile decoration.
- Edge case: indoor rooms get the warm-light tint from the lighting pass; outdoor rooms (garden, beach) don't.
- Integration: full play-through across all four rooms — title → garden → kitchen → bedroom → beach → garden — all with the new tile maps and the new sprite renderer for the kitten.

**Verification:**
- Each room looks visibly upgraded. No room still uses the old `drawX` `fillRect` code. The full gameplay loop still works end-to-end.

---

- [ ] **Unit 8: Ambient world life — birds, fish, butterflies, swaying flowers**

**Goal:** Add per-room ambient animation loops that run continuously and make the world feel inhabited. Each room has at least 3 ambient effects.

**Requirements:** R7, R10, R13

**Dependencies:** Units 1, 2, 3, 6, 7

**Files:**
- Modify: `src/game.js` (add per-room `ambient(dt)` function in the room manifest, plus shared ambient drawing helpers)

**Approach:**
- Each room object grows an `ambient(dt)` function called by `gameUpdate`. It mutates a per-room `ambientState` object.
- **Garden ambient effects:**
  - A bird sprite that flies across the screen at a random altitude every 12-25 seconds, with a subtle shadow on the grass below.
  - The frog in the pond blinks every 4-8 seconds (small 2-frame anim).
  - A fish jumps out of the pond every 8-15 seconds with a tiny splash.
  - Butterflies (already there) get a 2-frame wing flap with phase variation between butterflies.
  - Flowers near the kitten sway when she walks past (one-frame nudge, decays over 30 frames).
- **Kitchen ambient effects:**
  - Steam wisps rise from the food bowl every few seconds.
  - The mouse occasionally peeks out of its hole (briefly visible, then retreats).
  - A small dust mote drifts in a beam of light through an unseen window (a vertical light shaft on the floor).
- **Bedroom ambient effects:**
  - Slowly drifting "cozy" particles (small soft circles).
  - Occasional yarn ball wobble (1-frame nudge).
  - Pillow puff: subtle sway on the bed pillow.
- **Beach ambient effects:**
  - Wave line animates continuously (already partially does — generalize to a multi-frame water cycle).
  - A seabird flies across occasionally.
  - Sand puffs trail behind the kitten when she walks on dry sand.
  - Wave spray: small splashes at the waterline every few seconds.
- All ambient effects use the same `Engine.particles` system or per-room small arrays — pick one and stick to it (decision deferred to implementation).
- Ambient effects pause during room transitions and celebration.

**Patterns to follow:**
- Existing weather particle system in `src/game.js` for the once-per-room update loop pattern.
- Existing butterfly position update (`c.t += dt * 0.03; c.x = baseX + sin(t) * 40`) for wandering motion.

**Test scenarios:**
- Happy path: in the garden, a bird occasionally crosses the screen with a shadow underneath.
- Happy path: in the garden, the pond fish jumps out periodically with a splash particle.
- Happy path: in the garden, walking the kitten past a flower causes that flower to briefly tilt.
- Happy path: in the kitchen, steam rises from the food bowl on a regular cadence.
- Happy path: in the bedroom, soft cozy particles drift slowly.
- Happy path: on the beach, sand puffs appear behind the kitten when she walks on dry sand.
- Edge case: ambient animations stop during room transitions and resume afterward.
- Edge case: ambient particles don't bleed across rooms when transitioning.
- Edge case: ambient animations don't run during the full-shelf celebration (which has its own visuals).
- Integration: an idle minute in the garden — no taps — produces visible movement (bird, fish jump, butterflies flapping, frog blinking) so the world doesn't feel frozen.

**Verification:**
- Sit and watch any room with no input for 30 seconds: at least 5 different ambient events happen. The world reads as alive, not as a static screenshot with a kitten on top.

---

### Phase 3 — Interaction richness: multi-stage reactions + secrets + responses

- [ ] **Unit 9: Multi-stage hotspot reactions**

**Goal:** Convert each hotspot from a single-event reaction to a multi-stage vignette using a small reaction-state-machine.

**Requirements:** R8, R13

**Dependencies:** Units 2, 5 (animation + multi-state kitten)

**Files:**
- Modify: `src/game.js` (add `REACTIONS` registry, a `reactionTick(dt)` function called from `gameUpdate`, and per-hotspot reaction definitions; rewrite the `triggerHotspot` arrival branches to start a reaction sequence instead of a single state set)

**Approach:**
- Each hotspot reaction is a list of stages: `[{ name, onEnter, durationMs, beats }]`.
- `onEnter` is a function called once when the stage starts. Common uses: `playAnim(kitten, 'eat')`, `Sound.play('munch')`, `spawnFloater({...})`, `setHotspotState({...})`.
- `durationMs` is how long the stage runs before advancing.
- `beats` is an optional list of `{ atMs, do }` for inline events during the stage (e.g., a sound at 100ms in, a particle burst at 300ms in).
- A `reactionTick(dt)` function runs each frame: if the kitten has an active reaction, advance its stage timer, fire beats whose `atMs` has passed, and transition to the next stage when the timer expires.
- The kitten's `busy` flag is owned by the reaction, not by the hotspot directly.
- The arrival check from `updateHotspots` becomes: when the kitten arrives at a queued hotspot's target, call `startReaction(REACTIONS[hs.kind])` and clear the queued flag.

**Reaction definitions to author:**
- **Food bowl:** arrive → sniff (400ms) → eat (1200ms with munch beats and crumb particles) → lick lips (600ms) → sit (1500ms with tail twitch) → done.
- **Milk saucer:** arrive → sniff (300ms) → lap (1800ms with rhythmic lap sounds and small milk droplet particles) → lick lips (500ms) → done.
- **Bed:** arrive → step up (400ms) → curl (600ms transition) → sleep curl loop (3000ms with Z floaters at 0/700/1400ms) → stretch awake (800ms) → sit (600ms) → done. First bed-tap also flips day→dusk→night via the lighting pass.
- **Pond / frog:** arrive → kitten leans in (300ms) → frog hops (frog anim + ribbit at 0ms, splash at 200ms) → kitten pulls back surprised (200ms) → kitten sits and watches frog return (1000ms) → done.
- **Crab:** arrive → kitten cocks head (300ms) → crab scuttles (1000ms with scuttle sound at 100ms) → kitten watches (500ms) → done.
- **Waves:** arrive → kitten paws at water (200ms) → splash particles (300ms with splash sound, water droplets) → kitten shakes off (400ms) → giggle (200ms) → done.
- **Mouse:** arrive → mouse waves (600ms with mew sound) → kitten meows back (400ms) → mouse offers treat (drops a treat collectible 600ms in) → mouse retreats into hole (400ms) → done.
- **Self-pet (tap kitten):** purr loop (2000ms with floating hearts every 400ms) → done.
- All reactions can be interrupted by tapping somewhere else: the kitten cancels the reaction, plays a quick "interrupted" idle frame, and starts walking to the new target.

**Patterns to follow:**
- Existing `triggerHotspot` and `updateHotspots` arrival flow.
- Existing `kitten.busy` flag.

**Test scenarios:**
- Happy path: tapping the food bowl runs the full sniff → eat → lick → sit sequence with the right sounds and particles at the right beats.
- Happy path: tapping the bed runs the curl → sleep → stretch → sit sequence and toggles night mode at the right beat.
- Happy path: tapping the kitten runs the purr loop for ~2 seconds with hearts floating up at 400ms intervals.
- Edge case: tapping a different hotspot mid-reaction interrupts cleanly — kitten cancels the current reaction and starts walking to the new one.
- Edge case: tapping the same hotspot twice in a row doesn't double-fire stage beats.
- Edge case: a room transition mid-reaction cancels the reaction and clears `kitten.busy`.
- Edge case: each stage's `onEnter` runs exactly once (no double-fire even with weird dt jitter).
- Integration: walking a full sleep sequence triggers night mode at the right beat, not at a different one.

**Verification:**
- Every hotspot now feels like a little vignette rather than a one-shot event. A child watching another child play sees recognizable cause-and-effect cycles ("ohh she's gonna eat now!").

---

- [ ] **Unit 10: Discoverable secrets**

**Goal:** Add at least 2 hidden surprises per room that reward repeated tapping or kitten exploration.

**Requirements:** R9, R13

**Dependencies:** Unit 9

**Files:**
- Modify: `src/game.js` (add per-room secret definitions; track secret discovery state; hook secrets into the reaction system)

**Approach:**
- Each room's manifest gains a `secrets` array. Each secret has `{ kind, x, y, w, h, requiredTaps, reaction, found }`.
- A secret is a hidden hotspot that doesn't visibly mark itself but, when tapped `requiredTaps` times in a row, triggers a reaction.
- Once found, the secret can be re-triggered freely (it's discovered for the session).
- Secrets to author:
  - **Garden:** tap a specific bush 3 times → a tiny bird flies out, chirps, lands briefly on a tree branch. Tap a specific rock → a snail pokes out, kitten meows at it.
  - **Kitchen:** tap a specific tile 3 times → a tiny spider rappels from above, kitten startles cute. Tap the rug corner → reveals a hidden coin (a single shiny pixel that floats up to a corner of the shelf? or just plays a chime).
  - **Bedroom:** tap the toy box 3 times → a teddy bear briefly peeks out. Tap the window area → birds fly past outside.
  - **Beach:** tap a sand patch 3 times → a baby crab burrows out. Tap a specific seashell shape → it reveals it's a pearl shell with a sparkle inside.
- Secrets must not block the regular flow (a tap on a secret area also passes through to walk-target if the secret isn't yet found and the tap count threshold isn't met).
- Secret discovery state: in-memory only, reset each session. Surprising the child with the same secret on her next play is a feature, not a bug.

**Patterns to follow:**
- The hotspot tap-then-react flow from Unit 9.
- The collectible hit-test pattern in `tryCollectibleTap`.

**Test scenarios:**
- Happy path: tapping the bush three times in a row triggers the bird-fly-out reaction.
- Happy path: tapping a non-secret point on the bush still starts a walk to that point (secrets don't gobble all taps).
- Happy path: a discovered secret can be re-triggered by a single tap thereafter.
- Edge case: tapping the bush twice, walking away, then tapping again does NOT trigger the secret (the streak is broken on a non-secret tap or after a timeout — pick one and document it).
- Edge case: each room's secrets reset on session start.
- Integration: every room has at least 2 discoverable secrets and each one fires its reaction correctly.

**Verification:**
- A user who plays for 5 minutes per session discovers something new across multiple sessions. The world rewards exploration.

---

- [ ] **Unit 11: Environmental responses to the kitten**

**Goal:** Add subtle world reactions to the kitten's presence and movement: water ripples near the pond, flowers sway as she walks past, dust puffs on dirt/sand tiles, paw prints adapted to surface type.

**Requirements:** R10, R13

**Dependencies:** Units 7, 8

**Files:**
- Modify: `src/game.js` (extend the per-frame kitten update to fire environmental responses based on her position and the underlying tile)

**Approach:**
- **Water ripples:** when the kitten is within 30px of any water tile and moving, occasionally spawn a ripple particle on the nearest water tile.
- **Flower sway:** when the kitten passes within 12px of a flower (decoration tile or collectible), set the flower's `sway` field to a small value that decays over 30 frames; the draw function uses it as a horizontal offset.
- **Dust puffs:** when the kitten walks on a `dirt` or `sand` surface tile, every ~8 pixels of travel spawn a small dust particle behind her.
- **Surface-aware paw prints:** the existing paw print color/style varies by surface — darker on grass, sandy on sand, faint on tile, etc. The tile under the kitten provides its `surface` tag.
- **Bed creak:** when the kitten steps onto a bed tile, a small "creak" sound plays (not the full sleep reaction — just an ambient response).
- These responses are *passive*: they don't lock the kitten or block other reactions; they're free side effects.

**Patterns to follow:**
- Existing `world.pawPrints` system for spawning trail particles.
- Existing weather particle update loop.
- Tile registry from Unit 3 (each tile carries a `surface` tag).

**Test scenarios:**
- Happy path: walking the kitten past a flower in the garden causes that flower to briefly tilt, then return.
- Happy path: walking the kitten on dry sand in the beach spawns dust puffs every few pixels.
- Happy path: walking the kitten near the pond occasionally spawns a water ripple particle on the pond surface.
- Happy path: paw prints on grass are dark green; on sand are sandy beige; on tile are nearly invisible.
- Edge case: standing still doesn't spawn dust puffs or sway flowers (movement-driven only).
- Edge case: the kitten's accessory layer (hat, umbrella) doesn't interfere with sway or dust calculations.
- Integration: a full walk across the garden visibly moves grass, sways flowers, and leaves a paw print trail that matches the surface.

**Verification:**
- The world clearly *responds* to the kitten's presence in ways the child can see without being told.

---

- [ ] **Unit 12: NPC personality system + dialogue portrait windows**

**Goal:** Give the kitchen mouse a small personality system — varied wave styles, occasional spontaneous appearances, "talks" via emoji-style floaters — *and* add a reusable dialogue-portrait window that can later be reused for the frog and crab. The portrait window is the small high-leverage feature that turns NPC reactions into vignettes a child remembers, validated by prior art (`verdictzero/azet` PR #226 / #227 — see External References).

**Requirements:** R7, R8, R13

**Dependencies:** Units 1, 8, 9 (sprite renderer for the portrait, ambient layer for spontaneous appearances, reaction system to trigger the portrait at the right beat)

**Files:**
- Modify: `src/game.js` (extend the mouse hotspot with a personality state and varied reactions; add an ambient mouse appearance loop; add a `drawDialoguePortrait(ctx, sprite, side)` helper and a `world.dialogue` state object that the reaction system can set)

**Approach:**

*Mouse personality (carries the emotional weight):*
- The mouse has `mood` (`shy`, `playful`, `sleepy`) — chosen randomly per session.
- Mood affects the wave reaction:
  - `shy`: mouse only barely peeks out, waves once, drops the treat quickly, retreats.
  - `playful`: mouse jumps out of the hole, does a little spin, waves twice, offers the treat with a flourish, then peeks back at the kitten before retreating.
  - `sleepy`: mouse yawns, does a slow wave, gently rolls the treat out, settles back into the hole still visible.
- Ambient mouse appearances: every 20-40 seconds while the kitten is in the kitchen, the mouse briefly pokes its nose out of the hole and looks around. Tapping it during this peek triggers an extra greeting reaction (different from the main one).
- Mouse "talks" via floaters that show small symbols above its head (heart, music note, question mark, sparkle) at key beats during reactions.
- The treat-drop cap (4 per session) still applies.

*Dialogue portrait windows (carries the visual upgrade):*

**API borrowed verbatim from `verdictzero/azet` PR #227** (`js/engine.js`, `Renderer.drawPixelArtWindow` — see Concrete Patterns Borrowed From Prior Art). The implementation is ~25 lines:

- `drawPortraitWindow(ctx, sprite, frame, x, y, w, h, outerColor, innerColor)` — draws the sprite inside a bordered window:
  - Outer stroke fill at `(x - totalBorder, y - totalBorder, w + 2*totalBorder, h + 2*totalBorder)` using a soft pastel `outerColor` (default: a pale pink-grey to match the cozy palette, *not* azet's bright grey which is wrong for this game).
  - Inner stroke fill at `(x - innerPx, y - innerPx, w + 2*innerPx, h + 2*innerPx)` using a darker warm `innerColor` (default: PAL.outline / warm brown).
  - Sprite blit using the `renderSprite` from Unit 1, with `imageSmoothingEnabled = false` and integer-rounded coordinates.
  - Border thicknesses scale with sprite size: `outerPx = max(2, round(spriteW * 0.08))`, `innerPx = max(1, round(spriteW * 0.05))`. Mirrors azet's resolution-aware border math.
- A `world.dialogue` state object is set by the reaction system at specific stage beats: `{ active, sprite, frameIdx, side, fade }`. The `side` is `'left'` or `'right'` (which corner of the play area the portrait window appears). The `fade` is for soft-in/soft-out, driven by the same per-frame timer as the rest of the reaction.
- When `world.dialogue.active` is true, `gameRender` calls `drawPortraitWindow(...)` in the documented layer position (between weather and shelf — see the layer-order block at the top of `gameRender` per the prior-art layer-order discipline).
- **Mouse portrait sprite is procedurally generated, not hand-authored.** Borrow the `azet/generatePlaceholderPortrait(role)` deterministic-HSL-from-string-seed pattern verbatim: hash `mouse + mood` (e.g., `'mouse_playful'`) into a stable seed, derive the mouse's HSL palette from the seed, render a small body shape into a canvas, cache it. Each session's mood gives a stable but visibly different mouse portrait. **This eliminates ~6 hand-authored mouse portrait sprites — biggest single time saving in Phase 3.** The same pattern applies to the frog and crab portraits in their own follow-up units.
- The portrait's `frameIdx` selects which expression to draw (wave, smile, sleepy yawn) — the sprite is multi-frame, same as the kitten, so all expressions live in one sprite definition.
- Mouse reaction beats trigger the portrait at: arrive (mouse smile), wave (mouse wave), treat-offer (mouse smile + sparkle floater), retreat (portrait fades out via `world.dialogue.fade`).
- The portrait system is built generically so the **frog** (Unit 9) and **crab** (Unit 9) can reuse it in their own reactions in a later iteration without re-doing the window code. They get procedural portraits via the same generator (frog uses `'frog'` seed, crab uses `'crab'` seed).
- For the v6+ scope of *this* unit, only the mouse portrait is required. The frog and crab portraits are deferred-but-trivial follow-ups once the system exists — they cost a single line of code each (`getPortrait('frog')`).

**Patterns to follow:**
- The reaction system from Unit 9 (stage beats can call `setDialogue({...})`).
- Existing floater spawning patterns.
- The sprite renderer from Unit 1 (the portrait is just a larger-scale sprite drawn at a fixed UI position).
- The `azet` window-portrait pattern from External References — bright outer stroke, dark inner stroke, contained content area.

**Test scenarios:**
- Happy path: each session, the mouse's mood is one of `shy`, `playful`, `sleepy` (verified by 10 reset cycles producing more than one variant).
- Happy path: a `playful` mouse's wave reaction has the spin and the second wave; a `shy` mouse's doesn't.
- Happy path: while in the kitchen, the mouse periodically pokes its nose out unprompted.
- Happy path: tapping the mouse during a peek triggers a different (lighter) greeting than the full reaction.
- Happy path: during the mouse reaction, a portrait window appears on one side of the play area showing the mouse sprite. It cycles through expressions (smile → wave → smile + sparkle → fade) at the reaction beats.
- Happy path: the portrait window does not block the kitten's main animations or any collectibles (it draws over an empty area of the canvas, not over interactive content).
- Edge case: the treat cap is honored regardless of mood (no mood gives more than 4 treats per session).
- Edge case: the portrait window is suppressed during room transitions (its state is cleared in `flushFloatersOnArrive` or equivalent transition cleanup).
- Edge case: tapping during a portrait dialogue does not double-fire reaction beats — input is locked until the dialogue ends (or, alternatively, taps cancel the dialogue cleanly; pick one and document it).
- Integration: the mouse's emoji floaters show up at the right beats during the reaction without overlapping the kitten's own floaters or the portrait window.
- Integration: the portrait system is used by at least one NPC reaction (the mouse) and the API surface is generic enough that adding a frog or crab portrait in a follow-up commit requires only adding sprite data + setting `world.dialogue` from the reaction stage — no engine changes.

**Verification:**
- Repeat play sessions feel different because the mouse acts differently. The kitchen has personality. The dialogue portrait window is recognizably the *azet*-style framed-NPC pattern, adapted to the cozy palette, and reads as a small character interaction rather than a screen-full UI takeover.

---

### Phase 4 — Polish: sound layers + transitions + performance

- [ ] **Unit 13: Layered ambient + reaction audio**

**Goal:** Add per-room ambient sound loops (procedural, scheduled), surface-aware footstep sounds, and cleanly layered reaction sound beats.

**Requirements:** R11, R13

**Dependencies:** Units 7, 9, 11

**Files:**
- Modify: `src/game-sounds.js` (add new sound functions for ambient loops, footsteps, surface variants, mouse personality variants)
- Modify: `src/game.js` (add ambient audio scheduler per room, footstep tick on kitten walk, hook into reaction beats)

**Approach:**
- **Ambient loops:** each room has an ambient audio scheduler that fires soft procedural sounds every N seconds. Garden: occasional bird tweets (sine sweeps), distant wind rustle (filtered noise). Kitchen: low kettle hum (steady oscillator), occasional drip. Bedroom: soft ticking (faint metronome), distant chimes. Beach: continuous wave-noise loop (low-volume filtered noise), occasional gull cry.
- **Footstep sounds:** when the kitten advances `walkDist` past a threshold, play a footstep sound based on the surface tag of the tile under her — `grass` (soft scuff), `wood` (light tap), `tile` (slight click), `sand` (muffled crunch), `stone` (firm tap).
- **Reaction beats:** the reaction system already supports `beats` with `do: () => Sound.play(...)`. Author the food/milk/bed/etc. reactions to use varied sound beats (e.g., the eat reaction has *two* munch sounds at different pitches, a small yum sound at the end, a satisfied purr cut-in).
- **Volume balancing:** ambient is quietest, footsteps mid, reactions loudest, lullaby on top. Decided in implementation.

**Patterns to follow:**
- Existing `SOUNDS` map in `src/game-sounds.js` and the lullaby scheduler in `updateLullaby`.

**Test scenarios:**
- Happy path: each room has audible ambient sounds at low volume that fire on a soft cadence.
- Happy path: walking the kitten on different surfaces produces different footstep sounds.
- Happy path: each reaction has multiple sound beats at correct moments (not a single one-shot sound at the start).
- Edge case: the mute button silences ambient + footsteps + reactions (test the existing engine mute toggle still works).
- Edge case: ambient loops don't pile up if frame rate hiccups (the scheduler uses real elapsed time, not frame count).
- Integration: a full play session has continuous gentle ambient sound underneath the lullaby, with reaction sounds layering on top during interactions, all at comfortable volumes.

**Verification:**
- Headphones-on test: the game sounds *alive* even when the kitten is standing still. Footsteps differ between rooms. Each reaction has a memorable little audio vignette.

---

- [ ] **Unit 14: Smooth scene transitions + animation continuity**

**Goal:** Improve room-to-room transitions so they feel like the kitten is *walking* into a new space, not blinking through a fade. Add a brief "approach" animation as she steps off-screen and a brief "arrival" animation as she steps in.

**Requirements:** R8, R13

**Dependencies:** Units 5, 9

**Files:**
- Modify: `src/game.js` (rewrite `startRoomTransition`, `updateTransition`, `drawTransition` to support an animated walk-off + walk-in instead of a static crossfade)

**Approach:**
- New transition phases: `walkOff` (kitten walks toward the arrow until off-screen) → `fadeOut` (~10 frames) → `swap` (instant room change) → `fadeIn` (~10 frames) → `walkIn` (kitten walks from the spawn edge to a comfortable position) → `idle`.
- During `walkOff` and `walkIn` the kitten plays the appropriate `walkLeft` / `walkRight` animation.
- Tap input is ignored during all transition phases.
- The lighting pass continues to apply during transitions (no light flicker).
- Total transition time stays under 1.5 seconds so the child doesn't lose interest.

**Patterns to follow:**
- Existing `startRoomTransition` and the `phase: 'out' | 'in'` pattern.
- Existing kitten walk animation from Unit 5.

**Test scenarios:**
- Happy path: tapping the right arrow makes the kitten walk to the right edge, fade out, swap rooms, fade in on the left edge, and walk inward.
- Happy path: the kitten's walk animation is continuous through the transition (no snap-to-frame-0 reset on arrival).
- Edge case: tap input during the transition is dropped (no queued walk targets).
- Edge case: in-flight floaters from before the transition are still flushed via the existing `flushFloatersOnArrive` mechanism.
- Edge case: the lighting pass doesn't flicker during the swap.
- Integration: the existing `flushFloatersOnArrive` and butterfly `onKitten` reset still fire at the swap moment.

**Verification:**
- Room transitions feel like the kitten walks between rooms, not like the world teleports around her.

---

- [ ] **Unit 15: Performance pass + manual playtest + browser regression**

**Goal:** Profile the upgraded game on a mid-tier device target. Identify and fix any frame-rate regressions. Run a full manual playtest of every room and every reaction. Re-run the headless smoke test and browser test from prior sessions.

**Requirements:** R12, R13

**Dependencies:** Units 1-14

**Files:**
- Modify: `src/game.js` as needed for performance fixes (likely sprite caching, draw call batching, or precomputed tile patterns)
- Modify: `src/game-config.js` (bump version)
- Update: `CHANGELOG.md` (per the project convention)

**Approach:**
- Use the URL `?debug=fps` flag (already supported in the engine) to display FPS during playtest.
- Identify the worst-case scene (probably the garden with full ambient life, weather, snow particles, butterflies, fish jumping, bird crossing, sway responses, paw prints, plus the kitten and the shelf).
- Profile in a real browser and see whether FPS holds at 55+ on a mid-tier device target (e.g., a tablet or low-end laptop). If not, try in order: (1) cache rendered tile layers in an offscreen canvas, (2) reduce ambient particle density, (3) batch sprite draws by palette color.
- Manual playtest matrix:
  - All four rooms reachable from all other rooms.
  - Every hotspot triggers its full multi-stage reaction with the right sounds and animations.
  - Every collectible category fillable.
  - Night mode toggles on bed-tap with smooth lighting transition.
  - Weather mode (rain / snow / clear) renders correctly in every room.
  - Full-shelf celebration triggers and resets cleanly.
  - Discoverable secrets are findable in every room.
  - Audio: ambient + footsteps + reactions + lullaby all play and balance correctly.
  - No console errors at any point.
- Re-run the headless smoke test from the prior session (adapt to the new APIs as needed).
- Re-run the `agent-browser` end-to-end test (real Chromium load + tap through the rooms).
- Update `CHANGELOG.md` with What/Why entries for each landed phase (one per phase or one per unit, depending on commit cadence).

**Patterns to follow:**
- The headless smoke test pattern from `docs/plans/2026-04-11-001-feat-tiny-kitty-garden-plan.md`'s prior verification.
- The `?debug=fps` overlay in `src/engine/loop.js`.

**Test scenarios:**
- Happy path: FPS holds 55+ in every room, including the worst-case scene with ambient + weather + multiple reactions.
- Happy path: every entry in the playtest matrix passes.
- Happy path: smoke test exits 0.
- Happy path: browser test exits 0 with no console errors.
- Edge case: a stress test of 30 seconds in each room with no input passes ambient cycles correctly without leaks (memory profile is stable).
- Integration: the full session loop — title → play → walk → transitions → all reactions → collect → night → celebrate → reset — works end-to-end with no regression vs. the v5 baseline.

**Verification:**
- The game ships with stable 60 fps on mid-tier hardware, every system from Phases 1-3 working together, and a clean playtest pass. CHANGELOG and version bumped. PR opened.

## System-Wide Impact

- **Interaction graph:** the new sprite, animation, tile, lighting, and reaction systems all live in `src/game.js` and are called from `gameUpdate` / `gameRender`. They wrap around the existing engine hooks (`gameInit`, `gameUpdate`, `gameRender`, `gameTitleRender`, `gameTap`) without changing those signatures. The template engine (`src/engine/*.js`) is untouched in this plan — all complexity is on the game side.
- **Error propagation:** the new systems must fail soft. An unknown sprite frame index falls back to frame 0. An unknown tile name is skipped. An unknown reaction name kicks the kitten back to idle. Nothing should ever throw and halt the game loop.
- **State lifecycle risks:**
  - The animation state on the kitten must reset on room transitions (like `walkFrame` does today) so she doesn't enter the new room mid-eat-anim.
  - The reaction state machine must clear cleanly on transitions (drain stages, fire any "cleanup" beats, clear `kitten.busy`).
  - Ambient particle pools must clear on transitions to avoid bleed.
  - Discoverable-secret state is per-session in-memory only and must reset on `gameInit`.
  - The lighting pass must handle weather + time-of-day combinations without double-tinting.
- **API surface parity:** the existing `gameTap`, `GAME.hideUI`, and `gameTitleRender` template hooks remain unchanged. No new template-engine hooks are added by this plan. The single new "user-visible API" is the in-game `defineSprite` / `playAnim` / `startReaction` helpers, which are internal to `src/game.js`.
- **Integration coverage:** the multi-stage reactions, the animation transitions, and the room transition rewrite all touch the kitten's `busy` flag and animation state at the same boundaries. The smoke test must cover at least: (1) tapping a hotspot, walking, and arriving fires the full reaction; (2) interrupting a reaction by tapping somewhere else cleanly cancels; (3) a room transition mid-reaction cleanly cancels and clears `busy`; (4) the kitten's animation state is correct in the new room after the transition.
- **Unchanged invariants:** the `Engine.state.health = 1, maxHealth = 0` no-fail-state setup, the no-DOM-text rule (`hideUI: true`), the procedural-only graphics rule, the procedural-only audio rule, and the single-file `src/game.js` rule all remain unchanged. The build pipeline (`node build.js`) is unchanged. The CHANGELOG convention from v5 is followed for every commit in this plan.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Hand-authoring 30+ multi-frame sprites in JS data tables is tedious and error-prone. | Use the `defineSprite(w, h, palette, framesAsStrings)` helper from Unit 1 so frames are editable as multi-line ASCII art. Author one sprite end-to-end first (the kitten, Unit 5) to validate the workflow before scaling to all entities. |
| The total sprite + tile data may inflate `src/game.js` past comfortable size and slow down `node build.js` / page load. | Today `src/game.js` is ~2050 lines and the bundle is ~100 KB. Even doubling that is fine for a static page. If it gets uncomfortable (~500 KB+), we can compress sprites by RLE-encoding frames at author time, but start without it. |
| Frame rate drops on mid-tier tablets after Phase 2 (more draws per frame). | Unit 15 includes a profiling pass with concrete optimization fallbacks (offscreen-canvas tile cache, particle density reduction, sprite batching). The `?debug=fps` overlay already exists. |
| Multi-stage reactions are harder to test than one-shot events because they unfold over multiple frames. | Add deterministic time-step support to the smoke test (already partially done — the v2 smoke test uses a `mockTime` counter). Drive reactions by simulated frames and assert state at known beat times. |
| The reaction state machine could deadlock if `busy` is never cleared (a stage with no `next`, an unhandled error, etc.). | Every reaction has a final `done` stage that always runs and always clears `kitten.busy = null`. Add a hard timeout: any reaction running longer than 8 seconds force-clears. |
| Animation state can desync from the kitten's logical state (e.g., kitten walks but plays idle anim). | The animation state is set by the gameplay logic (movement → walkX, busy → reaction state). Use a single sync point in `updateKitten` so there's only one place that decides the anim state. |
| The lighting pass + multi-layer rendering may cause subtle z-order bugs (kitten visible over the shelf, foliage visible over the kitten's head incorrectly, etc.). | Z-order is fixed in `gameRender` and documented at the top of the function. Visual playtest of every room confirms layers in Unit 7. |
| Discoverable secrets confuse the child if she taps them by accident and weird things happen. | Secrets fire at most once per discovery streak and are gentle (no startles, no loud sounds, no fast motion). The reactions are short and resemble the existing hotspot vignettes. |
| Surface-aware footsteps may conflict with the existing lullaby (too much audio on top of each other). | Volume balancing in Unit 13. Footsteps are quietest (0.05-0.08 range), reactions are mid, lullaby loudest. |
| The new tile + sprite system is a large architectural change in a single file. The diff will be huge. | Phase the rollout: Phase 1 lands the systems with a flag, Phase 2 converts rooms one at a time. Each commit has its own CHANGELOG entry with What/Why per the v5 convention. |
| Unit 9's reaction state machine duplicates some of the existing hotspot state (`hs.state`, `hs.queued`, `kitten.busy`). | Migrate fully to the reaction state machine in Unit 9 — do not run both in parallel. Old `hs.state` field becomes the reaction stage timer; `kitten.busy` becomes "this reaction owns the kitten." |
| Adding 4 phases / 15 units is a lot of work — risk of stalling halfway. | Each phase ends with a working build that's strictly better than the previous version. Stopping after Phase 1 yields a reusable foundation. Stopping after Phase 2 yields a much prettier game. Stopping after Phase 3 yields the full vision. Phase 4 is polish only. The plan is *graceful* in that any phase boundary is a legitimate ship point. |
| AI tools producing duplicate-class merge artifacts in large single-file refactors. | Concrete prior art: the merged `mr1charles/Abil` PR has lines 25-200 as a near-duplicate of lines 207-630 — two versions of the engine glued together by an AI tool. **Mitigation:** before merging any large auto-generated refactor in Phase 1 / 2, grep `src/game.js` for duplicate `class` and top-level `const` declarations. The smoke test catches some of this (a redeclaration usually throws), but a near-duplicate function with a slightly different name will pass. Add this to the Phase 1 review checklist, especially for Unit 1 (sprite renderer) and Unit 5 (kitten sprite re-author). |
| Render layer order ambiguity creates z-fighting bugs as new layers are added (lighting, portraits, weather). | Document the layer order in a top-of-`gameRender` comment block once and never re-think it. Borrowed from `verdictzero/azet`'s practice of pinning the order ("rendered between `endFrame()` and `postProcess()`"). The canonical order for TKG: `ground tiles → decoration tiles → ambient creatures → hotspots → collectibles → paw prints → kitten → floaters → overlay tiles → weather → lighting pass → portrait window → shelf`. |

## Documentation / Operational Notes

- Each commit in this plan must add a CHANGELOG.md entry per the v5 convention (`What changed` / `Why` format with a short SHA reference). The entries are particularly valuable here because the plan lays down architectural systems whose rationale will not be obvious from the diff six months later.
- Bump `version` in `src/game-config.js` for each commit per the existing rule. Phase boundaries are good moments for major version bumps if that feels right (v6, v7, v8, v9 for the four phases, or finer-grained per unit).
- Update `CLAUDE.md` if the new sprite / tile / reaction systems become part of the template contract. They probably should *not* be — this plan is a game-specific upgrade, not a template feature. Keep the systems inside `src/game.js` and document them only via inline structure, not as template hooks.
- After Phase 4 ships, write a short `docs/solutions/` note capturing the data-driven sprite + tile pattern as institutional learning for future games built from this template.

## Alternative Approaches Considered

- **Switch to PixiJS or Phaser.** Real WebGL 2D engine, real sprite-sheet loaders, real animation systems. Massively reduces hand-authoring effort and unlocks shaders, blend modes, scrolling cameras, and a much higher visual ceiling. **Rejected** because it breaks the single-file static-HTML deploy story (the entire engine + bundler gets pulled in), violates the "no external libraries" constraint, and changes the project's shape from "a single 100 KB file you can read end-to-end" to "a webpack project." If the project's identity changes in the future, this is the right path; today it isn't. **Independently validated:** SitePoint published *"Game Dev Without an Engine: The 2025/2026 Renaissance"* in this same window — naming the engine-free trend explicitly and citing Unity's pricing controversy and a dev shipping 120+ vanilla-Canvas games as the cultural drivers. The project isn't fighting the current; it *is* the current.
- **Allow image files (PNG sprite sheets).** Massively reduces the cost of authoring rich sprites — drop in Aseprite output. **Rejected** because `CLAUDE.md` is explicit ("no image files") and the constraint has been intentional from day one (deploy as one HTML file, no asset loading dance, instant load on flaky networks). Worth revisiting if the constraint is ever softened, but not part of this plan.
- **Add a build step that compiles a sprite-data DSL into JS.** A small `sprites/*.txt` directory of ASCII-art sprites + a build pre-step that converts them to JS arrays inline in `src/game.js`. **Rejected** as the first iteration because it adds complexity to `build.js` and creates a "two source-of-truth" problem (where do you edit, the .txt or the inlined output?). The `defineSprite(strings)` helper from Unit 1 keeps the same readability without any build-step change. If hand-authoring proves painful, this is the right next step.
- **Use SVG sprites embedded as strings.** SVG paths inline in JS, drawn via `Path2D`. **Rejected** because SVG is the wrong tool for a pixel-art aesthetic — it would smooth-render and lose the chunky look that defines the game.
- **Skip the rendering rewrite and just add more `fillRect` per-object code.** **Rejected** because the current approach doesn't scale past ~5 multi-frame entities and would make the file unreadable. The data-table approach is the load-bearing decision that makes everything else affordable.
- **Use the existing `Engine.particles` system for everything (ambient, weather, floaters, ripples).** **Rejected** as a forcing function but considered as a default. Each system has different lifecycle requirements (ambient survives transitions, floaters don't, weather is per-session, ripples are short-lived). One pool would couple them. Decision deferred to implementation per Unit 8.

## Success Metrics

- **Visual:** side-by-side screenshots of v5 vs. post-Phase-2 show a clear quality improvement that a non-technical person can identify in under 5 seconds.
- **Density:** every room has at least 8 distinct visual elements (tile varieties, decoration, ambient creatures) instead of the current ~5.
- **Life:** sit and watch any room with no input for 30 seconds; at least 5 ambient events happen.
- **Interaction depth:** tapping any hotspot produces a multi-stage reaction with at least 3 distinct beats (sound + animation + particle), not a single event.
- **Discoverability:** every room has at least 2 hidden surprises that aren't visible until tapped.
- **Performance:** stable 60 fps on a mid-tier tablet target (60 fps means the `?debug=fps` overlay holds at 55-60).
- **Constraint compliance:** still a single `src/game.js` file, still no image files, still no audio files, still no external libraries, still ships as one static HTML file via GitHub Pages.
- **The 3-year-old test:** the child plays for at least 5 minutes without losing interest (the current version sustains ~2-3 minutes).

## Phased Delivery

Each phase is a complete, shippable improvement. The plan is graceful — any phase boundary is a legitimate stop point.

### Phase 1 — Foundation (Units 1-4)

Lands the sprite renderer, tile map renderer, animation state machine, and lighting pass. No visible change yet for the player; the systems are in place but the existing rendering still drives the game. Ends with a clean smoke test, version bump, CHANGELOG entry, and a deployed build.

### Phase 2 — Visual upgrade (Units 5-8)

Re-authors the kitten as a multi-frame sprite, converts all four rooms to tile maps, adds ambient world life. The player sees a substantially prettier and more alive game. Ends with a clean smoke test, browser playtest, version bump, CHANGELOG entry, and a deployed build.

### Phase 3 — Interaction richness (Units 9-12)

Multi-stage hotspot reactions, discoverable secrets, environmental responses to the kitten, mouse personality system. Every interaction now feels like a vignette. Ends with a clean smoke test, browser playtest, version bump, CHANGELOG entry, and a deployed build.

### Phase 4 — Polish (Units 13-15)

Layered audio, smoother transitions, performance pass, full playtest matrix, browser regression, CHANGELOG and version finalization. The game is shippable as a v9 (or whatever the version number ends up at) release.

## Sources & References

- Tiny Kitty Garden v1 plan: `docs/plans/2026-04-11-001-feat-tiny-kitty-garden-plan.md`
- Current game source: `src/game.js`, `src/game-sounds.js`
- Template engine: `src/engine/loop.js`, `src/engine/screens.js`, `src/engine/input.js`, `src/engine/particles.js`
- Project conventions: `CLAUDE.md` (versioning, changelog, procedural graphics, single-file constraint), `CHANGELOG.md` (running log of decisions)
- Visual reference: Stardew Valley (qualitative — density, idle life, multi-stage reactions, layered tile art). No assets or code are copied from Stardew.
- Research artifact: `~/Documents/Last30Days/how-are-others-making-cozy-pixel-art-html5-canvas-games-raw-v3.md` — full `/last30days` raw data behind the External References and Audience Signal sections, including 27 Reddit threads (16,539 cumulative upvotes), 11 GitHub items, and the supplemental web search results.
