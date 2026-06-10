// src/state.js — Mutable game state. Imported by reference so all modules
// share the same object. Do NOT destructure at import site.

import {
    CANVAS_WIDTH, BALL_SPEED_X, BALL_SPEED_Y, BALL_SPEED_MAG,
    PADDLE_WIDTH, MAX_LIVES,
    BRICK_ROWS, BRICK_COLS,
    LEVEL_CONFIG, // US-24
} from './constants.js';
import { buildLevelGrid, createEditorState } from './game-core.js'; // US-27

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

// US-24 — build the level-1 grid for the initial state
const _initGrid = buildLevelGrid(LEVEL_CONFIG[0], BRICK_ROWS, BRICK_COLS);

export const state = {
    balls: [makeBall()],
    currentSpeedMag: BALL_SPEED_MAG,
    paddleX: (CANVAS_WIDTH - PADDLE_WIDTH) / 2,
    currentPaddleWidth: PADDLE_WIDTH,
    lives: MAX_LIVES,
    score: 0,
    gameState: 'start',
    bricks: _initGrid.bricks,
    brickTypes: _initGrid.brickTypes,
    activePowerUps: [],
    activeEffects: {},
    stickyActive: false,
    levelStartTime: 0,
    comboCount: 0,
    brickHitSinceLastPaddle: false,
    livesLostThisLevel: 0,
    // US-24 — level progression
    level: 1,                      // current level (1-indexed)
    levelStartScore: 0,            // cumulative score at the start of the level
    baseSpeedMag: BALL_SPEED_MAG,  // ball base magnitude for the current level
    levelCompleteTimer: 0,         // ms left on the LEVEL COMPLETE overlay
    // US-25 — destruction particles
    particles: [],                 // active destruction particles
    particleFlashes: [],           // 1-frame white flashes for chain explosions
    // High scores (US-22)
    hsInputLetters: ['A', 'A', 'A'],
    hsInputCursor: 0,
    hsPendingScore: null,
    hsNewEntryRank: -1,
    hsFromStartScreen: false,
    // US-27 — level editor sub-state, created lazily on open (null when closed)
    editor: null,
};

/**
 * resetBallsState() — respawns a single ball at the level's base speed.
 * Called after a life loss; scales the ball to baseSpeedMag so the level
 * speed multiplier (US-24) is preserved across respawns.
 */
export function resetBallsState() {
    state.balls = [makeBall()];
    const mult = state.baseSpeedMag / BALL_SPEED_MAG;
    if (mult !== 1) {
        state.balls[0].vx *= mult;
        state.balls[0].vy *= mult;
    }
}

/** resetBricksState() — rebuilds the grid for the current level (US-24). */
export function resetBricksState() {
    const grid = buildLevelGrid(LEVEL_CONFIG[state.level - 1], BRICK_ROWS, BRICK_COLS);
    state.bricks     = grid.bricks;
    state.brickTypes = grid.brickTypes;
}

/**
 * startLevel(levelNum)                                             US-24
 * Initialises the given level (1-indexed): builds its grid, applies its speed
 * multiplier, and resets ball / paddle / per-level state. The cumulative score
 * and lives are NOT touched here (AC-03/AC-04) — only levelStartScore is snapped
 * to the current score. levelStartTime is reset to 0 for lazy re-init (AC-08).
 */
export function startLevel(levelNum) {
    const config = LEVEL_CONFIG[levelNum - 1];
    state.level = levelNum;

    const grid = buildLevelGrid(config, BRICK_ROWS, BRICK_COLS);
    state.bricks     = grid.bricks;
    state.brickTypes = grid.brickTypes;

    state.baseSpeedMag       = BALL_SPEED_MAG * config.ballSpeedMult;
    state.currentSpeedMag    = state.baseSpeedMag;
    state.currentPaddleWidth = PADDLE_WIDTH;
    state.paddleX            = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    state.activePowerUps     = [];
    state.activeEffects      = {};
    state.stickyActive       = false;
    resetBallsState();

    state.levelStartScore         = state.score; // cumulative score preserved
    state.levelStartTime          = 0;           // AC-08 lazy re-init
    state.comboCount              = 0;
    state.brickHitSinceLastPaddle = false;
    state.livesLostThisLevel      = 0;
    state.levelCompleteTimer      = 0;
    state.particles               = []; // US-25 AC-07: clear on level start/reset
    state.particleFlashes         = [];
}

/**
 * resetFullState() — full reset for a new game (AC-07): back to level 1,
 * score 0, lives full. High scores are NOT cleared (US-22 AC-10).
 */
export function resetFullState() {
    state.lives = MAX_LIVES;
    state.score = 0;
    startLevel(1);             // level 1 grid, speed, ball, paddle, per-level timers
    state.gameState = 'playing';
    // US-22 — reset HS input state (scores NOT cleared, AC-10)
    state.hsInputLetters  = ['A', 'A', 'A'];
    state.hsInputCursor   = 0;
    state.hsPendingScore  = null;
}

// ---------------------------------------------------------------------------
// US-27 — Level editor navigation
// ---------------------------------------------------------------------------

/**
 * openEditor() — enters the editor: builds a fresh empty editor sub-state
 * (AC-04) and switches the state machine to 'editor' (AC-01). The game grid /
 * ball state are left untouched; the editor renders its own scene.
 */
export function openEditor() {
    state.editor    = createEditorState(BRICK_ROWS, BRICK_COLS);
    state.gameState = 'editor';
}

/**
 * closeEditor() — leaves the editor back to the start screen (AC-05). The
 * dirty-confirm prompt is handled by the caller (main.js requestCloseEditor)
 * because it needs the DOM (window.confirm).
 */
export function closeEditor() {
    state.editor    = null;
    state.gameState = 'start';
}
