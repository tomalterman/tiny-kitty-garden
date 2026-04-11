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
    grassDk:  '#78b472',
    peach:    '#ffcdb2',
    peachDk:  '#e9a890',
    lav:      '#e6d4ee',
    lavDk:    '#b098c0',
    sky:      '#a6d8ff',
    skyDk:    '#7bb9ec',
    sea:      '#9dd4f3',
    seaDk:    '#6fb5dc',
    sand:     '#fde7a6',
    sandDk:   '#e9c875',
    pink:     '#ffb6c1',
    pinkDk:   '#e08899',
    cream:    '#fff9f0',
    white:    '#ffffff',
    wood:     '#d4a878',
    woodDk:   '#8b6a48',
    stone:    '#c0b8aa',
    outline:  '#5a4033',
    shadow:   'rgba(0,0,0,0.15)',
    eye:      '#2a1f26',
    red:      '#ff6b8a',
    orange:   '#ffb16b',
    yellow:   '#ffe07a',
    green:    '#9cdd7a',
    blue:     '#8ec5ff',
    purple:   '#c9a2ff',
    star:     '#fff3a3',
    frogG:    '#8ccc66',
    frogGD:   '#5c9c46',
    crab:     '#ff8a70',
    crabDk:   '#c0553a',
    mouse:    '#cdb7a3',
    mouseDk:  '#8e7a66',
    butterY:  '#ffe85a'
};

const SHELF_H = 28;
const PLAY_TOP = SHELF_H;

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
            purrTimer: 0
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
        transition: null,
        celebrating: null,
        lullabyTimer: 120,
        sessionTick: 0
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
        updateCollectibles(dt);
        checkShelfFull();
    }

    updateFloaters(dt);
    updatePawPrints(dt);
    updateWeather(dt);
    updateLullaby(dt);

    if (world.kitten.purrTimer > 0) world.kitten.purrTimer -= dt;
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

    // Paw prints under kitten
    drawPawPrints(ctx);

    // Kitten
    drawKitten(ctx);

    // Floaters over kitten
    drawFloaters(ctx);

    // Edge arrows
    drawEdgeArrows(ctx);

    // Weather (rain/snow) over world
    drawWeather(ctx);

    // Night tint
    if (world.night) {
        ctx.fillStyle = 'rgba(40,30,90,0.32)';
        ctx.fillRect(0, PLAY_TOP, w, h - PLAY_TOP);
        drawMoon(ctx);
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
    drawKittenSprite(ctx, kitX, kitY, 'down', Math.floor(time * 2) % 2, null);

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

    // 5. Walk target — plain walk, not a hotspot queue
    if (y < PLAY_TOP + 6) return; // don't walk into shelf
    setKittenTarget(x, y);
    // Any previously-queued hotspot walk is now stale.
    const room = currentRoom();
    for (const hs of room.hotspots) hs.queued = false;
}

// ==================== KITTEN ====================

const KITTEN_W = 18;
const KITTEN_H = 18;

function updateKitten(dt) {
    const k = world.kitten;

    // If kitten is mid-reaction for a hotspot, delegate to that hotspot's logic
    if (k.busy) return;

    if (k.tx == null) return;
    const dx = k.tx - k.x;
    const dy = k.ty - k.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.2) {
        k.x = k.tx; k.y = k.ty;
        k.tx = null; k.ty = null;
        return;
    }
    const step = k.speed * dt;
    const mv = Math.min(step, dist);
    k.x += (dx / dist) * mv;
    k.y += (dy / dist) * mv;
    k.walkDist += mv;

    // Update facing
    if (Math.abs(dx) > Math.abs(dy)) {
        k.facing = dx > 0 ? 'right' : 'left';
    } else {
        k.facing = dy > 0 ? 'down' : 'up';
    }

    // Advance walk frame every ~7 pixels
    if (k.walkDist > 7) {
        k.walkFrame = 1 - k.walkFrame;
        k.walkDist = 0;

        // Paw print trail
        world.pawPrints.push({
            x: k.x + (Math.random() - 0.5) * 4,
            y: k.y + 6 + (Math.random() - 0.5) * 2,
            life: 90,
            maxLife: 90
        });
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
    const k = world.kitten;
    k.purrTimer = 40;
    spawnFloater({
        kind: 'heart',
        x: k.x,
        y: k.y - KITTEN_H,
        vy: -0.5,
        life: 60,
        maxLife: 60
    });
    Sound.play('prrr');
}

function drawKitten(ctx) {
    const k = world.kitten;
    const frame = k.tx != null ? k.walkFrame : 0;
    drawKittenSprite(
        ctx,
        Math.round(k.x - KITTEN_W / 2),
        Math.round(k.y - KITTEN_H),
        k.facing,
        frame,
        world.night ? null : (world.weather === 'rain' ? 'umbrella' : (world.weather === 'snow' ? 'winter' : null))
    );

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

// The kitten is drawn procedurally with fillRect blocks for a chunky pixel look.
// (x,y) is the top-left of an 18x18 box.
function drawKittenSprite(ctx, x, y, facing, frame, accessory) {
    // Shadow
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 9, y + 18, 8, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leg wiggle
    const lift = frame === 1 ? 1 : 0;

    // Body
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x + 2, y + 9, 14, 8);
    // Outline body
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 2, y + 9, 14, 1);  // top
    ctx.fillRect(x + 2, y + 16, 14, 1); // bottom
    ctx.fillRect(x + 2, y + 9, 1, 8);   // left
    ctx.fillRect(x + 15, y + 9, 1, 8);  // right

    // Legs
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 4, y + 17 - lift, 2, 1);
    ctx.fillRect(x + 12, y + 17 + lift, 2, 1);
    ctx.fillRect(x + 7, y + 17 + lift, 2, 1);

    // Tail — direction-specific
    ctx.fillStyle = PAL.cream;
    if (facing === 'right') {
        ctx.fillRect(x + 16, y + 10, 2, 1);
        ctx.fillRect(x + 17, y + 9, 1, 3);
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x + 16, y + 9, 2, 1);
        ctx.fillRect(x + 18, y + 9, 1, 3);
    } else if (facing === 'left') {
        ctx.fillRect(x, y + 10, 2, 1);
        ctx.fillRect(x - 1, y + 9, 1, 3);
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x, y + 9, 2, 1);
        ctx.fillRect(x - 2, y + 9, 1, 3);
    } else {
        ctx.fillRect(x + 15, y + 10, 3, 1);
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x + 15, y + 9, 3, 1);
        ctx.fillRect(x + 18, y + 9, 1, 2);
    }

    // Head (bigger than body — "chunky, big head")
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x + 2, y + 2, 14, 9);
    // Ears
    ctx.fillRect(x + 2, y, 3, 2);
    ctx.fillRect(x + 13, y, 3, 2);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x + 3, y + 1, 1, 1);
    ctx.fillRect(x + 14, y + 1, 1, 1);
    // Head outline
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(x + 2, y + 2, 14, 1);  // top
    ctx.fillRect(x + 2, y + 10, 14, 1); // bottom
    ctx.fillRect(x + 2, y + 2, 1, 9);
    ctx.fillRect(x + 15, y + 2, 1, 9);
    // Ear outlines
    ctx.fillRect(x + 2, y, 3, 1);
    ctx.fillRect(x + 5, y, 1, 2);
    ctx.fillRect(x + 13, y, 3, 1);
    ctx.fillRect(x + 12, y, 1, 2);
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + 16, y + 1, 1, 1);

    // Face — depends on direction
    if (facing === 'up') {
        // back of head: tiny ears, no face
        ctx.fillStyle = PAL.cream;
        ctx.fillRect(x + 4, y + 5, 10, 3);
    } else {
        // Eyes (always smiling arcs)
        ctx.fillStyle = PAL.eye;
        if (facing === 'left') {
            ctx.fillRect(x + 4, y + 5, 2, 1);
            ctx.fillRect(x + 9, y + 5, 2, 1);
        } else if (facing === 'right') {
            ctx.fillRect(x + 7, y + 5, 2, 1);
            ctx.fillRect(x + 12, y + 5, 2, 1);
        } else {
            ctx.fillRect(x + 5, y + 5, 2, 1);
            ctx.fillRect(x + 11, y + 5, 2, 1);
        }
        // Nose
        ctx.fillStyle = PAL.pinkDk;
        ctx.fillRect(x + 8, y + 7, 2, 1);
        // Smile
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x + 7, y + 8, 1, 1);
        ctx.fillRect(x + 8, y + 9, 2, 1);
        ctx.fillRect(x + 10, y + 8, 1, 1);
        // Cheek blush
        ctx.fillStyle = PAL.pink;
        ctx.fillRect(x + 4, y + 7, 1, 1);
        ctx.fillRect(x + 13, y + 7, 1, 1);
    }

    // Accessory overlay (umbrella for rain, jacket+hat for snow)
    if (accessory === 'umbrella') {
        // Umbrella canopy
        ctx.fillStyle = PAL.red;
        ctx.fillRect(x + 1, y - 5, 16, 2);
        ctx.fillRect(x + 3, y - 6, 12, 1);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 5, y - 5, 2, 2);
        ctx.fillRect(x + 11, y - 5, 2, 2);
        // Handle
        ctx.fillStyle = PAL.woodDk;
        ctx.fillRect(x + 9, y - 3, 1, 5);
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(x + 1, y - 3, 16, 1);
    } else if (accessory === 'winter') {
        // Scarf across body
        ctx.fillStyle = PAL.red;
        ctx.fillRect(x + 2, y + 10, 14, 2);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 4, y + 10, 1, 2);
        ctx.fillRect(x + 8, y + 10, 1, 2);
        ctx.fillRect(x + 12, y + 10, 1, 2);
        // Hat
        ctx.fillStyle = PAL.red;
        ctx.fillRect(x + 4, y - 2, 10, 2);
        ctx.fillRect(x + 5, y - 3, 8, 1);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x + 4, y, 10, 1);
        // Pom
        ctx.fillRect(x + 8, y - 4, 2, 1);
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
        ctx.fillStyle = PAL.outline;
        ctx.fillRect(Math.round(p.x - 1), Math.round(p.y), 1, 1);
        ctx.fillRect(Math.round(p.x + 1), Math.round(p.y), 1, 1);
        ctx.fillRect(Math.round(p.x), Math.round(p.y + 1), 1, 1);
    }
    ctx.globalAlpha = 1;
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
    // Backdrop
    const g = ctx.createLinearGradient(0, 0, 0, SHELF_H);
    g.addColorStop(0, PAL.lav);
    g.addColorStop(1, PAL.pink);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GAME.width, SHELF_H);

    // Bottom shelf plank
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(0, SHELF_H - 4, GAME.width, 3);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(0, SHELF_H - 1, GAME.width, 1);

    // Outline divider
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(0, SHELF_H - 5, GAME.width, 1);

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
    // Each slot ~11px wide
    const slotW = Math.floor((available - (bins.length - 1) * 4) / totalCount);

    for (const bin of bins) {
        const binW = slotW * bin.count;
        // Bin outline
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(xCursor - 1, 3, binW + 2, SHELF_H - 9);
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
    // Keep weather for the session — feels continuous
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
            hotspots: [
                { kind: 'pond',  x: 80,  y: 150, w: 60, h: 28, state: 0 }
            ],
            collectibles: makeGardenCollectibles(),
            yarnBall: { x: 250, y: 75, collected: false, rolling: false },
            starsSpawned: false,
            stars: []
        },
        kitchen: {
            id: 'kitchen',
            bg: PAL.peach,
            melody: 'lullabyB',
            draw: drawKitchen,
            hotspots: [
                { kind: 'food',  x: 120, y: 160, w: 22, h: 14, state: 0 },
                { kind: 'milk',  x: 170, y: 160, w: 20, h: 12, state: 0 },
                { kind: 'mouse', x: 300, y: 172, w: 16, h: 14, state: 0, waved: false }
            ],
            collectibles: [], // treats are dispensed by the mouse
            yarnBall: { x: 50, y: 60, collected: false },
            starsSpawned: false,
            stars: [],
            treatsOffered: 0
        },
        bedroom: {
            id: 'bedroom',
            bg: PAL.lav,
            melody: 'lullabyC',
            draw: drawBedroom,
            hotspots: [
                { kind: 'bed', x: 250, y: 130, w: 80, h: 40, state: 0 }
            ],
            collectibles: [],
            yarnBall: { x: 200, y: 195, collected: false },
            toyBoxFill: 0,
            starsSpawned: false,
            stars: []
        },
        beach: {
            id: 'beach',
            bg: PAL.sand,
            melody: 'lullabyD',
            draw: drawBeach,
            hotspots: [
                { kind: 'waves', x: 0,  y: PLAY_TOP + 6,  w: GAME.width, h: 20, state: 0 },
                { kind: 'crab',  x: 240, y: 170, w: 20, h: 14, state: 0, offset: 0 }
            ],
            collectibles: makeBeachCollectibles(),
            yarnBall: { x: 150, y: 180, collected: false },
            starsSpawned: false,
            stars: []
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
    // Top-down: the whole play area is grass.
    ctx.fillStyle = PAL.grass;
    ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);

    // Grass blade dotting for texture
    ctx.fillStyle = PAL.grassDk;
    for (let i = 0; i < 36; i++) {
        const x = (i * 53 + 11) % GAME.width;
        const y = PLAY_TOP + 8 + (i * 31) % (GAME.height - PLAY_TOP - 18);
        ctx.fillRect(x, y, 2, 1);
    }

    // Stone path footprints arc through the middle (decorative)
    ctx.fillStyle = PAL.stone;
    for (let i = 0; i < 6; i++) {
        const sx = 60 + i * 50;
        const sy = 110 + Math.sin(i * 0.7) * 12;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Trees scattered across the field
    drawTree(ctx, 30, 70);
    drawTree(ctx, 350, 80);
    drawTree(ctx, 200, 50);

    // Bushes scattered
    drawBush(ctx, 110, 60);
    drawBush(ctx, 280, 70);
    drawBush(ctx, 60, 200);
    drawBush(ctx, 320, 200);

    // Pond shimmer
    const room = world.rooms.garden;
    const pond = room.hotspots.find(h => h.kind === 'pond');
    drawPond(ctx, pond);

    // Background micro-flowers scattered everywhere
    for (let i = 0; i < 14; i++) {
        const fx = (i * 37 + 17) % GAME.width;
        const fy = PLAY_TOP + 20 + (i * 19) % (GAME.height - PLAY_TOP - 30);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(fx, fy, 1, 1);
        ctx.fillRect(fx + 1, fy - 1, 1, 1);
        ctx.fillRect(fx - 1, fy - 1, 1, 1);
        ctx.fillRect(fx, fy - 2, 1, 1);
    }
}

function drawKitchen(ctx) {
    // Top-down: the whole play area is tile floor.
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);
    // Tile grid
    ctx.fillStyle = PAL.peach;
    for (let x = 0; x < GAME.width; x += 24) {
        ctx.fillRect(x, PLAY_TOP, 1, GAME.height - PLAY_TOP);
    }
    for (let y = PLAY_TOP + 12; y < GAME.height; y += 24) {
        ctx.fillRect(0, y, GAME.width, 1);
    }
    // Cozy rug in the center
    ctx.fillStyle = PAL.red;
    ctx.fillRect(80, 130, 130, 50);
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(80, 130, 130, 2);
    ctx.fillRect(80, 178, 130, 2);
    for (let i = 0; i < 13; i++) {
        ctx.fillRect(80 + i * 10, 134, 1, 42);
    }
    // Mouse hole — round hole on the floor
    ctx.fillStyle = PAL.outline;
    ctx.beginPath();
    ctx.ellipse(330, 175, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.woodDk;
    ctx.beginPath();
    ctx.ellipse(330, 173, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawBedroom(ctx) {
    // Top-down: the whole play area is wood plank floor.
    ctx.fillStyle = PAL.lav;
    ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);
    // Plank lines (horizontal grain)
    ctx.fillStyle = PAL.lavDk;
    for (let y = PLAY_TOP + 14; y < GAME.height; y += 18) {
        ctx.fillRect(0, y, GAME.width, 1);
    }
    // Plank seams (vertical breaks, offset per row)
    for (let row = 0; row < 12; row++) {
        const y = PLAY_TOP + row * 18;
        const x = ((row % 2) * 60 + 30) + ((row * 53) % 200);
        ctx.fillRect(x, y, 1, 18);
    }
    // Cozy oval rug in the center
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
    // Bed
    drawBed(ctx, world.rooms.bedroom.hotspots.find(h => h.kind === 'bed'));
    // Toy box (top-left corner of the play area)
    drawToyBox(ctx, 30, 50, world.rooms.bedroom.toyBoxFill);
}

function drawBeach(ctx) {
    // Sea
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(0, PLAY_TOP, GAME.width, 50);
    // Wave crests
    ctx.fillStyle = PAL.seaDk;
    for (let x = 0; x < GAME.width; x += 16) {
        const dy = Math.sin((x + world.sessionTick * 0.8) * 0.1) * 2;
        ctx.fillRect(x, PLAY_TOP + 45 + dy, 8, 2);
    }
    // Wet sand
    ctx.fillStyle = PAL.sandDk;
    ctx.fillRect(0, PLAY_TOP + 50, GAME.width, 6);
    // Dry sand
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(0, PLAY_TOP + 56, GAME.width, GAME.height - PLAY_TOP - 56);
    // Sand dots
    ctx.fillStyle = PAL.sandDk;
    for (let i = 0; i < 40; i++) {
        const x = (i * 17 + 3) % GAME.width;
        const y = PLAY_TOP + 60 + (i * 23) % (GAME.height - PLAY_TOP - 66);
        ctx.fillRect(x, y, 1, 1);
    }
    // A rock
    ctx.fillStyle = PAL.stone;
    ctx.fillRect(50, 160, 18, 10);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(50, 160, 18, 1);
    ctx.fillRect(50, 169, 18, 1);
}

function drawTree(ctx, x, y) {
    // Top-down tree: round canopy seen from above with a tiny brown center
    // (the trunk peeking through), and a soft shadow.
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 13, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.mintDp;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.grass;
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x - 1, y - 1, 2, 2);
}

function drawBush(ctx, x, y) {
    ctx.fillStyle = PAL.shadow;
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 6, 9, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.mintDp;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 1, 6, 0, Math.PI * 2);
    ctx.arc(x - 5, y - 1, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.grassDk;
    ctx.beginPath();
    ctx.arc(x, y - 1, 6, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 2, 4, 0, Math.PI * 2);
    ctx.arc(x - 4, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Tiny berry highlights
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(x - 1, y - 3, 1, 1);
    ctx.fillRect(x + 3, y - 1, 1, 1);
}

function drawPond(ctx, pond) {
    ctx.fillStyle = PAL.sea;
    ctx.beginPath();
    ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2, pond.w / 2, pond.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.seaDk;
    ctx.beginPath();
    ctx.ellipse(pond.x + pond.w / 2, pond.y + pond.h / 2 + 2, pond.w / 2 - 2, pond.h / 2 - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lily pad
    ctx.fillStyle = PAL.grass;
    ctx.beginPath();
    ctx.arc(pond.x + 12, pond.y + 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(pond.x + 11, pond.y + 8, 2, 2);
    // Ripples
    ctx.strokeStyle = PAL.cream;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const r = (world.sessionTick * 0.5) % 10;
    ctx.ellipse(pond.x + pond.w / 2 + 6, pond.y + pond.h / 2, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
}

function drawBed(ctx, bed) {
    // Bed frame
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(bed.x, bed.y + bed.h - 12, bed.w, 12);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(bed.x + 2, bed.y + bed.h - 10, bed.w - 4, 6);
    // Headboard
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(bed.x + bed.w - 6, bed.y, 6, bed.h);
    // Pillow
    ctx.fillStyle = PAL.white;
    ctx.fillRect(bed.x + bed.w - 26, bed.y + 8, 18, 10);
    ctx.fillStyle = PAL.outline;
    ctx.fillRect(bed.x + bed.w - 26, bed.y + 8, 18, 1);
    // Blanket
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(bed.x + 4, bed.y + 16, bed.w - 30, bed.h - 28);
    // Blanket stripes
    ctx.fillStyle = PAL.red;
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(bed.x + 4 + i * 12, bed.y + 16, 4, bed.h - 28);
    }
}

function drawToyBox(ctx, x, y, fill) {
    // Top-down chest: open lid with a slightly inset interior
    ctx.fillStyle = PAL.shadow;
    ctx.fillRect(x + 2, y + 22, 34, 2);
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x, y, 36, 24);
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x + 2, y + 2, 32, 20);
    // Plank seams
    ctx.fillStyle = PAL.woodDk;
    ctx.fillRect(x + 12, y + 2, 1, 20);
    ctx.fillRect(x + 23, y + 2, 1, 20);
    // Yellow tag
    ctx.fillStyle = PAL.yellow;
    ctx.fillRect(x + 14, y + 9, 8, 6);
    ctx.fillStyle = PAL.orange;
    ctx.fillRect(x + 14, y + 9, 8, 1);
    // Filled yarn balls peek out the top
    for (let i = 0; i < fill; i++) {
        drawYarnBall(ctx, x + 5 + i * 8, y - 4, i, true);
    }
}

function drawKittenPortrait(ctx, x, y) {
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x, y, 24, 22);
    ctx.fillStyle = PAL.cream;
    ctx.fillRect(x + 2, y + 2, 20, 18);
    drawKittenSprite(ctx, x + 3, y + 3, 'down', 0, null);
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
                hs.state = 50;
                k.busy = hs.kind;

                if (hs.kind === 'food') {
                    Sound.play('eat');
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
                } else if (hs.kind === 'milk') {
                    Sound.play('lap');
                } else if (hs.kind === 'bed') {
                    // Sleep: Zs for the duration
                    hs.state = 160;
                    Sound.play('mew');
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => {
                            spawnFloater({
                                kind: 'z', x: k.x + 4, y: k.y - KITTEN_H - 4,
                                vy: -0.4, vx: 0.2,
                                life: 50, maxLife: 50
                            });
                        }, i * 400);
                    }
                    if (!world.night) toggleNight();
                } else if (hs.kind === 'waves') {
                    Sound.play('waveBack');
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
                    spawnFloater({ kind: 'mrrp', x: k.x, y: k.y - KITTEN_H - 2, vy: -0.3, life: 30, maxLife: 30 });
                    Sound.play('giggle');
                } else if (hs.kind === 'pond') {
                    // Frog hops out and ribbits — kitten is now standing next to the pond
                    hs.state = 30;
                    Sound.play('ribbit');
                    k.busy = null; // pond reaction is brief; let kitten stay free
                } else if (hs.kind === 'crab') {
                    hs.state = 60;
                    hs.offset = 0;
                    Sound.play('scuttle');
                    k.busy = null;
                } else if (hs.kind === 'mouse') {
                    // Mouse waves and then drops a treat
                    hs.state = 90;
                    hs.waved = true;
                    Sound.play('mew');
                    spawnFloater({ kind: 'mrrp', x: hs.x + hs.w / 2, y: hs.y - 4, vy: -0.3, life: 40, maxLife: 40 });
                    setTimeout(() => {
                        if (room.treatsOffered >= 4) return;
                        room.collectibles.push({
                            kind: 'treat',
                            x: hs.x - 18,
                            y: hs.y + 2,
                            collected: false,
                            index: room.treatsOffered++
                        });
                    }, 600);
                    k.busy = null;
                }
            }
        }

        // Hotspot-done
        if (hs.state <= 0 && k.busy === hs.kind) {
            k.busy = null;
            hs.state = 0;
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
            ctx.fillStyle = PAL.red;
            ctx.beginPath();
            ctx.ellipse(hs.x + hs.w / 2, hs.y + hs.h, hs.w / 2, hs.h / 2, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.peachDk;
            ctx.fillRect(hs.x, hs.y + hs.h - 2, hs.w, 2);
            // Kibble
            ctx.fillStyle = PAL.wood;
            ctx.fillRect(hs.x + 4, hs.y + 3, 3, 3);
            ctx.fillRect(hs.x + 10, hs.y + 2, 3, 3);
            ctx.fillRect(hs.x + 16, hs.y + 4, 3, 3);
        } else if (hs.kind === 'milk') {
            ctx.fillStyle = PAL.sky;
            ctx.beginPath();
            ctx.ellipse(hs.x + hs.w / 2, hs.y + hs.h, hs.w / 2, hs.h / 2, 0, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = PAL.white;
            ctx.beginPath();
            ctx.ellipse(hs.x + hs.w / 2, hs.y + hs.h - 2, hs.w / 2 - 2, hs.h / 2 - 2, 0, Math.PI, Math.PI * 2);
            ctx.fill();
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
    ctx.fillStyle = PAL.frogG;
    ctx.fillRect(fx, fy, 10, 6);
    ctx.fillRect(fx + 1, fy - 2, 8, 2);
    ctx.fillStyle = PAL.frogGD;
    ctx.fillRect(fx, fy + 5, 10, 1);
    // Eyes
    ctx.fillStyle = PAL.white;
    ctx.fillRect(fx + 2, fy - 3, 2, 2);
    ctx.fillRect(fx + 6, fy - 3, 2, 2);
    ctx.fillStyle = PAL.eye;
    ctx.fillRect(fx + 3, fy - 2, 1, 1);
    ctx.fillRect(fx + 7, fy - 2, 1, 1);
}

function drawMouse(ctx, hs) {
    const waving = hs.state > 0 && hs.waved;
    const wiggle = waving ? Math.sin(hs.state * 0.4) * 2 : 0;
    ctx.fillStyle = PAL.mouse;
    ctx.fillRect(hs.x, hs.y, 12, 10);
    ctx.fillRect(hs.x + 12, hs.y + 3, 3, 4);
    // Ears
    ctx.fillStyle = PAL.mouseDk;
    ctx.fillRect(hs.x + 2, hs.y - 2, 3, 2);
    ctx.fillRect(hs.x + 7, hs.y - 2, 3, 2);
    ctx.fillStyle = PAL.pink;
    ctx.fillRect(hs.x + 3, hs.y - 1, 1, 1);
    ctx.fillRect(hs.x + 8, hs.y - 1, 1, 1);
    // Eye
    ctx.fillStyle = PAL.eye;
    ctx.fillRect(hs.x + 4, hs.y + 4, 1, 1);
    // Nose
    ctx.fillStyle = PAL.pinkDk;
    ctx.fillRect(hs.x + 12, hs.y + 5, 1, 1);
    // Tail
    ctx.strokeStyle = PAL.mouseDk;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hs.x, hs.y + 7);
    ctx.lineTo(hs.x - 5, hs.y + 10);
    ctx.stroke();
    // Waving paw
    if (waving) {
        ctx.fillStyle = PAL.mouse;
        ctx.fillRect(hs.x - 1, hs.y - 3 + wiggle, 2, 3);
    }
}

function drawCrab(ctx, hs) {
    const cx = hs.x + hs.offset;
    const cy = hs.y;
    ctx.fillStyle = PAL.crab;
    ctx.beginPath();
    ctx.ellipse(cx + 10, cy + 7, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.crabDk;
    ctx.fillRect(cx + 3, cy + 10, 14, 2);
    // Claws
    ctx.fillStyle = PAL.crab;
    ctx.fillRect(cx, cy + 5, 4, 3);
    ctx.fillRect(cx + 16, cy + 5, 4, 3);
    // Eyes
    ctx.fillStyle = PAL.white;
    ctx.fillRect(cx + 8, cy + 2, 2, 2);
    ctx.fillRect(cx + 12, cy + 2, 2, 2);
    ctx.fillStyle = PAL.eye;
    ctx.fillRect(cx + 9, cy + 2, 1, 1);
    ctx.fillRect(cx + 13, cy + 2, 1, 1);
    // Legs
    ctx.fillStyle = PAL.crabDk;
    const legShift = Math.floor(hs.offset / 4) % 2;
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(cx + 2 + i * 3, cy + 12, 1, 2 + legShift);
        ctx.fillRect(cx + 13 + i * 3, cy + 12, 1, 2 + (1 - legShift));
    }
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
        drawYarnBall(ctx, room.yarnBall.x, room.yarnBall.y, yIdx);
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
        startRoomTransition(-1);
        return true;
    }
    if (x >= GAME.width - 20) {
        startRoomTransition(1);
        return true;
    }
    return false;
}

function startRoomTransition(dir) {
    const idx = ROOM_ORDER.indexOf(world.room);
    const nextIdx = (idx + dir + ROOM_ORDER.length) % ROOM_ORDER.length;
    world.transition = {
        t: 0, duration: 24, phase: 'out',
        nextRoom: ROOM_ORDER[nextIdx],
        spawnSide: dir > 0 ? 'left' : 'right'
    };
    // Clear paw prints + floaters + in-flight kitten target
    world.pawPrints = [];
    world.kitten.tx = null;
    world.kitten.ty = null;
    world.kitten.busy = null;
}

function updateTransition(dt) {
    const t = world.transition;
    t.t += dt;
    if (t.phase === 'out' && t.t >= t.duration) {
        // Fast-forward any pending onArrive callbacks so in-flight
        // collectibles still land on the shelf — otherwise a shelf slot
        // can become permanently unreachable and block celebration.
        flushFloatersOnArrive();
        // Switch rooms
        world.room = t.nextRoom;
        const k = world.kitten;
        if (t.spawnSide === 'left') {
            k.x = 18;
            k.facing = 'right';
        } else {
            k.x = GAME.width - 18;
            k.facing = 'left';
        }
        k.y = PLAY_TOP + (GAME.height - PLAY_TOP) / 2 + 20;
        // Reset any butterflies that were riding the kitten in the old room
        // so they don't teleport-collect on re-entry.
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
        t.phase = 'in';
        t.t = 0;
    } else if (t.phase === 'in' && t.t >= t.duration) {
        world.transition = null;
    }
}

function drawTransition(ctx) {
    const t = world.transition;
    const a = t.phase === 'out' ? (t.t / t.duration) : (1 - t.t / t.duration);
    ctx.fillStyle = `rgba(255,249,240,${a})`;
    ctx.fillRect(0, PLAY_TOP, GAME.width, GAME.height - PLAY_TOP);
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
    Sound.play('twinkle');
    // Reset star spawns
    for (const r of Object.values(world.rooms)) {
        r.starsSpawned = false;
        r.stars = [];
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
