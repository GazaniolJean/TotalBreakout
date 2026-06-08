// src/draw.js — All canvas rendering. No game-state mutations.

import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    BALL_RADIUS,
    PADDLE_Y, PADDLE_HEIGHT,
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP,
    BRICK_OFFSET_X, BRICK_OFFSET_Y,
    ROW_COLORS, POWERUP_COLORS,
} from './constants.js';
import { state } from './state.js';
import { computeTimeMultiplier, computeComboMultiplier } from './game-core.js';

let _ctx = null;

/** initDraw(ctx) — call once at boot with the canvas 2D context. */
export function initDraw(ctx) {
    _ctx = ctx;
}

/**
 * drawBrickCracks(brickX, brickY, numCracks)                       US-23
 * Draws 1 or 2 diagonal crack lines on a damaged multi-hit brick.
 */
function drawBrickCracks(brickX, brickY, numCracks) {
    _ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    _ctx.lineWidth   = 1.5;
    _ctx.beginPath();
    if (numCracks >= 1) {
        // First crack: top-left area → bottom-right area
        _ctx.moveTo(brickX + BRICK_WIDTH * 0.2, brickY + 2);
        _ctx.lineTo(brickX + BRICK_WIDTH * 0.8, brickY + BRICK_HEIGHT - 2);
    }
    if (numCracks >= 2) {
        // Second crack: top-right area → bottom-left area (X shape)
        _ctx.moveTo(brickX + BRICK_WIDTH * 0.8, brickY + 2);
        _ctx.lineTo(brickX + BRICK_WIDTH * 0.2, brickY + BRICK_HEIGHT - 2);
    }
    _ctx.stroke();
    _ctx.lineWidth = 1;
}

export function drawBricks() {
    for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
            if (!state.bricks[r][c]) continue;
            const bt     = state.brickTypes[r][c];
            const brickX = BRICK_OFFSET_X + c * (BRICK_WIDTH + BRICK_GAP);
            const brickY = BRICK_OFFSET_Y + r * (BRICK_HEIGHT + BRICK_GAP);

            // Base fill — row colour for all brick types
            _ctx.fillStyle = ROW_COLORS[r];
            _ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);

            if (bt.type === 'explosive') {
                // Existing explosive marker (US-16)
                _ctx.fillStyle = '#E67E22';
                _ctx.font = 'bold 14px monospace';
                _ctx.textAlign = 'center';
                _ctx.textBaseline = 'middle';
                _ctx.fillText('✸', brickX + BRICK_WIDTH / 2, brickY + BRICK_HEIGHT / 2);
                _ctx.textAlign = 'left';
                _ctx.textBaseline = 'alphabetic';

            } else if (bt.type === 'multihit') {
                const damageTaken = bt.maxHits - bt.hitsLeft;

                if (damageTaken === 0) {
                    // Full HP: show hit-count label so players know the brick is tough
                    _ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    _ctx.font = 'bold 11px monospace';
                    _ctx.textAlign = 'center';
                    _ctx.textBaseline = 'middle';
                    _ctx.fillText(bt.maxHits, brickX + BRICK_WIDTH / 2, brickY + BRICK_HEIGHT / 2);
                    _ctx.textAlign = 'left';
                    _ctx.textBaseline = 'alphabetic';
                } else {
                    // Damaged: grey overlay (opacity grows with damage) + cracks
                    const overlayOpacity = (damageTaken / bt.maxHits) * 0.55;
                    _ctx.fillStyle = `rgba(200,200,200,${overlayOpacity})`;
                    _ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                    drawBrickCracks(brickX, brickY, damageTaken);
                }
            }
        }
    }
}

export function drawPaddle() {
    _ctx.fillStyle = '#ecf0f1';
    _ctx.fillRect(state.paddleX, PADDLE_Y, state.currentPaddleWidth, PADDLE_HEIGHT);
}

export function drawBalls() {
    for (const ball of state.balls) {
        _ctx.beginPath();
        _ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        _ctx.fillStyle = '#ffffff';
        _ctx.fill();
        _ctx.closePath();
        if (ball.stuck) {
            _ctx.beginPath();
            _ctx.arc(ball.x, ball.y, BALL_RADIUS + 4, 0, Math.PI * 2);
            _ctx.strokeStyle = '#FD79A8';
            _ctx.lineWidth = 2;
            _ctx.stroke();
            _ctx.closePath();
            _ctx.lineWidth = 1;
        }
        if (ball.penetration > 0) {
            _ctx.beginPath();
            _ctx.arc(ball.x, ball.y, BALL_RADIUS + 4, 0, Math.PI * 2);
            _ctx.strokeStyle = '#A29BFE';
            _ctx.lineWidth = 2;
            _ctx.stroke();
            _ctx.closePath();
            _ctx.lineWidth = 1;
        }
    }
}

export function drawCapsules() {
    for (const capsule of state.activePowerUps) {
        _ctx.fillStyle = capsule.color;
        _ctx.fillRect(capsule.x, capsule.y, capsule.size, capsule.size);
        _ctx.fillStyle = '#000000';
        _ctx.font = 'bold 14px monospace';
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillText(capsule.label, capsule.x + capsule.size / 2, capsule.y + capsule.size / 2);
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'alphabetic';
    }
}

export function drawEffectHUD() {
    const activeEffectKeys = Object.keys(state.activeEffects);
    if (activeEffectKeys.length === 0) return;
    _ctx.font = '14px monospace';
    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
    const lineHeight = 18;
    const baseY = CANVAS_HEIGHT - 8 - (activeEffectKeys.length - 1) * lineHeight;
    for (let i = 0; i < activeEffectKeys.length; i++) {
        const type   = activeEffectKeys[i];
        const effect = state.activeEffects[type];
        const secondsLeft = Math.ceil(effect.remainingMs / 1000);
        _ctx.fillStyle = POWERUP_COLORS[type] || '#ffffff';
        _ctx.fillText(type.toUpperCase() + ' ' + secondsLeft + 's', 8, baseY + i * lineHeight);
    }
}

/**
 * drawScoreMultipliers()
 * V3 — Renders the active score multipliers on the canvas:
 *   - Top-right : time multiplier  (e.g. "TIME ×2.4")
 *   - Bottom-right: combo multiplier when combo > 0 (e.g. "COMBO ×1.3")
 */
export function drawScoreMultipliers() {
    if (state.gameState !== 'playing') return;

    const elapsedMs  = state.levelStartTime ? Date.now() - state.levelStartTime : 0;
    const timeMult   = computeTimeMultiplier(elapsedMs);
    const comboMult  = computeComboMultiplier(state.comboCount);

    _ctx.font = '13px monospace';
    _ctx.textAlign = 'right';
    _ctx.textBaseline = 'alphabetic';

    // Time multiplier — top-right, colour shifts from gold (high) to grey (low)
    const timeColor = timeMult >= 2.5 ? '#f1c40f'
                    : timeMult >= 1.5 ? '#e67e22'
                    : timeMult >= 0.8 ? '#aaaaaa'
                    : '#666666';
    _ctx.fillStyle = timeColor;
    _ctx.fillText('TIME ×' + timeMult.toFixed(1), CANVAS_WIDTH - 8, 20);

    // Combo multiplier — bottom-right, only when active
    if (state.comboCount > 0) {
        _ctx.fillStyle = '#74B9FF';
        _ctx.fillText('COMBO ×' + comboMult.toFixed(1), CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
    }

    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
}

export function drawOverlay() {
    if (state.gameState === 'start') {
        _ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';
        const cx = CANVAS_WIDTH / 2;
        const cy = CANVAS_HEIGHT / 2;
        _ctx.fillStyle = '#ffffff';
        _ctx.font = 'bold 52px monospace';
        _ctx.fillText('BREAKOUT', cx, cy - 90);
        _ctx.fillStyle = '#aaaaaa';
        _ctx.font = '20px monospace';
        _ctx.fillText('Casse toutes les briques !', cx, cy - 48);
        _ctx.fillStyle = '#cccccc';
        _ctx.font = '18px monospace';
        _ctx.fillText('Clavier : Q / D  ou  ← →', cx, cy + 8);
        _ctx.fillText('Souris : deplace la raquette', cx, cy + 36);
        _ctx.fillText('Mobile : boutons ou glisser', cx, cy + 64);
        _ctx.fillStyle = '#f1c40f';
        _ctx.font = '18px monospace';
        _ctx.fillText('Appuie sur ESPACE ou clique pour commencer', cx, c