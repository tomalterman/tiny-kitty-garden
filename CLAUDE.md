# Arcade Game Template

A reusable single-file HTML template for arcade-style games.

## Structure

This is a template - the `index.html` contains a working example game ("Block Dodge") that demonstrates the template. To create a new game, copy `index.html` and replace the game-specific sections.

### Sections in index.html
1. **GAME CONFIGURATION** - Edit: game name, colors, Firebase, controls
2. **TEMPLATE ENGINE** - Don't edit: canvas, game loop, input, sound, high scores
3. **GAME SOUNDS** - Edit: sound definitions
4. **GAME LOGIC** - Replace: your game code

## Versioning

Before each push:
1. Increment `version` in the GAME config (v1 -> v2 -> v3...)
2. Start commit message with the version (e.g., `v2: Add new feature`)
3. Add a new entry to `CHANGELOG.md` (see "Changelog" below)

## Changelog

`CHANGELOG.md` is the running log of what got built and the design
decisions behind each change. Every commit that makes a meaningful
change must add an entry in the same commit as the code, so the log
stays in lockstep with the repo.

**Workflow for every commit:**

1. Make the code change.
2. Open `CHANGELOG.md` and add a new section at the top, immediately
   under the header, before the previous most-recent entry.
3. Stage `CHANGELOG.md` together with the code files.
4. Commit.

**Entry format:**

```markdown
## v<N> — <one-line summary> (`<short-sha-after-commit>`)

**What changed**

- bullet
- bullet

**Why**

Short paragraph or bullets. The "why" matters more than the "what" —
the diff already shows what changed, but the reasoning is lost
otherwise. Capture trade-offs, rejected alternatives, and bugs caught.
```

The short SHA is filled in after the commit lands (a small follow-up
edit + amend, or accept the placeholder for the initial commit and let
the next commit fix it). Trivial changes (typos, version bumps without
code change) can use a one-line entry without the **What/Why** split.

Do not skip the changelog because the change "feels small" — small
unexplained changes are exactly the ones that confuse the next reader
six months later.

## Game Contract

Games must implement:
- `gameInit()` - Setup entities, set Engine.state.health/maxHealth/score
- `gameUpdate(dt)` - Per-frame logic, update Engine.state.score/health
- `gameRender(ctx, w, h)` - Draw the game world

Optional:
- `gameTitleRender(ctx, w, h, time)` - Custom title screen art
- `gameOverRender(ctx, w, h)` - Custom game over art

## Decision Making

- Prefer action over questions
- Keep games age-appropriate and fun for a 6-year-old
- Use procedural graphics (Canvas API) - no image files
- All sounds are procedural (Web Audio API) - no audio files
