// ==================== GAME LOGIC: TINY KITTY GARDEN ====================
// A cozy tap-to-play game for a 3 year old. No score, no timer, no text,
// no way to lose. Tap anywhere, kitten walks there. Tap things to make
// cute events happen. Fill the shelf, watch a celebration, do it again.

// ---------- Soft Game Boy Color palette ----------
const PAL = {
    skyDay:   '#fff4c9',
    skyDusk:  '#f9c7d1',
    mint:     '#b8e8c6',
    mintDk:   '#8ec9a0',
    mintDp:   '#6ba686',
    grass:    '#a8dfa0',
    grassLt:  '#c4ebb8',
    grassMd:  '#90cc88',
    grassDk:  '#78b472',
    earth:    '#a8825a',
    peach:    '#ffcdb2',
    peachDk:  '#e9a890',
    lav:      '#e6d4ee',
    lavLt:    '#f2e5f6',
    lavDk:    '#b098c0',
    sky:      '#a6d8ff',
    skyLt:    '#cfe8ff',
    skyDk:    '#7bb9ec',
    sea:      '#9dd4f3',
    seaLt:    '#c4e6f9',
    seaMd:    '#88c5e8',
    seaDk:    '#6fb5dc',
    seaDp:    '#4a91bc',
    sand:     '#fde7a6',
    sandLt:   '#fff3c6',
    sandDk:   '#e9c875',
    sandDp:   '#c9a55a',
    pink:     '#ffb6c1',
    pinkLt:   '#ffd5dc',
    pinkDk:   '#e08899',
    cream:    '#fff9f0',
    creamDk:  '#ede0d0',
    white:    '#ffffff',
    wood:     '#d4a878',
    woodLt:   '#e8c79a',
    woodDk:   '#8b6a48',
    woodDp:   '#5a4028',
    stone:    '#c0b8aa',
    stoneLt:  '#d8d0c2',
    stoneDk:  '#8e8678',
    moss:     '#8bb878',
    outline:  '#5a4033',
    shadow:   'rgba(0,0,0,0.15)',
    shadowDk: 'rgba(0,0,0,0.22)',
    eye:      '#2a1f26',
    red:      '#ff6b8a',
    redDk:    '#c04868',
    orange:   '#ffb16b',
    yellow:   '#ffe07a',
    yellowLt: '#fff0a8',
    green:    '#9cdd7a',
    blue:     '#8ec5ff',
    purple:   '#c9a2ff',
    star:     '#fff3a3',
    frogG:    '#8ccc66',
    frogGD:   '#5c9c46',
    frogGL:   '#b8e08a',
    crab:     '#ff8a70',
    crabDk:   '#c0553a',
    crabLt:   '#ffb098',
    mouse:    '#cdb7a3',
    mouseLt:  '#e0ceb8',
    mouseDk:  '#8e7a66',
    butterY:  '#ffe85a',
    berry:    '#d04868'
};

const SHELF_H = 28;
const PLAY_TOP = SHELF_H;

// ==================== PHASE 1 FOUNDATION ====================

// ---------- Shared math helpers ----------
const TAU = Math.PI * 2;
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
function randi(lo, hi) { return Math.floor(rand(lo, hi + 1)); }

// ---------- Sprite renderer (Unit 1) ----------

function defineSprite(w, h, palette, framesAsStrings) {
    const frames = framesAsStrings.map(str => {
        const rows = str.split('\n').filter(r => r.length > 0);
        return rows.map(row => {
            const cells = [];
            for (let i = 0; i < w; i++) {
                const ch = i < row.length ? row[i] : '.';
                cells.push(ch === '.' ? 0 : parseInt(ch, 36));
            }
            return cells;
        });
    });
    return { w, h, palette, frames };
}

const SPRITES = {};

function getSprite(name) {
    if (SPRITES[name]) return SPRITES[name];
    if (!getSprite._placeholders) getSprite._placeholders = {};
    if (!getSprite._placeholders[name]) {
        getSprite._placeholders[name] = generatePlaceholderSprite(name);
    }
    return getSprite._placeholders[name];
}

function generatePlaceholderSprite(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    const hue = ((hash & 0xFFFF) % 360);
    const body = `hsl(${hue},60%,70%)`;
    const dark = `hsl(${hue},50%,50%)`;
    const pal = [null, body, dark];
    const grid = [];
    for (let r = 0; r < 8; r++) {
        const row = [];
        for (let c = 0; c < 8; c++) {
            if (r === 0 || r === 7 || c === 0 || c === 7) row.push(2);
            else row.push(1);
        }
        grid.push(row);
    }
    return { w: 8, h: 8, palette: pal, frames: [grid] };
}

function renderSprite(ctx, sprite, frameIdx, x, y, opts) {
    const frame = sprite.frames[clamp(frameIdx, 0, sprite.frames.length - 1)];
    const px = Math.round(x);
    const py = Math.round(y);
    const pal = sprite.palette;
    const shadow = opts && opts.shadow;
    const outline = opts && opts.outline;
    const flashColor = opts && opts.flash;
    const flipX = opts && opts.flipX;
    const w = sprite.w;

    function col(c) { return flipX ? w - 1 - c : c; }

    if (shadow) {
        const sx = px + (shadow.dx || 1);
        const sy = py + (shadow.dy || 1);
        ctx.fillStyle = shadow.color || PAL.shadow;
        for (let r = 0; r < frame.length; r++) {
            const row = frame[r];
            for (let c = 0; c < row.length; c++) {
                if (row[c] !== 0) ctx.fillRect(sx + col(c), sy + r, 1, 1);
            }
        }
    }

    if (outline) {
        ctx.fillStyle = outline;
        for (let r = 0; r < frame.length; r++) {
            const row = frame[r];
            for (let c = 0; c < row.length; c++) {
                if (row[c] === 0) continue;
                const hasEmpty = (r > 0 && frame[r - 1][c] === 0) ||
                    (r < frame.length - 1 && frame[r + 1][c] === 0) ||
                    (c > 0 && row[c - 1] === 0) ||
                    (c < row.length - 1 && row[c + 1] === 0) ||
                    r === 0 || r === frame.length - 1 || c === 0 || c === row.length - 1;
                if (hasEmpty) {
                    if (r > 0 && frame[r - 1][c] === 0) ctx.fillRect(px + col(c), py + r - 1, 1, 1);
                    if (r < frame.length - 1 && frame[r + 1][c] === 0) ctx.fillRect(px + col(c), py + r + 1, 1, 1);
                    if (c > 0 && row[c - 1] === 0) ctx.fillRect(px + col(c) + (flipX ? 1 : -1), py + r, 1, 1);
                    if (c < row.length - 1 && row[c + 1] === 0) ctx.fillRect(px + col(c) + (flipX ? -1 : 1), py + r, 1, 1);
                }
            }
        }
    }

    for (let r = 0; r < frame.length; r++) {
        const row = frame[r];
        for (let c = 0; c < row.length; c++) {
            const idx = row[c];
            if (idx === 0) continue;
            ctx.fillStyle = flashColor || pal[idx] || '#ff00ff';
            ctx.fillRect(px + col(c), py + r, 1, 1);
        }
    }
}

// ---------- Animation state machine (Unit 2) ----------

function playAnim(entity, name) {
    const registry = entity._animRegistry;
    if (!registry || !registry[name]) {
        if (registry && registry['idle']) name = 'idle';
        else return;
    }
    if (entity.animState === name) return;
    entity.animState = name;
    entity.animFrame = 0;
    entity.animTimer = registry[name].frameMs;
    entity._animPingDir = 1;
}

function updateAnim(entity, dt) {
    if (!entity.animState || !entity._animRegistry) return;
    const anim = entity._animRegistry[entity.animState];
    if (!anim || anim.frames.length <= 1) return;

    // dt is in frame-units (1.0 = 16.67ms at 60fps)
    entity.animTimer -= dt * 16.67;
    if (entity.animTimer > 0) return;

    entity.animTimer += anim.frameMs;

    if (anim.pingPong) {
        entity.animFrame += (entity._animPingDir || 1);
        if (entity.animFrame >= anim.frames.length - 1) {
            entity.animFrame = anim.frames.length - 1;
            entity._animPingDir = -1;
        } else if (entity.animFrame <= 0) {
            entity.animFrame = 0;
            entity._animPingDir = 1;
        }
    } else {
        entity.animFrame++;
        if (entity.animFrame >= anim.frames.length) {
            if (anim.loop) {
                entity.animFrame = 0;
            } else {
                entity.animFrame = anim.frames.length - 1;
                if (anim.next) {
                    playAnim(entity, anim.next);
                }
            }
        }
    }
}

function getAnimSpriteFrame(entity) {
    if (!entity.animState || !entity._animRegistry) return 0;
    const anim = entity._animRegistry[entity.animState];
    if (!anim) return 0;
    return anim.frames[clamp(entity.animFrame, 0, anim.frames.length - 1)];
}

// ---------- Tile map renderer (Unit 3) ----------

const TILE_SIZE = 16;
const MAP_COLS = 24;
const MAP_ROWS = Math.ceil((216 - SHELF_H) / TILE_SIZE);

const TILES = {};

// ---------- Garden tiles ----------
// Grass tiles use 8-12 fillRect calls each: base fill, highlight patches,
// dark blade verticals, and variant accents (earth speck / clover / daisy).
// All offsets are driven by `seed` so adjacent tiles vary.
TILES.gA = { surface: 'grass', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x, y, 16, 16);
    // Subtle light patches
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x + (seed % 6) + 1, y + ((seed >> 3) % 6) + 2, 2, 1);
    ctx.fillRect(x + ((seed >> 4) % 8) + 6, y + ((seed >> 2) % 5) + 9, 1, 1);
    // Dark blade verticals (2-3 px tall)
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + ((seed >> 1) % 12) + 2, y + ((seed >> 5) % 8) + 4, 1, 2);
    ctx.fillRect(x + ((seed >> 2) % 10) + 4, y + ((seed >> 6) % 6) + 10, 1, 2);
    ctx.fillRect(x + ((seed >> 3) % 9) + 7, y + ((seed >> 1) % 7) + 3, 1, 3);
    // Mid-tone filler between blades
    ctx.fillStyle = PAL.grassMd;
    ctx.fillRect(x + ((seed >> 5) % 13) + 1, y + ((seed >> 4) % 12) + 2, 1, 1);
    ctx.fillRect(x + ((seed >> 7) % 14) + 1, y + ((seed >> 2) % 13) + 1, 1, 1);
    // Tiny earth speck
    ctx.fillStyle = PAL.earth;
    ctx.fillRect(x + ((seed >> 6) % 12) + 2, y + ((seed >> 3) % 10) + 5, 1, 1);
}};
TILES.gB = { surface: 'grass', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x, y, 16, 16);
    // Prominent blade cluster
    ctx.fillStyle = PAL.grassDk;
    const bx = x + (seed % 9) + 3;
    const by = y + ((seed >> 2) % 6) + 7;
    ctx.fillRect(bx, by, 1, 4);
    ctx.fillRect(bx + 1, by + 1, 1, 3);
    ctx.fillRect(bx + 2, by, 1, 4);
    ctx.fillRect(bx + 3, by + 1, 1, 3);
    // Secondary blades
    ctx.fillRect(x + ((seed >> 4) % 13) + 1, y + ((seed >> 5) % 8) + 3, 1, 2);
    ctx.fillRect(x + ((seed >> 6) % 12) + 2, y + ((seed >> 7) % 10) + 2, 1, 2);
    // Light tips on some blades
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(bx + 2, by - 1, 1, 1);
    ctx.fillRect(x + ((seed >> 3) % 13) + 1, y + ((seed >> 4) % 12) + 1, 1, 1);
    // Mid filler
    ctx.fillStyle = PAL.grassMd;
    ctx.fillRect(x + ((seed >> 8) % 14) + 1, y + ((seed >> 6) % 13) + 1, 1, 1);
}};
TILES.gC = { surface: 'grass', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x, y, 16, 16);
    // Faint blades
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + ((seed >> 1) % 12) + 1, y + ((seed >> 5) % 10) + 2, 1, 2);
    ctx.fillRect(x + ((seed >> 3) % 10) + 4, y + ((seed >> 4) % 8) + 10, 1, 2);
    // Clover: 3 small leaves around a tiny center
    const cx = x + (seed % 10) + 3;
    const cy = y + ((seed >> 2) % 9) + 5;
    ctx.fillStyle = PAL.mintDk;
    ctx.fillRect(cx, cy, 2, 2);
    ctx.fillRect(cx + 2, cy - 1, 2, 2);
    ctx.fillRect(cx - 1, cy + 1, 2, 2);
    ctx.fillStyle = PAL.moss;
    ctx.fillRect(cx + 1, cy, 1, 1);
    ctx.fillRect(cx + 2, cy, 1, 1);
    // Highlight
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x + ((seed >> 7) % 14) + 1, y + ((seed >> 6) % 13) + 1, 1, 1);
}};
TILES.gD = { surface: 'grass', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x, y, 16, 16);
    // Blade base
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + ((seed >> 2) % 11) + 2, y + ((seed >> 5) % 7) + 9, 1, 3);
    // Daisy stem
    ctx.fillStyle = PAL.grassDk;
    const dx = x + (seed % 9) + 4, dy = y + ((seed >> 3) % 7) + 5;
    ctx.fillRect(dx, dy + 1, 1, 3);
    // Daisy petals (5 pixels around center)
    ctx.fillStyle = PAL.white;
    ctx.fillRect(dx, dy - 1, 1, 1);
    ctx.fillRect(dx - 1, dy, 1, 1);
    ctx.fillRect(dx + 1, dy, 1, 1);
    ctx.fillRect(dx, dy + 1, 1, 1);
    ctx.fillRect(dx - 1, dy - 1, 1, 1);
    // Daisy center
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(dx, dy, 1, 1);
    // Leaf on stem
    ctx.fillStyle = PAL.mintDk;
    ctx.fillRect(dx - 1, dy + 2, 1, 1);
    // Light patch
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x + ((seed >> 6) % 13) + 1, y + ((seed >> 7) % 12) + 1, 1, 1);
}};
TILES.stA = { surface: 'stone', draw(ctx, x, y, seed) {
    // Grass backdrop with a hint of blade
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + 1, y + 2, 1, 1);
    ctx.fillRect(x + 14, y + 14, 1, 1);
    // Rounded cobble body
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(x + 3, y + 4, 10, 8);
    ctx.fillRect(x + 2, y + 5, 12, 6);
    ctx.fillRect(x + 4, y + 3, 8, 10);
    // Top highlight
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(x + 4, y + 4, 6, 1);
    ctx.fillRect(x + 3, y + 5, 1, 2);
    // Bottom shadow (mortar line)
    ctx.fillStyle = PAL.stoneDk;
    ctx.fillRect(x + 3, y + 11, 10, 1);
    ctx.fillRect(x + 12, y + 5, 1, 6);
    // Moss / crack accent
    ctx.fillStyle = PAL.moss;
    ctx.fillRect(x + 5 + (seed % 4), y + 10, 1, 1);
}};
TILES.stB = { surface: 'stone', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + 15, y + 1, 1, 1);
    // Wider cobble
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(x + 2, y + 5, 12, 7);
    ctx.fillRect(x + 1, y + 6, 14, 5);
    // Highlight band
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(x + 2, y + 5, 8, 1);
    ctx.fillRect(x + 2, y + 6, 1, 2);
    // Shadow + mortar
    ctx.fillStyle = PAL.stoneDk;
    ctx.fillRect(x + 2, y + 11, 12, 1);
    ctx.fillRect(x + 13, y + 6, 1, 5);
    // Crack line
    ctx.fillStyle = PAL.stoneDk;
    ctx.fillRect(x + 7, y + 7, 1, 2);
    // Tiny moss speck
    ctx.fillStyle = PAL.moss;
    ctx.fillRect(x + 4 + (seed % 6), y + 10, 1, 1);
}};
TILES.wA = { surface: 'water', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(x, y, 16, 16);
    // Depth gradient — darker band across middle
    ctx.fillStyle = PAL.seaMd;
    ctx.fillRect(x, y + 6, 16, 3);
    // Ripple lines
    ctx.fillStyle = PAL.seaLt;
    ctx.fillRect(x + 2, y + 3, 4, 1);
    ctx.fillRect(x + 9, y + 11, 5, 1);
    // Sparkle pixel
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + (seed % 12) + 2, y + ((seed >> 3) % 12) + 2, 1, 1);
    // Dark wavelet
    ctx.fillStyle = PAL.seaDk;
    ctx.fillRect(x + 3, y + 12, 3, 1);
}};
TILES.wB = { surface: 'water', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(x, y, 16, 16);
    // Deep middle
    ctx.fillStyle = PAL.seaMd;
    ctx.fillRect(x, y + 5, 16, 4);
    // Ripple lines
    ctx.fillStyle = PAL.seaDk;
    ctx.fillRect(x + 3, y + 8, 10, 1);
    ctx.fillRect(x + 2, y + 13, 5, 1);
    // Light ripples
    ctx.fillStyle = PAL.seaLt;
    ctx.fillRect(x + 6, y + 2, 6, 1);
    ctx.fillRect(x + 1, y + 11, 3, 1);
    // Sparkle
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + ((seed >> 2) % 12) + 2, y + ((seed >> 5) % 10) + 3, 1, 1);
}};
TILES.dA = { surface: 'dirt', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.earth;
    ctx.fillRect(x + ((seed >> 1) % 13) + 1, y + ((seed >> 4) % 12) + 2, 2, 1);
    ctx.fillRect(x + ((seed >> 3) % 12) + 2, y + ((seed >> 6) % 13) + 1, 1, 2);
    ctx.fillStyle = PAL.sandLt;
    ctx.fillRect(x + ((seed >> 5) % 14) + 1, y + ((seed >> 2) % 13) + 1, 1, 1);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + ((seed >> 7) % 11) + 3, y + ((seed >> 4) % 10) + 3, 1, 1);
}};

// ---------- Kitchen tiles ----------
// Kitchen tiles show as square ceramic tiles with grout lines, a top shine,
// and occasional scuff / crumb marks.
TILES.kfA = { surface: 'tile', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x, y, 16, 16);
    // Subtle top-left shine
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + 1, y + 1, 3, 1);
    ctx.fillRect(x + 1, y + 2, 1, 2);
    // Grout lines (right + bottom)
    ctx.fillStyle = PAL.peach;
    ctx.fillRect(x + 15, y, 1, 16);
    ctx.fillRect(x, y + 15, 16, 1);
    // Grout shadow (darker inner edge)
    ctx.fillStyle = PAL.peachDk;
    ctx.fillRect(x + 14, y + 15, 2, 1);
    ctx.fillRect(x + 15, y + 14, 1, 2);
    // Mid-tone soft fill to soften uniformity
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(x + ((seed >> 4) % 11) + 3, y + ((seed >> 2) % 10) + 4, 1, 1);
}};
TILES.kfB = { surface: 'tile', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + 1, y + 1, 3, 1);
    ctx.fillRect(x + 1, y + 2, 1, 2);
    // Grout
    ctx.fillStyle = PAL.peach;
    ctx.fillRect(x + 15, y, 1, 16);
    ctx.fillRect(x, y + 15, 16, 1);
    ctx.fillStyle = PAL.peachDk;
    ctx.fillRect(x + 14, y + 15, 2, 1);
    // Decorative diamond motif
    ctx.fillStyle = PAL.peach;
    ctx.fillRect(x + 7, y + 6, 2, 1);
    ctx.fillRect(x + 6, y + 7, 4, 2);
    ctx.fillRect(x + 7, y + 9, 2, 1);
    ctx.fillStyle = PAL.peachDk;
    ctx.fillRect(x + 7, y + 7, 2, 1);
    // Scuff dot
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(x + ((seed >> 3) % 12) + 2, y + ((seed >> 5) % 11) + 3, 1, 1);
}};
TILES.kfC = { surface: 'tile', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + 1, y + 1, 3, 1);
    // Grout
    ctx.fillStyle = PAL.peach;
    ctx.fillRect(x + 15, y, 1, 16);
    ctx.fillRect(x, y + 15, 16, 1);
    ctx.fillStyle = PAL.peachDk;
    ctx.fillRect(x + 15, y + 14, 1, 2);
    // Tiny crumb / fleck
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + ((seed >> 1) % 12) + 2, y + ((seed >> 4) % 11) + 3, 1, 1);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + ((seed >> 2) % 13) + 1, y + ((seed >> 6) % 12) + 2, 1, 1);
    // Scuff
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(x + ((seed >> 5) % 11) + 3, y + ((seed >> 3) % 10) + 4, 2, 1);
}};
TILES.rugA = { surface: 'rug', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x, y, 16, 16);
    // Weave texture (crosshatch)
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(x + 1, y + 3, 14, 1);
    ctx.fillRect(x + 1, y + 11, 14, 1);
    ctx.fillRect(x + 3, y + 1, 1, 14);
    ctx.fillRect(x + 12, y + 1, 1, 14);
    // Light weave highlights
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(x + 6, y + 6, 1, 1);
    ctx.fillRect(x + 9, y + 9, 1, 1);
    ctx.fillRect(x + 8, y + 3, 1, 1);
    // Subtle seed-dot pattern
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x + ((seed >> 4) % 10) + 3, y + ((seed >> 2) % 10) + 3, 1, 1);
}};
TILES.rugB = { surface: 'rug', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x, y, 16, 16);
    // Fringed top/bottom border with tassle ticks
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(x, y, 16, 2);
    ctx.fillRect(x, y + 14, 16, 2);
    ctx.fillStyle = PAL.yellowLt;
    ctx.fillRect(x, y, 16, 1);
    ctx.fillRect(x, y + 14, 16, 1);
    // Dark border stripe
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(x, y + 2, 16, 1);
    ctx.fillRect(x, y + 13, 16, 1);
    // Inner diamond motif
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x + 7, y + 6, 2, 1);
    ctx.fillRect(x + 6, y + 7, 4, 2);
    ctx.fillRect(x + 7, y + 9, 2, 1);
    // Subtle weave dot (seeded)
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(x + ((seed >> 3) % 12) + 2, y + 6 + ((seed >> 5) % 4), 1, 1);
}};

// ---------- Bedroom tiles ----------
// Plank tiles show lavender-tinted wood with grain streaks, knots, and
// nail-head dots between boards.
TILES.bpA = { surface: 'wood', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.lav;
    ctx.fillRect(x, y, 16, 16);
    // Top highlight streak
    ctx.fillStyle = PAL.lavLt;
    ctx.fillRect(x + 1, y + 1, 14, 1);
    // Plank seam
    ctx.fillStyle = PAL.lavDk;
    ctx.fillRect(x, y + 15, 16, 1);
    // Grain streaks (long horizontals)
    ctx.fillStyle = PAL.lavDk;
    ctx.fillRect(x + 2, y + 5, 12, 1);
    ctx.fillRect(x + 4, y + 10, 10, 1);
    // Light grain between
    ctx.fillStyle = PAL.lavLt;
    ctx.fillRect(x + 3, y + 8, 9, 1);
    // Nail head
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 1 + ((seed >> 3) % 13), y + 15, 1, 1);
}};
TILES.bpB = { surface: 'wood', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.lav;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.lavLt;
    ctx.fillRect(x + 1, y + 1, 14, 1);
    ctx.fillStyle = PAL.lavDk;
    ctx.fillRect(x, y + 15, 16, 1);
    // Vertical plank seam
    ctx.fillRect(x + (seed % 12) + 2, y, 1, 16);
    // Grain streaks
    ctx.fillRect(x + 2, y + 6, 5, 1);
    ctx.fillRect(x + 8, y + 9, 7, 1);
    ctx.fillStyle = PAL.lavLt;
    ctx.fillRect(x + 3, y + 3, 4, 1);
    // Nail heads either side of seam
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + (seed % 12) + 1, y + 2, 1, 1);
    ctx.fillRect(x + (seed % 12) + 3, y + 13, 1, 1);
}};
TILES.bpC = { surface: 'wood', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.lav;
    ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = PAL.lavLt;
    ctx.fillRect(x + 1, y + 1, 14, 1);
    ctx.fillStyle = PAL.lavDk;
    ctx.fillRect(x, y + 15, 16, 1);
    // Grain streak (long)
    ctx.fillRect(x + (seed % 8) + 4, y + 3, 1, 10);
    // Knot circle
    const kx = x + ((seed >> 4) % 10) + 3;
    const ky = y + ((seed >> 6) % 8) + 5;
    ctx.fillStyle = PAL.lavDk;
    ctx.fillRect(kx, ky, 3, 2);
    ctx.fillRect(kx + 1, ky - 1, 1, 1);
    ctx.fillRect(kx + 1, ky + 2, 1, 1);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(kx + 1, ky, 1, 2);
    // Light edge highlight on knot
    ctx.fillStyle = PAL.lavLt;
    ctx.fillRect(kx + 3, ky, 1, 1);
}};
TILES.carpA = { surface: 'rug', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x, y, 16, 16);
    // Woven texture
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(x + 2, y + 4, 12, 1);
    ctx.fillRect(x + 2, y + 11, 12, 1);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(x + 2, y + 3, 12, 1);
    ctx.fillRect(x + 2, y + 12, 12, 1);
    // Subtle seed speck
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x + ((seed >> 2) % 12) + 2, y + 7 + ((seed >> 5) % 3), 1, 1);
}};
TILES.carpB = { surface: 'rug', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x, y, 16, 16);
    // Red inner block
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x + 2, y + 2, 12, 12);
    // Inner pink square
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x + 4, y + 4, 8, 8);
    // Center diamond
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x + 7, y + 6, 2, 1);
    ctx.fillRect(x + 6, y + 7, 4, 2);
    ctx.fillRect(x + 7, y + 9, 2, 1);
    // Center highlight
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(x + 7, y + 7, 1, 1);
    // Corner accents
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(x + 2, y + 2, 1, 1);
    ctx.fillRect(x + 13, y + 2, 1, 1);
    ctx.fillRect(x + 2, y + 13, 1, 1);
    ctx.fillRect(x + 13, y + 13, 1, 1);
    // Variant dot (seeded)
    ctx.fillStyle = PAL.yellowLt;
    ctx.fillRect(x + 4 + ((seed >> 3) % 7), y + 4 + ((seed >> 5) % 7), 1, 1);
}};

// ---------- Beach tiles ----------
TILES.seaA = { surface: 'water', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(x, y, 16, 16);
    // Depth band
    ctx.fillStyle = PAL.seaMd;
    ctx.fillRect(x, y + 6, 16, 3);
    // Subtle foam/light ripple
    ctx.fillStyle = PAL.seaLt;
    ctx.fillRect(x + 2, y + 2, 5, 1);
    ctx.fillRect(x + 9, y + 13, 4, 1);
    // Sparkle
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + ((seed >> 2) % 13) + 1, y + ((seed >> 5) % 13) + 1, 1, 1);
}};
TILES.seaB = { surface: 'water', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(x, y, 16, 16);
    // Deeper band
    ctx.fillStyle = PAL.seaMd;
    ctx.fillRect(x, y + 5, 16, 4);
    ctx.fillStyle = PAL.seaDp;
    ctx.fillRect(x, y + 14, 16, 2);
    // Animated wave line
    ctx.fillStyle = PAL.seaDk;
    const dy = Math.sin((x + (typeof world !== 'undefined' ? world.sessionTick * 0.8 : 0)) * 0.1) * 2;
    ctx.fillRect(x + 2, y + 12 + dy, 8, 2);
    // Light foam ripples
    ctx.fillStyle = PAL.seaLt;
    ctx.fillRect(x + 4, y + 3, 6, 1);
    ctx.fillRect(x + 11, y + 7, 3, 1);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + ((seed >> 4) % 13) + 1, y + ((seed >> 6) % 5) + 2, 1, 1);
}};
TILES.wsA = { surface: 'sand', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(x, y, 16, 16);
    // Wet shine
    ctx.fillStyle = PAL.seaLt;
    ctx.fillRect(x + 2, y + 2, 5, 1);
    ctx.fillRect(x + 10, y + 5, 4, 1);
    // Ripple ridges
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(x, y + 8, 16, 1);
    ctx.fillRect(x, y + 13, 16, 1);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(x, y + 11, 16, 1);
    // Tiny shell
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + ((seed >> 3) % 12) + 2, y + ((seed >> 6) % 5) + 9, 1, 1);
}};
TILES.sA = { surface: 'sand', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(x, y, 16, 16);
    // Subtle grains
    ctx.fillStyle = PAL.sandLt;
    ctx.fillRect(x + ((seed >> 1) % 14) + 1, y + ((seed >> 4) % 13) + 2, 1, 1);
    ctx.fillRect(x + ((seed >> 3) % 13) + 2, y + ((seed >> 6) % 14) + 1, 1, 1);
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(x + ((seed >> 5) % 12) + 3, y + ((seed >> 2) % 12) + 3, 1, 1);
}};
TILES.sB = { surface: 'sand', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(x, y, 16, 16);
    // Ripple texture
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(x + 1, y + 6, 12, 1);
    // Grain specks
    ctx.fillRect(x + (seed % 12) + 2, y + (seed % 10) + 3, 1, 1);
    ctx.fillRect(x + ((seed >> 3) % 13) + 1, y + ((seed >> 5) % 12) + 2, 1, 1);
    // Tiny shell fragment
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(x + ((seed >> 4) % 10) + 3, y + ((seed >> 2) % 8) + 10, 2, 1);
    ctx.fillRect(x + ((seed >> 4) % 10) + 4, y + ((seed >> 2) % 8) + 11, 1, 1);
    // Highlight
    ctx.fillStyle = PAL.sandLt;
    ctx.fillRect(x + ((seed >> 6) % 13) + 1, y + ((seed >> 7) % 5) + 1, 1, 1);
}};
TILES.sC = { surface: 'sand', draw(ctx, x, y, seed) {
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(x, y, 16, 16);
    // Grain texture
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(x + (seed % 9) + 3, y + (seed % 7) + 4, 1, 1);
    ctx.fillRect(x + ((seed >> 4) % 10) + 2, y + ((seed >> 4) % 8) + 3, 1, 1);
    ctx.fillRect(x + ((seed >> 2) % 12) + 1, y + ((seed >> 6) % 10) + 5, 1, 1);
    // Highlight speck
    ctx.fillStyle = PAL.sandLt;
    ctx.fillRect(x + ((seed >> 1) % 13) + 1, y + ((seed >> 5) % 13) + 1, 1, 1);
    // Tiny shadow mark
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(x + ((seed >> 7) % 11) + 3, y + ((seed >> 3) % 12) + 2, 1, 1);
    // Optional shell speckle
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + ((seed >> 5) % 12) + 2, y + ((seed >> 4) % 12) + 2, 1, 1);
}};
TILES.rkA = { surface: 'stone', draw(ctx, x, y, seed) {
    // Sand backdrop
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(x, y, 16, 16);
    // Subtle shadow under rock
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(x + 2, y + 13, 12, 1);
    // Rock body
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(x + 1, y + 3, 14, 10);
    // Rounded corners
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(x + 1, y + 3, 1, 1);
    ctx.fillRect(x + 14, y + 3, 1, 1);
    ctx.fillRect(x + 1, y + 12, 1, 1);
    ctx.fillRect(x + 14, y + 12, 1, 1);
    // Top highlight
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(x + 2, y + 4, 8, 1);
    ctx.fillRect(x + 2, y + 5, 1, 2);
    // Crack line
    ctx.fillStyle = PAL.stoneDk;
    ctx.fillRect(x + 5, y + 7, 4, 1);
    ctx.fillRect(x + 8, y + 8, 1, 2);
    // Shadow band at bottom
    ctx.fillRect(x + 1, y + 11, 14, 1);
    // Outline
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 2, y + 3, 12, 1);
    ctx.fillRect(x + 2, y + 12, 12, 1);
    ctx.fillRect(x + 1, y + 4, 1, 8);
    ctx.fillRect(x + 14, y + 4, 1, 8);
    // Lichen spot
    ctx.fillStyle = PAL.moss;
    ctx.fillRect(x + 10 + ((seed >> 4) % 3), y + 6, 2, 1);
}};

// ---------- Decoration tiles ----------
// Each flower variant has a recognizable 5-petal silhouette plus stem and
// leaf. Pixel layout (petals around `dx,dy` center):
//
//     . P .
//     P C P
//     . P .
//     . S .
//     L S .
//
// where P = petal, C = center, S = stem, L = leaf. A secondary tint pixel
// inside the petal ring adds dimensionality.
TILES.flW = { surface: 'grass', draw(ctx, x, y, seed) {
    const dx = x + (seed % 9) + 4, dy = y + ((seed >> 3) % 8) + 4;
    // Stem
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(dx, dy + 2, 1, 4);
    // Leaf
    ctx.fillStyle = PAL.mintDk;
    ctx.fillRect(dx - 1, dy + 4, 1, 1);
    ctx.fillRect(dx - 2, dy + 5, 2, 1);
    // Petals (white)
    ctx.fillStyle = PAL.white;
    ctx.fillRect(dx - 1, dy - 1, 3, 3);
    ctx.fillRect(dx, dy - 2, 1, 1);
    ctx.fillRect(dx, dy + 2, 1, 1);
    ctx.fillRect(dx - 2, dy, 1, 1);
    ctx.fillRect(dx + 2, dy, 1, 1);
    // Petal shading
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(dx + 1, dy + 1, 1, 1);
    // Center
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(dx, dy, 1, 1);
}};
TILES.flP = { surface: 'grass', draw(ctx, x, y, seed) {
    const dx = x + (seed % 9) + 4, dy = y + ((seed >> 3) % 8) + 4;
    // Stem + leaf
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(dx, dy + 2, 1, 4);
    ctx.fillStyle = PAL.mintDk;
    ctx.fillRect(dx + 1, dy + 3, 1, 1);
    ctx.fillRect(dx + 1, dy + 4, 2, 1);
    // Petals (pink)
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(dx - 1, dy - 1, 3, 3);
    ctx.fillRect(dx, dy - 2, 1, 1);
    ctx.fillRect(dx, dy + 2, 1, 1);
    ctx.fillRect(dx - 2, dy, 1, 1);
    ctx.fillRect(dx + 2, dy, 1, 1);
    // Deeper shading
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(dx + 1, dy + 1, 1, 1);
    ctx.fillRect(dx + 2, dy, 1, 1);
    // Highlight
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(dx - 1, dy - 1, 1, 1);
    // Center
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(dx, dy, 1, 1);
}};
TILES.flY = { surface: 'grass', draw(ctx, x, y, seed) {
    const dx = x + (seed % 9) + 4, dy = y + ((seed >> 3) % 8) + 4;
    // Stem + leaf
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(dx, dy + 2, 1, 4);
    ctx.fillStyle = PAL.mintDk;
    ctx.fillRect(dx - 1, dy + 3, 1, 1);
    ctx.fillRect(dx - 2, dy + 4, 2, 1);
    // Petals (yellow)
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(dx - 1, dy - 1, 3, 3);
    ctx.fillRect(dx, dy - 2, 1, 1);
    ctx.fillRect(dx, dy + 2, 1, 1);
    ctx.fillRect(dx - 2, dy, 1, 1);
    ctx.fillRect(dx + 2, dy, 1, 1);
    // Highlight petal
    ctx.fillStyle = PAL.yellowLt;
    ctx.fillRect(dx - 1, dy - 1, 1, 1);
    ctx.fillRect(dx, dy - 2, 1, 1);
    // Shadow petal
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(dx + 1, dy + 1, 1, 1);
    // Center
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(dx, dy, 1, 1);
}};
TILES.bushS = { surface: 'grass', draw(ctx, x, y, seed) {
    // Shadow on ground
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(x + 3, y + 12, 10, 1);
    // Outer dark layer (irregular lobes)
    ctx.fillStyle = PAL.mintDp;
    ctx.fillRect(x + 2, y + 5, 12, 7);
    ctx.fillRect(x + 3, y + 4, 10, 1);
    ctx.fillRect(x + 1, y + 6, 1, 4);
    ctx.fillRect(x + 14, y + 6, 1, 4);
    ctx.fillRect(x + 4, y + 3, 3, 1);
    ctx.fillRect(x + 9, y + 3, 3, 1);
    // Mid green
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + 3, y + 5, 10, 6);
    // Leaf cluster bumps (highlight on top-left)
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x + 4, y + 5, 3, 2);
    ctx.fillRect(x + 9, y + 6, 3, 2);
    ctx.fillRect(x + 5, y + 8, 2, 1);
    // Brightest tips
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x + 5, y + 5, 1, 1);
    ctx.fillRect(x + 10, y + 6, 1, 1);
    // Berry clusters
    ctx.fillStyle = PAL.berry;
    ctx.fillRect(x + 6 + ((seed >> 2) % 2), y + 7, 1, 1);
    ctx.fillRect(x + 11, y + 9, 1, 1);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x + 6 + ((seed >> 2) % 2), y + 7, 1, 1);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(x + 11, y + 9, 1, 1);
    // Occasional tiny flower (seeded variant)
    if ((seed & 7) === 0) {
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 4, y + 9, 1, 1);
        ctx.fillStyle = PAL.yellow;
        ctx.fillRect(x + 4, y + 9, 1, 1);
    }
}};
TILES.mholeA = { surface: 'tile', draw(ctx, x, y) {
    // Arched hole shape with outline and shadow
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 2, y + 5, 12, 7);
    ctx.fillRect(x + 3, y + 4, 10, 1);
    ctx.fillRect(x + 4, y + 3, 8, 1);
    // Interior darkness
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(x + 3, y + 6, 10, 5);
    ctx.fillRect(x + 4, y + 5, 8, 1);
    // Floor edge inside hole
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 3, y + 10, 10, 1);
    // Wood frame edge
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + 2, y + 11, 1, 1);
    ctx.fillRect(x + 13, y + 11, 1, 1);
    // Tiny highlight on arch top
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(x + 5, y + 3, 3, 1);
}};

// ---------- Overlay tiles ----------
// Tree foliage seen top-down with leaf cluster bumps, shadow gutter,
// central trunk hint, and light/shadow shading.
TILES.treeFoliage = { surface: 'grass', draw(ctx, x, y, seed) {
    // Base dark canopy layer
    ctx.fillStyle = PAL.mintDp;
    ctx.fillRect(x, y + 2, 16, 14);
    ctx.fillRect(x + 1, y + 1, 14, 1);
    // Mid green
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + 1, y + 3, 14, 12);
    ctx.fillRect(x + 2, y + 2, 12, 1);
    // Leaf clusters (light green bumps)
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(x + 2, y + 4, 3, 2);
    ctx.fillRect(x + 6, y + 3, 3, 2);
    ctx.fillRect(x + 10, y + 4, 3, 2);
    ctx.fillRect(x + 3, y + 7, 2, 2);
    ctx.fillRect(x + 11, y + 7, 2, 2);
    ctx.fillRect(x + 6, y + 9, 4, 2);
    // Brightest highlights
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x + 3, y + 4, 1, 1);
    ctx.fillRect(x + 7, y + 3, 1, 1);
    ctx.fillRect(x + 11, y + 4, 1, 1);
    // Shadow underside
    ctx.fillStyle = PAL.mintDp;
    ctx.fillRect(x + 2, y + 13, 12, 2);
    ctx.fillRect(x + 3, y + 15, 10, 1);
    // Trunk hint (visible through canopy)
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 7, y + 7, 2, 2);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + 7, y + 7, 1, 1);
    // Leaf-edge silhouette on seeded tile (subtle variety)
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + ((seed >> 3) % 13) + 1, y + 13, 1, 1);
}};

// ==================== TILE MAPS ====================

function makeLayer(fill) {
    const layer = [];
    for (let r = 0; r < MAP_ROWS; r++) {
        const row = [];
        for (let c = 0; c < MAP_COLS; c++) row.push(fill);
        layer.push(row);
    }
    return layer;
}

function buildGardenMap() {
    // Ground: grass with variants
    const ground = makeLayer(null);
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            const s = tileSeed(c, r);
            const v = s % 10;
            ground[r][c] = v < 4 ? 'gA' : v < 6 ? 'gB' : v < 8 ? 'gC' : 'gD';
        }
    }
    // Stone path: arc through the middle (y ~ 110, cols 3-18)
    // Row = (110 - PLAY_TOP) / 16 ~ 5, varying with sin
    for (let i = 0; i < 6; i++) {
        const sx = 60 + i * 50;
        const sy = 110 + Math.sin(i * 0.7) * 12;
        const col = Math.floor(sx / 16);
        const row = Math.floor((sy - PLAY_TOP) / 16);
        if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
            ground[row][col] = (tileSeed(col, row) % 2 === 0) ? 'stA' : 'stB';
        }
    }
    // Water tiles for pond at (80, 150) w=60, h=28  -> cols 5-8, rows 7-9
    const pondCols = [5, 6, 7, 8];
    const pondRows = [7, 8];
    for (const pr of pondRows) {
        for (const pc of pondCols) {
            if (pr < MAP_ROWS && pc < MAP_COLS) {
                ground[pr][pc] = (tileSeed(pc, pr) % 2 === 0) ? 'wA' : 'wB';
            }
        }
    }

    // Decoration: scattered flowers
    const deco = makeLayer(null);
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            const s = tileSeed(c + 100, r + 100);
            if (s % 17 === 0) deco[r][c] = 'flW';
            else if (s % 19 === 0) deco[r][c] = 'flP';
            else if (s % 23 === 0) deco[r][c] = 'flY';
        }
    }
    // Bushes at approximate positions: (110,60)->(6,2), (280,70)->(17,2), (60,200)->(3,10), (320,200)->(20,10)
    const bushPositions = [[6, 2], [17, 2], [3, 10], [20, 10]];
    for (const [bc, br] of bushPositions) {
        if (br < MAP_ROWS && bc < MAP_COLS) deco[br][bc] = 'bushS';
    }

    // Overlay: tree foliage at tree positions (30,70)->(1,2), (350,80)->(21,3), (200,50)->(12,1)
    const overlay = makeLayer(null);
    const treePositions = [[1, 2], [21, 3], [12, 1]];
    for (const [tc, tr] of treePositions) {
        if (tr >= 0 && tr < MAP_ROWS && tc >= 0 && tc < MAP_COLS) {
            overlay[tr][tc] = 'treeFoliage';
            // Extend tree foliage to neighbor cell if possible
            if (tc + 1 < MAP_COLS) overlay[tr][tc + 1] = 'treeFoliage';
        }
    }

    return { ground, decoration: deco, overlay };
}

function buildKitchenMap() {
    const ground = makeLayer(null);
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            const s = tileSeed(c, r);
            ground[r][c] = s % 5 === 0 ? 'kfB' : s % 7 === 0 ? 'kfC' : 'kfA';
        }
    }
    // Rug in center at (80,130)-(210,180) -> cols 5-13, rows 6-9
    for (let r = 6; r <= 9; r++) {
        for (let c = 5; c <= 13; c++) {
            if (r < MAP_ROWS && c < MAP_COLS) {
                ground[r][c] = (r === 6 || r === 9) ? 'rugB' : 'rugA';
            }
        }
    }

    const deco = makeLayer(null);
    // Mouse hole at (330,175) -> col 20, row 9
    if (9 < MAP_ROWS && 20 < MAP_COLS) deco[9][20] = 'mholeA';

    return { ground, decoration: deco, overlay: makeLayer(null) };
}

function buildBedroomMap() {
    const ground = makeLayer(null);
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            const s = tileSeed(c, r);
            ground[r][c] = s % 4 === 0 ? 'bpB' : s % 6 === 0 ? 'bpC' : 'bpA';
        }
    }
    // Carpet in center: oval rug at (160,130) radius ~50x22 -> cols 7-13, rows 6-8
    for (let r = 6; r <= 8; r++) {
        for (let c = 7; c <= 13; c++) {
            if (r < MAP_ROWS && c < MAP_COLS) {
                ground[r][c] = ((r === 6 || r === 8) && (c === 7 || c === 13)) ? 'carpA' : 'carpB';
            }
        }
    }

    return { ground, decoration: makeLayer(null), overlay: makeLayer(null) };
}

function buildBeachMap() {
    const ground = makeLayer(null);
    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            if (r < 3) {
                // Sea: top 3 rows (48px = close to the 50px sea area)
                ground[r][c] = (tileSeed(c, r) % 2 === 0) ? 'seaA' : 'seaB';
            } else if (r === 3) {
                // Wet sand transition
                ground[r][c] = 'wsA';
            } else {
                // Dry sand
                const s = tileSeed(c, r);
                ground[r][c] = s % 5 === 0 ? 'sB' : s % 7 === 0 ? 'sC' : 'sA';
            }
        }
    }
    // Rock at (50,160) -> col 3, row 8
    if (8 < MAP_ROWS && 3 < MAP_COLS) ground[8][3] = 'rkA';

    return { ground, decoration: makeLayer(null), overlay: makeLayer(null) };
}

function tileSeed(col, row) {
    return ((col * 73856093) ^ (row * 19349663)) >>> 0;
}

function drawTileLayer(ctx, map, layerName) {
    const layer = map[layerName];
    if (!layer) return;
    for (let r = 0; r < layer.length; r++) {
        const row = layer[r];
        for (let c = 0; c < row.length; c++) {
            const name = row[c];
            if (!name) continue;
            const tile = TILES[name];
            if (!tile) {
                if (!drawTileLayer._warned) drawTileLayer._warned = {};
                if (!drawTileLayer._warned[name]) {
                    console.warn('Unknown tile:', name);
                    drawTileLayer._warned[name] = true;
                }
                continue;
            }
            let px = c * TILE_SIZE;
            const py = PLAY_TOP + r * TILE_SIZE;
            // Apply flower sway offset if active
            if (world && world.swayTiles && layerName === 'decoration') {
                const swayKey = c + ',' + r;
                if (world.swayTiles[swayKey]) {
                    px += world.swayTiles[swayKey];
                }
            }
            const neighbors = {
                n: r > 0 ? layer[r - 1][c] : null,
                s: r < layer.length - 1 ? layer[r + 1][c] : null,
                e: c < row.length - 1 ? row[c + 1] : null,
                w: c > 0 ? row[c - 1] : null
            };
            tile.draw(ctx, px, py, tileSeed(c, r), neighbors);
        }
    }
}

function tileAt(map, layerName, col, row) {
    const layer = map[layerName];
    if (!layer || !layer[row] || !layer[row][col]) return null;
    return TILES[layer[row][col]] || null;
}

function surfaceAt(map, px, py) {
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor((py - PLAY_TOP) / TILE_SIZE);
    const tile = tileAt(map, 'ground', col, row);
    return tile ? tile.surface : 'grass';
}

// ---------- Lighting / tinting layer (Unit 4) ----------

function drawLightingPass(ctx) {
    if (!world) return;
    const room = currentRoom();
    const indoor = room && room.indoor;
    const tod = world.timeOfDay || 'day';
    const weather = world.weather || 'clear';
    const fade = (world.fx && world.fx.lightingFade) || 0;

    let r = 0, g = 0, b = 0, a = 0;

    if (tod === 'night') {
        if (indoor) { r = 80; g = 60; b = 30; a = 0.18; }
        else { r = 40; g = 30; b = 90; a = 0.35; }
    } else if (tod === 'dusk') {
        r = 200; g = 130; b = 120; a = 0.15;
    } else {
        if (indoor) { r = 255; g = 240; b = 200; a = 0.05; }
    }

    if (weather === 'rain' && !indoor) {
        r = Math.round(r * 0.7 + 100 * 0.3);
        g = Math.round(g * 0.7 + 140 * 0.3);
        b = Math.round(b * 0.7 + 180 * 0.3);
        a = Math.max(a, 0.10);
    } else if (weather === 'snow' && !indoor) {
        r = Math.round(r * 0.7 + 180 * 0.3);
        g = Math.round(g * 0.7 + 190 * 0.3);
        b = Math.round(b * 0.7 + 220 * 0.3);
        a = Math.max(a, 0.08);
    }

    if (tod === 'dusk' && fade > 0 && fade < 1) a *= fade;
    if (a <= 0) return;

    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);
}

// ---------- World effects state ----------

function initWorldFx() {
    return { shake: 0, lightingFade: 0, weatherFade: 0 };
}

// ---------- Kitten sprite (Unit 5 — data-driven 24×24) ----------

const KITTEN_PAL = [
    null,           // 0 = transparent
    PAL.cream,      // 1 = body
    PAL.outline,    // 2 = dark brown outlines
    PAL.pink,       // 3 = inner ear (saturated pink)
    PAL.eye,        // 4 = dark eyes
    '#fffdf7',      // 5 = highlight (top of head / ear tuft)
    '#ede0d0',      // 6 = shadow (bottom body)
    PAL.pinkDk,     // 7 = nose, mouth
    '#ffffff',      // 8 = eye catch-light (pure white sparkle)
    '#d4bfa8',      // 9 = deep shadow (under belly / tail curl)
    '#ffd4d8',      // a = cheek blush (warm pink)
];

SPRITES.kitten = defineSprite(24, 24, KITTEN_PAL, [
    // Frame 0: walkDown neutral (front view)
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162......',
        '....226112..2116262.....',
        '.....262.....2622.......',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 1: walkDown left step
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '...226111166111162......',
        '..226.112..2116262.....',
        '..22...62.....2622.....',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 2: walkDown right step
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162.222..',
        '....226112..211626.262.',
        '.....262.....262..22...',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 3: walkUp neutral (back view)
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251152.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162......',
        '....226112..2116262.....',
        '.....262.....2622.......',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 4: walkUp left step
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251152.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '...226111166111162......',
        '..226.112..2116262.....',
        '..22...62.....2622.....',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 5: walkUp right step
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251152.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..21111111111111112.....',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162.222..',
        '....226112..211626.262.',
        '.....262.....262..22...',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 6: walkRight neutral (side view, one eye)
    [
        '........................',
        '.......22222............',
        '......2555522...........',
        '......251152222.........',
        '.....2211111112.........',
        '.....2111111112.........',
        '.....2551184112.........',
        '.....2111117112.........',
        '.....211a117712.........',
        '.....211112222..........',
        '.....221111126..........',
        '......222222262.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......261111622.......',
        '.......261111622.......',
        '.......2611116262.......',
        '.......2261162.22.......',
        '........262262..........',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 7: walkRight left step
    [
        '........................',
        '.......22222............',
        '......2555522...........',
        '......251152222.........',
        '.....2211111112.........',
        '.....2111111112.........',
        '.....2551184112.........',
        '.....2111117112.........',
        '.....211a117712.........',
        '.....211112222..........',
        '.....221111126..........',
        '......222222262.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......261111622.......',
        '.......261111622.......',
        '......2261116262........',
        '......226.162.22........',
        '......22..262...........',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 8: walkRight right step
    [
        '........................',
        '.......22222............',
        '......2555522...........',
        '......251152222.........',
        '.....2211111112.........',
        '.....2111111112.........',
        '.....2551184112.........',
        '.....2111117112.........',
        '.....211a117712.........',
        '.....211112222..........',
        '.....221111126..........',
        '......222222262.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......21111126.........',
        '.......261111622.......',
        '.......261111622.......',
        '.......2611116262.22...',
        '.......226116.2622.262.',
        '........2622...22..22..',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 9: idleBreathe expanded (slightly puffed body)
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '..222222222222222262....',
        '...2111111111111126.....',
        '...2111111111111126.....',
        '...2111111111111126.....',
        '...2111111111111126.....',
        '...261111111111116262...',
        '...261111111111116.22..',
        '...2611116611111162.....',
        '...2261112..21116262....',
        '....262......2622.......',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 10: sit (legs tucked, tail wrapped)
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....261111111111626.....',
        '...226111111111162......',
        '..2211166666611126......',
        '..26111111111111262.....',
        '..2222222222222222......',
        '........................',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 11: sitTailTwitch (tail shifted)
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....261111111111626.....',
        '...226111111111162......',
        '..2211166666611126......',
        '..2611111111111126222...',
        '..22222222222222221.2...',
        '.....................2..',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 12: sleepCurl (curled up ball)
    [
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '.....22222222222........',
        '....255511111112........',
        '....211111111112........',
        '....211441111112........',
        '....2.2..2111112........',
        '....2222211111126.......',
        '...211111111111126......',
        '...211111111111126......',
        '...261111111111626......',
        '..226111111111162.......',
        '..221116666611126.......',
        '..26111111111111262.....',
        '..2222222222222222......',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 13: sleepCurl breathing (slightly expanded)
    [
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '.....22222222222........',
        '....255511111112........',
        '....211111111112........',
        '....211441111112........',
        '....2.2..2111112........',
        '....2222211111126.......',
        '..2211111111111126......',
        '..2111111111111126......',
        '..2611111111111626......',
        '..226111111111162.......',
        '..221116666611126.......',
        '..26111111111111262.....',
        '..2222222222222222......',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 14: eat (head lowered, mouth near bowl)
    [
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....261111111111626.....',
        '....2261111111162.......',
        '....226666666662........',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 15: eat (head lower, mouth open)
    [
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....261111111111626.....',
        '....2261111111162.......',
        '....226666666662........',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 16: eat (head lowest, gulp)
    [
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....261111111111626.....',
        '....226666666662........',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 17: purr (eyes closed/happy, relaxed)
    [
        '........................',
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21122111111221112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162......',
        '....226112..2116262.....',
        '.....262.....2622.......',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 18: happyDance (bounce left)
    [
        '........................',
        '...2222......2222.......',
        '..255552....255552......',
        '..251152....251132......',
        '.22111122221111122......',
        '.21111111111111112......',
        '.25511111111111152......',
        '.21184111111841112......',
        '.21111111111111112......',
        '.211a1117711a11112......',
        '.2111122..221111126....',
        '.22111111111111226......',
        '..2222222222222262......',
        '...211111111111126......',
        '...211111111111126......',
        '...211111111111126......',
        '...211111111111126......',
        '...2611111111116262.....',
        '...2611111111116.22....',
        '...26111166111162.......',
        '...2261112..116262......',
        '....262.....2622........',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 19: happyDance (bounce up)
    [
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162......',
        '....226112..2116262.....',
        '.....262.....2622.......',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 20: happyDance (bounce right)
    [
        '........................',
        '.....2222......2222.....',
        '....255552....255552....',
        '....251152....251132....',
        '...22111122221111122....',
        '...21111111111111112....',
        '...25511111111111152....',
        '...21184111111841112....',
        '...21111111111111112....',
        '...211a1117711a11112....',
        '...2111122..221111126..',
        '...22111111111111226....',
        '....2222222222222262....',
        '.....211111111111126....',
        '.....211111111111126....',
        '.....211111111111126....',
        '.....211111111111126....',
        '.....2611111111116262...',
        '.....2611111111116.22..',
        '.....26111166111162.....',
        '.....2261112..116262....',
        '......262.....2622......',
        '........................',
        '........................',
    ].join('\n'),
    // Frame 21: happyDance (bounce up again)
    [
        '....2222......2222......',
        '...255552....255552.....',
        '...251152....251132.....',
        '..22111122221111122.....',
        '..21111111111111112.....',
        '..25511111111111152.....',
        '..21184111111841112.....',
        '..21111111111111112.....',
        '..211a1117711a11112.....',
        '..2111122..221111126...',
        '..22111111111111226.....',
        '...2222222222222262.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....211111111111126.....',
        '....2611111111116262....',
        '....2611111111116.22...',
        '....26111166111162......',
        '....226112..2116262.....',
        '.....262.....2622.......',
        '........................',
        '........................',
        '........................',
    ].join('\n'),
]);

const KITTEN_ANIMS = {
    walkDown:      { frames: [0, 1, 0, 2], frameMs: 110, loop: true },
    walkUp:        { frames: [3, 4, 3, 5], frameMs: 110, loop: true },
    walkRight:     { frames: [6, 7, 6, 8], frameMs: 110, loop: true },
    walkLeft:      { frames: [6, 7, 6, 8], frameMs: 110, loop: true },  // rendered with flipX
    idleBreathe:   { frames: [0, 9],       frameMs: 600, loop: true },
    sit:           { frames: [10],         frameMs: 0,   loop: false, next: 'sitTailTwitch' },
    sitTailTwitch: { frames: [10, 11],     frameMs: 700, loop: true },
    sleepCurl:     { frames: [12, 13],     frameMs: 900, loop: true },
    eat:           { frames: [14, 15, 14, 16], frameMs: 130, loop: false, next: 'idleBreathe' },
    purr:          { frames: [0, 17],      frameMs: 350, loop: true },
    happyDance:    { frames: [18, 19, 20, 21], frameMs: 130, loop: true },
};

function _capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- World state ----------
let world = null;

// ==================== ENGINE HOOKS ====================

function gameInit() {
    // Keep the engine from ever triggering game-over.
    Engine.state.health = 1;
    Engine.state.maxHealth = 0;
    Engine.state.score = 0;

    world = {
        room: 'garden',
        kitten: {
            x: GAME.width / 2,
            y: PLAY_TOP + (GAME.height - PLAY_TOP) / 2 + 20,
            tx: null,
            ty: null,
            speed: 0.65,
            facing: 'down',
            walkFrame: 0,
            walkDist: 0,
            busy: null,
            purrTimer: 0,
            animState: null,
            animFrame: 0,
            animTimer: 0,
            _animRegistry: null,
            _animPingDir: 1,
            flash: 0
        },
        pawPrints: [],
        floaters: [],
        shelf: {
            flowers:     [false, false, false, false, false],
            butterflies: [false, false, false],
            shells:      [false, false, false, false, false, false],
            yarnBalls:   [false, false, false, false],
            stars:       [false, false, false, false, false, false, false, false],
            treats:      [false, false, false, false]
        },
        rooms: buildRooms(),
        weather: pickWeather(),
        weatherParticles: [],
        night: false,
        timeOfDay: 'day',
        fx: initWorldFx(),
        reaction: null,
        transition: null,
        celebrating: null,
        lullabyTimer: 120,
        sessionTick: 0,
        swayTiles: {},
        dustPuffs: [],
        waterRipples: [],
        dialogue: null
    };

    seedWeather();
}

function gameUpdate(dt) {
    world.sessionTick += dt;

    if (world.transition) {
        updateTransition(dt);
        updateFloaters(dt);
        updateWeather(dt);
        return;
    }

    if (world.celebrating) {
        updateCelebration(dt);
    } else {
        updateKitten(dt);
        updateHotspots(dt);
        reactionTick(dt);
        updateCollectibles(dt);
        updateSecrets(dt);
        const room = currentRoom();
        if (room.ambient) room.ambient(dt);
        checkShelfFull();
    }

    updateFloaters(dt);
    updatePawPrints(dt);
    updateDustPuffs(dt);
    updateWaterRipples(dt);
    updateSwayTiles(dt);
    updateWeather(dt);
    updateLullaby(dt);
    updateDuskTransition(dt);

    if (world.kitten.purrTimer > 0) world.kitten.purrTimer -= dt;
    if (world.kitten.flash > 0) world.kitten.flash -= dt * (1 / 60);
}

// ---------- Dialogue portrait window system ----------

function drawPortraitWindow(ctx, x, y, w, h, bodyColor, outerColor, innerColor) {
    bodyColor = bodyColor || PAL.cream;
    outerColor = outerColor || '#e8d0d8';
    innerColor = innerColor || PAL.outline;
    // Outer border
    ctx.fillStyle = outerColor;
    ctx.fillRect(x, y, w, h);
    // Inner border
    ctx.fillStyle = innerColor;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Body fill
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
}

function drawMousePortrait(ctx, x, y, mood) {
    // Simple procedural mouse face inside portrait window
    // Brown circle body
    ctx.fillStyle = PAL.mouse;
    ctx.beginPath();
    ctx.arc(x + 16, y + 18, 10, 0, TAU);
    ctx.fill();
    // Ears
    ctx.fillStyle = PAL.mouseDk;
    ctx.beginPath();
    ctx.arc(x + 9, y + 10, 5, 0, TAU);
    ctx.arc(x + 23, y + 10, 5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PAL.pink;
    ctx.beginPath();
    ctx.arc(x + 9, y + 10, 3, 0, TAU);
    ctx.arc(x + 23, y + 10, 3, 0, TAU);
    ctx.fill();
    // Eyes - vary by mood
    ctx.fillStyle = PAL.eye;
    if (mood === 'sleepy') {
        // Half-closed eyes
        ctx.fillRect(x + 11, y + 17, 3, 1);
        ctx.fillRect(x + 19, y + 17, 3, 1);
    } else if (mood === 'playful') {
        // Wide sparkly eyes
        ctx.fillRect(x + 12, y + 16, 2, 2);
        ctx.fillRect(x + 20, y + 16, 2, 2);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 12, y + 16, 1, 1);
        ctx.fillRect(x + 20, y + 16, 1, 1);
    } else {
        // Shy - small dots
        ctx.fillRect(x + 12, y + 17, 1, 1);
        ctx.fillRect(x + 20, y + 17, 1, 1);
    }
    // Nose
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(x + 15, y + 20, 2, 1);
    // Whiskers
    ctx.fillStyle = PAL.mouseDk;
    ctx.fillRect(x + 7, y + 19, 4, 1);
    ctx.fillRect(x + 22, y + 19, 4, 1);
}

function drawDialogue(ctx) {
    const d = world.dialogue;
    if (!d || !d.active) return;

    d.timer += 1;

    // Calculate alpha: fade in over 10 frames, fade out over 10 frames
    let alpha;
    if (d.fade === 1) {
        // Fading out
        d.fadeOutTimer = (d.fadeOutTimer || 0) + 1;
        alpha = clamp(1 - d.fadeOutTimer / 10, 0, 1);
        if (alpha <= 0) {
            world.dialogue = null;
            return;
        }
    } else {
        // Fading in
        alpha = clamp(d.timer / 10, 0, 1);
    }

    const pw = 40, ph = 40;
    const px = d.side === 'right' ? GAME.width - pw - 10 : 10;
    const py = PLAY_TOP + 8;

    ctx.save();
    ctx.globalAlpha = alpha;
    drawPortraitWindow(ctx, px, py, pw, ph);
    drawMousePortrait(ctx, px + 4, py + 4, d.mood);
    ctx.restore();
}

function gameRender(ctx, w, h) {
    const room = currentRoom();

    // Sky/ground base fill
    ctx.fillStyle = room.bg;
    ctx.fillRect(0, PLAY_TOP, w, h - PLAY_TOP);

    // Room scenery
    room.draw(ctx);

    // Hotspots drawn inside room logic where needed, but dynamic layers go here
    drawHotspots(ctx, room);
    drawCollectibles(ctx, room);

    // Dust puffs and water ripples under kitten
    drawDustPuffs(ctx);
    drawWaterRipples(ctx);

    // Paw prints under kitten
    drawPawPrints(ctx);

    // Kitten
    drawKitten(ctx);

    // Overlay tiles (tree foliage drawn over kitten)
    const roomMap = currentRoom().map;
    if (roomMap) drawTileLayer(ctx, roomMap, 'overlay');

    // Floaters over kitten
    drawFloaters(ctx);

    // Edge arrows
    drawEdgeArrows(ctx);

    // Weather (rain/snow) over world
    drawWeather(ctx);

    // Lighting pass (day/dusk/night + weather + indoor)
    drawLightingPass(ctx);

    // Moon icon at night
    if (world.night) drawMoon(ctx);

    // Dialogue portrait window
    if (world.dialogue && world.dialogue.active) {
        drawDialogue(ctx);
    }

    // Transition fade
    if (world.transition) drawTransition(ctx);

    // Celebration overlays
    if (world.celebrating) drawCelebration(ctx);

    // Shelf always on top
    drawShelf(ctx);
}

function gameTitleRender(ctx, w, h, time) {
    // Backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, PAL.skyDay);
    sky.addColorStop(1, PAL.mint);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Rolling hills
    ctx.fillStyle = PAL.grass;
    ctx.beginPath();
    ctx.moveTo(0, h - 50);
    for (let x = 0; x <= w; x += 8) {
        ctx.lineTo(x, h - 50 + Math.sin((x + time * 20) * 0.05) * 4);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.moveTo(0, h - 30);
    for (let x = 0; x <= w; x += 8) {
        ctx.lineTo(x, h - 30 + Math.sin((x + time * 15 + 30) * 0.04) * 3);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fill();

    // Drifting butterflies
    for (let i = 0; i < 4; i++) {
        const bx = ((time * (18 + i * 5) + i * 97) % (w + 40)) - 20;
        const by = 40 + Math.sin(time * 2 + i) * 14 + i * 10;
        drawButterfly(ctx, bx, by, i % 4, time);
    }

    // Tiny flowers in the grass
    for (let i = 0; i < 8; i++) {
        const fx = (i * 53 + 17) % w;
        const fy = h - 20 - (i % 2) * 6;
        drawFlower(ctx, fx, fy, i % 5, false);
    }

    // Title logo card
    const cardW = 240, cardH = 60;
    const cx = (w - cardW) / 2;
    const cy = 30;
    ctx.fillStyle = 'rgba(255,249,240,0.9)';
    roundRect(ctx, cx, cy, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 2;
    roundRect(ctx, cx, cy, cardW, cardH, 8);
    ctx.stroke();

    // Title text — the only copy on screen is the game name
    ctx.fillStyle = PAL.pinkDk;
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Tiny Kitty Garden', w / 2 + 1, cy + 28 + 1);
    ctx.fillStyle = PAL.red;
    ctx.fillText('Tiny Kitty Garden', w / 2, cy + 28);

    // Kitten in the middle of the card
    const kitX = w / 2 - 8;
    const kitY = cy + 34;
    // Animate between walkDown frames on title screen
    const titleFrames = KITTEN_ANIMS.walkDown.frames;
    const titleIdx = titleFrames[Math.floor(time * 2) % titleFrames.length];
    renderSprite(ctx, SPRITES.kitten, titleIdx, kitX, kitY, {
        shadow: { dx: 1, dy: 1, color: PAL.shadow }
    });

    // Pulsing paw-print prompt (art, not text)
    const pulse = (Math.sin(time * 3) + 1) / 2;
    const pawY = h - 70;
    ctx.globalAlpha = 0.6 + pulse * 0.4;
    drawPawIcon(ctx, w / 2, pawY, 10 + pulse * 2, PAL.red);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
}

function gameTap(x, y) {
    if (!world || world.transition) return;

    // Celebration absorbs all taps
    if (world.celebrating) return;

    // 1. Edge arrows (highest priority — they live on the edges)
    if (tryEdgeArrowTap(x, y)) return;

    // 2. Self-pet — tap on kitten
    if (kittenHitTest(x, y)) {
        purrKitten();
        return;
    }

    // 3. Collectibles
    if (tryCollectibleTap(x, y)) return;

    // 4. Hotspots
    if (tryHotspotTap(x, y)) return;

    // 4.5. Secrets
    if (trySecretTap(x, y)) return;

    // 5. Walk target — plain walk, not a hotspot queue
    if (y < PLAY_TOP + 6) return; // don't walk into shelf
    cancelReaction();
    setKittenTarget(x, y);
    // Any previously-queued hotspot walk is now stale.
    const room = currentRoom();
    for (const hs of room.hotspots) hs.queued = false;
}

// ==================== KITTEN ====================

const KITTEN_W = 24;
const KITTEN_H = 24;

function updateKitten(dt) {
    const k = world.kitten;

    // Ensure animation registry is wired up
    if (!k._animRegistry) k._animRegistry = KITTEN_ANIMS;

    // If kitten is mid-reaction for a hotspot, delegate to that hotspot's logic
    if (k.busy) {
        if (k.busy === 'dance') playAnim(k, 'happyDance');
        updateAnim(k, dt);
        return;
    }

    if (k.tx == null) {
        // Idle — no walk target, not busy
        playAnim(k, 'idleBreathe');
        updateAnim(k, dt);
        return;
    }
    const dx = k.tx - k.x;
    const dy = k.ty - k.y;
    const dToTarget = Math.hypot(dx, dy);
    if (dToTarget < 1.2) {
        k.x = k.tx; k.y = k.ty;
        k.tx = null; k.ty = null;
        playAnim(k, 'idleBreathe');
        updateAnim(k, dt);
        return;
    }
    const step = k.speed * dt;
    const mv = Math.min(step, dToTarget);
    k.x += (dx / dToTarget) * mv;
    k.y += (dy / dToTarget) * mv;
    k.walkDist += mv;

    // Update facing
    if (Math.abs(dx) > Math.abs(dy)) {
        k.facing = dx > 0 ? 'right' : 'left';
    } else {
        k.facing = dy > 0 ? 'down' : 'up';
    }

    // Play walk animation matching facing direction
    playAnim(k, 'walk' + _capFirst(k.facing));
    updateAnim(k, dt);

    // Advance walk frame every ~7 pixels (legacy counter kept for paw prints)
    if (k.walkDist > 7) {
        k.walkFrame = 1 - k.walkFrame;
        k.walkDist = 0;

        // Surface-aware paw print color
        const room = currentRoom();
        const surface = room.map ? surfaceAt(room.map, k.x, k.y) : 'grass';
        let pawColor = PAL.outline;
        if (surface === 'grass') pawColor = PAL.grassDk;
        else if (surface === 'sand') pawColor = PAL.sandDk;
        else if (surface === 'wood') pawColor = PAL.lavDk;
        else if (surface === 'tile') pawColor = 'rgba(0,0,0,0.08)';
        else if (surface === 'rug') pawColor = PAL.pinkDk;
        else if (surface === 'water') pawColor = PAL.seaDk;
        else if (surface === 'stone') pawColor = PAL.stone;
        else if (surface === 'dirt') pawColor = PAL.woodDk;

        // Paw print trail
        world.pawPrints.push({
            x: k.x + (Math.random() - 0.5) * 4,
            y: k.y + 6 + (Math.random() - 0.5) * 2,
            life: 90,
            maxLife: 90,
            color: pawColor
        });

        // Surface-appropriate footstep sound
        if (surface === 'grass' || surface === 'dirt') Sound.play('stepGrass');
        else if (surface === 'wood') Sound.play('stepWood');
        else if (surface === 'tile' || surface === 'rug') Sound.play('stepTile');
        else if (surface === 'sand') Sound.play('stepSand');
        else if (surface === 'stone') Sound.play('stepStone');

        // Dust puffs on dirt/sand
        if (surface === 'dirt' || surface === 'sand') {
            if (!world.dustPuffs) world.dustPuffs = [];
            if (world.dustPuffs.length < 10) {
                world.dustPuffs.push({
                    x: k.x + (Math.random() - 0.5) * 6,
                    y: k.y + 4,
                    vy: -0.15 - Math.random() * 0.1,
                    life: 25,
                    maxLife: 25,
                    color: surface === 'sand' ? PAL.sandDk : PAL.woodDk
                });
            }
        }

        // Water ripples near pond (garden only)
        if (world.room === 'garden') {
            const pondCX = 110, pondCY = 164;
            if (dist(k.x, k.y, pondCX, pondCY) < 35) {
                if (!world.waterRipples) world.waterRipples = [];
                if (Math.random() < 0.3 && world.waterRipples.length < 3) {
                    world.waterRipples.push({
                        x: 80 + Math.random() * 60,
                        y: 150 + Math.random() * 28,
                        r: 0, maxR: 8,
                        life: 40, maxLife: 40
                    });
                }
            }
        }
    }

    // Flower sway — check 3×3 tile neighborhood around kitten for flower decorations
    {
        const room = currentRoom();
        if (room.map && room.map.decoration) {
            const col = Math.floor(k.x / TILE_SIZE);
            const row = Math.floor((k.y - PLAY_TOP) / TILE_SIZE);
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const r2 = row + dr, c2 = col + dc;
                    if (r2 < 0 || c2 < 0) continue;
                    const deco = room.map.decoration;
                    if (!deco[r2] || !deco[r2][c2]) continue;
                    const name = deco[r2][c2];
                    if (name === 'flW' || name === 'flP' || name === 'flY') {
                        const tilePx = c2 * TILE_SIZE + TILE_SIZE / 2;
                        const tilePy = PLAY_TOP + r2 * TILE_SIZE + TILE_SIZE / 2;
                        if (dist(k.x, k.y, tilePx, tilePy) < 20) {
                            const key = c2 + ',' + r2;
                            // Sway direction based on kitten approach
                            const swayDir = k.x < tilePx ? 2 : -2;
                            world.swayTiles[key] = swayDir;
                        }
                    }
                }
            }
        }
    }

    // Clamp to play area
    k.x = Math.max(10, Math.min(GAME.width - 10, k.x));
    k.y = Math.max(PLAY_TOP + 10, Math.min(GAME.height - 8, k.y));
}

function setKittenTarget(x, y) {
    const k = world.kitten;
    k.tx = x;
    k.ty = Math.max(PLAY_TOP + 10, Math.min(GAME.height - 8, y));
    k.busy = null;
}

// Queue a walk toward a hotspot so that when the kitten arrives at that exact
// target point (tx/ty), the hotspot's arrival reaction fires. Using the
// queued target directly (rather than the hotspot center) avoids
// geometry traps when the aim-point is offset from the hit box.
function queueHotspotWalk(hs, x, y) {
    setKittenTarget(x, y);
    hs.queued = true;
    hs.queuedX = world.kitten.tx;
    hs.queuedY = world.kitten.ty;
}

function kittenHitTest(x, y) {
    const k = world.kitten;
    return (
        x >= k.x - KITTEN_W / 2 && x <= k.x + KITTEN_W / 2 &&
        y >= k.y - KITTEN_H && y <= k.y + 2
    );
}

function purrKitten() {
    world.kitten.purrTimer = 40;
    startReaction('selfPet');
}

function drawKitten(ctx) {
    const k = world.kitten;
    const flipX = k.facing === 'left';
    const frameIdx = getAnimSpriteFrame(k);
    const px = Math.round(k.x - KITTEN_W / 2);
    const py = Math.round(k.y - KITTEN_H);
    const accessory = world.night ? null : (world.weather === 'rain' ? 'umbrella' : (world.weather === 'snow' ? 'winter' : null));

    renderSprite(ctx, SPRITES.kitten, frameIdx, px, py, {
        flipX,
        shadow: { dx: 1, dy: 1, color: PAL.shadow }
    });

    // Accessory overlay (umbrella for rain, scarf+hat for snow) — coordinates adjusted for 24×24
    if (accessory === 'umbrella') {
        const x = px, y = py;
        ctx.fillStyle = PAL.red;
        ctx.fillRect(x + 1, y - 5, 22, 2);
        ctx.fillRect(x + 3, y - 6, 18, 1);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 6, y - 5, 3, 2);
        ctx.fillRect(x + 15, y - 5, 3, 2);
        ctx.fillStyle = PAL.woodDk;
        ctx.fillRect(x + 12, y - 3, 1, 5);
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x + 1, y - 3, 22, 1);
    } else if (accessory === 'winter') {
        const x = px, y = py;
        ctx.fillStyle = PAL.red;
        ctx.fillRect(x + 3, y + 12, 18, 2);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 6, y + 12, 1, 2);
        ctx.fillRect(x + 11, y + 12, 1, 2);
        ctx.fillRect(x + 16, y + 12, 1, 2);
        ctx.fillStyle = PAL.red;
        ctx.fillRect(x + 5, y - 2, 14, 2);
        ctx.fillRect(x + 6, y - 3, 12, 1);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 5, y, 14, 1);
        ctx.fillRect(x + 10, y - 4, 3, 1);
    }

    // Purr curls when recently petted
    if (k.purrTimer > 0) {
        ctx.strokeStyle = PAL.pinkDk;
        ctx.lineWidth = 1;
        const t = 40 - k.purrTimer;
        for (let i = 0; i < 3; i++) {
            const cx = k.x + (i - 1) * 4;
            const cy = k.y - KITTEN_H - 4 - t * 0.2;
            ctx.beginPath();
            ctx.arc(cx, cy, 1.5 + i * 0.3, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// ==================== PAW PRINTS ====================

function updatePawPrints(dt) {
    for (let i = world.pawPrints.length - 1; i >= 0; i--) {
        world.pawPrints[i].life -= dt;
        if (world.pawPrints[i].life <= 0) world.pawPrints.splice(i, 1);
    }
}

function drawPawPrints(ctx) {
    for (const p of world.pawPrints) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.5;
        ctx.fillStyle = p.color || PAL.outline;
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y), 1, 1);
        ctx.fillRect(Math.round(p.x + 1), Math.round(p.y), 1, 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y + 1), 1, 1);
    }
    ctx.globalAlpha = 1;
}

// ==================== DUST PUFFS ====================

function updateDustPuffs(dt) {
    if (!world.dustPuffs) return;
    for (let i = world.dustPuffs.length - 1; i >= 0; i--) {
        const p = world.dustPuffs[i];
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) world.dustPuffs.splice(i, 1);
    }
}

function drawDustPuffs(ctx) {
    if (!world.dustPuffs) return;
    for (const p of world.dustPuffs) {
        const alpha = Math.max(0, p.life / p.maxLife) * 0.4;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;
}

// ==================== WATER RIPPLES ====================

function updateWaterRipples(dt) {
    if (!world.waterRipples) return;
    for (let i = world.waterRipples.length - 1; i >= 0; i--) {
        const r = world.waterRipples[i];
        r.life -= dt;
        r.r = r.maxR * (1 - r.life / r.maxLife);
        if (r.life <= 0) world.waterRipples.splice(i, 1);
    }
}

function drawWaterRipples(ctx) {
    if (!world.waterRipples) return;
    for (const r of world.waterRipples) {
        const alpha = Math.max(0, r.life / r.maxLife) * 0.35;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = PAL.white;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.round(r.x), Math.round(r.y), r.r, 0, TAU);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

// ==================== SWAY TILES ====================

function updateSwayTiles(dt) {
    if (!world.swayTiles) return;
    const keys = Object.keys(world.swayTiles);
    for (const key of keys) {
        const val = world.swayTiles[key];
        // Decay toward 0
        if (Math.abs(val) < 0.1) {
            delete world.swayTiles[key];
        } else {
            world.swayTiles[key] = val * (1 - 0.06 * dt);
        }
    }
}

// ==================== FLOATERS ====================
// Floaters are short-lived bits: hearts, Zs, sparkles, flying collectibles.

function spawnFloater(f) {
    world.floaters.push(f);
}

function flushFloatersOnArrive() {
    for (const f of world.floaters) {
        if (f.onArrive) f.onArrive();
    }
    world.floaters = [];
}

function updateFloaters(dt) {
    for (let i = world.floaters.length - 1; i >= 0; i--) {
        const f = world.floaters[i];
        f.life -= dt;

        if (f.flyTo) {
            // Steer toward shelf target over its life
            const t = 1 - f.life / f.maxLife;
            f.x = lerp(f.startX, f.flyTo.x, easeOut(t));
            f.y = lerp(f.startY, f.flyTo.y, easeOut(t));
        } else {
            if (f.vx != null) f.x += f.vx * dt;
            if (f.vy != null) f.y += f.vy * dt;
        }

        if (f.life <= 0) {
            if (f.onArrive) f.onArrive();
            world.floaters.splice(i, 1);
        }
    }
}

function drawFloaters(ctx) {
    for (const f of world.floaters) {
        const alpha = Math.min(1, f.life / (f.maxLife * 0.4));
        ctx.globalAlpha = Math.max(0.2, alpha);
        if (f.kind === 'heart') {
            drawHeartIcon(ctx, f.x, f.y, 4, PAL.red);
        } else if (f.kind === 'z') {
            ctx.fillStyle = PAL.sky;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('z', f.x, f.y);
        } else if (f.kind === 'mrrp') {
            ctx.fillStyle = PAL.pinkDk;
            ctx.font = 'bold 6px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('~', f.x, f.y);
        } else if (f.kind === 'flower') {
            drawFlower(ctx, f.x, f.y, f.color, true);
        } else if (f.kind === 'butterfly') {
            drawButterfly(ctx, f.x, f.y, f.color, world.sessionTick / 60);
        } else if (f.kind === 'shell') {
            drawShell(ctx, f.x, f.y, f.shape);
        } else if (f.kind === 'yarn') {
            drawYarnBall(ctx, f.x, f.y, f.color);
        } else if (f.kind === 'star') {
            drawStarIcon(ctx, f.x, f.y, 4, PAL.star);
        } else if (f.kind === 'treat') {
            drawTreat(ctx, f.x, f.y);
        } else if (f.kind === 'splash') {
            ctx.fillStyle = PAL.sea;
            ctx.fillRect(f.x - 1, f.y, 2, 1);
        } else if (f.kind === 'crumb') {
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(f.x, f.y, 1, 1);
        }
    }
    ctx.globalAlpha = 1;
}

// ==================== SHELF ====================

function drawShelf(ctx) {
    // Backdrop gradient (lav → pink)
    const g = ctx.createLinearGradient(0, 0, 0, SHELF_H);
    g.addColorStop(0, PAL.lav);
    g.addColorStop(1, PAL.pink);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME.width, SHELF_H);

    // Bottom shelf plank — layered with grain
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(0, SHELF_H - 5, GAME.width, 5);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(0, SHELF_H - 4, GAME.width, 3);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(0, SHELF_H - 4, GAME.width, 1);    // top highlight
    // Wood grain streaks across plank
    ctx.fillStyle = PAL.woodDk;
    for (let gx = 8; gx < GAME.width; gx += 40) {
        ctx.fillRect(gx, SHELF_H - 3, 14, 1);
    }
    for (let gx = 30; gx < GAME.width; gx += 48) {
        ctx.fillRect(gx, SHELF_H - 2, 10, 1);
    }
    // Plank knots
    ctx.fillStyle = PAL.woodDp;
    for (let gx = 60; gx < GAME.width; gx += 96) {
        ctx.fillRect(gx, SHELF_H - 3, 2, 2);
        ctx.fillRect(gx + 1, SHELF_H - 4, 1, 1);
    }
    // Dark bottom line
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(0, SHELF_H - 1, GAME.width, 1);
    // Outline divider above plank
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(0, SHELF_H - 6, GAME.width, 1);

    // Bins: flowers | butterflies | shells | yarn | stars | treats
    const bins = [
        { key: 'flowers',     count: 5, drawer: (ctx, x, y, filled, i) => drawFlower(ctx, x, y, i, filled) },
        { key: 'butterflies', count: 3, drawer: (ctx, x, y, filled, i) => drawButterfly(ctx, x, y, i, filled ? 0 : -1) },
        { key: 'shells',      count: 6, drawer: (ctx, x, y, filled, i) => drawShell(ctx, x, y, i, filled) },
        { key: 'yarnBalls',   count: 4, drawer: (ctx, x, y, filled, i) => drawYarnBall(ctx, x, y, i, filled) },
        { key: 'stars',       count: 8, drawer: (ctx, x, y, filled, i) => drawStarIcon(ctx, x, y, 3, filled ? PAL.star : '#d0c7b0') },
        { key: 'treats',      count: 4, drawer: (ctx, x, y, filled, i) => drawTreat(ctx, x, y, filled) }
    ];

    const pad = 2;
    const available = GAME.width - pad * 2;
    let xCursor = pad;
    const totalCount = bins.reduce((s, b) => s + b.count, 0);
    const slotW = Math.floor((available - (bins.length - 1) * 4) / totalCount);

    for (const bin of bins) {
        const binW = slotW * bin.count;
        // Bin back panel (soft cream with shadow bottom)
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(xCursor - 1, 3, binW + 2, SHELF_H - 10);
        ctx.fillStyle = 'rgba(90,64,51,0.12)';
        ctx.fillRect(xCursor - 1, SHELF_H - 8, binW + 2, 1);
        // Bin top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(xCursor - 1, 3, binW + 2, 1);
        // Bin side borders (subtle)
        ctx.fillStyle = 'rgba(90,64,51,0.25)';
        ctx.fillRect(xCursor - 1, 3, 1, SHELF_H - 10);
        ctx.fillRect(xCursor + binW, 3, 1, SHELF_H - 10);

        for (let i = 0; i < bin.count; i++) {
            const ix = xCursor + i * slotW + Math.floor(slotW / 2) - 4;
            const iy = 10;
            const filled = world.shelf[bin.key][i];
            if (!filled) ctx.globalAlpha = 0.3;
            bin.drawer(ctx, ix, iy, filled, i);
            ctx.globalAlpha = 1;
        }
        xCursor += binW + 4;
    }
}

function checkShelfFull() {
    if (world.celebrating) return;
    for (const key of Object.keys(world.shelf)) {
        for (const v of world.shelf[key]) if (!v) return;
    }
    startCelebration();
}

// ==================== CELEBRATION ====================

function startCelebration() {
    world.celebrating = { t: 0, duration: 300, confetti: [] };
    Sound.play('celebrate');
    // Seed confetti
    for (let i = 0; i < 60; i++) {
        world.celebrating.confetti.push({
            x: Math.random() * GAME.width,
            y: -10 - Math.random() * 40,
            vx: (Math.random() - 0.5) * 1.2,
            vy: 0.6 + Math.random() * 0.8,
            color: [PAL.red, PAL.yellow, PAL.green, PAL.blue, PAL.purple, PAL.pink][i % 6],
            size: 2 + Math.floor(Math.random() * 2),
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.2
        });
    }
}

function updateCelebration(dt) {
    const c = world.celebrating;
    c.t += dt;
    for (const p of c.confetti) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        if (p.y > GAME.height + 10) {
            p.y = -10;
            p.x = Math.random() * GAME.width;
        }
    }
    // Kitten happy-dance hop
    const k = world.kitten;
    k.tx = null; k.ty = null;
    k.busy = 'dance';
    const hop = Math.abs(Math.sin(c.t * 0.3)) * 6;
    k.y = PLAY_TOP + (GAME.height - PLAY_TOP) / 2 + 20 - hop;

    if (c.t >= c.duration) {
        resetShelfForNextRound();
        world.celebrating = null;
        k.busy = null;
    }
}

function drawCelebration(ctx) {
    const c = world.celebrating;
    for (const p of c.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
    }
    // Big pink heart above kitten
    const k = world.kitten;
    drawHeartIcon(ctx, k.x, k.y - 30, 8, PAL.red);
}

function resetShelfForNextRound() {
    // Drop any lingering floaters without firing onArrive — otherwise a
    // stray onArrive would pre-mark a slot in the fresh shelf.
    world.floaters = [];
    for (const key of Object.keys(world.shelf)) {
        world.shelf[key].fill(false);
    }
    world.rooms = buildRooms();
    world.night = false;
    world.timeOfDay = 'day';
    world._duskTimer = null;
    world.fx = initWorldFx();
}

// ==================== ROOM SYSTEM ====================

const ROOM_ORDER = ['garden', 'kitchen', 'bedroom', 'beach'];

function currentRoom() { return world.rooms[world.room]; }

function buildRooms() {
    return {
        garden: {
            id: 'garden',
            bg: PAL.skyDay,
            melody: 'lullabyA',
            draw: drawGarden,
            map: buildGardenMap(),
            hotspots: [
                { kind: 'pond',  x: 80,  y: 150, w: 60, h: 28, state: 0 }
            ],
            collectibles: makeGardenCollectibles(),
            yarnBall: { x: 250, y: 75, collected: false, rolling: false },
            starsSpawned: false,
            stars: [],
            ambientState: {
                birdX: -20, birdY: 0, birdBaseY: 50, birdTimer: rand(15, 25) * 60, birdActive: false,
                frogBlinkTimer: rand(5, 8) * 60, frogBlinkFrame: 0,
                fishTimer: rand(8, 15) * 60, fishActive: false, fishX: 0, fishY: 0, fishArcT: 0,
                fishSplash: []
            },
            secrets: [
                { x: 110, y: 52, w: 20, h: 20, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'bushBird',
                    reaction: () => {
                        Sound.play('twinkle');
                        for (let i = 0; i < 3; i++) {
                            spawnFloater({ kind: 'crumb', x: 115 + i*3, y: 52, vy: -0.8 - i*0.2, vx: 0.3 + i*0.1, life: 50, maxLife: 50 });
                        }
                    }
                },
                { x: 195, y: 42, w: 16, h: 16, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'rockSnail',
                    reaction: () => {
                        Sound.play('mew');
                        spawnFloater({ kind: 'crumb', x: 200, y: 48, vy: -0.2, vx: 0, life: 60, maxLife: 60 });
                        spawnFloater({ kind: 'heart', x: 200, y: 42, vy: -0.5, life: 40, maxLife: 40 });
                    }
                }
            ],
            ambient: function(dt) {
                const s = this.ambientState;
                // Bird flyby
                if (s.birdActive) {
                    s.birdX += 0.6 * dt;
                    s.birdY = s.birdBaseY + Math.sin(s.birdX * 0.04) * 4;
                    if (s.birdX > GAME.width + 20) s.birdActive = false;
                } else {
                    s.birdTimer -= dt;
                    if (s.birdTimer <= 0) {
                        s.birdTimer = rand(15, 25) * 60;
                        s.birdX = -10;
                        s.birdBaseY = PLAY_TOP + rand(15, 50);
                        s.birdY = s.birdBaseY;
                        s.birdActive = true;
                        Sound.play('ambBirdTweet');
                    }
                }
                // Frog blink
                if (s.frogBlinkFrame > 0) {
                    s.frogBlinkFrame -= dt;
                } else {
                    s.frogBlinkTimer -= dt;
                    if (s.frogBlinkTimer <= 0) {
                        s.frogBlinkTimer = rand(5, 8) * 60;
                        s.frogBlinkFrame = 15;
                    }
                }
                // Fish jump
                if (s.fishActive) {
                    s.fishArcT += dt * (1 / 30);
                    if (s.fishArcT >= 1) {
                        s.fishActive = false;
                        s.fishSplash.push({ x: s.fishX, life: 12 });
                        if (s.fishSplash.length > 5) s.fishSplash.shift();
                    }
                } else {
                    s.fishTimer -= dt;
                    if (s.fishTimer <= 0) {
                        s.fishTimer = rand(8, 15) * 60;
                        const pond = this.hotspots.find(h => h.kind === 'pond');
                        s.fishX = pond.x + rand(10, pond.w - 10);
                        s.fishY = pond.y + pond.h / 2;
                        s.fishArcT = 0;
                        s.fishActive = true;
                    }
                }
                // Decay splash particles
                for (let i = s.fishSplash.length - 1; i >= 0; i--) {
                    s.fishSplash[i].life -= dt;
                    if (s.fishSplash[i].life <= 0) s.fishSplash.splice(i, 1);
                }
            }
        },
        kitchen: {
            id: 'kitchen',
            bg: PAL.peach,
            melody: 'lullabyB',
            draw: drawKitchen,
            map: buildKitchenMap(),
            indoor: true,
            hotspots: [
                { kind: 'food',  x: 120, y: 160, w: 22, h: 14, state: 0 },
                { kind: 'milk',  x: 170, y: 160, w: 20, h: 12, state: 0 },
                { kind: 'mouse', x: 300, y: 172, w: 16, h: 14, state: 0, waved: false }
            ],
            collectibles: [], // treats are dispensed by the mouse
            yarnBall: { x: 50, y: 60, collected: false },
            starsSpawned: false,
            stars: [],
            treatsOffered: 0,
            mouseMood: ['shy', 'playful', 'sleepy'][Math.floor(Math.random() * 3)],
            secrets: [
                { x: 180, y: 100, w: 16, h: 16, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'tileSpider',
                    reaction: () => {
                        Sound.play('mew');
                        spawnFloater({ kind: 'crumb', x: 188, y: 90, vy: 0.5, vx: 0, life: 50, maxLife: 50 });
                        spawnFloater({ kind: 'mrrp', x: 188, y: 85, vy: -0.3, life: 30, maxLife: 30 });
                    }
                },
                { x: 85, y: 170, w: 20, h: 10, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'rugCoin',
                    reaction: () => {
                        Sound.play('twinkle');
                        spawnFloater({ kind: 'star', x: 95, y: 168, vy: -0.6, life: 50, maxLife: 50 });
                    }
                }
            ],
            ambientState: {
                steamParticles: [],
                steamTimer: rand(3, 5) * 60,
                mousePeekTimer: rand(20, 40) * 60, mousePeekFrame: 0,
                dustX: 200, dustY: PLAY_TOP + 10, dustTimer: 0,
                tickCounter: 0
            },
            ambient: function(dt) {
                const s = this.ambientState;
                // Steam wisps from food bowl
                s.steamTimer -= dt;
                if (s.steamTimer <= 0) {
                    s.steamTimer = rand(3, 5) * 60;
                    const food = this.hotspots.find(h => h.kind === 'food');
                    for (let i = 0; i < 3; i++) {
                        if (s.steamParticles.length < 10) {
                            s.steamParticles.push({
                                x: food.x + rand(4, food.w - 4),
                                y: food.y,
                                life: 40, maxLife: 40
                            });
                        }
                    }
                }
                for (let i = s.steamParticles.length - 1; i >= 0; i--) {
                    const p = s.steamParticles[i];
                    p.y -= 0.25 * dt;
                    p.x += Math.sin(p.life * 0.2) * 0.1 * dt;
                    p.life -= dt;
                    if (p.life <= 0) s.steamParticles.splice(i, 1);
                }
                // Mouse peek
                if (s.mousePeekFrame > 0) {
                    s.mousePeekFrame -= dt;
                } else {
                    s.mousePeekTimer -= dt;
                    if (s.mousePeekTimer <= 0) {
                        s.mousePeekTimer = rand(20, 40) * 60;
                        s.mousePeekFrame = 60;
                    }
                }
                // Dust mote
                s.dustTimer -= dt;
                if (s.dustTimer <= 0) {
                    s.dustTimer = rand(5, 8) * 60;
                    s.dustX = rand(180, 220);
                    s.dustY = PLAY_TOP + 10;
                    Sound.play('ambDrip');
                }
                s.dustY += 0.15 * dt;
                s.dustX += Math.sin(s.dustY * 0.08) * 0.1 * dt;
                // Clock tick every ~3 seconds
                s.tickCounter += dt;
                if (s.tickCounter >= 180) {
                    s.tickCounter = 0;
                    Sound.play('ambTick');
                }
            }
        },
        bedroom: {
            id: 'bedroom',
            bg: PAL.lav,
            melody: 'lullabyC',
            draw: drawBedroom,
            map: buildBedroomMap(),
            indoor: true,
            hotspots: [
                { kind: 'bed', x: 250, y: 130, w: 80, h: 40, state: 0 }
            ],
            collectibles: [],
            yarnBall: { x: 200, y: 195, collected: false },
            toyBoxFill: 0,
            starsSpawned: false,
            stars: [],
            secrets: [
                { x: 22, y: 42, w: 24, h: 24, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'toyBoxTeddy',
                    reaction: () => {
                        Sound.play('mew');
                        spawnFloater({ kind: 'heart', x: 34, y: 40, vy: -0.5, life: 50, maxLife: 50 });
                        spawnFloater({ kind: 'mrrp', x: 34, y: 36, vy: -0.3, life: 40, maxLife: 40 });
                    }
                },
                { x: 300, y: 32, w: 40, h: 20, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'windowBirds',
                    reaction: () => {
                        Sound.play('twinkle');
                        for (let i = 0; i < 4; i++) {
                            spawnFloater({ kind: 'crumb', x: 300 + i*8, y: 36 + i*2, vx: 1.0, vy: -0.1, life: 60, maxLife: 60 });
                        }
                    }
                }
            ],
            ambientState: {
                cozyMotes: [
                    { x: rand(40, 350), y: rand(PLAY_TOP + 20, 190), vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1) },
                    { x: rand(40, 350), y: rand(PLAY_TOP + 20, 190), vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1) },
                    { x: rand(40, 350), y: rand(PLAY_TOP + 20, 190), vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1) },
                    { x: rand(40, 350), y: rand(PLAY_TOP + 20, 190), vx: rand(-0.15, 0.15), vy: rand(-0.1, 0.1) }
                ],
                yarnWobbleTimer: rand(10, 15) * 60, yarnWobbleFrame: 0,
                pillowTimer: rand(8, 12) * 60, pillowFrame: 0,
                tickCounter: 0
            },
            ambient: function(dt) {
                const s = this.ambientState;
                // Cozy motes drift
                for (const m of s.cozyMotes) {
                    m.x += m.vx * dt;
                    m.y += m.vy * dt;
                    if (m.x < 20 || m.x > GAME.width - 20) m.vx = -m.vx;
                    if (m.y < PLAY_TOP + 10 || m.y > GAME.height - 10) m.vy = -m.vy;
                }
                // Yarn wobble
                if (s.yarnWobbleFrame > 0) {
                    s.yarnWobbleFrame -= dt;
                } else {
                    s.yarnWobbleTimer -= dt;
                    if (s.yarnWobbleTimer <= 0) {
                        s.yarnWobbleTimer = rand(10, 15) * 60;
                        s.yarnWobbleFrame = 8;
                    }
                }
                // Pillow puff
                if (s.pillowFrame > 0) {
                    s.pillowFrame -= dt;
                } else {
                    s.pillowTimer -= dt;
                    if (s.pillowTimer <= 0) {
                        s.pillowTimer = rand(8, 12) * 60;
                        s.pillowFrame = 10;
                    }
                }
                // Clock tick every ~4 seconds
                s.tickCounter += dt;
                if (s.tickCounter >= 240) {
                    s.tickCounter = 0;
                    Sound.play('ambTick');
                }
            }
        },
        beach: {
            id: 'beach',
            bg: PAL.sand,
            melody: 'lullabyD',
            draw: drawBeach,
            map: buildBeachMap(),
            hotspots: [
                { kind: 'waves', x: 0,  y: PLAY_TOP + 6,  w: GAME.width, h: 20, state: 0 },
                { kind: 'crab',  x: 240, y: 170, w: 20, h: 14, state: 0, offset: 0 }
            ],
            collectibles: makeBeachCollectibles(),
            yarnBall: { x: 150, y: 180, collected: false },
            starsSpawned: false,
            stars: [],
            secrets: [
                { x: 140, y: 160, w: 16, h: 16, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'sandBabyCrab',
                    reaction: () => {
                        Sound.play('mew');
                        spawnFloater({ kind: 'heart', x: 148, y: 155, vy: -0.5, life: 50, maxLife: 50 });
                        spawnFloater({ kind: 'mrrp', x: 148, y: 150, vy: -0.3, life: 30, maxLife: 30 });
                    }
                },
                { x: 275, y: 104, w: 16, h: 16, requiredTaps: 3, tapCount: 0, tapTimer: 0, found: false, kind: 'pearlShell',
                    reaction: () => {
                        Sound.play('twinkle');
                        spawnFloater({ kind: 'star', x: 283, y: 100, vy: -0.5, life: 50, maxLife: 50 });
                        spawnFloater({ kind: 'heart', x: 280, y: 96, vy: -0.6, life: 40, maxLife: 40 });
                    }
                }
            ],
            ambientState: {
                seabirdX: -20, seabirdY: 0, seabirdBaseY: 0, seabirdTimer: rand(15, 25) * 60, seabirdActive: false,
                sprayParticles: [], sprayTimer: rand(4, 8) * 60,
                sandPuffs: []
            },
            ambient: function(dt) {
                const s = this.ambientState;
                // Seabird flyby
                if (s.seabirdActive) {
                    s.seabirdX += 0.5 * dt;
                    s.seabirdY = s.seabirdBaseY + Math.sin(s.seabirdX * 0.03) * 3;
                    if (s.seabirdX > GAME.width + 20) s.seabirdActive = false;
                } else {
                    s.seabirdTimer -= dt;
                    if (s.seabirdTimer <= 0) {
                        s.seabirdTimer = rand(15, 25) * 60;
                        s.seabirdX = -10;
                        s.seabirdBaseY = PLAY_TOP + rand(10, 35);
                        s.seabirdY = s.seabirdBaseY;
                        s.seabirdActive = true;
                        Sound.play('ambGull');
                    }
                }
                // Wave spray
                s.sprayTimer -= dt;
                if (s.sprayTimer <= 0) {
                    s.sprayTimer = rand(4, 8) * 60;
                    const sx = rand(20, GAME.width - 20);
                    for (let i = 0; i < 3; i++) {
                        if (s.sprayParticles.length < 10) {
                            s.sprayParticles.push({
                                x: sx + rand(-6, 6), y: PLAY_TOP + rand(46, 54),
                                vy: -rand(0.2, 0.5), life: 25, maxLife: 25
                            });
                        }
                    }
                }
                for (let i = s.sprayParticles.length - 1; i >= 0; i--) {
                    const p = s.sprayParticles[i];
                    p.y += p.vy * dt;
                    p.life -= dt;
                    if (p.life <= 0) s.sprayParticles.splice(i, 1);
                }
                // Sand puffs near walking kitten
                const k = world.kitten;
                if (k.tx != null && k.y > PLAY_TOP + 56) {
                    if (Math.random() < 0.12) {
                        if (s.sandPuffs.length < 10) {
                            s.sandPuffs.push({
                                x: k.x + rand(-3, 3), y: k.y + rand(2, 5),
                                life: 18, maxLife: 18
                            });
                        }
                    }
                }
                for (let i = s.sandPuffs.length - 1; i >= 0; i--) {
                    const p = s.sandPuffs[i];
                    p.y -= 0.08 * dt;
                    p.life -= dt;
                    if (p.life <= 0) s.sandPuffs.splice(i, 1);
                }
            }
        }
    };
}

function makeGardenCollectibles() {
    // 5 flowers spread across the top-down field
    const positions = [
        { x: 40,  y: 180 },
        { x: 170, y: 90  },
        { x: 220, y: 195 },
        { x: 305, y: 135 },
        { x: 360, y: 165 }
    ];
    const flowers = positions.map((p, i) => ({
        kind: 'flower', x: p.x, y: p.y, color: i, collected: false
    }));
    // 3 butterflies drifting in sine paths
    const butters = [];
    for (let i = 0; i < 3; i++) {
        butters.push({
            kind: 'butterfly',
            baseX: 40 + i * 110,
            baseY: 90 + i * 10,
            t: i * 2.1,
            color: i,
            collected: false,
            x: 0, y: 0,
            onKitten: 0
        });
    }
    return [...flowers, ...butters];
}

function makeBeachCollectibles() {
    // Shells scattered across the sandy area below the wave line (y >= 90)
    const positions = [
        { x: 35,  y: 105 }, { x: 95,  y: 175 }, { x: 145, y: 130 },
        { x: 215, y: 195 }, { x: 275, y: 110 }, { x: 350, y: 160 }
    ];
    return positions.map((p, i) => ({
        kind: 'shell', x: p.x, y: p.y, shape: i, collected: false
    }));
}

// ---- Room scenery drawers ----

function drawGarden(ctx) {
    const room = world.rooms.garden;
    drawTileLayer(ctx, room.map, 'ground');
    drawTileLayer(ctx, room.map, 'decoration');

    // Decorative props (purely visual, no collision)
    drawGardenDeco(ctx);

    // Trees (trunks/shadows — foliage drawn in overlay after kitten)
    drawTree(ctx, 30, 70);
    drawTree(ctx, 350, 80);
    drawTree(ctx, 200, 50);

    // Bushes
    drawBush(ctx, 110, 60);
    drawBush(ctx, 280, 70);
    drawBush(ctx, 60, 200);
    drawBush(ctx, 320, 200);

    // Pond shimmer
    const pond = room.hotspots.find(h => h.kind === 'pond');
    drawPond(ctx, pond);

    // Ambient effects
    const s = room.ambientState;
    if (s) {
        // Bird flyby
        if (s.birdActive) {
            const bx = Math.round(s.birdX);
            const by = Math.round(s.birdY);
            // Shadow on ground
            ctx.fillStyle = PAL.shadow;
            ctx.fillRect(bx, PLAY_TOP + 120, 3, 1);
            // Bird body
            ctx.fillStyle = PAL.outline;
            ctx.fillRect(bx + 1, by, 2, 1);
            // Wings (flap using sessionTick)
            const wingUp = Math.sin(world.sessionTick * 0.3) > 0;
            ctx.fillRect(bx, by + (wingUp ? -1 : 1), 1, 1);
            ctx.fillRect(bx + 3, by + (wingUp ? -1 : 1), 1, 1);
        }
        // Fish jump
        if (s.fishActive) {
            const t = s.fishArcT;
            const fx = Math.round(s.fishX);
            const fy = Math.round(s.fishY - Math.sin(t * Math.PI) * 10);
            ctx.fillStyle = PAL.orange;
            ctx.fillRect(fx, fy, 2, 1);
            ctx.fillStyle = PAL.outline;
            ctx.fillRect(fx + 2, fy, 1, 1);
        }
        // Fish splash particles
        for (const sp of s.fishSplash) {
            const a = sp.life / 12;
            ctx.globalAlpha = a;
            ctx.fillStyle = PAL.white;
            ctx.fillRect(Math.round(sp.x - 1), Math.round(s.fishY), 1, 1);
            ctx.fillRect(Math.round(sp.x + 2), Math.round(s.fishY), 1, 1);
            ctx.globalAlpha = 1;
        }
    }
}

function drawKitchen(ctx) {
    const room = world.rooms.kitchen;
    drawTileLayer(ctx, room.map, 'ground');
    drawTileLayer(ctx, room.map, 'decoration');

    // Decorative props
    drawKitchenDeco(ctx);

    // Mouse hole — round hole on the floor (drawn on top for smooth ellipse)
    ctx.fillStyle = PAL.outline;
    ctx.beginPath();
    ctx.ellipse(330, 175, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.woodDk;
    ctx.beginPath();
    ctx.ellipse(330, 173, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient effects
    const s = room.ambientState;
    if (s) {
        // Steam wisps
        for (const p of s.steamParticles) {
            const a = p.life / p.maxLife;
            ctx.globalAlpha = a * 0.5;
            ctx.fillStyle = PAL.white;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            ctx.globalAlpha = 1;
        }
        // Mouse peek (small brown nose at the hole)
        if (s.mousePeekFrame > 0) {
            const peekT = s.mousePeekFrame / 60;
            const peekSize = peekT > 0.8 ? 1 : peekT > 0.2 ? 2 : 1;
            ctx.fillStyle = PAL.mouseDk;
            ctx.beginPath();
            ctx.arc(330, 173, peekSize, 0, Math.PI * 2);
            ctx.fill();
            if (peekSize > 1) {
                // Tiny eye
                ctx.fillStyle = PAL.eye;
                ctx.fillRect(329, 172, 1, 1);
            }
        }
        // Dust mote
        if (s.dustY < GAME.height) {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = PAL.white;
            ctx.fillRect(Math.round(s.dustX), Math.round(s.dustY), 1, 1);
            ctx.globalAlpha = 1;
        }
    }
}

function drawBedroom(ctx) {
    const room = world.rooms.bedroom;
    drawTileLayer(ctx, room.map, 'ground');
    drawTileLayer(ctx, room.map, 'decoration');

    // Decorative props
    drawBedroomDeco(ctx);

    // Cozy oval rug in the center (smooth ellipse on top of tiles)
    ctx.fillStyle = PAL.pink;
    ctx.beginPath();
    ctx.ellipse(160, 130, 50, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.red;
    ctx.beginPath();
    ctx.ellipse(160, 130, 44, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.pink;
    ctx.beginPath();
    ctx.ellipse(160, 130, 36, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bed (with pillow puff ambient)
    const s = room.ambientState;
    const pillowOff = (s && s.pillowFrame > 0) ? Math.round(Math.sin(s.pillowFrame * 0.8) * 1) : 0;
    drawBed(ctx, room.hotspots.find(h => h.kind === 'bed'), pillowOff);
    // Toy box (top-left corner of the play area)
    drawToyBox(ctx, 30, 50, room.toyBoxFill);

    // Ambient effects
    if (s) {
        // Cozy motes
        for (const m of s.cozyMotes) {
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = PAL.pink;
            ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
            ctx.globalAlpha = 1;
        }
        // Yarn wobble offset stored for drawCollectibles to pick up
        if (s.yarnWobbleFrame > 0) {
            room._yarnWobbleOff = Math.round(Math.sin(s.yarnWobbleFrame * 1.2) * 1);
        } else {
            room._yarnWobbleOff = 0;
        }
    }
}

function drawBeach(ctx) {
    const room = world.rooms.beach;
    drawTileLayer(ctx, room.map, 'ground');
    drawTileLayer(ctx, room.map, 'decoration');

    // Decorative props
    drawBeachDeco(ctx);

    // Ambient effects
    const s = room.ambientState;
    if (s) {
        // Seabird flyby
        if (s.seabirdActive) {
            const bx = Math.round(s.seabirdX);
            const by = Math.round(s.seabirdY);
            // Shadow on water
            ctx.fillStyle = PAL.shadow;
            ctx.fillRect(bx, PLAY_TOP + 40, 3, 1);
            // Bird body (white/grey seabird)
            ctx.fillStyle = PAL.stone;
            ctx.fillRect(bx + 1, by, 2, 1);
            ctx.fillStyle = PAL.white;
            const wingUp = Math.sin(world.sessionTick * 0.25) > 0;
            ctx.fillRect(bx, by + (wingUp ? -1 : 1), 1, 1);
            ctx.fillRect(bx + 3, by + (wingUp ? -1 : 1), 1, 1);
        }
        // Wave spray
        for (const p of s.sprayParticles) {
            const a = p.life / p.maxLife;
            ctx.globalAlpha = a * 0.6;
            ctx.fillStyle = PAL.white;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            ctx.globalAlpha = 1;
        }
        // Sand puffs
        for (const p of s.sandPuffs) {
            const a = p.life / p.maxLife;
            ctx.globalAlpha = a * 0.4;
            ctx.fillStyle = PAL.sandDk;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
            ctx.globalAlpha = 1;
        }
    }
}

// ==================== ROOM DECORATIONS ====================
// Purely visual props — no hit-box, no collision. Placed in corners and
// edges to avoid the kitten's main walking zones.

function drawGardenDeco(ctx) {
    // Wooden signpost (top-right, near but not overlapping trees)
    const sx = 362, sy = 48;
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(sx, sy, 2, 10);            // post
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(sx - 5, sy + 1, 12, 5);    // sign plank
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(sx - 5, sy + 1, 12, 1);    // top edge
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(sx - 4, sy + 2, 10, 1);    // highlight
    ctx.fillStyle = PAL.pink;                // tiny heart on the sign
    ctx.fillRect(sx - 1, sy + 3, 1, 1);
    ctx.fillRect(sx + 1, sy + 3, 1, 1);
    ctx.fillRect(sx, sy + 4, 2, 1);
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(sx - 2, sy + 10, 6, 1);    // ground shadow

    // Watering can near bottom edge (left-mid)
    const wx = 155, wy = 128;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(wx + 1, wy + 8, 10, 1);
    ctx.fillStyle = PAL.sky;                 // can body
    ctx.fillRect(wx, wy + 2, 10, 6);
    ctx.fillStyle = PAL.skyLt;
    ctx.fillRect(wx, wy + 2, 2, 5);          // left highlight
    ctx.fillStyle = PAL.skyDk;
    ctx.fillRect(wx, wy + 7, 10, 1);         // base shadow
    ctx.fillStyle = PAL.skyDk;
    ctx.fillRect(wx + 1, wy + 1, 2, 1);      // opening rim
    ctx.fillRect(wx + 10, wy + 3, 3, 1);     // spout
    ctx.fillRect(wx + 12, wy + 4, 1, 1);
    ctx.fillStyle = PAL.sky;
    ctx.fillRect(wx + 10, wy + 4, 3, 1);
    // Handle arch (3 pixel dots)
    ctx.fillStyle = PAL.skyDk;
    ctx.fillRect(wx + 2, wy, 1, 1);
    ctx.fillRect(wx + 3, wy, 2, 1);
    ctx.fillRect(wx + 5, wy + 1, 1, 1);
    ctx.fillRect(wx + 1, wy + 1, 1, 1);

    // Rock garden cluster (top-center, between trees)
    const rx = 240, ry = 58;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(rx, ry + 6, 18, 1);
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(rx, ry + 2, 6, 5);
    ctx.fillRect(rx + 7, ry, 5, 7);
    ctx.fillRect(rx + 13, ry + 3, 5, 4);
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(rx, ry + 2, 5, 1);
    ctx.fillRect(rx + 7, ry, 4, 1);
    ctx.fillRect(rx + 13, ry + 3, 4, 1);
    ctx.fillStyle = PAL.stoneDk;
    ctx.fillRect(rx, ry + 6, 6, 1);
    ctx.fillRect(rx + 7, ry + 6, 5, 1);
    ctx.fillRect(rx + 13, ry + 6, 5, 1);
    // Moss on rocks
    ctx.fillStyle = PAL.moss;
    ctx.fillRect(rx + 2, ry + 4, 1, 1);
    ctx.fillRect(rx + 9, ry + 2, 1, 1);

    // Mushroom cluster (bottom-right edge)
    const mx = 355, my = 185;
    // Shadow
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(mx - 1, my + 6, 10, 1);
    // Big mushroom
    ctx.fillStyle = PAL.cream;               // stem
    ctx.fillRect(mx + 1, my + 3, 2, 4);
    ctx.fillStyle = PAL.red;                 // cap
    ctx.fillRect(mx, my + 1, 4, 3);
    ctx.fillRect(mx + 1, my, 2, 1);
    ctx.fillStyle = PAL.redDk;               // cap shadow
    ctx.fillRect(mx, my + 3, 4, 1);
    ctx.fillStyle = PAL.white;               // spots
    ctx.fillRect(mx + 1, my + 2, 1, 1);
    ctx.fillRect(mx + 2, my + 1, 1, 1);
    // Small mushroom
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(mx + 6, my + 4, 1, 2);
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(mx + 5, my + 3, 3, 2);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(mx + 6, my + 3, 1, 1);

    // Scattered fallen leaves
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(150, 95, 2, 1);
    ctx.fillRect(151, 96, 1, 1);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(220, 180, 2, 1);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(300, 170, 1, 2);
}

function drawKitchenDeco(ctx) {
    // Wall clock (top-center)
    const cx = 180, cy = 34;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(cx - 5, cy + 11, 12, 1);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(cx - 6, cy, 13, 11);        // outer frame
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(cx - 5, cy + 1, 11, 9);     // face
    ctx.fillStyle = PAL.woodDk;              // numeral ticks
    ctx.fillRect(cx, cy + 1, 1, 1);
    ctx.fillRect(cx, cy + 9, 1, 1);
    ctx.fillRect(cx - 5, cy + 5, 1, 1);
    ctx.fillRect(cx + 5, cy + 5, 1, 1);
    // Hands pointing up-right (like 2 o'clock)
    ctx.fillRect(cx, cy + 5, 1, 1);
    ctx.fillRect(cx + 1, cy + 4, 1, 1);
    ctx.fillRect(cx, cy + 4, 1, 1);
    ctx.fillRect(cx - 1, cy + 5, 1, 1);
    ctx.fillRect(cx, cy + 6, 1, 1);
    // Pendulum
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(cx, cy + 11, 1, 3);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(cx - 1, cy + 14, 3, 2);

    // Small table with teacup (top-left area)
    const tx = 30, ty = 50;
    // Table shadow
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(tx - 1, ty + 12, 18, 1);
    // Table legs
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(tx + 1, ty + 6, 2, 6);
    ctx.fillRect(tx + 13, ty + 6, 2, 6);
    // Tabletop
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(tx, ty + 4, 16, 3);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(tx, ty + 4, 16, 1);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(tx, ty + 6, 16, 1);
    // Teacup on table
    ctx.fillStyle = PAL.white;
    ctx.fillRect(tx + 3, ty, 4, 4);
    ctx.fillStyle = PAL.creamDk;             // shadow side
    ctx.fillRect(tx + 6, ty + 1, 1, 3);
    // Saucer
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(tx + 2, ty + 3, 6, 1);
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(tx + 2, ty + 4, 6, 1);
    // Tea (dark liquid on top)
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(tx + 4, ty + 1, 2, 1);
    // Handle
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(tx + 7, ty + 1, 1, 2);
    // Steam (subtle)
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(tx + 5, ty - 2, 1, 1);
    ctx.fillRect(tx + 4, ty - 3, 1, 1);
    // Second saucer item: spoon
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(tx + 9, ty + 3, 3, 1);
    ctx.fillRect(tx + 12, ty + 3, 1, 2);

    // Potted plant (top-right)
    const px = 340, py = 40;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(px + 1, py + 14, 10, 1);
    // Pot
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(px, py + 8, 12, 6);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(px + 1, py + 9, 10, 4);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(px, py + 7, 12, 2);         // rim
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(px + 1, py + 7, 10, 1);     // rim highlight
    // Plant leaves
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(px + 2, py + 2, 2, 5);
    ctx.fillRect(px + 6, py, 2, 7);
    ctx.fillRect(px + 9, py + 2, 2, 5);
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(px + 2, py + 2, 1, 3);
    ctx.fillRect(px + 6, py, 1, 4);
    ctx.fillRect(px + 9, py + 2, 1, 3);
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(px + 6, py, 1, 1);
    // Flower bud
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(px + 5, py + 1, 1, 1);

    // Jar shelf (right wall)
    const jx = 340, jy = 100;
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(jx - 2, jy + 8, 18, 2);     // shelf plank
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(jx - 2, jy + 8, 18, 1);
    // Jar 1 (honey)
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(jx, jy + 3, 3, 5);
    ctx.fillStyle = PAL.yellowLt;
    ctx.fillRect(jx, jy + 3, 1, 4);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(jx, jy + 2, 3, 1);
    // Jar 2 (pink jam)
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(jx + 5, jy + 3, 3, 5);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(jx + 5, jy + 3, 1, 4);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(jx + 5, jy + 2, 3, 1);
    // Jar 3 (green herbs)
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(jx + 10, jy + 3, 3, 5);
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(jx + 10, jy + 3, 1, 4);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(jx + 10, jy + 2, 3, 1);

    // Door mat (bottom-left entry)
    const mx = 20, my = 190;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(mx, my + 4, 22, 1);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(mx, my, 22, 4);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(mx, my, 22, 1);
    ctx.fillRect(mx, my + 3, 22, 1);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(mx, my + 2, 22, 1);
    // Text-like accent
    ctx.fillStyle = PAL.white;
    ctx.fillRect(mx + 9, my + 1, 1, 1);
    ctx.fillRect(mx + 11, my + 1, 1, 1);
    ctx.fillRect(mx + 13, my + 1, 1, 1);
}

function drawBedroomDeco(ctx) {
    // Nightstand with lamp (next to bed on left side)
    const nx = 220, ny = 130;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(nx, ny + 20, 20, 1);
    // Nightstand body
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(nx, ny + 8, 20, 12);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(nx + 1, ny + 9, 18, 10);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(nx + 1, ny + 9, 18, 1);
    // Drawer line
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(nx + 1, ny + 14, 18, 1);
    // Drawer handle
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(nx + 9, ny + 11, 2, 1);
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(nx + 9, ny + 12, 2, 1);
    // Lamp base
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(nx + 7, ny + 6, 6, 2);
    // Lamp post
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(nx + 9, ny, 2, 6);
    // Lamp shade
    ctx.fillStyle = PAL.yellowLt;
    ctx.fillRect(nx + 5, ny - 4, 10, 5);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(nx + 5, ny - 4, 10, 1);
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(nx + 5, ny + 1, 10, 1);
    // Warm light halo
    ctx.fillStyle = 'rgba(255,224,122,0.12)';
    ctx.fillRect(nx - 5, ny - 8, 30, 20);

    // Picture frame on wall (top-left above toy box)
    const fx = 80, fy = 40;
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(fx, fy, 24, 14);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(fx + 1, fy + 1, 22, 12);
    ctx.fillStyle = PAL.sky;                 // sky in picture
    ctx.fillRect(fx + 2, fy + 2, 20, 6);
    ctx.fillStyle = PAL.grass;               // grass in picture
    ctx.fillRect(fx + 2, fy + 8, 20, 4);
    ctx.fillStyle = PAL.white;               // sun
    ctx.fillRect(fx + 18, fy + 3, 2, 2);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(fx + 19, fy + 3, 1, 1);
    // Tiny flower in picture
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(fx + 6, fy + 9, 1, 1);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(fx + 6, fy + 10, 1, 1);
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(fx + 6, fy + 11, 1, 1);
    // Frame shadow
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(fx + 1, fy + 14, 24, 1);

    // Scattered toy blocks (left area)
    const bx = 80, by = 105;
    // Block 1 (blue)
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(bx - 1, by + 8, 6, 1);
    ctx.fillStyle = PAL.blue;
    ctx.fillRect(bx, by + 2, 6, 6);
    ctx.fillStyle = PAL.skyLt;
    ctx.fillRect(bx, by + 2, 6, 1);
    ctx.fillRect(bx, by + 2, 1, 6);
    ctx.fillStyle = PAL.skyDk;
    ctx.fillRect(bx, by + 7, 6, 1);
    ctx.fillStyle = PAL.white;               // letter A
    ctx.fillRect(bx + 2, by + 4, 2, 1);
    ctx.fillRect(bx + 2, by + 4, 1, 3);
    ctx.fillRect(bx + 3, by + 4, 1, 3);
    // Block 2 (red, rotated feel)
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(bx + 6, by + 10, 6, 1);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(bx + 7, by + 4, 6, 6);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(bx + 7, by + 4, 6, 1);
    ctx.fillRect(bx + 7, by + 4, 1, 6);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(bx + 7, by + 9, 6, 1);
    ctx.fillStyle = PAL.white;               // number 1
    ctx.fillRect(bx + 9, by + 5, 1, 4);
    ctx.fillRect(bx + 8, by + 6, 1, 1);

    // Small bookshelf (middle-top)
    const skx = 150, sky = 45;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(skx + 1, sky + 22, 20, 1);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(skx, sky, 22, 22);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(skx + 1, sky + 1, 20, 20);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(skx + 1, sky + 10, 20, 1);  // shelf divider
    // Books (top shelf)
    ctx.fillStyle = PAL.blue;
    ctx.fillRect(skx + 2, sky + 2, 2, 8);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(skx + 5, sky + 3, 2, 7);
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(skx + 8, sky + 2, 2, 8);
    ctx.fillStyle = PAL.purple;
    ctx.fillRect(skx + 11, sky + 3, 2, 7);
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(skx + 14, sky + 2, 2, 8);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(skx + 17, sky + 3, 2, 7);
    // Books (bottom shelf)
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(skx + 2, sky + 12, 2, 8);
    ctx.fillStyle = PAL.sky;
    ctx.fillRect(skx + 5, sky + 13, 2, 7);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(skx + 8, sky + 12, 2, 8);
    // Book page highlights
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(skx + 4, sky + 3, 1, 7);
    ctx.fillRect(skx + 10, sky + 2, 1, 8);
    ctx.fillRect(skx + 16, sky + 2, 1, 8);

    // Stuffed animal in corner (teddy)
    const tdx = 28, tdy = 180;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(tdx, tdy + 8, 10, 1);
    // Body
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(tdx + 1, tdy + 2, 8, 6);
    // Head
    ctx.fillRect(tdx + 2, tdy - 2, 6, 5);
    // Ears
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(tdx + 2, tdy - 3, 2, 2);
    ctx.fillRect(tdx + 6, tdy - 3, 2, 2);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(tdx + 2, tdy - 2, 1, 1);
    ctx.fillRect(tdx + 7, tdy - 2, 1, 1);
    // Eyes + nose
    ctx.fillStyle = PAL.eye;
    ctx.fillRect(tdx + 3, tdy, 1, 1);
    ctx.fillRect(tdx + 6, tdy, 1, 1);
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(tdx + 4, tdy + 1, 2, 1);
    // Belly highlight
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(tdx + 3, tdy + 3, 4, 2);
    // Bow tie
    ctx.fillStyle = PAL.red;
    ctx.fillRect(tdx + 3, tdy + 2, 4, 1);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(tdx + 4, tdy + 2, 1, 1);
}

function drawBeachDeco(ctx) {
    // Sandcastle (right-mid)
    const sx = 295, sy = 150;
    // Shadow
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(sx - 2, sy + 22, 24, 1);
    // Base
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(sx, sy + 14, 20, 8);
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(sx, sy + 21, 20, 1);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(sx, sy + 14, 20, 1);
    // Left tower
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(sx, sy + 8, 6, 8);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(sx, sy + 8, 1, 8);
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(sx + 5, sy + 8, 1, 8);
    // Middle tall tower
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(sx + 7, sy + 4, 6, 12);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(sx + 7, sy + 4, 1, 12);
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(sx + 12, sy + 4, 1, 12);
    // Right tower
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(sx + 14, sy + 8, 6, 8);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(sx + 14, sy + 8, 1, 8);
    // Crenellations (notches on top)
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(sx + 1, sy + 8, 1, 1);
    ctx.fillRect(sx + 3, sy + 8, 1, 1);
    ctx.fillRect(sx + 8, sy + 4, 1, 1);
    ctx.fillRect(sx + 10, sy + 4, 1, 1);
    ctx.fillRect(sx + 12, sy + 4, 1, 1);
    ctx.fillRect(sx + 15, sy + 8, 1, 1);
    ctx.fillRect(sx + 17, sy + 8, 1, 1);
    // Door on middle tower
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(sx + 9, sy + 12, 2, 4);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(sx + 9, sy + 12, 2, 1);
    // Flag on tallest tower
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(sx + 10, sy, 1, 5);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(sx + 7, sy, 3, 2);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(sx + 7, sy + 1, 3, 1);

    // Driftwood (mid-left)
    const dx = 180, dy = 140;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(dx, dy + 4, 28, 1);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(dx, dy, 28, 4);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(dx, dy, 28, 2);
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(dx + 6, dy + 1, 1, 2);
    ctx.fillRect(dx + 17, dy + 1, 1, 2);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(dx + 2, dy, 3, 1);
    ctx.fillRect(dx + 20, dy, 4, 1);
    // Knot / tip
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(dx - 1, dy + 1, 1, 2);
    ctx.fillRect(dx + 28, dy + 1, 1, 2);

    // Beach umbrella (top-right, by the water edge)
    const ux = 330, uy = 65;
    // Pole
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(ux + 9, uy, 1, 18);
    // Canopy (half-circle of stripes)
    ctx.fillStyle = PAL.red;
    ctx.fillRect(ux, uy + 4, 19, 4);
    ctx.fillRect(ux + 1, uy + 3, 17, 1);
    ctx.fillRect(ux + 3, uy + 2, 13, 1);
    ctx.fillRect(ux + 5, uy + 1, 9, 1);
    ctx.fillRect(ux + 8, uy, 3, 1);
    ctx.fillStyle = PAL.white;               // alternating stripes
    ctx.fillRect(ux + 3, uy + 4, 3, 4);
    ctx.fillRect(ux + 9, uy + 4, 1, 4);
    ctx.fillRect(ux + 13, uy + 4, 3, 4);
    ctx.fillRect(ux + 5, uy + 2, 1, 1);
    ctx.fillRect(ux + 11, uy + 1, 1, 1);
    ctx.fillRect(ux + 13, uy + 3, 1, 1);
    ctx.fillStyle = PAL.redDk;               // shadow band
    ctx.fillRect(ux + 1, uy + 7, 17, 1);
    // Top knob
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(ux + 9, uy - 1, 2, 1);

    // Seaweed clump (in water at top-left)
    const wvx = 90, wvy = 40;
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(wvx, wvy + 2, 1, 6);
    ctx.fillRect(wvx + 2, wvy + 1, 1, 7);
    ctx.fillRect(wvx + 4, wvy + 3, 1, 5);
    ctx.fillRect(wvx + 1, wvy + 4, 1, 3);
    ctx.fillRect(wvx + 3, wvy + 5, 1, 3);
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(wvx + 2, wvy + 1, 1, 1);
    ctx.fillRect(wvx, wvy + 2, 1, 1);
    ctx.fillRect(wvx + 4, wvy + 3, 1, 1);

    // Shells scattered on sand
    // Spiral shell
    const shx = 110, shy = 180;
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(shx, shy + 4, 5, 1);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(shx, shy + 1, 4, 3);
    ctx.fillRect(shx + 1, shy, 3, 1);
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(shx + 1, shy + 2, 2, 1);
    ctx.fillRect(shx, shy + 3, 4, 1);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(shx + 1, shy, 2, 1);
    // Clam shell
    const cl = { x: 140, y: 185 };
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(cl.x, cl.y + 3, 6, 1);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cl.x, cl.y + 1, 6, 2);
    ctx.fillRect(cl.x + 1, cl.y, 4, 1);
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(cl.x + 1, cl.y + 2, 4, 1);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(cl.x + 2, cl.y + 1, 2, 1);
    // Small shell fragment
    ctx.fillStyle = PAL.sandDp;
    ctx.fillRect(220, 188, 1, 1);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(240, 196, 2, 1);

    // Small tidal pool (mid-bottom sand)
    const tpx = 230, tpy = 180;
    ctx.fillStyle = PAL.sandDp;
    ctx.beginPath();
    ctx.ellipse(tpx, tpy, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.sea;
    ctx.beginPath();
    ctx.ellipse(tpx, tpy, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.seaLt;
    ctx.fillRect(tpx - 3, tpy - 1, 3, 1);
    ctx.fillStyle = PAL.white;               // tiny sparkle
    ctx.fillRect(tpx + 3, tpy, 1, 1);
}

function drawTree(ctx, x, y) {
    // Top-down tree: layered canopy with leaf-cluster bumps, visible trunk,
    // light/shadow shading, and a soft oval shadow on the ground.
    // Ground shadow
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 13, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Darkest outer canopy layer (main silhouette)
    ctx.fillStyle = PAL.mintDp;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    // Mid layer
    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    // Leaf cluster bumps on upper-left (lit side)
    ctx.fillStyle = PAL.grass;
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 7, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 4, 0, Math.PI * 2);
    ctx.arc(x - 5, y + 1, 3, 0, Math.PI * 2);
    ctx.fill();
    // Bright highlights on top of clusters
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x - 4, y - 5, 2, 1);
    ctx.fillRect(x - 1, y - 6, 2, 1);
    ctx.fillRect(x + 3, y - 4, 2, 1);
    ctx.fillRect(x - 6, y - 1, 1, 1);
    // Leaf-edge silhouettes at canopy perimeter
    ctx.fillStyle = PAL.mintDp;
    ctx.fillRect(x + 10, y - 4, 1, 1);
    ctx.fillRect(x - 11, y + 2, 1, 1);
    ctx.fillRect(x + 8, y + 8, 1, 1);
    ctx.fillRect(x - 8, y - 7, 1, 1);
    // Trunk peeking through center with bark lines
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x - 1, y - 1, 1, 1);
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(x, y + 1, 2, 1);
}

function drawBush(ctx, x, y) {
    // Soft shadow
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 6, 9, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Outer irregular lobes (dark)
    ctx.fillStyle = PAL.mintDp;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 1, 6, 0, Math.PI * 2);
    ctx.arc(x - 5, y - 1, 6, 0, Math.PI * 2);
    ctx.arc(x + 3, y + 3, 5, 0, Math.PI * 2);
    ctx.arc(x - 3, y + 3, 5, 0, Math.PI * 2);
    ctx.fill();
    // Mid-tone fill
    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.arc(x, y - 1, 6, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 2, 4, 0, Math.PI * 2);
    ctx.arc(x - 4, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Light leaf clusters on top
    ctx.fillStyle = PAL.grass;
    ctx.beginPath();
    ctx.arc(x - 2, y - 3, 3, 0, Math.PI * 2);
    ctx.arc(x + 2, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Bright highlight specks
    ctx.fillStyle = PAL.grassLt;
    ctx.fillRect(x - 3, y - 4, 1, 1);
    ctx.fillRect(x + 1, y - 4, 1, 1);
    ctx.fillRect(x + 4, y - 3, 1, 1);
    // Berry clusters (deep red + pink highlight)
    ctx.fillStyle = PAL.berry;
    ctx.fillRect(x - 1, y - 3, 1, 1);
    ctx.fillRect(x + 3, y - 1, 1, 1);
    ctx.fillRect(x - 4, y + 1, 1, 1);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x - 1, y - 3, 1, 1);  // pink sits atop the berry for highlight
    ctx.fillRect(x + 3, y - 1, 1, 1);
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(x - 4, y + 1, 1, 1);
}

function drawPond(ctx, pond) {
    // Rocky edge (darker ring) - irregular sand-stone dots around perimeter
    ctx.fillStyle = PAL.stoneDk;
    const cx = pond.x + pond.w / 2;
    const cy = pond.y + pond.h / 2;
    // Water body (main ellipse)
    ctx.fillStyle = PAL.sea;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mid-depth band
    ctx.fillStyle = PAL.seaMd;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, pond.w / 2 - 3, pond.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Deep center
    ctx.fillStyle = PAL.seaDk;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, pond.w / 2 - 6, pond.h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rocky edge pebbles scattered around perimeter
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(pond.x + 2, pond.y + 6, 2, 1);
    ctx.fillRect(pond.x + pond.w - 4, pond.y + 8, 2, 1);
    ctx.fillRect(pond.x + pond.w / 2 - 2, pond.y, 2, 1);
    ctx.fillRect(pond.x + 6, pond.y + pond.h - 1, 2, 1);
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(pond.x + 2, pond.y + 6, 1, 1);
    ctx.fillRect(pond.x + pond.w - 4, pond.y + 8, 1, 1);
    // Lily pad 1 (larger, with detail)
    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.arc(pond.x + 12, pond.y + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.grass;
    ctx.beginPath();
    ctx.arc(pond.x + 12, pond.y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    // Lily pad notch (slice in the leaf)
    ctx.fillStyle = PAL.seaDk;
    ctx.fillRect(pond.x + 12, pond.y + 9, 1, 2);
    // Lily flower petals
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(pond.x + 11, pond.y + 8, 2, 2);
    ctx.fillRect(pond.x + 10, pond.y + 9, 1, 1);
    ctx.fillRect(pond.x + 13, pond.y + 9, 1, 1);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(pond.x + 11, pond.y + 8, 1, 1);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(pond.x + 12, pond.y + 9, 1, 1);
    // Lily pad 2 (smaller, on other side)
    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.arc(pond.x + pond.w - 10, pond.y + pond.h / 2 + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(pond.x + pond.w - 11, pond.y + pond.h / 2 + 3, 3, 2);
    // Water plant reed
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(pond.x + 4, pond.y + 14, 1, 4);
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(pond.x + 4, pond.y + 14, 1, 1);
    ctx.fillRect(pond.x + 5, pond.y + 15, 1, 1);
    // Ripples (animated)
    ctx.strokeStyle = PAL.cream;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const r = (world.sessionTick * 0.5) % 10;
    ctx.ellipse(pond.x + pond.w / 2 + 6, pond.y + pond.h / 2, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Static sparkle
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cx - 4, cy - 4, 1, 1);
    ctx.fillRect(cx + 8, cy + 1, 1, 1);
}

function drawBed(ctx, bed, pillowOff) {
    const pOff = pillowOff || 0;
    // Bed frame (dark wood base)
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(bed.x, bed.y + bed.h - 12, bed.w, 12);
    // Frame highlight (top edge)
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(bed.x + 2, bed.y + bed.h - 10, bed.w - 4, 6);
    // Frame wood grain
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(bed.x + 8, bed.y + bed.h - 8, bed.w - 16, 1);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(bed.x + 4, bed.y + bed.h - 10, 6, 1);
    // Headboard (carved detail)
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(bed.x + bed.w - 6, bed.y, 6, bed.h);
    // Headboard carved scallops
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(bed.x + bed.w - 5, bed.y + 2, 4, 2);
    ctx.fillRect(bed.x + bed.w - 5, bed.y + 8, 4, 2);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(bed.x + bed.w - 5, bed.y + 2, 2, 1);
    // Headboard trim
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(bed.x + bed.w - 6, bed.y + bed.h - 13, 6, 1);
    // Pillow (fluffy, with ambient sway)
    ctx.fillStyle = PAL.white;
    ctx.fillRect(bed.x + bed.w - 26 + pOff, bed.y + 8, 18, 10);
    // Pillow shadow under
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(bed.x + bed.w - 26 + pOff, bed.y + 17, 18, 1);
    // Pillow shading
    ctx.fillStyle = PAL.creamDk;
    ctx.fillRect(bed.x + bed.w - 10 + pOff, bed.y + 10, 1, 7);
    // Pillow top highlight
    ctx.fillStyle = PAL.white;
    ctx.fillRect(bed.x + bed.w - 24 + pOff, bed.y + 9, 6, 1);
    // Pillow top outline
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(bed.x + bed.w - 26 + pOff, bed.y + 8, 18, 1);
    // Blanket (quilted pink)
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(bed.x + 4, bed.y + 16, bed.w - 30, bed.h - 28);
    // Blanket stripes
    ctx.fillStyle = PAL.red;
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(bed.x + 4 + i * 12, bed.y + 16, 4, bed.h - 28);
    }
    // Quilted stitch marks (small cross-hatches)
    ctx.fillStyle = PAL.pinkLt;
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(bed.x + 10 + i * 12, bed.y + 18, 1, 1);
        ctx.fillRect(bed.x + 10 + i * 12, bed.y + 22, 1, 1);
    }
    ctx.fillStyle = PAL.redDk;
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(bed.x + 5 + i * 12, bed.y + 20, 1, 1);
    }
    // Blanket top hem line
    ctx.fillStyle = PAL.redDk;
    ctx.fillRect(bed.x + 4, bed.y + 16, bed.w - 30, 1);
}

function drawToyBox(ctx, x, y, fill) {
    // Top-down chest: open lid with a slightly inset interior
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(x + 2, y + 22, 34, 2);
    // Outer frame
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x, y, 36, 24);
    // Inner plank face
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + 2, y + 2, 32, 20);
    // Plank seams
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 12, y + 2, 1, 20);
    ctx.fillRect(x + 23, y + 2, 1, 20);
    // Wood grain (horizontal streaks on each plank)
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 3, y + 7, 9, 1);
    ctx.fillRect(x + 13, y + 15, 10, 1);
    ctx.fillRect(x + 24, y + 6, 10, 1);
    ctx.fillStyle = PAL.woodLt;
    ctx.fillRect(x + 3, y + 4, 8, 1);
    ctx.fillRect(x + 14, y + 5, 8, 1);
    ctx.fillRect(x + 25, y + 12, 8, 1);
    // Knot circles on a plank
    ctx.fillStyle = PAL.woodDp;
    ctx.fillRect(x + 6, y + 11, 2, 2);
    ctx.fillRect(x + 7, y + 10, 1, 1);
    ctx.fillRect(x + 7, y + 13, 1, 1);
    // Metal hinges (top corners)
    ctx.fillStyle = PAL.stoneDk;
    ctx.fillRect(x + 3, y, 5, 3);
    ctx.fillRect(x + 28, y, 5, 3);
    ctx.fillStyle = PAL.stoneLt;
    ctx.fillRect(x + 3, y, 5, 1);
    ctx.fillRect(x + 28, y, 5, 1);
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(x + 4, y + 1, 1, 1);
    ctx.fillRect(x + 29, y + 1, 1, 1);
    // Yellow tag (name plate)
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(x + 14, y + 9, 8, 6);
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(x + 14, y + 9, 8, 1);
    ctx.fillStyle = PAL.yellowLt;
    ctx.fillRect(x + 15, y + 10, 1, 1);
    // Star doodle on tag
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 18, y + 11, 1, 3);
    ctx.fillRect(x + 17, y + 12, 3, 1);
    // Filled yarn balls peek out the top
    for (let i = 0; i < fill; i++) {
        drawYarnBall(ctx, x + 5 + i * 8, y - 4, i, true);
    }
    // Peek of a toy block if box is decently filled
    if (fill >= 2) {
        ctx.fillStyle = PAL.blue;
        ctx.fillRect(x + 25, y - 3, 4, 4);
        ctx.fillStyle = PAL.skyLt;
        ctx.fillRect(x + 25, y - 3, 2, 1);
        ctx.fillStyle = PAL.skyDk;
        ctx.fillRect(x + 28, y, 1, 1);
    }
}

function drawKittenPortrait(ctx, x, y) {
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x, y, 28, 28);
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x + 2, y + 2, 24, 24);
    renderSprite(ctx, SPRITES.kitten, 0, x + 2, y + 2, {});
}

// ==================== REACTION STATE MACHINE ====================

const REACTIONS = {
    food: { stages: [
        { name: 'sniff', duration: 24,
          onEnter() { playAnim(world.kitten, 'eat'); } },
        { name: 'eat', duration: 72,
          onEnter() { playAnim(world.kitten, 'eat'); },
          beats: [
            { at: 6, do() { Sound.play('eat'); } },
            { at: 12, do() {
                const hs = currentRoom().hotspots.find(h => h.kind === 'food');
                if (!hs) return;
                for (let i = 0; i < 5; i++) {
                    spawnFloater({
                        kind: 'crumb',
                        x: hs.x + hs.w / 2 + (Math.random() - 0.5) * 10,
                        y: hs.y - 2,
                        vy: -0.6 - Math.random() * 0.4,
                        vx: (Math.random() - 0.5) * 0.4,
                        life: 30, maxLife: 30
                    });
                }
            }},
            { at: 36, do() { Sound.play('eat'); } }
          ] },
        { name: 'lickLips', duration: 36,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } },
        { name: 'sit', duration: 90,
          onEnter() { playAnim(world.kitten, 'sit'); } }
    ]},

    milk: { stages: [
        { name: 'sniff', duration: 18,
          onEnter() { playAnim(world.kitten, 'eat'); } },
        { name: 'lap', duration: 108,
          onEnter() { playAnim(world.kitten, 'eat'); },
          beats: [
            { at: 6,  do() { Sound.play('lap'); } },
            { at: 30, do() { Sound.play('lap'); } },
            { at: 54, do() { Sound.play('lap'); } },
            { at: 78, do() { Sound.play('lap'); } }
          ] },
        { name: 'lick', duration: 36,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } }
    ]},

    bed: { stages: [
        { name: 'stepUp', duration: 24,
          onEnter() { playAnim(world.kitten, 'sit'); } },
        { name: 'curl', duration: 36,
          onEnter() { playAnim(world.kitten, 'sleepCurl'); Sound.play('mew'); } },
        { name: 'sleep', duration: 180,
          onEnter() { playAnim(world.kitten, 'sleepCurl'); },
          beats: [
            { at: 0, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'z', x: k.x + 4, y: k.y - KITTEN_H - 4, vy: -0.4, vx: 0.2, life: 50, maxLife: 50 });
            }},
            { at: 12, do() { if (!world.night) toggleNight(); } },
            { at: 42, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'z', x: k.x + 4, y: k.y - KITTEN_H - 4, vy: -0.4, vx: 0.2, life: 50, maxLife: 50 });
            }},
            { at: 84, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'z', x: k.x + 4, y: k.y - KITTEN_H - 4, vy: -0.4, vx: 0.2, life: 50, maxLife: 50 });
            }}
          ] },
        { name: 'stretch', duration: 48,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } },
        { name: 'sit', duration: 36,
          onEnter() { playAnim(world.kitten, 'sit'); } }
    ]},

    pond: { stages: [
        { name: 'leanIn', duration: 18,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } },
        { name: 'frogHop', duration: 12,
          onEnter() {
            const hs = currentRoom().hotspots.find(h => h.kind === 'pond');
            if (hs) hs.state = 30;
            Sound.play('ribbit');
          } },
        { name: 'watch', duration: 60,
          onEnter() { playAnim(world.kitten, 'sit'); },
          beats: [
            { at: 12, do() { Sound.play('ribbit'); } },
            { at: 30, do() { world.kitten.busy = null; } }
          ] }
    ]},

    crab: { stages: [
        { name: 'cockHead', duration: 18,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } },
        { name: 'scuttle', duration: 60,
          onEnter() {
            const hs = currentRoom().hotspots.find(h => h.kind === 'crab');
            if (hs) { hs.state = 60; hs.offset = 0; }
            Sound.play('scuttle');
          } },
        { name: 'watch', duration: 30,
          onEnter() {
            playAnim(world.kitten, 'sit');
            world.kitten.busy = null;
          } }
    ]},

    waves: { stages: [
        { name: 'paw', duration: 12,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } },
        { name: 'splash', duration: 18,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); },
          beats: [
            { at: 0, do() {
                Sound.play('waveBack');
                const k = world.kitten;
                for (let i = 0; i < 6; i++) {
                    spawnFloater({
                        kind: 'splash',
                        x: k.x + (Math.random() - 0.5) * 12,
                        y: k.y - 4,
                        vy: -0.8 - Math.random() * 0.5,
                        vx: (Math.random() - 0.5) * 1.0,
                        life: 25, maxLife: 25
                    });
                }
            }},
            { at: 3, do() {
                // extra splash floaters
            }},
            { at: 12, do() { Sound.play('giggle'); } },
            { at: 15, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'mrrp', x: k.x, y: k.y - KITTEN_H - 2, vy: -0.3, life: 30, maxLife: 30 });
            }}
          ] },
        { name: 'shake', duration: 24,
          onEnter() { playAnim(world.kitten, 'idleBreathe'); } }
    ]},

    mouse: { build: () => {
        const mood = world.rooms.kitchen.mouseMood;
        const hs = () => currentRoom().hotspots.find(h => h.kind === 'mouse');

        // Mood-dependent timing
        const waveDur = mood === 'shy' ? 24 : mood === 'playful' ? 48 : 42;
        const retreatDur = mood === 'shy' ? 18 : mood === 'playful' ? 36 : 30;
        const treatDur = mood === 'playful' ? 36 : mood === 'sleepy' ? 30 : 36;

        const stages = [];

        // Sleepy: yawn stage first
        if (mood === 'sleepy') {
            stages.push({ name: 'yawn', duration: 24,
                onEnter() {
                    const m = hs();
                    if (m) spawnFloater({ kind: 'z', x: m.x + 6, y: m.y - 6, vy: -0.3, vx: 0.1, life: 40, maxLife: 40 });
                    playAnim(world.kitten, 'idleBreathe');
                }
            });
        }

        // Wave stage
        const waveBeats = [];
        if (mood === 'playful') {
            // Two waves + extra floaters
            waveBeats.push({ at: 12, do() {
                const m = hs();
                if (m) spawnFloater({ kind: 'mrrp', x: m.x + m.w / 2, y: m.y - 4, vy: -0.3, life: 30, maxLife: 30 });
            }});
            waveBeats.push({ at: 24, do() {
                const m = hs();
                if (m) {
                    spawnFloater({ kind: 'heart', x: m.x + m.w / 2 + 4, y: m.y - 8, vy: -0.4, life: 30, maxLife: 30 });
                    spawnFloater({ kind: 'heart', x: m.x + m.w / 2 - 4, y: m.y - 6, vy: -0.5, life: 30, maxLife: 30 });
                }
            }});
            waveBeats.push({ at: 36, do() {
                const m = hs();
                if (m) spawnFloater({ kind: 'mrrp', x: m.x + m.w / 2, y: m.y - 4, vy: -0.3, life: 30, maxLife: 30 });
            }});
        } else if (mood === 'shy') {
            // Fewer floaters
            waveBeats.push({ at: 12, do() {
                const m = hs();
                if (m) spawnFloater({ kind: 'mrrp', x: m.x + m.w / 2, y: m.y - 4, vy: -0.2, life: 25, maxLife: 25 });
            }});
        }

        stages.push({ name: 'wave', duration: waveDur,
            onEnter() {
                const m = hs();
                if (m) { m.waved = true; m.state = waveDur + 60; }
                Sound.play('mew');
                if (m && mood !== 'shy') spawnFloater({ kind: 'mrrp', x: m.x + m.w / 2, y: m.y - 4, vy: -0.3, life: 40, maxLife: 40 });
                playAnim(world.kitten, 'idleBreathe');
                // Show portrait
                world.dialogue = { active: true, mood: mood, side: 'right', fade: 0, timer: 0 };
            },
            beats: waveBeats
        });

        // Meow back
        stages.push({ name: 'meowBack', duration: 24,
            onEnter() { playAnim(world.kitten, 'idleBreathe'); }
        });

        // Offer treat
        const treatBeats = [{ at: Math.floor(treatDur / 2), do() {
            const room = currentRoom();
            const m = room.hotspots.find(h => h.kind === 'mouse');
            if (!m || room.treatsOffered >= 4) return;
            room.collectibles.push({
                kind: 'treat',
                x: m.x - 18,
                y: m.y + 2,
                collected: false,
                index: room.treatsOffered++
            });
            if (mood === 'playful') {
                spawnFloater({ kind: 'star', x: m.x - 12, y: m.y - 4, vy: -0.5, life: 35, maxLife: 35 });
            }
        }}];

        stages.push({ name: 'offerTreat', duration: treatDur,
            onEnter() { playAnim(world.kitten, 'sit'); },
            beats: treatBeats
        });

        // Retreat
        const retreatBeats = [];
        if (mood === 'playful') {
            // Peek-back beat near end
            retreatBeats.push({ at: Math.floor(retreatDur * 0.7), do() {
                const m = hs();
                if (m) spawnFloater({ kind: 'mrrp', x: m.x + m.w / 2, y: m.y - 2, vy: -0.2, life: 20, maxLife: 20 });
            }});
        }

        stages.push({ name: 'retreat', duration: retreatDur,
            onEnter() {
                playAnim(world.kitten, 'idleBreathe');
                world.kitten.busy = null;
                // Start fading out portrait
                if (world.dialogue) world.dialogue.fade = 1;
            },
            beats: retreatBeats
        });

        // Done stage — clear dialogue
        stages.push({ name: 'done', duration: 12,
            onEnter() {
                world.dialogue = null;
            }
        });

        return { stages };
    }},

    selfPet: { stages: [
        { name: 'purr', duration: 120,
          onEnter() {
            playAnim(world.kitten, 'purr');
            Sound.play('prrr');
          },
          beats: [
            { at: 0,  do() {
                const k = world.kitten;
                spawnFloater({ kind: 'heart', x: k.x, y: k.y - KITTEN_H, vy: -0.5, life: 60, maxLife: 60 });
            }},
            { at: 24, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'heart', x: k.x, y: k.y - KITTEN_H, vy: -0.5, life: 60, maxLife: 60 });
            }},
            { at: 48, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'heart', x: k.x, y: k.y - KITTEN_H, vy: -0.5, life: 60, maxLife: 60 });
            }},
            { at: 72, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'heart', x: k.x, y: k.y - KITTEN_H, vy: -0.5, life: 60, maxLife: 60 });
            }},
            { at: 96, do() {
                const k = world.kitten;
                spawnFloater({ kind: 'heart', x: k.x, y: k.y - KITTEN_H, vy: -0.5, life: 60, maxLife: 60 });
            }}
          ] }
    ]}
};

function startReaction(kind) {
    let def = REACTIONS[kind];
    if (!def) return;
    if (def.build) def = def.build();
    const k = world.kitten;
    k.busy = kind;
    world.reaction = {
        stages: def.stages,
        stageIdx: 0,
        timer: 0,
        beatIdx: 0,
        hotspotKind: kind,
        totalTime: 0
    };
    const stage = def.stages[0];
    if (stage.onEnter) stage.onEnter();
}

function reactionTick(dt) {
    const r = world.reaction;
    if (!r) return;

    r.timer += dt;
    r.totalTime += dt;

    // Hard timeout safety: 480 frames = 8 seconds
    if (r.totalTime >= 480) {
        cancelReaction();
        return;
    }

    const stage = r.stages[r.stageIdx];

    // Fire beats
    if (stage.beats) {
        while (r.beatIdx < stage.beats.length && r.timer >= stage.beats[r.beatIdx].at) {
            stage.beats[r.beatIdx].do();
            r.beatIdx++;
        }
    }

    // Advance stage
    if (stage.duration > 0 && r.timer >= stage.duration) {
        r.stageIdx++;
        if (r.stageIdx >= r.stages.length) {
            // Reaction complete
            world.kitten.busy = null;
            world.reaction = null;
            return;
        }
        r.timer = 0;
        r.beatIdx = 0;
        const next = r.stages[r.stageIdx];
        if (next.onEnter) next.onEnter();
    }
}

function cancelReaction() {
    if (!world.reaction) return;
    world.kitten.busy = null;
    world.reaction = null;
    playAnim(world.kitten, 'idleBreathe');
}

// ==================== HOTSPOTS ====================

function tryHotspotTap(x, y) {
    const room = currentRoom();
    for (const hs of room.hotspots) {
        if (x >= hs.x && x <= hs.x + hs.w && y >= hs.y && y <= hs.y + hs.h) {
            triggerHotspot(hs, room);
            return true;
        }
    }
    return false;
}

function trySecretTap(x, y) {
    const room = currentRoom();
    if (!room.secrets) return false;
    for (const s of room.secrets) {
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
            s.tapCount++;
            s.tapTimer = 90;
            if (s.found || s.tapCount >= s.requiredTaps) {
                s.found = true;
                // Queue a walk; reaction fires on arrival
                s.queued = true;
                s.queuedX = s.x + s.w / 2;
                s.queuedY = s.y + s.h + 6;
                setKittenTarget(s.queuedX, s.queuedY);
                return true;
            }
            return false;
        }
    }
    return false;
}

function updateSecrets(dt) {
    const room = currentRoom();
    if (!room.secrets) return;
    const k = world.kitten;
    for (const s of room.secrets) {
        if (s.tapTimer > 0) {
            s.tapTimer -= dt;
            if (s.tapTimer <= 0) {
                s.tapTimer = 0;
                s.tapCount = 0;
            }
        }
        if (s.queued && k.tx == null && !k.busy) {
            const reach = Math.hypot(k.x - s.queuedX, k.y - s.queuedY);
            if (reach < 6) {
                s.queued = false;
                s.reaction();
            }
        }
    }
}

function triggerHotspot(hs, room) {
    const k = world.kitten;
    // Clear any previously-queued hotspot walks in this room so we don't
    // double-fire an old action when the kitten arrives near both targets.
    for (const other of room.hotspots) {
        if (other !== hs) other.queued = false;
    }
    // Every interaction walks the kitten to the hotspot first; the reaction
    // fires on arrival inside updateHotspots. This makes the world feel like
    // the kitten is inhabiting it instead of remote-controlling it.
    if (hs.kind === 'pond') {
        queueHotspotWalk(hs, hs.x + hs.w / 2, hs.y + hs.h + 8);
    } else if (hs.kind === 'food') {
        queueHotspotWalk(hs, hs.x + hs.w / 2, hs.y + hs.h + 4);
    } else if (hs.kind === 'milk') {
        queueHotspotWalk(hs, hs.x + hs.w / 2, hs.y + hs.h + 4);
    } else if (hs.kind === 'bed') {
        if (hs.state > 0) return; // ignore taps while sleeping
        queueHotspotWalk(hs, hs.x + hs.w / 2 - 14, hs.y + hs.h + 6);
    } else if (hs.kind === 'waves') {
        // Splash happens wherever the kitten ends up on the wet sand
        queueHotspotWalk(hs, Math.max(20, Math.min(GAME.width - 20, k.x)), PLAY_TOP + 56);
    } else if (hs.kind === 'crab') {
        queueHotspotWalk(hs, hs.x + hs.w / 2, hs.y + hs.h + 6);
    } else if (hs.kind === 'mouse') {
        queueHotspotWalk(hs, hs.x - 14, hs.y + hs.h);
    }
}

function updateHotspots(dt) {
    const room = currentRoom();
    const k = world.kitten;

    for (const hs of room.hotspots) {
        // Advance state timers
        if (hs.state > 0) hs.state -= dt;

        // Kitten-arrival reactions for queued hotspots.
        // Match against the exact queued target (not the hotspot center) so
        // offsets-from-center don't break the check. A small epsilon is enough
        // because the kitten walks the target to completion before tx is nulled.
        if (hs.queued && k.tx == null && !k.busy) {
            const reach = Math.hypot(k.x - hs.queuedX, k.y - hs.queuedY);
            if (reach < 4) {
                hs.queued = false;
                startReaction(hs.kind);
            }
        }
    }

    // Crab scuttle
    const crab = room.hotspots.find(h => h.kind === 'crab');
    if (crab && crab.state > 0) {
        crab.offset += dt * 0.8;
        if (crab.offset > 40) crab.offset = 40;
    } else if (crab) {
        crab.offset = Math.max(0, crab.offset - dt * 0.4);
    }
}

function drawHotspots(ctx, room) {
    for (const hs of room.hotspots) {
        if (hs.kind === 'food') {
            // Red ceramic bowl with shine + varied kibble
            const cx = hs.x + hs.w / 2;
            const by = hs.y + hs.h;
            // Bowl body (semi-circle)
            ctx.fillStyle = PAL.red;
            ctx.beginPath();
            ctx.ellipse(cx, by, hs.w / 2, hs.h / 2, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Bowl rim band (darker)
            ctx.fillStyle = PAL.redDk;
            ctx.fillRect(hs.x + 1, hs.y + hs.h - 2, hs.w - 2, 2);
            // Bowl shine highlight (upper-left)
            ctx.fillStyle = PAL.pinkLt;
            ctx.fillRect(hs.x + 3, hs.y + hs.h - 5, 3, 1);
            ctx.fillRect(hs.x + 2, hs.y + hs.h - 4, 1, 1);
            // Bowl base darker line
            ctx.fillStyle = PAL.woodDp;
            ctx.fillRect(hs.x + 2, hs.y + hs.h - 1, hs.w - 4, 1);
            // Kibble (varied shapes, richer palette)
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(hs.x + 4, hs.y + 3, 3, 3);
            ctx.fillRect(hs.x + 10, hs.y + 2, 3, 3);
            ctx.fillRect(hs.x + 16, hs.y + 4, 3, 3);
            // Kibble shading
            ctx.fillStyle = PAL.woodDk;
            ctx.fillRect(hs.x + 4, hs.y + 5, 3, 1);
            ctx.fillRect(hs.x + 10, hs.y + 4, 3, 1);
            ctx.fillRect(hs.x + 16, hs.y + 6, 3, 1);
            // Kibble highlights
            ctx.fillStyle = PAL.woodLt;
            ctx.fillRect(hs.x + 4, hs.y + 3, 1, 1);
            ctx.fillRect(hs.x + 10, hs.y + 2, 1, 1);
            ctx.fillRect(hs.x + 16, hs.y + 4, 1, 1);
            // Stray crumb
            ctx.fillStyle = PAL.woodDk;
            ctx.fillRect(hs.x + 8, hs.y + 6, 1, 1);
            ctx.fillRect(hs.x + 14, hs.y + 7, 1, 1);
        } else if (hs.kind === 'milk') {
            // Blue ceramic bowl with milk surface reflection
            const cx = hs.x + hs.w / 2;
            const by = hs.y + hs.h;
            // Outer bowl (sky blue)
            ctx.fillStyle = PAL.sky;
            ctx.beginPath();
            ctx.ellipse(cx, by, hs.w / 2, hs.h / 2, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Bowl rim
            ctx.fillStyle = PAL.skyDk;
            ctx.fillRect(hs.x + 1, hs.y + hs.h - 2, hs.w - 2, 2);
            // Bowl shine
            ctx.fillStyle = PAL.skyLt;
            ctx.fillRect(hs.x + 3, hs.y + hs.h - 5, 3, 1);
            // Milk pool
            ctx.fillStyle = PAL.white;
            ctx.beginPath();
            ctx.ellipse(cx, by - 2, hs.w / 2 - 2, hs.h / 2 - 2, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            // Milk surface reflection (subtle blue)
            ctx.fillStyle = PAL.skyLt;
            ctx.fillRect(hs.x + 4, hs.y + 4, 4, 1);
            ctx.fillRect(hs.x + 10, hs.y + 3, 3, 1);
            // Bowl base line
            ctx.fillStyle = PAL.skyDk;
            ctx.fillRect(hs.x + 2, hs.y + hs.h - 1, hs.w - 4, 1);
        } else if (hs.kind === 'mouse') {
            drawMouse(ctx, hs);
        } else if (hs.kind === 'pond') {
            drawFrog(ctx, hs);
        } else if (hs.kind === 'crab') {
            drawCrab(ctx, hs);
        } else if (hs.kind === 'waves') {
            // waves are drawn inside drawBeach; hotspot is invisible
        } else if (hs.kind === 'bed') {
            // bed is drawn inside drawBedroom; hotspot is invisible
        }
    }
}

function drawFrog(ctx, pond) {
    const hopping = pond.state > 0;
    const hopT = 1 - pond.state / 30;
    const fx = pond.x + 42;
    let fy = pond.y + 10;
    if (hopping) {
        fy = pond.y + 10 - Math.sin(hopT * Math.PI) * 20;
    }
    // Body (wider, with belly detail)
    ctx.fillStyle = PAL.frogG;
    ctx.fillRect(fx, fy, 10, 6);
    ctx.fillRect(fx - 1, fy + 1, 12, 4);
    ctx.fillRect(fx + 1, fy - 2, 8, 2);
    // Lighter belly underside
    ctx.fillStyle = PAL.frogGL;
    ctx.fillRect(fx, fy + 4, 10, 1);
    // Body shadow / seam
    ctx.fillStyle = PAL.frogGD;
    ctx.fillRect(fx, fy + 5, 10, 1);
    ctx.fillRect(fx - 1, fy + 4, 1, 1);
    ctx.fillRect(fx + 10, fy + 4, 1, 1);
    // Back darker shading (top)
    ctx.fillRect(fx + 4, fy + 1, 2, 1);
    // Webbed feet (front)
    ctx.fillStyle = PAL.frogG;
    ctx.fillRect(fx - 1, fy + 5, 2, 2);
    ctx.fillRect(fx + 9, fy + 5, 2, 2);
    ctx.fillStyle = PAL.frogGD;
    ctx.fillRect(fx - 1, fy + 6, 1, 1);
    ctx.fillRect(fx + 10, fy + 6, 1, 1);
    // Small smile
    ctx.fillStyle = PAL.frogGD;
    ctx.fillRect(fx + 3, fy + 3, 4, 1);
    ctx.fillStyle = PAL.pinkLt;
    ctx.fillRect(fx + 4, fy + 3, 2, 1);
    // Eyes — check frog blink ambient state
    const gardenAmb = world.rooms.garden && world.rooms.garden.ambientState;
    const blinkF = gardenAmb ? gardenAmb.frogBlinkFrame : 0;
    const blinkPhase = blinkF > 0 ? (blinkF > 10 ? 1 : blinkF > 5 ? 2 : blinkF > 2 ? 1 : 0) : 0;
    // 0 = open, 1 = half, 2 = closed
    if (blinkPhase < 2) {
        // Eye sockets (slightly darker)
        ctx.fillStyle = PAL.frogGD;
        ctx.fillRect(fx + 1, fy - 3, 3, 1);
        ctx.fillRect(fx + 5, fy - 3, 3, 1);
        // Eye whites
        ctx.fillStyle = PAL.white;
        ctx.fillRect(fx + 2, fy - 3, 2, blinkPhase === 1 ? 1 : 2);
        ctx.fillRect(fx + 6, fy - 3, 2, blinkPhase === 1 ? 1 : 2);
        if (blinkPhase === 0) {
            ctx.fillStyle = PAL.eye;
            ctx.fillRect(fx + 3, fy - 2, 1, 1);
            ctx.fillRect(fx + 7, fy - 2, 1, 1);
            // Catch-light sparkle
            ctx.fillStyle = PAL.white;
            ctx.fillRect(fx + 2, fy - 3, 1, 1);
            ctx.fillRect(fx + 6, fy - 3, 1, 1);
        }
    } else {
        // Closed — just a line
        ctx.fillStyle = PAL.frogGD;
        ctx.fillRect(fx + 2, fy - 3, 2, 1);
        ctx.fillRect(fx + 6, fy - 3, 2, 1);
    }
}

function drawMouse(ctx, hs) {
    const waving = hs.state > 0 && hs.waved;
    const wiggle = waving ? Math.sin(hs.state * 0.4) * 2 : 0;
    // Body (rounder — corner softening)
    ctx.fillStyle = PAL.mouse;
    ctx.fillRect(hs.x, hs.y, 12, 10);
    ctx.fillRect(hs.x + 1, hs.y - 1, 10, 1);
    ctx.fillRect(hs.x + 1, hs.y + 10, 10, 1);
    // Snout
    ctx.fillRect(hs.x + 12, hs.y + 3, 3, 4);
    // Lighter belly
    ctx.fillStyle = PAL.mouseLt;
    ctx.fillRect(hs.x + 1, hs.y + 7, 10, 2);
    ctx.fillRect(hs.x + 2, hs.y + 1, 2, 1);
    // Body shading (bottom-right)
    ctx.fillStyle = PAL.mouseDk;
    ctx.fillRect(hs.x, hs.y + 9, 12, 1);
    ctx.fillRect(hs.x + 11, hs.y + 1, 1, 6);
    // Fur texture (small dark ticks)
    ctx.fillStyle = PAL.mouseDk;
    ctx.fillRect(hs.x + 2, hs.y + 2, 1, 1);
    ctx.fillRect(hs.x + 6, hs.y + 4, 1, 1);
    ctx.fillRect(hs.x + 4, hs.y + 7, 1, 1);
    // Ears
    ctx.fillStyle = PAL.mouseDk;
    ctx.fillRect(hs.x + 2, hs.y - 2, 3, 2);
    ctx.fillRect(hs.x + 7, hs.y - 2, 3, 2);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(hs.x + 3, hs.y - 1, 1, 1);
    ctx.fillRect(hs.x + 8, hs.y - 1, 1, 1);
    // Eye with catch-light
    ctx.fillStyle = PAL.eye;
    ctx.fillRect(hs.x + 4, hs.y + 4, 2, 2);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(hs.x + 4, hs.y + 4, 1, 1);
    // Whiskers (multiple lines)
    ctx.fillStyle = PAL.mouseDk;
    ctx.fillRect(hs.x + 10, hs.y + 5, 4, 1);
    ctx.fillRect(hs.x + 10, hs.y + 7, 4, 1);
    ctx.fillRect(hs.x + 11, hs.y + 6, 3, 1);
    // Nose (slightly larger, more visible)
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(hs.x + 13, hs.y + 5, 2, 1);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(hs.x + 14, hs.y + 5, 1, 1);
    // Tiny pink feet
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(hs.x + 2, hs.y + 10, 1, 1);
    ctx.fillRect(hs.x + 9, hs.y + 10, 1, 1);
    // Tail (curled)
    ctx.strokeStyle = PAL.mouseDk;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hs.x, hs.y + 7);
    ctx.lineTo(hs.x - 3, hs.y + 9);
    ctx.lineTo(hs.x - 5, hs.y + 8);
    ctx.lineTo(hs.x - 6, hs.y + 10);
    ctx.stroke();
    // Waving paw (with a slight fur tick)
    if (waving) {
        ctx.fillStyle = PAL.mouse;
        ctx.fillRect(hs.x - 1, hs.y - 3 + wiggle, 2, 3);
        ctx.fillStyle = PAL.mouseDk;
        ctx.fillRect(hs.x - 1, hs.y - 1 + wiggle, 2, 1);
        ctx.fillStyle = PAL.pink;
        ctx.fillRect(hs.x - 1, hs.y - 3 + wiggle, 1, 1);
    }
}

function drawCrab(ctx, hs) {
    const cx = hs.x + hs.offset;
    const cy = hs.y;
    // Shell (body)
    ctx.fillStyle = PAL.crab;
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 7, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Shell highlight (top)
    ctx.fillStyle = PAL.crabLt;
    ctx.fillRect(cx + 7, cy + 3, 6, 1);
    ctx.fillRect(cx + 9, cy + 4, 2, 1);
    // Shell ridge pattern (hex-ish)
    ctx.fillStyle = PAL.crabDk;
    ctx.fillRect(cx + 6, cy + 6, 2, 1);
    ctx.fillRect(cx + 12, cy + 6, 2, 1);
    ctx.fillRect(cx + 9, cy + 8, 2, 1);
    // Shell shadow band
    ctx.fillStyle = PAL.crabDk;
    ctx.fillRect(cx + 3, cy + 10, 14, 2);
    // Claws (larger with pincer detail)
    ctx.fillStyle = PAL.crab;
    ctx.fillRect(cx - 1, cy + 5, 5, 3);
    ctx.fillRect(cx + 16, cy + 5, 5, 3);
    // Claw pincer split
    ctx.fillStyle = PAL.crabDk;
    ctx.fillRect(cx, cy + 6, 1, 1);
    ctx.fillRect(cx + 19, cy + 6, 1, 1);
    // Claw highlight
    ctx.fillStyle = PAL.crabLt;
    ctx.fillRect(cx, cy + 5, 2, 1);
    ctx.fillRect(cx + 18, cy + 5, 2, 1);
    // Eye stalks (short dark lines)
    ctx.fillStyle = PAL.crabDk;
    ctx.fillRect(cx + 9, cy + 1, 1, 2);
    ctx.fillRect(cx + 13, cy + 1, 1, 2);
    // Eye whites
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cx + 8, cy + 2, 2, 2);
    ctx.fillRect(cx + 12, cy + 2, 2, 2);
    ctx.fillStyle = PAL.eye;
    ctx.fillRect(cx + 9, cy + 2, 1, 1);
    ctx.fillRect(cx + 13, cy + 2, 1, 1);
    // Eye catch-light
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cx + 9, cy + 3, 1, 1);
    ctx.fillRect(cx + 13, cy + 3, 1, 1);
    // Legs
    ctx.fillStyle = PAL.crabDk;
    const legShift = Math.floor(hs.offset / 4) % 2;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx + 2 + i * 3, cy + 12, 1, 2 + legShift);
        ctx.fillRect(cx + 13 + i * 3, cy + 12, 1, 2 + (1 - legShift));
    }
    // Tiny mouth line
    ctx.fillStyle = PAL.crabDk;
    ctx.fillRect(cx + 9, cy + 9, 2, 1);
}

// ==================== COLLECTIBLES ====================

function updateCollectibles(dt) {
    const room = currentRoom();
    const k = world.kitten;

    // Butterflies drift and can be caught
    for (const c of room.collectibles) {
        if (c.collected) continue;
        if (c.kind === 'butterfly') {
            c.t += dt * 0.03;
            c.x = c.baseX + Math.sin(c.t) * 40 + Math.sin(c.t * 0.3) * 15;
            c.y = c.baseY + Math.cos(c.t * 1.3) * 15;
            if (c.onKitten > 0) {
                c.onKitten -= dt;
                c.x = k.x;
                c.y = k.y - KITTEN_H - 4;
                if (c.onKitten <= 0) collectButterfly(c, room);
            }
        }
    }

    // Spawn stars at night if not spawned
    if (world.night && !room.starsSpawned) {
        room.starsSpawned = true;
        const basePositions = [
            { x: 50, y: PLAY_TOP + 20 },
            { x: 190, y: PLAY_TOP + 30 },
            { x: 330, y: PLAY_TOP + 20 }
        ];
        for (let i = 0; i < 2; i++) {
            const p = basePositions[i];
            room.stars.push({
                kind: 'star', x: p.x, y: p.y, twinkle: i * 10, collected: false
            });
        }
    }

    // Twinkle stars
    for (const s of room.stars) {
        s.twinkle += dt * 0.1;
    }

    // Yarn ball rolling
    if (room.yarnBall.rolling) {
        const target = room.yarnBall.rollTarget;
        const dx = target.x - room.yarnBall.x;
        const dy = target.y - room.yarnBall.y;
        const d = Math.hypot(dx, dy);
        if (d < 2) {
            room.yarnBall.rolling = false;
            completeYarnBall(room);
        } else {
            room.yarnBall.x += (dx / d) * 1.2 * dt;
            room.yarnBall.y += (dy / d) * 1.2 * dt;
        }
    }
}

function drawCollectibles(ctx, room) {
    for (const c of room.collectibles) {
        if (c.collected) continue;
        if (c.kind === 'flower') {
            drawFlower(ctx, c.x, c.y, c.color, false);
        } else if (c.kind === 'butterfly') {
            drawButterfly(ctx, c.x, c.y, c.color, world.sessionTick / 30);
        } else if (c.kind === 'shell') {
            drawShell(ctx, c.x, c.y, c.shape);
        } else if (c.kind === 'treat') {
            drawTreat(ctx, c.x, c.y);
        }
    }

    // Yarn ball (if not yet collected)
    if (!room.yarnBall.collected) {
        const yIdx = ROOM_ORDER.indexOf(room.id);
        const wobble = room._yarnWobbleOff || 0;
        drawYarnBall(ctx, room.yarnBall.x + wobble, room.yarnBall.y, yIdx);
    }

    // Stars (night)
    if (world.night) {
        for (const s of room.stars) {
            if (s.collected) continue;
            const size = 3 + Math.sin(s.twinkle) * 1;
            drawStarIcon(ctx, s.x, s.y, size, PAL.star);
        }
    }
}

function tryCollectibleTap(x, y) {
    const room = currentRoom();
    const hitRadius = 12;

    // Stars first (night only)
    if (world.night) {
        for (const s of room.stars) {
            if (s.collected) continue;
            if (Math.hypot(x - s.x, y - s.y) < hitRadius) {
                collectStar(s, room);
                return true;
            }
        }
    }

    for (const c of room.collectibles) {
        if (c.collected) continue;
        if (Math.hypot(x - c.x, y - c.y) < hitRadius) {
            if (c.kind === 'flower') {
                setKittenTarget(c.x, c.y + 8);
                sniffFlower(c, room);
                return true;
            }
            if (c.kind === 'butterfly') {
                setKittenTarget(c.x, c.y + 8);
                catchButterfly(c, room);
                return true;
            }
            if (c.kind === 'shell') {
                setKittenTarget(c.x, c.y + 4);
                pickUpShell(c, room);
                return true;
            }
            if (c.kind === 'treat') {
                setKittenTarget(c.x, c.y + 4);
                eatTreat(c, room);
                return true;
            }
        }
    }

    // Yarn ball
    if (!room.yarnBall.collected && !room.yarnBall.rolling) {
        if (Math.hypot(x - room.yarnBall.x, y - room.yarnBall.y) < hitRadius) {
            setKittenTarget(room.yarnBall.x, room.yarnBall.y + 6);
            pushYarnBall(room);
            return true;
        }
    }

    return false;
}

function sniffFlower(flower, room) {
    flower.collected = true;
    Sound.play('sparkle');
    Sound.play('mew');
    const slot = flower.color;
    spawnFloater({
        kind: 'flower',
        color: flower.color,
        x: flower.x, y: flower.y,
        startX: flower.x, startY: flower.y,
        flyTo: shelfSlotXY('flowers', slot),
        life: 60, maxLife: 60,
        onArrive: () => { world.shelf.flowers[slot] = true; }
    });
}

function catchButterfly(c, room) {
    c.onKitten = 50;
    Sound.play('mew');
}

function collectButterfly(c, room) {
    c.collected = true;
    // Find next empty slot
    const slot = world.shelf.butterflies.findIndex(v => !v);
    if (slot < 0) return;
    Sound.play('sparkle');
    spawnFloater({
        kind: 'butterfly',
        color: c.color,
        x: c.x, y: c.y,
        startX: c.x, startY: c.y,
        flyTo: shelfSlotXY('butterflies', slot),
        life: 60, maxLife: 60,
        onArrive: () => { world.shelf.butterflies[slot] = true; }
    });
}

function pickUpShell(shell, room) {
    shell.collected = true;
    const slot = shell.shape;
    Sound.play('mrrp');
    Sound.play('sparkle');
    spawnFloater({
        kind: 'shell',
        shape: shell.shape,
        x: shell.x, y: shell.y,
        startX: shell.x, startY: shell.y,
        flyTo: shelfSlotXY('shells', slot),
        life: 60, maxLife: 60,
        onArrive: () => { world.shelf.shells[slot] = true; }
    });
}

function pushYarnBall(room) {
    // Roll it toward the nearest edge, then collect
    room.yarnBall.rolling = true;
    Sound.play('mew');
    // Roll into screen center then collect
    room.yarnBall.rollTarget = { x: room.yarnBall.x + 30, y: room.yarnBall.y };
}

function completeYarnBall(room) {
    room.yarnBall.collected = true;
    const slot = ROOM_ORDER.indexOf(room.id);
    Sound.play('sparkle');
    if (room.id === 'bedroom') {
        world.rooms.bedroom.toyBoxFill++;
    }
    spawnFloater({
        kind: 'yarn',
        color: slot,
        x: room.yarnBall.x, y: room.yarnBall.y,
        startX: room.yarnBall.x, startY: room.yarnBall.y,
        flyTo: shelfSlotXY('yarnBalls', slot),
        life: 60, maxLife: 60,
        onArrive: () => { world.shelf.yarnBalls[slot] = true; }
    });
}

function eatTreat(treat, room) {
    treat.collected = true;
    const slot = world.shelf.treats.findIndex(v => !v);
    if (slot < 0) return;
    Sound.play('eat');
    Sound.play('sparkle');
    spawnFloater({
        kind: 'treat',
        x: treat.x, y: treat.y,
        startX: treat.x, startY: treat.y,
        flyTo: shelfSlotXY('treats', slot),
        life: 60, maxLife: 60,
        onArrive: () => { world.shelf.treats[slot] = true; }
    });
}

function collectStar(s, room) {
    s.collected = true;
    const slot = world.shelf.stars.findIndex(v => !v);
    if (slot < 0) return;
    Sound.play('twinkle');
    Sound.play('sparkle');
    spawnFloater({
        kind: 'star',
        x: s.x, y: s.y,
        startX: s.x, startY: s.y,
        flyTo: shelfSlotXY('stars', slot),
        life: 60, maxLife: 60,
        onArrive: () => { world.shelf.stars[slot] = true; }
    });
}

function shelfSlotXY(binKey, index) {
    // Re-compute shelf layout to find a slot center
    const bins = ['flowers', 'butterflies', 'shells', 'yarnBalls', 'stars', 'treats'];
    const counts = { flowers: 5, butterflies: 3, shells: 6, yarnBalls: 4, stars: 8, treats: 4 };
    const pad = 2;
    const available = GAME.width - pad * 2;
    const totalCount = bins.reduce((s, b) => s + counts[b], 0);
    const slotW = Math.floor((available - (bins.length - 1) * 4) / totalCount);
    let x = pad;
    for (const b of bins) {
        if (b === binKey) {
            return {
                x: x + index * slotW + Math.floor(slotW / 2) - 4,
                y: 10
            };
        }
        x += slotW * counts[b] + 4;
    }
    return { x: GAME.width / 2, y: 10 };
}

// ==================== SPRITE HELPERS ====================

function drawFlower(ctx, x, y, color, bloomed) {
    const colors = [PAL.red, PAL.yellow, PAL.pink, PAL.purple, PAL.blue];
    const c = colors[color % colors.length];
    // Stem
    ctx.fillStyle = PAL.grassDk;
    ctx.fillRect(x + 3, y + 4, 1, 6);
    // Petals (4 around center)
    ctx.fillStyle = c;
    ctx.fillRect(x + 2, y, 3, 2);
    ctx.fillRect(x + 2, y + 4, 3, 2);
    ctx.fillRect(x, y + 2, 2, 2);
    ctx.fillRect(x + 5, y + 2, 2, 2);
    // Center
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(x + 3, y + 2, 1, 2);
    ctx.fillRect(x + 2, y + 3, 3, 1);
    if (bloomed) {
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 3, y + 2, 1, 1);
    }
}

function drawButterfly(ctx, x, y, color, time) {
    const colors = [PAL.butterY, PAL.pink, PAL.blue, PAL.purple];
    const c = colors[color % colors.length];
    const flap = time >= 0 ? Math.sin(time * 6) : 0;
    const wingH = 3 + Math.abs(flap) * 1;
    // Body
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 3, y + 1, 1, 4);
    // Wings
    ctx.fillStyle = c;
    ctx.fillRect(x, y + 1, 3, wingH);
    ctx.fillRect(x + 4, y + 1, 3, wingH);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + 1, y + 2, 1, 1);
    ctx.fillRect(x + 5, y + 2, 1, 1);
    // Antennae
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 2, y, 1, 1);
    ctx.fillRect(x + 4, y, 1, 1);
}

function drawShell(ctx, x, y, shape) {
    const colors = [PAL.pink, PAL.cream, PAL.yellow, PAL.purple, PAL.peach, PAL.white];
    const c = colors[shape % colors.length];
    ctx.fillStyle = c;
    if (shape % 3 === 0) {
        // Scallop
        ctx.fillRect(x + 1, y + 1, 6, 4);
        ctx.fillRect(x, y + 2, 8, 2);
        ctx.fillRect(x + 3, y, 2, 1);
    } else if (shape % 3 === 1) {
        // Conch
        ctx.fillRect(x, y + 2, 3, 4);
        ctx.fillRect(x + 3, y, 3, 6);
        ctx.fillRect(x + 6, y + 3, 2, 2);
    } else {
        // Spiral
        ctx.fillRect(x + 1, y, 5, 5);
        ctx.fillRect(x, y + 1, 1, 3);
        ctx.fillRect(x + 6, y + 1, 1, 3);
    }
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 3, y + 2, 1, 1);
}

function drawYarnBall(ctx, x, y, color) {
    const colors = [PAL.red, PAL.blue, PAL.yellow, PAL.green];
    const c = colors[color % colors.length];
    ctx.fillStyle = c;
    ctx.fillRect(x + 1, y + 1, 6, 6);
    ctx.fillRect(x, y + 2, 8, 4);
    ctx.fillRect(x + 2, y, 4, 8);
    // Yarn stripes
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 1, y + 3, 6, 1);
    ctx.fillRect(x + 3, y + 1, 1, 6);
    // Loose thread
    ctx.fillRect(x + 7, y + 4, 2, 1);
}

function drawStarIcon(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y + 1, size * 2 + 1, 1);
    ctx.fillRect(x + 1, y, size * 2 - 1, 3);
    ctx.fillRect(x + 2, y - 1, size * 2 - 3, 5);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(x + size - 1, y, 1, 1);
}

function drawTreat(ctx, x, y) {
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x, y + 2, 8, 4);
    ctx.fillRect(x + 1, y + 1, 6, 6);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 2, y + 3, 4, 2);
    ctx.fillStyle = PAL.red;
    ctx.fillRect(x + 3, y + 3, 1, 1);
    ctx.fillRect(x + 5, y + 4, 1, 1);
}

function drawHeartIcon(ctx, cx, cy, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cx - size, cy - size / 2, size * 2 + 1, size);
    ctx.fillRect(cx - size + 1, cy + size / 2, size * 2 - 1, 1);
    ctx.fillRect(cx - size / 2, cy - size, size + 1, 1);
    ctx.fillRect(cx - size + 1, cy - size + 1, size - 1, 1);
    ctx.fillRect(cx + 1, cy - size + 1, size - 1, 1);
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cx - size / 2, cy - size / 2, 1, 1);
}

function drawPawIcon(ctx, cx, cy, size, color) {
    ctx.fillStyle = color;
    // Main pad
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * 0.4, size * 0.6, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Toes
    for (let i = 0; i < 4; i++) {
        const ax = cx + (i - 1.5) * size * 0.4;
        const ay = cy - size * 0.4;
        ctx.beginPath();
        ctx.arc(ax, ay, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMoon(ctx) {
    ctx.fillStyle = PAL.star;
    ctx.beginPath();
    ctx.arc(GAME.width - 30, PLAY_TOP + 20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,30,90,0.32)';
    ctx.beginPath();
    ctx.arc(GAME.width - 26, PLAY_TOP + 18, 7, 0, Math.PI * 2);
    ctx.fill();
}

// ==================== ROOM TRANSITIONS ====================

function drawEdgeArrows(ctx) {
    const time = world.sessionTick;
    const pulse = 0.5 + Math.sin(time * 0.1) * 0.3;
    // Left arrow
    ctx.globalAlpha = 0.6 + pulse * 0.3;
    ctx.fillStyle = PAL.yellow;
    const ly = (GAME.height + PLAY_TOP) / 2;
    ctx.beginPath();
    ctx.moveTo(4, ly);
    ctx.lineTo(16, ly - 10);
    ctx.lineTo(16, ly + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Right arrow
    ctx.fillStyle = PAL.yellow;
    ctx.beginPath();
    ctx.moveTo(GAME.width - 4, ly);
    ctx.lineTo(GAME.width - 16, ly - 10);
    ctx.lineTo(GAME.width - 16, ly + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
}

function tryEdgeArrowTap(x, y) {
    const ly = (GAME.height + PLAY_TOP) / 2;
    if (y < ly - 18 || y > ly + 18) return false;
    if (x <= 20) {
        startRoomTransition(-1, 'left');
        return true;
    }
    if (x >= GAME.width - 20) {
        startRoomTransition(1, 'right');
        return true;
    }
    return false;
}

function startRoomTransition(dir, exitSide) {
    const idx = ROOM_ORDER.indexOf(world.room);
    const nextIdx = (idx + dir + ROOM_ORDER.length) % ROOM_ORDER.length;
    const spawnSide = dir > 0 ? 'left' : 'right';
    world.transition = {
        nextRoom: ROOM_ORDER[nextIdx],
        spawnSide: spawnSide,
        exitSide: exitSide,
        phase: 'walkOff',
        t: 0,
        walkOffTarget: exitSide === 'right' ? GAME.width + 12 : -12,
        walkInTarget: spawnSide === 'left' ? 30 : GAME.width - 30
    };
    // Cancel ongoing reactions and clear kitten target
    cancelReaction();
    world.dialogue = null;
    world.kitten.tx = null;
    world.kitten.ty = null;
    world.kitten.busy = null;
}

function updateTransition(dt) {
    const t = world.transition;
    const k = world.kitten;

    if (t.phase === 'walkOff') {
        // Walk kitten toward the exit edge
        const target = t.walkOffTarget;
        const dx = target - k.x;
        if (Math.abs(dx) < 2) {
            t.phase = 'fadeOut';
            t.t = 0;
        } else {
            k.x += Math.sign(dx) * k.speed * dt * 1.5;
            k.facing = dx > 0 ? 'right' : 'left';
            playAnim(k, 'walk' + _capFirst(k.facing));
            updateAnim(k, dt);
        }
    } else if (t.phase === 'fadeOut') {
        t.t += dt;
        if (t.t >= 15) {
            // Fast-forward any pending onArrive callbacks so in-flight
            // collectibles still land on the shelf.
            flushFloatersOnArrive();
            // Switch rooms
            world.room = t.nextRoom;
            // Position kitten at entry edge (offscreen)
            if (t.spawnSide === 'left') {
                k.x = -12;
                k.facing = 'right';
            } else {
                k.x = GAME.width + 12;
                k.facing = 'left';
            }
            k.y = PLAY_TOP + (GAME.height - PLAY_TOP) / 2 + 20;
            // Reset any butterflies that were riding the kitten in the old room
            for (const r of Object.values(world.rooms)) {
                for (const c of r.collectibles) {
                    if (c.kind === 'butterfly' && c.onKitten > 0) c.onKitten = 0;
                }
            }
            // Re-arm the kitchen mouse wave on every re-entry
            if (world.room === 'kitchen') {
                const mouse = world.rooms.kitchen.hotspots.find(h => h.kind === 'mouse');
                if (mouse) { mouse.waved = false; mouse.state = 0; }
            }
            // Clear environmental particles
            world.pawPrints = [];
            world.dustPuffs = [];
            world.waterRipples = [];
            world.swayTiles = {};
            t.phase = 'fadeIn';
            t.t = 0;
        }
    } else if (t.phase === 'fadeIn') {
        t.t += dt;
        if (t.t >= 15) {
            t.phase = 'walkIn';
            t.t = 0;
        }
    } else if (t.phase === 'walkIn') {
        const target = t.walkInTarget;
        const dx = target - k.x;
        if (Math.abs(dx) < 2) {
            k.x = target;
            k.tx = null; k.ty = null;
            playAnim(k, 'idleBreathe');
            world.transition = null;
        } else {
            k.x += Math.sign(dx) * k.speed * dt * 1.5;
            k.facing = dx > 0 ? 'right' : 'left';
            playAnim(k, 'walk' + _capFirst(k.facing));
            updateAnim(k, dt);
        }
    }
}

function drawTransition(ctx) {
    const t = world.transition;
    if (t.phase === 'fadeOut') {
        const a = t.t / 15; // 0 -> 1
        ctx.fillStyle = `rgba(255,249,240,${a})`;
        ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);
    } else if (t.phase === 'fadeIn') {
        const a = 1 - t.t / 15; // 1 -> 0
        ctx.fillStyle = `rgba(255,249,240,${a})`;
        ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);
    }
    // walkOff and walkIn phases: no overlay, kitten walks visibly
}

// ==================== WEATHER ====================

function pickWeather() {
    const r = Math.random();
    if (r < 0.6) return 'clear';
    if (r < 0.8) return 'rain';
    return 'snow';
}

function seedWeather() {
    if (world.weather === 'clear') return;
    const n = world.weather === 'rain' ? 30 : 20;
    for (let i = 0; i < n; i++) {
        world.weatherParticles.push(makeWeatherParticle());
    }
}

function makeWeatherParticle() {
    if (world.weather === 'rain') {
        return {
            x: Math.random() * GAME.width,
            y: Math.random() * GAME.height,
            vy: 2.2,
            vx: -0.4,
            len: 3
        };
    }
    return {
        x: Math.random() * GAME.width,
        y: Math.random() * GAME.height,
        vy: 0.5 + Math.random() * 0.5,
        vx: Math.sin(Math.random() * 6) * 0.3,
        size: 1 + Math.floor(Math.random() * 2)
    };
}

function updateWeather(dt) {
    if (world.weather === 'clear') return;
    for (const p of world.weatherParticles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > GAME.height) {
            p.y = PLAY_TOP;
            p.x = Math.random() * GAME.width;
        }
        if (p.x < 0) p.x = GAME.width;
        if (p.x > GAME.width) p.x = 0;
    }
}

function drawWeather(ctx) {
    if (world.weather === 'rain') {
        ctx.strokeStyle = PAL.sky;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        for (const p of world.weatherParticles) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - 1, p.y + p.len);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    } else if (world.weather === 'snow') {
        ctx.fillStyle = PAL.white;
        for (const p of world.weatherParticles) {
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
    }
}

// ==================== NIGHT ====================

function toggleNight() {
    world.night = true;
    world.timeOfDay = 'dusk';
    world.fx.lightingFade = 0;
    world._duskTimer = 60;
    Sound.play('twinkle');
    for (const r of Object.values(world.rooms)) {
        r.starsSpawned = false;
        r.stars = [];
    }
}

function updateDuskTransition(dt) {
    if (!world._duskTimer) return;
    world._duskTimer -= dt;
    world.fx.lightingFade = clamp(1 - world._duskTimer / 60, 0, 1);
    if (world._duskTimer <= 0) {
        world._duskTimer = null;
        world.timeOfDay = 'night';
        world.fx.lightingFade = 0;
    }
}

// ==================== LULLABY ====================

function updateLullaby(dt) {
    world.lullabyTimer -= dt;
    if (world.lullabyTimer <= 0) {
        const room = currentRoom();
        Sound.play(world.night ? 'lullabyNight' : room.melody);
        world.lullabyTimer = 420 + Math.random() * 180; // ~7-10s
    }
}

// ==================== UTILS ====================

function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
