// src/powerups.js — Power-up spawn, collection and effect activation.

import {
    BRICK_OFFSET_X, BRICK_OFFSET_Y, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP,
    POWERUP_SIZE, POWERUP_COLORS, POWERUP_LABELS, POWERUP_DURATIONS,
    SPEED_FAST_MULT, SPEED_SLOW_MULT,
    PADDLE_WIDE_MULT, PADDLE_SMALL_MULT, PADDLE_WIDTH, CANVAS_WIDTH,
    BALL_SPEED_MAG, MULTIBALL_COUNT, MULTIBALL_SPREAD_DEG, MAX_BALLS,
    PENETRATION_COUNT,
} from './constants.js';
import { state } from './state.js';

// Kept as a module-level reference; set once via initPowerups().
let _GameCore = null;
let _updateHUD = null;

/**
 * initPowerups(GameCore, updateHUD)
 * Must be called once at boot before any power-up logic runs.
 * Avoids circular imports: GameCore is loaded as a non-module script
 * (window.GameCore shim) and updateHUD lives in the main module.
 */
export function initPowerups(GameCore, updateHUD) {
    _GameCore  = GameCore;
    _updateHUD = updateHUD;
}

/**
 * spawnPowerUp(row, col, type)
 * Creates a falling capsule at the centre of the destroyed brick.
 */
export function spawnPowerUp(row, col, type) {
    const brickX   = BRICK_OFFSET_X + col * (BRICK_WIDTH  + BRICK_GAP);
    const brickY   = BRICK_OFFSET_Y + row * (BRICK_HEIGHT + BRICK_GAP);
    const capsuleX = brickX + (BRICK_WIDTH  - POWERUP_SIZE) / 2;
    const capsuleY = brickY + (BRICK_HEIGHT - POWERUP_SIZE) / 2;
    state.activePowerUps.push({
        x: capsuleX, y: capsuleY,
        type, color: POWERUP_COLORS[type], label: POWERUP_LABELS[type],
        size: POWERUP_SIZE,
    });
}

/**
 * applyBallSpeedMagnitude(newMag)
 * Renormalises all ball velocity vectors to newMag, preserving direction.
 */
export function applyBallSpeedMagnitude(newMag) {
    for (const ball of state.balls) {
        const currentMag = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (currentMag === 0) continue;
        const scale = newMag / currentMag;
        ball.vx *= scale;
        ball.vy *= scale;
    }
}

/**
 * activateEffect(type)
 * Activates or extends a power-up effect.
 * CR-01: same-type re-collection adds duration (cap 3x), never re-applies magnitude.
 */
export function activateEffect(type) {
    // Instant / single-use effects — early return before timed-effect logic
    if (type === 'extralife') {
        state.lives += 1;
        _updateHUD();
        return;
    }
    if (type === 'sticky') {
        state.stickyActive = true;
        return;
    }
    if (type === 'multiball') {
        const newBalls = _GameCore.spawnExtraBalls(state.balls[0], MULTIBALL_COUNT, MULTIBALL_SPREAD_DEG, state.currentSpeedMag);
        state.balls.push(...newBalls);
        if (state.balls.length > MAX_BALLS) state.balls.splice(MAX_BALLS);
        return;
    }

    const duration    = POWERUP_DURATIONS[type];
    const maxDuration = duration * 3;

    // AC-07: opposite paddle-size effect cancels the current one
    if (type === 'wide' && state.activeEffects['small']) {
        delete state.activeEffects['small'];
        state.currentPaddleWidth = PADDLE_WIDTH;
    } else if (type === 'small' && state.activeEffects['wide']) {
        delete state.activeEffects['wide'];
        state.currentPaddleWidth = PADDLE_WIDTH;
    }

    if (state.activeEffects[type]) {
        // CR-01: stack duration
        state.activeEffects[type].remainingMs = Math.min(
            state.activeEffects[type].remainingMs + duration,
            maxDuration
        );
        state.activeEffects[type].totalMs = maxDuration;
        return;
    }

    // First collection
    state.activeEffects[type] = { remainingMs: duration, totalMs: duration };

    if (type === 'penetration') {
        state.balls.forEach(ball => { ball.penetration = PENETRATION_COUNT; });
    }
    if (type === 'fast' || type === 'slow') {
        const multiplier = (type === 'fast') ? SPEED_FAST_MULT : SPEED_SLOW_MULT;
        state.currentSpeedMag = _GameCore.computeSpeedEffect(BALL_SPEED_MAG, multiplier);
        applyBallSpeedMagnitude(state.currentSpeedMag);
    } else if (type === 'wide' || type === 'small') {
        const mult = (type === 'wide') ? PADDLE_WIDE_MULT : PADDLE_SMALL_MULT;
        state.currentPaddleWidth = PADDLE_WIDTH * mult;
        state.paddleX = state.paddleX + (PADDLE_WIDTH - state.currentPaddleWidth) / 2;
        state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - state.currentPaddleWidth, state.paddleX));
    }
}
