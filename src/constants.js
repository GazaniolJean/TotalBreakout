// src/constants.js — All game constants, single source of truth.

export const CANVAS_WIDTH  = 800;
export const CANVAS_HEIGHT = 600;

export const BALL_RADIUS    = 8;
export const BALL_SPEED_X   = 4;
export const BALL_SPEED_Y   = 4;
export const BALL_SPEED_MAG = Math.sqrt(BALL_SPEED_X ** 2 + BALL_SPEED_Y ** 2);

export const PADDLE_WIDTH   = 100;
export const PADDLE_HEIGHT  = 12;
export const PADDLE_Y       = 560;
export const MAX_BOUNCE_ANGLE = 5;
export const KEY_LEFT       = 'q';
export const KEY_RIGHT      = 'd';
export const PADDLE_SPEED   = 6;

export const BRICK_ROWS     = 5;
export const BRICK_COLS     = 10;
export const BRICK_WIDTH    = 70;
export const BRICK_HEIGHT   = 20;
export const BRICK_GAP      = 4;
export const BRICK_OFFSET_Y = 60;
export const BRICK_OFFSET_X = (CANVAS_WIDTH - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_GAP)) / 2;

export const ROW_COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'];
export const ROW_POINTS = [50, 40, 30, 20, 10];

export const MAX_LIVES = 3;

// Power-ups
export const POWERUP_DROP_CHANCE    = 0.20;
export const EXTRA_LIFE_DROP_CHANCE = 0.05;
export const EXPLOSIVE_BRICK_CHANCE = 0.08;
export const MULTIHIT2_CHANCE       = 0.10; // US-23
export const MULTIHIT3_CHANCE       = 0.05; // US-23
export const POWERUP_FALL_SPEED     = 3;
export const POWERUP_SIZE           = 20;

// Speed power-ups (US-10)
export const SPEED_FAST_MULT = 1.6;
export const SPEED_SLOW_MULT = 0.55;
export const SPEED_DURATION  = 8000;

// Paddle size power-ups (US-11)
export const PADDLE_WIDE_MULT     = 1.7;
export const PADDLE_SMALL_MULT    = 0.5;
export const PADDLE_SIZE_DURATION = 10000;

// Sticky (US-14)
export const STICKY_DURATION = 5000;

// Multiball (US-12)
export const MULTIBALL_COUNT      = 3;
export const MULTIBALL_SPREAD_DEG = 20;
export const MAX_BALLS            = 10;

// Penetration (US-13)
export const PENETRATION_COUNT    = 3;
export const PENETRATION_DURATION = 7000;

// Power-up definitions — single source of truth (R1)
export const POWERUP_DEFS = {
    fast:        { color: '#FF6B35', label: '▲',  duration: SPEED_DURATION,       kind: 'timed'   },
    slow:        { color: '#74B9FF', label: '▼',  duration: SPEED_DURATION,       kind: 'timed'   },
    wide:        { color: '#00B894', label: '◀▶', duration: PADDLE_SIZE_DURATION, kind: 'timed'   },
    small:       { color: '#E17055', label: '▶◀', duration: PADDLE_SIZE_DURATION, kind: 'timed'   },
    penetration: { color: '#A29BFE', label: '⬡',  duration: PENETRATION_DURATION, kind: 'timed'   },
    sticky:      { color: '#FD79A8', label: '●',  duration: null,                 kind: 'instant' },
    extralife:   { color: '#55EFC4', label: '♥',  duration: null,                 kind: 'instant' },
    multiball:   { color: '#FDCB6E', label: '✦',  duration: null,                 kind: 'instant' },
    test:        { color: '#FFFFFF', label: 'T',  duration: 5000,                 kind: 'timed'   },
};

export const POWERUP_COLORS    = Object.fromEntries(Object.entries(POWERUP_DEFS).map(([k, v]) => [k, v.color]));
export const POWERUP_LABELS    = Object.fromEntries(Object.entries(POWERUP_DEFS).map(([k, v]) => [k, v.label]));
export const POWERUP_DURATIONS = Object.fromEntries(Object.entries(POWERUP_DEFS).filter(([, v]) => v.duration).map(([k, v]) => [k, v.duration]));
export const POWERUP_TYPES     = ['fast', 'slow', 'wide', 'small', 'sticky', 'multiball', 'penetration'];

// V3 — Score system
export const PRECISION_BONUS = 500;

// High scores (US-22)
export const HS_MAX_ENTRIES = 10;
export const HS_STORAGE_KEY = 'breakout_highscores';

// ---------------------------------------------------------------------------
// US-24 — Multiple levels (3 fixed levels of increasing difficulty)
// ---------------------------------------------------------------------------
// Each level is declarative. `layout: null` → procedural grid generated with
// the configured chances; an explicit 2-D array imposes a fixed layout
// (reserved for the v5 editor — see buildLevelGrid in game-core.js).
export const LEVEL_CONFIG = [
    { name: 'NIVEAU 1', ballSpeedMult: 1.00, explosive_chance: 0.08, multihit2_chance: 0.10, multihit3_chance: 0.00, layout: null },
    { name: 'NIVEAU 2', ballSpeedMult: 1.15, explosive_chance: 0.12, multihit2_chance: 0.15, multihit3_chance: 0.05, layout: null },
    { name: 'NIVEAU 3', ballSpeedMult: 1.30, explosive_chance: 0.15, multihit2_chance: 0.20, multihit3_chance: 0.12, layout: null },
];

// Duration (ms) of the LEVEL COMPLETE overlay shown between levels (AC-03).
export const LEVEL_COMPLETE_DURATION = 2000;

// ---------------------------------------------------------------------------
// US-25 — Brick destruction particles
// ---------------------------------------------------------------------------
export const PARTICLE_COUNT      = 6;     // particles emitted per destroyed brick (AC-01)
export const PARTICLE_SIZE       = 4;     // px — square side (AC-02)
export const PARTICLE_SPEED      = 3;     // px/frame — initial speed (AC-02)
export const PARTICLE_FRICTION   = 0.92;  // per-frame velocity multiplier (AC-02)
export const PARTICLE_LIFETIME   = 400;   // ms — lifespan (AC-02)
export const PARTICLE_SPREAD_DEG = 15;    // ± random angular jitter (AC-01)
export const MAX_PARTICLES       = 200;   // ring-buffer cap (AC-05)
export const EXPLOSION_FLASH_COLOR = 'rgba(255,255,255,0.6)'; // chain flash (AC-04)
