// ==================== GAME CONFIGURATION ====================
// Tiny Kitty Garden — a cozy tap-to-play game for a 3 year old.

const GAME = {
    title: 'Tiny Kitty Garden',
    subtitle: '',
    version: 'v7',
    bgColor: '#fff4c9',

    // Unused — kept for template compatibility.
    firebase: {
        apiKey: "",
        authDomain: "",
        databaseURL: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    },
    firebasePath: 'tiny-kitty-garden',
    localStoragePrefix: 'tinyKittyGarden',

    // Canvas resolution (384x216 = SNES-style)
    width: 384,
    height: 216,

    // No on-screen controls — the game is tap-the-canvas only.
    controls: [],

    // No instructions — the child can't read.
    instructions: [],

    // Hide score/hearts HUD, default title text, and the DOM scoreboard/instructions blocks.
    hideUI: true
};
