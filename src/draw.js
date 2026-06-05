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

let _ctx = null;

/** initDraw(ctx) — call once at boot with the canvas 2D context. */
export function initDraw(ctx) {
    _ctx = ctx;
}

export function drawBricks() {
    for (let r = 0; r < BRICK_ROWS; r++) {
        _ctx.fillStyle = ROW_COLORS[r];
        for (let c = 0; c < BRICK_COLS; c++) {
            if (!state.bricks[r][c]) continue;
            const brickX = BRICK_OFFSET_X + c * (BRICK_WIDTH + BRICK_GAP);
            const brickY = BRICK_OFFSET_Y + r * (BRICK_HEIGHT + BRICK_GAP);
            _ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
            if (state.brickTypes[r][c] === 'explosive') {
                _ctx.fillStyle = '#E67E22';
                _ctx.font = 'bold 14px monospace';
                _ctx.textAlign = 'center';
                _ctx.textBaseline = 'middle';
                _ctx.fillText('✸', brickX + BRICK_WIDTH / 2, brickY + BRICK_HEIGHT / 2);
                _ctx.textAlign = 'left';
                _ctx.textBaseline = 'alphabetic';
                _ctx.fillStyle = ROW_COLORS[r];
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
        _ctx.fillText('Mobile : glisser', cx, cy + 64);
        _ctx.fillStyle = '#f1c40f';
        _ctx.font = '18px monospace';
        _ctx.fillText('Appuie sur ESPACE ou clique pour commencer', cx, cy + 112);
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'alphabetic';
    }
    if (state.gameState === 'gameover') {
        _ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _ctx.fillStyle = '#e74c3c';
        _ctx.font = 'bold 48px monospace';
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        _ctx.fillStyle = '#ffffff';
        _ctx.font = '28px monospace';
        _ctx.fillText('Score : ' + state.score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        _ctx.fillStyle = '#aaaaaa';
        _ctx.font = '18px monospace';
        _ctx.fillText('Appuie sur ESPACE pour rejouer', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'alphabetic';
    } else if (state.gameState === 'victory') {
        _ctx.fillStyle = 'rgba(0, 40, 0, 0.7)';
        _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        _ctx.textAlign = 'center';
        _ctx.textBaseline = 'middle';
        _ctx.fillStyle = '#2ecc71';
        _ctx.font = 'bold 48px monospace';
        _ctx.fillText('YOU WIN !', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        _ctx.fillStyle = '#ffffff';
        _ctx.font = '28px monospace';
        _ctx.fillText('Score : ' + state.score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        _ctx.fillStyle = '#aaaaaa';
        _ctx.font = '18px monospace';
        _ctx.fillText('Appuie sur ESPACE pour rejouer', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        _ctx.textAlign = 'left';
        _ctx.textBaseline = 'alphabetic';
    }
}

export function draw() {
    _ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    _ctx.fillStyle = '#0d0d1a';
    _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBricks();
    drawPaddle();
    drawBalls();
    drawCapsules();
    drawEffectHUD();
    drawOverlay();
}
