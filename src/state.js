// src/state.js — Mutable game state. Imported by reference so all modules
// share the same object. Do NOT destructure at import site.

import {
    CANVAS_WIDTH, BALL_SPEED_X, BALL_SPEED_Y, BALL_SPEED_MAG,
    PADDLE_WIDTH, MAX_LIVES,
    BRICK_ROWS, BRICK_COLS, EXPLOSIVE_BRICK_CHANCE,
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

function makeBrickTypes() {
    const types = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
        types[r] = [];
        for (let c = 0; c < BRICK_COLS; c++) {
            types[r][c] = Math.random() < EXPLOSIVE_BRICK_CHANCE ? 'explosive' : 'normal';
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
};

// ---------------------------------------------------------------------------
// Reset helpers — called by resetGame() and handleLifeLost()
// ---------------------------------------------------------------------------

export function resetBallsState() {
    state.balls = [makeBall()];
}

export function resetBricksState() {
    state.bricks     = buildBricks(BRICK_ROWS, BRICK_COLS);
    state.brickTypes = makeBrickTypes();
}

export function resetFullState() {
    state.lives            = MAX_LIVES;
    state.score            = 0;
    state.currentSpeedMag  = BALL_SPEED_MAG;
    state.currentPaddleWidth = PADDLE_WIDTH;
    state.paddleX          = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    state.activePowerUps   = [];
    state.activeEffects    = {};
    state.stickyActive     = false;
    state.gameState        = 'playing';
    resetBallsState();
    resetBricksState();
}
