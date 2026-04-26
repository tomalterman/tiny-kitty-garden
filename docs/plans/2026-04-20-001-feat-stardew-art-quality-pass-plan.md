---
title: "feat: Full Stardew art quality pass — pixel art density, detail, and charm"
type: feat
status: active
date: 2026-04-20
origin: docs/plans/2026-04-11-002-feat-stardew-level-visual-polish-plan.md
---

# feat: Full Stardew art quality pass — pixel art density, detail, and charm

## Overview

The Phase 1-4 visual polish built the *systems* — sprite renderer, tile maps, animation state machine, reaction sequences, ambient life, lighting. The art filling those systems is still minimal: tiles are 1-4 fillRect calls, the kitten sprite is functional but simple, trees/bushes are basic circles, and rooms lack decorative density. This plan upgrades every visual element to Stardew-adjacent quality while staying within the project's constraints (single-file, no image files, all-procedural Canvas).

The goal: a non-technical person looking at a screenshot should see a polished, hand-crafted pixel world — not a programmer-art demo with good animation.

## Problem Frame

Stardew Valley's visual appeal comes from three qualities the game currently lacks:

1. **Tile density** — Every Stardew tile has 8-16 distinct pixel details (grass blades, dirt texture, wood grain). Our tiles have 1-4 fillRect calls. The eye immediately sees repetition.
2. **Sprite charm** — Stardew characters have carefully tuned proportions, shading, and personality in every pixel. Our kitten sprite is recognizable but boxy — the ASCII-art authoring produced functional shapes, not charming ones.
3. **Decorative richness** — Stardew rooms are packed with small objects (furniture, potted plants, tools, books, rugs with patterns). Our rooms have their functional elements (bed, food bowl, pond) but large empty spaces between them.

## Requirements Trace

- **R1.** Every tile draw function must use at least 6-8 distinct pixel-level details (blades, texture marks, grain lines, cracks, patterns) instead of the current 1-4 fillRect solid fills.
- **R2.** The kitten sprite must be redesigned with proper pixel-art proportions: rounder head, expressive eyes with catch-lights, visible ear tufts, body shading, and tail with curve detail. All 22 frames re-authored.
- **R3.** Trees, bushes, and the pond must be redrawn with pixel-level foliage detail, trunk texture, leaf variation, water shimmer, and lily pad detail — not smooth arcs and circles.
- **R4.** Each room must gain 4-6 additional decorative elements (small objects, furniture details, wall/floor accents) to eliminate empty spaces.
- **R5.** The color palette must expand from ~42 to ~55-65 entries with intermediate shades for smooth gradients in tiles and sprites.
- **R6.** The shelf at the top must be visually upgraded with wood grain texture and richer collectible icons.
- **R7.** All changes must maintain 55+ FPS and stay within the single-file constraint.

## Scope Boundaries

- **No new gameplay** — This is purely visual. No new hotspots, collectibles, rooms, or mechanics.
- **No new animation states** — The 22 kitten frames stay. We re-author the art within each frame, not add new frames.
- **No new tile types** — The existing ~30 tile names stay. We enrich their draw functions.
- **No canvas size change** — Still 384×216.
- **No engine changes** — `renderSprite`, `drawTileLayer`, animation system unchanged.

## Context & Research

### Current Visual Inventory

| Element | Current state | Target |
|---------|--------------|--------|
| Grass tiles (gA-gD) | 1-5 fillRect, flat green + small dot | 8-12 fillRect, varied blade heights, clover detail, dirt speck, subtle color variation |
| Stone path (stA-stB) | 2-3 fillRect, flat grey square | 6-8 fillRect, rounded cobble shape, mortar lines, moss accent |
| Water tiles (wA-wB) | 1 fillRect, flat blue | 6-8 fillRect, ripple lines, depth gradient, sparkle pixel |
| Kitchen floor (kfA-kfC) | 2-4 fillRect, grid lines | 6-8 fillRect, tile pattern with grout, subtle shine, scuff marks |
| Bedroom planks (bpA-bpC) | 2-4 fillRect, plank lines | 6-8 fillRect, wood grain detail, knot marks, nail heads |
| Sand (sA-sC) | 1-3 fillRect, flat + speckle | 5-7 fillRect, rippled texture, shell fragment, shadow variation |
| Sea (seaA-seaB) | 1 fillRect + wave line | 6-8 fillRect, foam, depth layers, sparkle |
| Flowers (flW-flY) | 4 fillRect, cross shape | 6-8 fillRect, petal shapes, stem, leaf, center detail |
| Tree foliage overlay | 4 fillRect, nested layers | 8-12 fillRect, individual leaf clusters, light/shadow areas |
| Bush | 8 shapes, circles | 10-14 shapes, irregular foliage bumps, berry clusters, shadow beneath |
| Pond | 6 shapes, ellipses | 10-14 shapes, rocky edge, water plants, multiple lily pads, depth rings |
| Kitten (22 frames) | ASCII-art authored, functional | Hand-tuned pixel art, round head, catch-light eyes, shading |
| Decorative objects | Minimal | 4-6 per room: potted plants, scattered toys, wall decorations, etc. |

### Relevant Patterns

- `src/game.js` — all tile draw functions in `TILES` registry, all creature draw functions, kitten sprite data
- `defineSprite(w, h, palette, framesAsStrings)` — ASCII art sprite authoring format
- Tile draw functions: `(ctx, x, y, seed, neighbors)` with 16×16 pixel area
- `seed % N` for deterministic per-tile variation

## Key Technical Decisions

- **Tiles stay 16×16 fillRect-based.** No arcs, circles, or paths in tile draw functions — they run 24×12 = 288 times per frame. fillRect-only keeps them fast.
- **Kitten sprite stays 24×24 ASCII-art format.** The defineSprite helper with palette indices is the authoring tool. We re-author every frame with better art, not change the format.
- **Decorative objects are new tile types or inline draw calls.** Small props (potted plants, books, toys) can be decoration-layer tiles or drawn inline in the room draw function — whichever is more reusable.
- **Palette expansion uses the existing PAL object.** New colors added alongside existing ones. No breaking changes.
- **Trees and bushes stay as inline draw functions.** They use arcs and ellipses, which is fine since there are only 3-6 per room, not 288 per frame like tiles.

## Open Questions

### Deferred to Implementation

- **Exact pixel patterns for each tile variant.** These are tuned visually in the browser.
- **Exact palette hex values for new intermediate shades.** Derived by interpolating existing PAL colors.
- **Which decorative objects go in which rooms.** General guidance in the plan, specifics decided during implementation.
- **Whether trees need the overlay system or can be single-layer.** Currently trees use overlay tiles for foliage — may stay or switch to inline drawing with z-sort.

## Implementation Units

Units are ordered by visual impact — the biggest improvements first.

### Phase A — Tiles (the biggest visual area)

- [ ] **Unit 1: Enrich grass tile draw functions**

**Goal:** Make the 4 grass variants (gA-gD) visually rich with blade-level detail, so a field of grass has visible texture variety instead of flat green.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Modify: `src/game.js` (TILES.gA through TILES.gD draw functions)

**Approach:**
- Each grass tile should use 8-12 fillRect calls drawing: 2-3 blade shapes (1px wide, 2-3px tall, varied green), 1-2 small dirt/earth dots (brownish), a tiny flower or clover for variant tiles, subtle shadow marks. Use `seed` for deterministic variety.
- gA: plain grass with blade detail. gB: grass with prominent blades. gC: grass with clover. gD: grass with tiny daisy.
- Use PAL.grass as base, PAL.grassDk for blades, new PAL.grassLt for highlights, PAL.woodDk for earth dots.

**Patterns to follow:**
- Existing tile draw function signature: `(ctx, x, y, seed, neighbors)`
- Existing `seed % N` pattern for variant selection

**Test scenarios:**
- Happy path: a garden full of grass tiles shows visible texture variety — no two adjacent tiles look identical.
- Edge case: tile rendering at edge of play area doesn't draw outside bounds.
- Integration: existing gameplay (walking, collectibles, hotspots) unaffected by tile visual changes.

**Verification:**
- Side-by-side screenshot comparison: new grass vs old grass shows immediately visible improvement in density and charm.

---

- [ ] **Unit 2: Enrich all other surface tiles**

**Goal:** Apply the same density treatment to stone, water, kitchen floor, bedroom planks, carpet, rug, sand, sea, wet sand, and rock tiles.

**Requirements:** R1

**Dependencies:** Unit 1 (to establish the pattern)

**Files:**
- Modify: `src/game.js` (all remaining TILES draw functions)

**Approach:**
- Stone (stA-stB): rounded cobble edges, mortar lines between stones, moss accent pixel
- Water (wA-wB): ripple lines, depth shading (darker at edges), occasional sparkle pixel
- Kitchen floor (kfA-kfC): tile grout detail, subtle shine spot, occasional scuff mark
- Bedroom planks (bpA-bpC): wood grain lines (horizontal streaks), knot circles, nail head dots
- Carpet/rug: pattern detail — crosshatch or diamond motifs inside the tile
- Sand (sA-sC): rippled texture lines, tiny shell fragments, shadow granules
- Sea (seaA-seaB): foam lines, depth gradient with multiple blue shades, animated sparkle
- Rock (rkA): cracks, lichen spots, rounded shadow edges

**Verification:**
- Every room's background reads as textured and detailed, not flat-colored.

---

- [ ] **Unit 3: Enrich decoration tiles (flowers, bush, mouse hole, tree foliage)**

**Goal:** Make decoration tiles visually charming — flowers with petals and stems, bushes with leaf clusters, tree foliage with individual leaf shapes.

**Requirements:** R1, R3

**Dependencies:** Unit 1

**Files:**
- Modify: `src/game.js` (TILES.flW, flP, flY, bushS, mholeA, treeFoliage draw functions)

**Approach:**
- Flowers: 5-petal shape with center dot, thin stem with leaf. Each color variant has a distinct petal shape.
- Bush: irregular outline with 3-4 leaf cluster bumps, berry dots, shadow underneath
- Mouse hole: rounded arch shape with shadow depth, small wood grain around edges
- Tree foliage: multiple leaf cluster shapes with light/dark variation, not just nested rectangles. Individual leaf silhouettes at edges.

**Verification:**
- Flowers are recognizably flower-shaped, not cross-shaped. Bushes look organic. Tree foliage has visible leaf structure.

---

### Phase B — Characters and creatures

- [ ] **Unit 4: Redesign kitten sprite art**

**Goal:** Re-author all 22 kitten sprite frames with proper pixel-art quality: rounder head, expressive eyes with catch-light, ear tufts, body shading (directional light), curved tail, and personality in every pose.

**Requirements:** R2

**Dependencies:** None (can run parallel to Phase A)

**Files:**
- Modify: `src/game.js` (SPRITES.kitten defineSprite call — the frame string data)
- Modify: `src/game.js` (KITTEN_PAL — may add 2-3 intermediate shades)

**Approach:**
- Keep the 24×24 frame size and the defineSprite ASCII-art format
- Add 2-3 palette entries: a mid-cream body shade, a warm highlight for catch-lights, a blush pink
- Re-author each frame focusing on:
  - **Head**: rounder silhouette (use outline pixels to create curve), two 2×2 eyes with 1px catch-light in upper-left, triangular ears with pink inner and tiny tuft
  - **Body**: directional shading — lighter pixels on top-left, darker on bottom-right. Body slightly narrower than head for kawaii proportions
  - **Tail**: curved shape using diagonal pixel placement, not straight rectangles
  - **Legs**: tiny paw dots visible, leg positions clearly different between walk frames
  - **Face**: nose is a tiny inverted triangle, mouth is a "w" shape, cheek blush dots
- Walk frames should have clear weight-shift: the body tilts 1px toward the stepping foot
- Idle breathe should have visible chest expansion (1px body height difference)
- Sleep curl should be clearly curled with tail wrapped around

**Patterns to follow:**
- Existing defineSprite format with palette indices
- Existing KITTEN_PAL structure

**Test scenarios:**
- Happy path: the kitten is immediately recognizable as cuter and more detailed than before
- Happy path: walk animation in all 4 directions shows smooth, charming movement
- Edge case: accessories (umbrella, winter hat) still composite correctly over the new sprite
- Integration: all animation states (eat, sleep, purr, dance) work with the new frames

**Verification:**
- A non-technical person shown the new kitten says "cute" unprompted.

---

- [ ] **Unit 5: Upgrade creature and prop drawing**

**Goal:** Redraw trees, bushes, pond, frog, mouse, crab, bed, toy box, and food/milk bowls with Stardew-level detail.

**Requirements:** R3

**Dependencies:** Unit 3 (enriched decoration tiles inform the visual language)

**Files:**
- Modify: `src/game.js` (drawTree, drawBush, drawPond, drawFrog, drawMouse, drawCrab, drawBed, drawToyBox, drawHotspots for food/milk bowls)

**Approach:**
- **Trees**: Replace smooth arc canopy with pixel-cluster foliage. Multiple shades of green in irregular blobs. Visible trunk with bark texture. Small shadow with leaf-edge detail.
- **Bushes**: Irregular organic shape with multiple leaf-bump lobes. Berry highlights. Shadow that follows the bush shape. Tiny flowers on some bushes.
- **Pond**: Rocky/grassy edge (not smooth ellipse). Multiple lily pads. Water plants. Depth rings. Reflected sky color at center, darker at edges.
- **Frog**: Larger (current is very small). Webbed feet detail. Belly lighter shade. Visible smile. Eye shine dots.
- **Mouse**: Rounder body, visible whiskers (multiple lines), furry texture, tail curl, tiny pink feet.
- **Crab**: Shell texture (hex pattern or ridges), eye stalks, claw detail with pincers.
- **Bed**: Quilted blanket pattern, headboard with carved detail, fluffy pillow shape, bed frame wood grain.
- **Toy box**: Wood plank texture, metal hinges, toys peeking out (ball, block shapes).
- **Food/milk bowls**: Ceramic shine highlight, kibble pieces with individual shapes, milk surface reflection.

**Verification:**
- Each creature and prop reads as hand-crafted pixel art, not geometric primitives.

---

### Phase C — Room density and palette

- [ ] **Unit 6: Add decorative objects to each room**

**Goal:** Fill empty spaces in each room with 4-6 small decorative objects so the world feels dense and lived-in.

**Requirements:** R4

**Dependencies:** Units 1-3 (tiles provide the visual language for decorations)

**Files:**
- Modify: `src/game.js` (room draw functions: drawGarden, drawKitchen, drawBedroom, drawBeach)
- Modify: `src/game.js` (buildRooms — may add decoration-layer tile entries)

**Approach:**
- **Garden**: stepping stones in a path, a small bird bath (stone pedestal + water bowl), a garden fence section, scattered fallen leaves, a watering can
- **Kitchen**: a small table with a teacup, a potted plant on the counter, a clock on the wall (decorative), scattered crumbs near food, a small mat at the door
- **Bedroom**: a nightstand with a lamp, scattered toy blocks, a small bookshelf, a window with curtains, a mobile hanging above the bed
- **Beach**: driftwood, a sandcastle, seaweed clumps, a small tidal pool, a beach umbrella
- Each decoration is 8-20 fillRect calls drawing recognizable objects. They're purely visual — no hotspot interaction.

**Verification:**
- No room has a visible "empty zone" larger than ~40×40 pixels. The world feels packed with cozy detail.

---

- [ ] **Unit 7: Expand palette and upgrade shelf**

**Goal:** Add intermediate shades to PAL for smoother gradients in tiles and sprites. Upgrade the shelf visual with wood grain and richer collectible icons.

**Requirements:** R5, R6

**Dependencies:** Units 1-5 (palette expansion informed by what shades the enriched art needs)

**Files:**
- Modify: `src/game.js` (PAL object — add new color entries)
- Modify: `src/game.js` (drawShelf — add wood grain texture, richer bin styling)

**Approach:**
- Add ~15-20 new PAL entries: grassLt, grassMd, sandLt, seaLt, seaMd, woodLt, creamDk, creamMd, lavLt, pinkLt, skyLt, stoneLt, stoneDk, etc.
- Shelf upgrade: wood grain lines across the plank, richer gradient, bin borders with shadow, collectible icons with more detail (flowers have petals, shells have spiral, etc.)

**Verification:**
- The palette supports smooth 3-shade gradients for all major surface types. The shelf looks like a polished game UI, not a debug overlay.

---

### Phase D — Verification

- [ ] **Unit 8: Browser playtest + performance verification**

**Goal:** Full playtest of all 4 rooms in the browser. Verify FPS holds at 55+. Screenshot comparison showing clear visual improvement.

**Requirements:** R7

**Dependencies:** Units 1-7

**Files:**
- Modify: `src/game-config.js` (version bump)
- Modify: `CHANGELOG.md`

**Approach:**
- Open `dist/index.html?debug=fps` via agent-browser
- Visit all 4 rooms, verify FPS ≥ 55 in each
- Compare screenshots with v10 baseline
- Verify all gameplay still works: hotspots, collectibles, transitions, night mode, weather, celebration
- If FPS drops below 55: reduce fillRect count in the most expensive tiles, batch by color

**Verification:**
- FPS ≥ 55 in all rooms. Side-by-side screenshots show dramatic visual improvement. Zero console errors.

## System-Wide Impact

- **Performance:** The main risk. Enriched tiles add ~4-8 more fillRect calls per tile × 288 tiles = ~1,000-2,300 more draw calls per frame. On a 384×216 canvas this should be fine — the bottleneck is overdraw area, not call count, and each call is a tiny 1-2px rect.
- **File size:** Richer tile functions and kitten sprite data will add ~200-400 lines. File should stay under 200 KB.
- **Unchanged:** Animation system, reaction system, secrets, ambient life, transitions, audio, hotspot logic — all untouched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Enriched tiles drop FPS below 55 | Measure after Unit 2. If tiles are too expensive, cache tile renders to offscreen canvas (draw each tile once, blit the cached version). |
| Kitten redesign doesn't look better | Author 2-3 test frames first, verify in browser before re-authoring all 22. |
| Room decorations clutter the play area | Decorations are visual-only (no collision, no hit-box). Place them in corners and edges, not in walk paths. |
| New palette colors clash with existing art | Derive new shades by interpolating between existing PAL pairs (e.g., grassLt = midpoint of grass and mint). |

## Success Metrics

- **The 5-second test:** A non-technical person looking at a v10 screenshot next to a post-pass screenshot identifies the improvement in under 5 seconds.
- **Density:** Every room has at least 12 distinct visual elements visible (tile varieties + decorations + creatures + props).
- **Charm:** The kitten reads as "cute pixel art" not "data-driven ASCII art."
- **Performance:** 55+ FPS maintained across all rooms with weather + night + ambient effects active.

## Sources & References

- Origin plan: `docs/plans/2026-04-11-002-feat-stardew-level-visual-polish-plan.md`
- Current game source: `src/game.js`, `src/game-sounds.js`
- Visual reference: Stardew Valley tile art (qualitative — density, texture, charm per tile)
- Prior art palette: ENDESGA-32 (referenced in origin plan for cozy pixel-art color proportions)
