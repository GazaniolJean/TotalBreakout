// src/draw.js — All canvas rendering. No game-state mutations.

import {
    CANVAS_WIDTH, CANVAS_HEIGHT,
    BALL_RADIUS,
    PADDLE_Y, PADDLE_HEIGHT,
    BRICK_ROWS, BRICK_COLS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_GAP,
    BRICK_OFFSET_X, BRICK_OFFSET_Y,
    ROW_COLORS, POWERUP_COLORS,
    LEVEL_CONFIG, // US-24
} from './constants.js';
import { state } from './state.js';
import { computeTimeMultiplier, computeComboMultiplier } from './game-core.js';
import { loadHighScores } from './highscore.js';

let _ctx = null;

export function initDraw(ctx) {
    _ctx = ctx;
}

function drawBrickCracks(brickX, brickY, numCracks) {
    _ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    _ctx.lineWidth   = 1.5;
    _ctx.beginPath();
    if (numCracks >= 1) {
        _ctx.moveTo(brickX + BRICK_WIDTH * 0.2, brickY + 2);
        _ctx.lineTo(brickX + BRICK_WIDTH * 0.8, brickY + BRICK_HEIGHT - 2);
    }
    if (numCracks >= 2) {
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
            _ctx.fillStyle = ROW_COLORS[r];
            _ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
            if (bt.type === 'explosive') {
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
                    _ctx.fillStyle = 'rgba(255,255,255,0.85)';
                    _ctx.font = 'bold 11px monospace';
                    _ctx.textAlign = 'center';
                    _ctx.textBaseline = 'middle';
                    _ctx.fillText(bt.maxHits, brickX + BRICK_WIDTH / 2, brickY + BRICK_HEIGHT / 2);
                    _ctx.textAlign = 'left';
                    _ctx.textBaseline = 'alphabetic';
                } else {
                    const overlayOpacity = (damageTaken / bt.maxHits) * 0.55;
                    _ctx.fillStyle = `rgba(200,200,200,${overlayOpacity})`;
                    _ctx.fillRect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                    drawBrickCracks(brickX, brickY, damageTaken);
                }
            }
        }
    }
}

/**
 * drawExplosionFlashes()                                          US-25
 * Renders the 1-frame white flashes for bricks destroyed by an explosion
 * chain (AC-04). Drawn after the bricks, before the ball/HUD.
 */
export function drawExplosionFlashes() {
    if (state.particleFlashes.length === 0) return;
    _ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (const f of state.particleFlashes) {
        _ctx.fillRect(f.x, f.y, f.w, f.h);
    }
}

/**
 * drawParticles()                                                 US-25
 * Renders every active destruction particle as a fading colored square (AC-02).
 * Opacity decreases linearly from 1.0 to 0 over the particle's lifetime.
 */
export function drawParticles() {
    for (const p of state.particles) {
        const opacity = Math.max(0, 1 - p.age / p.lifetime);
        _ctx.globalAlpha = opacity;
        _ctx.fillStyle = p.color;
        _ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    _ctx.globalAlpha = 1;
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

export function drawScoreMultipliers() {
    if (state.gameState !== 'playing') return;
    const elapsedMs  = state.levelStartTime ? Date.now() - state.levelStartTime : 0;
    const timeMult   = computeTimeMultiplier(elapsedMs);
    const comboMult  = computeComboMultiplier(state.comboCount);
    _ctx.font = '13px monospace';
    _ctx.textAlign = 'right';
    _ctx.textBaseline = 'alphabetic';
    const timeColor = timeMult >= 2.5 ? '#f1c40f'
                    : timeMult >= 1.5 ? '#e67e22'
                    : timeMult >= 0.8 ? '#aaaaaa'
                    : '#666666';
    _ctx.fillStyle = timeColor;
    _ctx.fillText('TIME ×' + timeMult.toFixed(1), CANVAS_WIDTH - 8, 20);
    if (state.comboCount > 0) {
        _ctx.fillStyle = '#74B9FF';
        _ctx.fillText('COMBO ×' + comboMult.toFixed(1), CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
    }
    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
}

/**
 * drawHighScoreInput()                                            US-22
 * Renders the initials entry screen (AC-03, AC-04).
 */
function drawHighScoreInput() {
    const cx = CANVAS_WIDTH / 2;
    _ctx.fillStyle = '#000000';
    _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillStyle = '#00FF41';
    _ctx.font = 'bold 28px monospace';
    _ctx.fillText('NOUVEAU RECORD !', cx, 120);
    _ctx.fillStyle = '#aaaaaa';
    _ctx.font = '20px monospace';
    _ctx.fillText('Score : ' + (state.hsPendingScore ? state.hsPendingScore.score : 0), cx, 170);
    _ctx.fillStyle = '#00FF41';
    _ctx.font = '22px monospace';
    _ctx.fillText('ENTREZ VOS INITIALES', cx, 230);
    const boxW = 60, boxH = 72, gap = 20;
    const totalW = 3 * boxW + 2 * gap;
    const startX = cx - totalW / 2;
    const boxY   = 280;
    const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
    for (let i = 0; i < 3; i++) {
        const bx = startX + i * (boxW + gap);
        const active = i === state.hsInputCursor;
        _ctx.fillStyle = active ? '#003300' : '#111111';
        _ctx.fillRect(bx, boxY, boxW, boxH);
        _ctx.strokeStyle = active ? '#00FF41' : '#446644';
        _ctx.lineWidth   = active ? 2 : 1;
        _ctx.strokeRect(bx, boxY, boxW, boxH);
        _ctx.lineWidth = 1;
        _ctx.fillStyle = active ? '#00FF41' : '#446644';
        _ctx.font = 'bold 44px monospace';
        _ctx.fillText(state.hsInputLetters[i], bx + boxW / 2, boxY + boxH / 2);
        if (active && blinkOn) {
            _ctx.fillStyle = '#00FF41';
            _ctx.fillRect(bx + 8, boxY + boxH - 8, boxW - 16, 3);
        }
    }
    _ctx.fillStyle = '#888888';
    _ctx.font = '15px monospace';
    _ctx.fillText('↑ ↓  changer la lettre    ← →  changer le champ', cx, 400);
    _drawHsInputMobileButtons(cx, 450);
    _ctx.fillStyle = '#f1c40f';
    _ctx.font = '18px monospace';
    _ctx.fillText('ENTREE ou ESPACE pour valider', cx, 530);
    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
}

function _drawHsInputMobileButtons(cx, y) {
    const btns = [
        { label: '◀', id: 'hs-left',  x: cx - 140 },
        { label: '▲', id: 'hs-up',    x: cx - 60  },
        { label: '▼', id: 'hs-down',  x: cx + 20  },
        { label: '▶', id: 'hs-right', x: cx + 100 },
    ];
    _ctx.font = '20px monospace';
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    for (const btn of btns) {
        _ctx.fillStyle = '#223322';
        _ctx.fillRect(btn.x - 18, y - 18, 36, 36);
        _ctx.strokeStyle = '#446644';
        _ctx.strokeRect(btn.x - 18, y - 18, 36, 36);
        _ctx.fillStyle = '#00FF41';
        _ctx.fillText(btn.label, btn.x, y);
    }
}

/**
 * drawHighScoreTable(scores)                                      US-22
 * Renders the retro leaderboard overlay (AC-05, AC-07, AC-08).
 */
function drawHighScoreTable(scores) {
    const cx = CANVAS_WIDTH / 2;
    _ctx.fillStyle = '#000000';
    _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillStyle = '#00FF41';
    _ctx.font = 'bold 26px monospace';
    _ctx.fillText('▸ HIGH SCORES ◂', cx, 50);
    _ctx.font = '15px monospace';
    _ctx.fillStyle = '#446644';
    _ctx.fillText('RANK   INITIALS    SCORE     LVL', cx, 90);
    _ctx.fillStyle = '#223322';
    _ctx.fillRect(80, 102, CANVAS_WIDTH - 160, 2);
    const lineH = 38;
    const baseY = 128;
    for (let i = 0; i < scores.length; i++) {
        const entry = scores[i];
        const y     = baseY + i * lineH;
        const isNew = i === state.hsNewEntryRank;
        _ctx.fillStyle = isNew ? '#FFD700' : '#00FF41';
        _ctx.font = isNew ? 'bold 17px monospace' : '17px monospace';
        _ctx.textAlign = 'center';
        const rank     = String(i + 1).padStart(2, ' ') + '.';
        const initials = entry.initials || 'AAA';
        const scoreStr = entry.score !== null ? String(entry.score).padStart(6, ' ') : '   ---';
        const lvlStr   = 'LV' + (entry.level || 1);
        _ctx.fillText(
            `${rank}      ${initials}      ${scoreStr}    ${lvlStr}`,
            cx, y
        );
    }
    _ctx.fillStyle = '#f1c40f';
    _ctx.font = '16px monospace';
    _ctx.textAlign = 'center';
    const hint = state.hsFromStartScreen ? '[H / ESPACE]  fermer' : '[ESPACE]  rejouer';
    _ctx.fillText(hint, cx, CANVAS_HEIGHT - 24);
    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
}

/**
 * drawLevelComplete()                                             US-24
 * Green semi-transparent overlay shown for LEVEL_COMPLETE_DURATION between
 * levels (AC-03). Displays the score earned on the level just cleared (AC-04).
 */
function drawLevelComplete() {
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;
    _ctx.fillStyle = 'rgba(0, 80, 0, 0.78)';
    _ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillStyle = '#2ecc71';
    _ctx.font = 'bold 46px monospace';
    _ctx.fillText('LEVEL COMPLETE', cx, cy - 70);
    _ctx.fillStyle = '#ffffff';
    _ctx.font = '24px monospace';
    const levelScore = state.score - state.levelStartScore;
    _ctx.fillText('Score du niveau : ' + levelScore, cx, cy - 14);
    _ctx.fillStyle = '#cccccc';
    _ctx.font = '20px monospace';
    _ctx.fillText('Score total : ' + state.score, cx, cy + 22);
    _ctx.fillStyle = '#f1c40f';
    _ctx.font = '20px monospace';
    const next = LEVEL_CONFIG[state.level]; // state.level still the cleared level
    _ctx.fillText('Prochain : ' + (next ? next.name : ''), cx, cy + 64);
    _ctx.textAlign = 'left';
    _ctx.textBaseline = 'alphabetic';
}

export function drawOverlay() {
    if (state.gameState === 'levelcomplete') {
        drawLevelComplete();
        return;
    }
    if (state.gameState === 'highscore_input') {
        drawHighScoreInput();
        return;
    }
    if (state.gameState === 'highscore_view') {
        drawHighScoreTable(loadHighScores());
        return;
    }
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
        _ctx.fillText('Appuie sur ESPACE ou clique pour commencer', cx, cy + 112);
        // AC-06: hint to view high scores
        _ctx.fillStyle = '#00FF41';
        _ctx.font = '15px monospace';
        _ctx.fillText('[H]  HIGH SCORES', cx, cy + 148);
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
        _ctx.fillText('Score total : ' + state.score, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10); // US-24 cumulative
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
    drawExplosionFlashes(); // US-25 (AC-04)
    drawParticles();        // US-25 (AC-03: after bricks, before HUD)
    drawPaddle();
    drawBalls();
    drawCapsules();
    drawEffectHUD();
    drawScoreMultipliers();
    drawOverlay();
}
