// src/update.js — All game logic / physics. No rendering.

import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    BALL_RADIUS, BALL_SPEED_MAG,
    PADDLE_Y, PADDLE_HEIGHT, PADDLE_WIDTH,
    KEY_LEFT, KEY_RIGHT, PADDLE_SPEED, MAX_BOUNCE_ANGLE,
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP,
    BRICK_OFFSET_X, BRICK_OFFSET_Y, ROW_POINTS,
    POWERUP_DROP_CHANCE, EXTRA_LIFE_DROP_CHANCE, POWERUP_FALL_SPEED,
    POWERUP_TYPES, STICKY_DURATION, PRECISION_BONUS,
} from './constants.js';
import { state, resetBallsState } from './state.js';
import { keys } from './input.js';
import { spawnPowerUp, activateEffect, applyBallSpeedMagnitude } from './powerups.js';

// Injected at boot via initUpdate() to avoid circular imports
let _GameCore  = null;
let _updateHUD = null;

/** initUpdate(GameCore, updateHUD) — call once at boot. */
export function initUpdate(GameCore, updateHUD) {
    _GameCore  = GameCore;
    _updateHUD = updateHUD;
}

/** releaseStickyBall(ball) — compute and apply release velocity for a glued ball. */
export function releaseStickyBall(ball) {
    const releaseResult = _GameCore.computePaddleBounce(
        ball.x, PADDLE_Y, 0, 1, BALL_RADIUS,
        state.paddleX, PADDLE_Y, state.currentPaddleWidth, PADDLE_HEIGHT,
        MAX_BOUNCE_ANGLE, state.currentSpeedMag
    );
    ball.vx = releaseResult.vx;
    ball.vy = releaseResult.vy;
    ball.y  = releaseResult.y;
    ball.stuck = false;
    ball.stickyTimer = 0;
}

function updatePaddle(dt) {
    if (keys[KEY_LEFT]  || keys['arrowleft'])  state.paddleX -= PADDLE_SPEED * dt;
    if (keys[KEY_RIGHT] || keys['arrowright']) state.paddleX += PADDLE_SPEED * dt;
    state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - state.currentPaddleWidth, state.paddleX));
}

/**
 * handleBrickDestruction(row, col)
 * Marks the brick as destroyed and adds score applying V3 multipliers:
 *   - time multiplier  : peak ×3 at start, decays to ×0.1 after 4 min
 *   - combo multiplier : ×1 + comboCount × 0.1
 *   - lives bonus      : ×(1 + max(0, lives - 3))  for players with extra lives
 */
function handleBrickDestruction(row, col) {
    state.bricks[row][col]     = false;
    state.brickTypes[row][col] = 'destroyed';

    const basePoints  = ROW_POINTS[row];
    const elapsedMs   = state.levelStartTime ? Date.now() - state.levelStartTime : 0;
    const timeMult    = _GameCore.computeTimeMultiplier(elapsedMs);
    const comboMult   = _GameCore.computeComboMultiplier(state.comboCount);
    const extraLives  = Math.max(0, state.lives - 3);
    const livesMult   = 1 + extraLives;

    state.score += Math.round(basePoints * timeMult * comboMult * livesMult);
}

function updateBall(i, dt, deltaTime, destroyedThisFrame) {
    const ball = state.balls[i];

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const wallResult = _GameCore.computeWallCollisions(ball.x, ball.y, ball.vx, ball.vy, BALL_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT);
    ball.x = wallResult.x; ball.y = wallResult.y;
    ball.vx = wallResult.vx; ball.vy = wallResult.vy;

    if (wallResult.lost) {
        state.balls.splice(i, 1);
        return false;
    }

    if (ball.stuck) {
        ball.x = _GameCore.stickyBallX(state.paddleX, state.currentPaddleWidth, ball.stickyHitOffset);
        ball.y = PADDLE_Y - BALL_RADIUS;
        ball.vx = 0; ball.vy = 0;
        ball.stickyTimer += deltaTime;
        if (ball.stickyTimer >= STICKY_DURATION) releaseStickyBall(ball);
    } else {
        const paddleResult = _GameCore.computePaddleBounce(
            ball.x, ball.y, ball.vx, ball.vy, BALL_RADIUS,
            state.paddleX, PADDLE_Y, state.currentPaddleWidth, PADDLE_HEIGHT, MAX_BOUNCE_ANGLE, state.currentSpeedMag
        );
        const bounceOccurred = (ball.vy > 0) && (paddleResult.vy < 0);

        // V3 — update combo streak on every paddle contact
        if (bounceOccurred) {
            if (state.brickHitSinceLastPaddle) {
                state.comboCount++;
            } else {
                state.comboCount = 0;
            }
            state.brickHitSinceLastPaddle = false;
            _updateHUD(); // refresh combo display
        }

        if (state.stickyActive && bounceOccurred) {
            ball.stuck = true;
            state.stickyActive = false;
            ball.stickyTimer = 0;
            ball.stickyHitOffset = ball.x - state.paddleX;
            ball.x = _GameCore.stickyBallX(state.paddleX, state.currentPaddleWidth, ball.stickyHitOffset);
            ball.y = PADDLE_Y - BALL_RADIUS;
            ball.vx = 0; ball.vy = 0;
        } else {
            ball.vx = paddleResult.vx; ball.vy = paddleResult.vy; ball.y = paddleResult.y;
        }
    }

    let brickHits = null;
    if (ball.penetration > 0) {
        brickHits = _GameCore.computeBrickCollisionPenetrating(
            ball.x, ball.y, ball.vx, ball.vy, BALL_RADIUS,
            state.bricks, BRICK_OFFSET_X, BRICK_OFFSET_Y, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP,
            ball.penetration
        );
    } else {
        const standard = _GameCore.computeBrickCollision(
            ball.x, ball.y, ball.vx, ball.vy, BALL_RADIUS,
            state.bricks, BRICK_OFFSET_X, BRICK_OFFSET_Y, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP
        );
        if (standard) {
            brickHits = {
                vx: standard.vx, vy: standard.vy, x: standard.x, y: standard.y,
                destroyedBricks: [{ row: standard.hitRow, col: standard.hitCol }],
                remainingPenetration: 0,
            };
        }
    }

    if (brickHits !== null) {
        let anyDestroyed = false;
        for (const { row, col } of brickHits.destroyedBricks) {
            const key = row + ',' + col;
            if (!destroyedThisFrame.has(key) && state.bricks[row][col]) {
                destroyedThisFrame.add(key);
                const wasExplosive = state.brickTypes[row][col] === 'explosive';
                handleBrickDestruction(row, col);
                anyDestroyed = true;
                if (wasExplosive) {
                    const chain = _GameCore.computeExplosionChain(state.bricks, state.brickTypes, row, col, BRICK_ROWS, BRICK_COLS);
                    for (const { row: cr, col: cc } of chain) {
                        const chainKey = cr + ',' + cc;
                        if (!destroyedThisFrame.has(chainKey) && state.bricks[cr][cc]) {
                            destroyedThisFrame.add(chainKey);
                            handleBrickDestruction(cr, cc);
                        }
                    }
                }
                if (Math.random() < POWERUP_DROP_CHANCE) {
                    spawnPowerUp(row, col, POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]);
                }
                if (Math.random() < EXTRA_LIFE_DROP_CHANCE) {
                    spawnPowerUp(row, col, 'extralife');
                }
            }
        }
        if (anyDestroyed) {
            state.brickHitSinceLastPaddle = true; // V3 — flag for combo tracking
            _updateHUD();
            ball.penetration = brickHits.remainingPenetration;
            if (_GameCore.checkVictory(state.bricks)) {
                // V3 — precision bonus: no life lost this level
                if (state.livesLostThisLevel === 0) {
                    state.score += PRECISION_BONUS;
                    _updateHUD();
                }
                state.gameState = 'victory';
            }
        }
        ball.vx = brickHits.vx; ball.vy = brickHits.vy;
        ball.x  = brickHits.x;  ball.y  = brickHits.y;
    }

    return true;
}

function updatePowerUpCapsules(dt) {
    for (let i = state.activePowerUps.length - 1; i >= 0; i--) {
        const capsule = state.activePowerUps[i];
        capsule.y += POWERUP_FALL_SPEED * dt;
        if (_GameCore.checkPowerUpCollection(capsule, state.paddleX, PADDLE_Y, state.currentPaddleWidth, PADDLE_HEIGHT)) {
            activateEffect(capsule.type);
            state.activePowerUps.splice(i, 1);
            continue;
        }
        if (capsule.y > CANVAS_HEIGHT) {
            state.activePowerUps.splice(i, 1);
        }
    }
}

function updateTimedEffects(deltaTime) {
    for (const type of Object.keys(state.activeEffects)) {
        state.activeEffects[type].remainingMs -= deltaTime;
        if (state.activeEffects[type].remainingMs <= 0) {
            delete state.activeEffects[type];
            if (type === 'fast' || type === 'slow') {
                state.currentSpeedMag = BALL_SPEED_MAG;
                applyBallSpeedMagnitude(state.currentSpeedMag);
            }
            if (type === 'wide' || type === 'small') {
                state.currentPaddleWidth = PADDLE_WIDTH;
                state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - state.currentPaddleWidth, state.paddleX));
            }
            if (type === 'penetration') {
                state.balls.forEach(ball => { ball.penetration = 0; });
            }
        }
    }
}

function handleLifeLost() {
    // V3 — track for precision bonus and reset combo
    state.livesLostThisLevel++;
    state.comboCount              = 0;
    state.brickHitSinceLastPaddle = false;

    state.lives -= 1;
    _updateHUD();
    ['fast', 'slow', 'wide', 'small'].forEach(t => delete state.activeEffects[t]);
    state.currentSpeedMag    = BALL_SPEED_MAG;
    state.currentPaddleWidth = PADDLE_WIDTH;
    state.stickyActive       = false;
    state.activePowerUps     = [];
    if (state.lives === 0) {
        state.activeEffects = {};
        state.gameState = 'gameover';
    } else {
        resetBallsState();
        state.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    }
}

export function update(deltaTime) {
    if (state.gameState !== 'playing') return;

    // V3 — lazily initialise level timer on first playing frame
    if (state.levelStartTime === 0) state.levelStartTime = Date.now();

    const dt = deltaTime / (1000 / 60);
    updatePaddle(dt);
    const destroyedThisFrame = new Set();
    for (let i = state.balls.length - 1; i >= 0; i--) {
        updateBall(i, dt, deltaTime, destroyedThisFrame);
    }
    if (state.balls.length === 0) { handleLifeLost(); return; }
    updatePowerUpCapsules(dt);
    updateTimedEffects(deltaTime);
}
