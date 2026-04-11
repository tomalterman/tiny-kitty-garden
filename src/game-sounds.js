// ==================== GAME SOUNDS ====================
// Soft procedural chiptune for Tiny Kitty Garden.
// Every sound is gentle — volumes are kept low (0.1–0.2 range).

const SOUNDS = {
    // Engine-auto-played sounds
    start: (S) => {
        S.playTone(660, 880, 0.12, 'sine', 0.18);
        setTimeout(() => S.playTone(880, 990, 0.18, 'sine', 0.18), 120);
    },
    // Never triggered in practice (no game-over), but defined to avoid a no-op warning.
    gameOver: (S) => { /* silent */ },

    // Per-room lullabies — short 4-note phrases
    lullabyA: (S) => {
        // Garden — bright major
        const notes = [523, 659, 784, 659];
        notes.forEach((n, i) => setTimeout(() => S.playTone(n, n, 0.22, 'triangle', 0.12), i * 180));
    },
    lullabyB: (S) => {
        // Kitchen — warm descending
        const notes = [784, 698, 587, 523];
        notes.forEach((n, i) => setTimeout(() => S.playTone(n, n, 0.24, 'triangle', 0.12), i * 200));
    },
    lullabyC: (S) => {
        // Bedroom — soft and slow
        const notes = [659, 587, 494, 523];
        notes.forEach((n, i) => setTimeout(() => S.playTone(n, n, 0.28, 'sine', 0.12), i * 240));
    },
    lullabyD: (S) => {
        // Beach — rolling
        const notes = [587, 698, 784, 880, 784, 698];
        notes.forEach((n, i) => setTimeout(() => S.playTone(n, n, 0.18, 'triangle', 0.11), i * 160));
    },
    lullabyNight: (S) => {
        // Night variant — slower, lower
        const notes = [440, 392, 330, 392];
        notes.forEach((n, i) => setTimeout(() => S.playTone(n, n, 0.34, 'sine', 0.10), i * 280));
    },

    // Cat sounds
    mrrp: (S) => {
        S.playTone(520, 680, 0.08, 'triangle', 0.16);
        setTimeout(() => S.playTone(680, 600, 0.06, 'triangle', 0.14), 60);
    },
    prrr: (S) => {
        // Purring rumble
        S.playTone(180, 160, 0.28, 'sawtooth', 0.12);
        setTimeout(() => S.playTone(170, 150, 0.24, 'sawtooth', 0.10), 80);
    },
    mew: (S) => {
        S.playTone(620, 840, 0.14, 'sine', 0.18);
    },
    giggle: (S) => {
        [720, 820, 900, 820].forEach((n, i) => {
            setTimeout(() => S.playTone(n, n, 0.05, 'sine', 0.14), i * 45);
        });
    },

    // Reaction sounds
    sparkle: (S) => {
        S.playTone(980, 1320, 0.08, 'sine', 0.15);
        setTimeout(() => S.playTone(1320, 1560, 0.06, 'sine', 0.12), 50);
    },
    twinkle: (S) => {
        [1050, 1320, 1760].forEach((n, i) => {
            setTimeout(() => S.playTone(n, n, 0.10, 'sine', 0.12), i * 80);
        });
    },
    ribbit: (S) => {
        S.playTone(180, 240, 0.10, 'sawtooth', 0.20);
        setTimeout(() => S.playTone(240, 180, 0.08, 'sawtooth', 0.18), 90);
    },
    lap: (S) => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => S.playNoise(0.05, 800, 300), i * 100);
        }
    },
    eat: (S) => {
        for (let i = 0; i < 3; i++) {
            setTimeout(() => S.playTone(300 + i * 40, 260 + i * 40, 0.06, 'triangle', 0.16), i * 70);
        }
    },
    waveBack: (S) => {
        S.playNoise(0.14, 900, 300);
    },
    scuttle: (S) => {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => S.playTone(900, 600, 0.03, 'square', 0.08), i * 40);
        }
    },

    // Full-shelf celebration
    celebrate: (S) => {
        const notes = [523, 659, 784, 1046, 1318];
        notes.forEach((n, i) => setTimeout(() => S.playTone(n, n, 0.14, 'triangle', 0.16), i * 120));
        setTimeout(() => {
            [784, 988, 1175, 1568].forEach((n, i) => {
                setTimeout(() => S.playTone(n, n, 0.18, 'sine', 0.15), i * 140);
            });
        }, 700);
    }
};
