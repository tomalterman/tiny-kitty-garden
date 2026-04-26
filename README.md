# Tiny Kitty Garden

A cozy tap-to-play browser game built from the shared
[`arcade-template`](../arcade-template). It is designed for a young child: no
reading, no score pressure, no controls beyond tapping the canvas.

## Play Locally

Open `index.html` in a modern browser, or run a local static server:

```sh
npm run build
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Interaction Model

- Tap the canvas to move the kitten.
- Tap garden objects to trigger reactions.
- UI chrome, score, hearts, instructions, and high-score blocks are hidden.

## Structure

```text
tiny-kitty-garden/
  src/
    game-config.js   Game title, tap-only controls, hidden UI setting
    game-sounds.js   Web Audio sound definitions
    game.js          Tiny Kitty Garden-specific game logic
    template.html    Shared arcade shell copied from arcade-template
  build.js           Builds index.html from src/
  index.html         Built playable game
  dist/index.html    Built deployable game
  CHANGELOG.md       Version history
```

## Relationship To `arcade-template`

This repo is a downstream game. Shared engine improvements should usually start
in `../arcade-template`, then be copied forward deliberately.
