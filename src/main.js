// src/main.js — Entry point. Wires up all modules and starts the game loop.

import * as GameCore from './game-core.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { state, resetFullState } from './state.js';
import { initInput } from './input.js';
import { initPowerups } from './powerups.js';
import { initDraw, draw } from './draw.js';
import { initUpdate, update, releaseStickyBall } from './update.js';

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('gameCanvas');
canvas.width  = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

// ============================================================
// HUD
// ============================================================
function updateHUD() {
    const dots  = '●'.repeat(Math.min(state.lives, 3));
    const extra = state.lives > 3 ? ' +' + (state.lives - 3) : '';
    document.getElementById('livesDisplay').textContent = dots + extra;
    document.getElementById('scoreDisplay').textContent = state.score;
}

// ============================================================
// RESET
// ============================================================
function resetGame() {
    resetFullState();
    updateHUD();
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
    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// ============================================================
// BOOT — wire up all modules, then start
// ============================================================
initDraw(ctx);
initUpdate(GameCore, updateHUD);
initPowerups(GameCore, updateHUD);
initInput(canvas, { resetGame, releaseStickyBall });
updateHUD();
requestAnimationFrame(gameLoop);
