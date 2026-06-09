// src/main.js — Entry point. Wires up all modules and starts the game loop.

import * as GameCore from './game-core.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { state, resetFullState } from './state.js';
import { initInput } from './input.js';
import { initPowerups } from './powerups.js';
import { initDraw, draw } from './draw.js';
import { initUpdate, update, releaseStickyBall } from './update.js';
import { computeComboMultiplier } from './game-core.js';
import { isTopScore, confirmEntry } from './highscore.js'; // US-22

const canvas = document.getElementById('gameCanvas');
canvas.width  = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

function updateHUD() {
    const dots  = '●'.repeat(Math.min(state.lives, 3));
    const extra = state.lives > 3 ? ' +' + (state.lives - 3) : '';
    document.getElementById('livesDisplay').textContent = dots + extra;
    document.getElementById('scoreDisplay').textContent = state.score;
    const levelEl = document.getElementById('levelDisplay'); // US-24
    if (levelEl) levelEl.textContent = 'LV ' + state.level;
    const comboEl = document.getElementById('comboDisplay');
    if (comboEl) {
        if (state.comboCount > 0 && state.gameState === 'playing') {
            const mult = computeComboMultiplier(state.comboCount).toFixed(1);
            comboEl.textContent = 'COMBO ' + state.comboCount + '  ×' + mult;
            comboEl.style.opacity = '1';
        } else {
            comboEl.textContent = '';
            comboEl.style.opacity = '0';
        }
    }
}

function resetGame() {
    resetFullState();
    updateHUD();
}

// ============================================================
// US-22 — High score flow
// ============================================================

/**
 * checkHighScoreTransition(prevState)
 * Called each frame after update(). If the game just ended and the score
 * qualifies for top-10, redirects to highscore_input before any overlay (AC-02).
 */
function checkHighScoreTransition(prevState) {
    if (prevState !== 'playing') return;
    const newState = state.gameState;
    if (newState !== 'gameover' && newState !== 'victory') return;
    if (isTopScore(state.score)) {
        state.hsPendingScore  = { score: state.score, level: state.level }; // US-24
        state.hsInputLetters  = ['A', 'A', 'A'];
        state.hsInputCursor   = 0;
        state.hsNewEntryRank  = -1;
        state.hsFromStartScreen = false;
        state.gameState = 'highscore_input';
    }
}

function confirmHsEntry() {
    if (!state.hsPendingScore) return;
    const initials = state.hsInputLetters.join('');
    const rank = confirmEntry(initials, state.hsPendingScore.score, state.hsPendingScore.level);
    state.hsNewEntryRank  = rank;
    state.hsPendingScore  = null;
    state.gameState = 'highscore_view';
}

function closeHsView() {
    if (state.hsFromStartScreen) {
        state.gameState = 'start';
    } else {
        resetFullState();
        state.gameState = 'start';
        updateHUD();
    }
    state.hsNewEntryRank = -1;
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    if (deltaTime > 50) deltaTime = 50;
    const prevState = state.gameState;
    update(deltaTime);
    checkHighScoreTransition(prevState); // US-22: intercept end-game before draw
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================================
// BOOT
// ============================================================
initDraw(ctx);
initUpdate(GameCore, updateHUD);
initPowerups(GameCore, updateHUD);
initInput(canvas, { resetGame, releaseStickyBall, confirmHsEntry, closeHsView });
updateHUD();
requestAnimationFrame(gameLoop);
