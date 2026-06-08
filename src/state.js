// src/state.js — Mutable game state. Imported by reference so all modules
// share the same object. Do NOT destructure at import site.

import {
    CANVAS_WIDTH, BALL_SPEED_X, BALL_SPEED_Y, BALL_SPEED_MAG,
    PADDLE_WIDTH, MAX_LIVES,
    BRICK_ROWS, BRICK_COLS,
    EXPLOSIVE_BRICK_CHANCE, MULTIHIT2_CHANCE, MULTIHIT3_CHANCE,
} from './constants.js';
import { buildBricks } from './game-core.js';

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

export const state = {
    balls: [makeBall()],
    currentSpeedMag: BALL_SPEED_MAG,
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    currentPaddleWidth: PADDLE_WIDTH,
    lives: MAX_LIVES,
    score: 0,
    gameState: 'start',
    bricks: buildBricks(BRICK_ROWS, BRICK_COLS),
    brickTypes: makeBrickTypes(),
    activePowerUps: [],
    activeEffects: {},
    stickyActive: false,
    levelStartTime: 0,
    comboCount: 0,
    brickHitSinceLastPaddle: false,
    livesLostThisLevel: 0,
    // High scores (US-22)
    hsInputLetters: ['A', 'A', 'A'],
    hsInputCursor: 0,
    hsPendingScore: null,
    hsNewEntryRank: -1,
    hsFromStartScreen: false,
};

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
    state.levelStartTime          = 0;
    state.comboCount              = 0;
    state.brickHitSinceLastPaddle = false;
    state.livesLostThisLevel      = 0;
    // US-22 — reset HS input state (scores NOT cleared, AC-10)
    state.hsInputLetters  = ['A', 'A', 'A'];
    state.hsInputCursor   = 0;
    state.hsPendingScore  = null;
    resetBallsState();
    resetBricksState();
}
