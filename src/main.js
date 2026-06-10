// src/main.js — Entry point. Wires up all modules and starts the game loop.

import * as GameCore from './game-core.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { state, resetFullState, openEditor, closeEditor } from './state.js'; // US-27
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
// US-27 — Level editor wiring
// ============================================================

/**
 * requestCloseEditor() — exits the editor, asking confirmation first if there
 * are unsaved changes (AC-05). Kept in main.js because it needs the DOM
 * (window.confirm); state.js stays DOM-free.
 */
function requestCloseEditor() {
    if (state.editor && state.editor.dirty) {
        const leave = window.confirm('Quitter l\'éditeur ? Les modifications non sauvegardées seront perdues.');
        if (!leave) return;
    }
    closeEditor();
    updateHUD();
}

/**
 * syncChrome() — keeps the DOM chrome (HUD vs editor banner, mobile editor
 * button) in sync with the state machine via a body[data-state] attribute
 * (AC-07). CSS does the show/hide; JS only writes on actual state changes.
 */
let _lastChromeState = null;
function syncChrome() {
    if (state.gameState === _lastChromeState) return;
    _lastChromeState = state.gameState;
    document.body.dataset.state = state.gameState;
    if (state.gameState === 'editor' && state.editor) {
        const nameEl = document.getElementById('editorBannerName');
        const toolEl = document.getElementById('editorBannerTool');
        if (nameEl) nameEl.textContent = state.editor.levelName;
        if (toolEl) toolEl.textContent = 'Outil : Normale'; // US-29 makes this dynamic
    }
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
    syncChrome();                        // US-27: keep DOM chrome in sync with state
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================================
// BOOT
// ============================================================
initDraw(ctx);
initUpdate(GameCore, updateHUD);
initPowerups(GameCore, updateHUD);
initInput(canvas, { resetGame, releaseStickyBall, confirmHsEntry, closeHsView, openEditor, requestCloseEditor }); // US-27
updateHUD();
syncChrome(); // US-27: initial chrome state
requestAnimationFrame(gameLoop);
