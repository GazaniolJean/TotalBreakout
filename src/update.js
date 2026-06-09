// src/update.js — All game logic / physics. No rendering.

import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    BALL_RADIUS,
    PADDLE_Y, PADDLE_HEIGHT, PADDLE_WIDTH,
    KEY_LEFT, KEY_RIGHT, PADDLE_SPEED, MAX_BOUNCE_ANGLE,
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP,
    BRICK_OFFSET_X, BRICK_OFFSET_Y, ROW_POINTS,
    POWERUP_DROP_CHANCE, EXTRA_LIFE_DROP_CHANCE, POWERUP_FALL_SPEED,
    POWERUP_TYPES, STICKY_DURATION, PRECISION_BONUS,
    LEVEL_CONFIG, LEVEL_COMPLETE_DURATION, // US-24
    ROW_COLORS, PARTICLE_COUNT, PARTICLE_SIZE, PARTICLE_SPEED, // US-25
    PARTICLE_FRICTION, PARTICLE_LIFETIME, PARTICLE_SPREAD_DEG, MAX_PARTICLES, // US-25
} from './constants.js';
import { state, resetBallsState, startLevel } from './state.js';
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

/** updatePaddle(dt) — déplace la raquette selon les touches actives et la bloque dans les limites du canvas. */
function updatePaddle(dt) {
    if (keys[KEY_LEFT]  || keys['arrowleft'])  state.paddleX -= PADDLE_SPEED * dt;
    if (keys[KEY_RIGHT] || keys['arrowright']) state.paddleX += PADDLE_SPEED * dt;
    state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - state.currentPaddleWidth, state.paddleX));
}

/**
 * emitBrickParticles(row, col)                                     US-25
 * Spawns destruction particles at the brick centre (AC-01) and enforces the
 * MAX_PARTICLES ring-buffer cap by dropping the oldest particles (AC-05).
 */
function emitBrickParticles(row, col) {
    const cx = BRICK_OFFSET_X + col * (BRICK_WIDTH  + BRICK_GAP) + BRICK_WIDTH  / 2;
    const cy = BRICK_OFFSET_Y + row * (BRICK_HEIGHT + BRICK_GAP) + BRICK_HEIGHT / 2;
    const parts = _GameCore.spawnBrickParticles(
        cx, cy, ROW_COLORS[row],
        PARTICLE_COUNT, PARTICLE_SPEED, PARTICLE_SPREAD_DEG, PARTICLE_LIFETIME, PARTICLE_SIZE
    );
    state.particles.push(...parts);
    if (state.particles.length > MAX_PARTICLES) {
        // ring buffer: newest overwrite oldest (AC-05)
        state.particles.splice(0, state.particles.length - MAX_PARTICLES);
    }
}

/**
 * emitExplosionFlash(row, col)                                     US-25
 * Registers a 1-frame white flash over a brick destroyed indirectly by an
 * explosion chain (AC-04). No particles are emitted for these (perf).
 */
function emitExplosionFlash(row, col) {
    const x = BRICK_OFFSET_X + col * (BRICK_WIDTH  + BRICK_GAP);
    const y = BRICK_OFFSET_Y + row * (BRICK_HEIGHT + BRICK_GAP);
    state.particleFlashes.push({ x, y, w: BRICK_WIDTH, h: BRICK_HEIGHT });
}

/**
 * destroyBrick(row, col)                                            US-23
 * Marks the brick as fully destroyed, adds score with V3 multipliers.
 * Called when hitsLeft reaches 0 (normal) or by explosion chain (force-destroy).
 * Does NOT call applyHitToBrick — caller is responsible for hitsLeft bookkeeping.
 *
 * V3 multipliers applied:
 *   - time multiplier  : peak ×3 at start, decays to ×0.1 after 4 min
 *   - combo multiplier : ×1 + comboCount × 0.1
 *   - lives bonus      : ×(1 + max(0, lives - 3))
 */
function destroyBrick(row, col) {
    state.bricks[row][col] = false;
    const bt   = state.brickTypes[row][col];
    bt.hitsLeft = 0;
    bt.type     = 'destroyed';

    const basePoints  = ROW_POINTS[row];
    const elapsedMs   = state.levelStartTime ? Date.now() - state.levelStartTime : 0;
    const timeMult    = _GameCore.computeTimeMultiplier(elapsedMs);
    const comboMult   = _GameCore.computeComboMultiplier(state.comboCount);
    const extraLives  = Math.max(0, state.lives - 3);
    const livesMult   = 1 + extraLives;

    state.score += Math.round(basePoints * timeMult * comboMult * livesMult);
}

/**
 * updateBall(i, dt, deltaTime, destroyedThisFrame)
 * Traite la physique complète d'une balle : déplacement, rebonds murs/raquette,
 * collisions briques (standard ou pénétrante), effet sticky, combos et power-ups.
 * Retourne false si la balle sort du bas (supprimée), true sinon.
 */
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
        // US-23: distinguish "brick hit" (hitsLeft decremented) from
        // "brick destroyed" (hitsLeft reached 0).
        let anyHit      = false; // any brick interacted with (triggers combo flag)
        let anyDestroyed = false; // any brick fully destroyed (triggers score/HUD/victory)

        for (const { row, col } of brickHits.destroyedBricks) {
            const key = row + ',' + col;
            if (!destroyedThisFrame.has(key) && state.bricks[row][col]) {
                destroyedThisFrame.add(key);
                anyHit = true;

                const bt = state.brickTypes[row][col];
                const { newHitsLeft, destroyed } = _GameCore.applyHitToBrick(bt);
                bt.hitsLeft = newHitsLeft; // decrement in-place (AC-03)

                if (destroyed) {
                    anyDestroyed = true;
                    const wasExplosive = bt.type === 'explosive';
                    destroyBrick(row, col);
                    emitBrickParticles(row, col); // US-25 AC-01: direct destruction → particles

                    if (wasExplosive) {
                        // AC-07 (US-23): explosion chain force-destroys multi-hit
                        // bricks immediately, bypassing applyHitToBrick.
                        const chain = _GameCore.computeExplosionChain(state.bricks, state.brickTypes, row, col, BRICK_ROWS, BRICK_COLS);
                        for (const { row: cr, col: cc } of chain) {
                            const chainKey = cr + ',' + cc;
                            if (!destroyedThisFrame.has(chainKey) && state.bricks[cr][cc]) {
                                destroyedThisFrame.add(chainKey);
                                destroyBrick(cr, cc);
                                emitExplosionFlash(cr, cc); // US-25 AC-04: indirect → flash, no particles
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
                // Non-destroyed multi-hit brick: ball bounces (AC-03), no score.
            }
        }

        if (anyHit) {
            state.brickHitSinceLastPaddle = true; // V3 — flag for combo tracking
            ball.penetration = brickHits.remainingPenetration;
        }
        if (anyDestroyed) {
            _updateHUD();
            if (_GameCore.checkVictory(state.bricks)) {
                // V3 — precision bonus: no life lost this level
                if (state.livesLostThisLevel === 0) {
                    state.score += PRECISION_BONUS;
                    _updateHUD();
                }
                // US-24 — advance to next level, or final victory after last level
                if (state.level < LEVEL_CONFIG.length) {
                    state.gameState        = 'levelcomplete';
                    state.levelCompleteTimer = LEVEL_COMPLETE_DURATION;
                } else {
                    state.gameState = 'victory';
                }
            }
        }
        ball.vx = brickHits.vx; ball.vy = brickHits.vy;
        ball.x  = brickHits.x;  ball.y  = brickHits.y;
    }

    return true;
}

/** updatePowerUpCapsules(dt) — fait tomber les capsules actives, active l'effet si la raquette les attrape, les supprime si elles sortent du bas. */
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

/** updateTimedEffects(deltaTime) — décrémente le timer de chaque effet actif et rétablit les valeurs par défaut (à vitesse, largeur raquette, pénétration) à l'expiration. */
function updateTimedEffects(deltaTime) {
    for (const type of Object.keys(state.activeEffects)) {
        state.activeEffects[type].remainingMs -= deltaTime;
        if (state.activeEffects[type].remainingMs <= 0) {
            delete state.activeEffects[type];
            if (type === 'fast' || type === 'slow') {
                state.currentSpeedMag = state.baseSpeedMag; // US-24: restore level base speed
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

/**
 * handleLifeLost() — appelée quand toutes les balles sont perdues.
 * Décrémente les vies, réinitialise le combo et les effets actifs.
 * Passe en 'gameover' si plus de vies, sinon respawn balle + raquette.
 */
function handleLifeLost() {
    // V3 — track for precision bonus and reset combo
    state.livesLostThisLevel++;
    state.comboCount              = 0;
    state.brickHitSinceLastPaddle = false;

    state.lives -= 1;
    _updateHUD();
    ['fast', 'slow', 'wide', 'small'].forEach(t => delete state.activeEffects[t]);
    state.currentSpeedMag    = state.baseSpeedMag; // US-24: keep level base speed
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

/** update(deltaTime) — tick principal du jeu : raquette, balles, capsules power-up, effets temporisés. Ignore si l'état n'est pas 'playing'. */
export function update(deltaTime) {
    // US-24 — LEVEL COMPLETE overlay: count down, then start the next level
    if (state.gameState === 'levelcomplete') {
        state.levelCompleteTimer -= deltaTime;
        if (state.levelCompleteTimer <= 0) {
            startLevel(state.level + 1);
            state.gameState = 'playing';
            _updateHUD();
        }
        return;
    }
    if (state.gameState !== 'playing') return;

    // V3 — lazily initialise level timer on first playing frame
    if (state.levelStartTime === 0) state.levelStartTime = Date.now();

    // US-25 — clear last frame's 1-frame explosion flashes
    state.particleFlashes.length = 0;

    const dt = deltaTime / (1000 / 60);
    updatePaddle(dt);
    const destroyedThisFrame = new Set();
    for (let i = state.balls.length - 1; i >= 0; i--) {
        updateBall(i, dt, deltaTime, destroyedThisFrame);
    }
    // US-25 — advance purely-visual destruction particles
    state.particles = _GameCore.advanceParticles(state.particles, dt, deltaTime, PARTICLE_FRICTION);
    if (state.balls.length === 0) { handleLifeLost(); return; }
    updatePowerUpCapsules(dt);
    updateTimedEffects(deltaTime);
}
