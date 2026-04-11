# Changelog

A running log of what was built and the design decisions behind each change.
Each entry is added in the same commit as the code change. Most recent entries
are at the top.

The convention and update workflow are documented in `CLAUDE.md` under
"Changelog".

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
