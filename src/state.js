// src/state.js — Mutable game state. Imported by reference so all modules
// share the same object. Do NOT destructure at import site.

import {
    CANVAS_WIDTH, BALL_SPEED_X, BALL_SPEED_Y, BALL_SPEED_MAG,
    PADDLE_WIDTH, MAX_LIVES,
    BRICK_ROWS, BRICK_COLS,
    EXPLOSIVE_BRICK_CHANCE, MULTIHIT2_CHANCE, MULTIHIT3_CHANCE, // US-23
} from './constants.js';
import { buildBricks } from './game-core.js';

// ---------------------------------------------------------------------------
// Helpers used to initialise / reset sub-structures
// ---------------------------------------------------------------------------

function makeBall() {
    return {
        x: CANVAS_WIDTH / 2,
        y: 420,
        vx: BALL_SPEED_X,
        vy: -BALL_SPEED_Y,
        stuck: false,
        stickyTimer: 0,
        stickyHitOffset: 0,
        penetration: 0,
    };
}

/**
 * makeBrickTypes()                                                  US-23
 * Returns a 2-D array of brick descriptors { type, hitsLeft, maxHits }.
 * A single uniform roll selects among explosive / multihit3 / multihit2 / normal
 * so each probability is exact and independent.
 *
 * type values:
 *   'normal'    — standard 1-hit brick
 *   'explosive' — 1-hit but triggers chain explosion on destruction (US-16)
 *   'multihit'  — requires maxHits hits before being destroyed (US-23)
 *   'destroyed' — runtime sentinel set by update.js when brick is removed
 */
function makeBrickTypes() {
    const THRESHOLD_EXPLOSIVE = EXPLOSIVE_BRICK_CHANCE;
    const THRESHOLD_MH3       = THRESHOLD_EXPLOSIVE + MULTIHIT3_CHANCE;
    const THRESHOLD_MH2       = THRESHOLD_MH3       + MULTIHIT2_CHANCE;

    const types = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
        types[r] = [];
        for (let c = 0; c < BRICK_COLS; c++) {
            const roll = Math.random();
            let type = 'normal', maxHits = 1;
            if      (roll < THRESHOLD_EXPLOSIVE) { type = 'explosive'; }
            else if (roll < THRESHOLD_MH3)       { type = 'multihit'; maxHits = 3; }
            else if (roll < THRESHOLD_MH2)       { type = 'multihit'; maxHits = 2; }
            types[r][c] = { type, hitsLeft: maxHits, maxHits };
        }
    }
    return types;
}

// ---------------------------------------------------------------------------
// The single mutable state object shared across all modules
// ---------------------------------------------------------------------------
export const state = {
    // Balls
    balls: [makeBall()],
    currentSpeedMag: BALL_SPEED_MAG,

    // Paddle
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    currentPaddleWidth: PADDLE_WIDTH,

    // Score & lives
    lives: MAX_LIVES,
    score: 0,

    // Game state machine
    gameState: 'start',

    // Bricks
    bricks: buildBricks(BRICK_ROWS, BRICK_COLS),
    brickTypes: makeBrickTypes(),

    // Power-ups
    activePowerUps: [],
    activeEffects: {},
    stickyActive: false,

    // V3 — Score multipliers
    levelStartTime: 0,              // set lazily on first playing frame
    comboCount: 0,                  // increments on paddle hit after >=1 brick destroyed
    brickHitSinceLastPaddle: false, // true when any brick destroyed since last paddle hit
    livesLostThisLevel: 0,          // used for precision bonus on victory
};

// ---