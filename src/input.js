// src/input.js — Keyboard, mouse and touch input handling.

import { CANVAS_WIDTH, KEY_LEFT, KEY_RIGHT, PADDLE_SPEED } from './constants.js';
import { state } from './state.js';

// ---------------------------------------------------------------------------
// US-22 — High score input helpers
// ---------------------------------------------------------------------------

function cycleLetterUp(letter)   { return letter === 'Z' ? 'A' : String.fromCharCode(letter.charCodeAt(0) + 1); }
function cycleLetterDown(letter) { return letter === 'A' ? 'Z' : String.fromCharCode(letter.charCodeAt(0) - 1); }

function handleHsInputKey(key, confirmCallback) {
    const k = key.toLowerCase();
    if (key === 'ArrowUp') {
        state.hsInputLetters[state.hsInputCursor] = cycleLetterUp(state.hsInputLetters[state.hsInputCursor]);
        return true;
    }
    if (key === 'ArrowDown') {
        state.hsInputLetters[state.hsInputCursor] = cycleLetterDown(state.hsInputLetters[state.hsInputCursor]);
        return true;
    }
    if (key === 'ArrowLeft' || k === KEY_LEFT) {
        state.hsInputCursor = (state.hsInputCursor + 2) % 3;
        return true;
    }
    if (key === 'ArrowRight' || k === KEY_RIGHT) {
        state.hsInputCursor = (state.hsInputCursor + 1) % 3;
        return true;
    }
    if (key === 'Enter' || key === ' ') {
        confirmCallback();
        return true;
    }
    return false;
}

export const keys = {};

export function initInput(canvas, { resetGame, releaseStickyBall, confirmHsEntry, closeHsView }) {
    function releaseAllStuckBalls() {
        state.balls.forEach(ball => { if (ball.stuck) releaseStickyBall(ball); });
    }

    window.addEventListener('keydown', (e) => {
        // US-22 — intercept keys in high score states before anything else
        if (state.gameState === 'highscore_input') {
            handleHsInputKey(e.key, confirmHsEntry);
            e.preventDefault();
            return;
        }
        if (state.gameState === 'highscore_view') {
            if (e.key === 'h' || e.key === 'H' || e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
                closeHsView();
            }
            return;
        }

        keys[e.key.toLowerCase()] = true;
        if (state.balls.some(b => b.stuck) && state.gameState === 'playing') {
            releaseAllStuckBalls();
            return;
        }
        if (state.gameState === 'start') {
            if (e.key === 'h' || e.key === 'H') {
                state.hsFromStartScreen = true;
                state.hsNewEntryRank    = -1;
                state.gameState = 'highscore_view';
                return;
            }
            if (!e.key.startsWith('F') && e.key !== 'Dead') {
                state.gameState = 'playing';
                return;
            }
        }
        if (e.key === ' ' && (state.gameState === 'gameover' || state.gameState === 'victory')) {
            resetGame();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousedown', () => {
        if (state.gameState === 'highscore_view') { closeHsView(); return; }
        if (state.balls.some(b => b.stuck) && state.gameState === 'playing') {
            releaseAllStuckBalls();
            return;
        }
        if (state.gameState === 'start') {
            state.gameState = 'playing';
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect   = canvas.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const clientX = (e.clientX - rect.left) * scaleX;
        state.paddleX = clientX - state.currentPaddleWidth / 2;
        state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - state.currentPaddleWidth, state.paddleX));
    });

    let touchStartX  = 0;
    let paddleStartX = 0;

    canvas.addEventListener('touchstart', (e) => {
        if (state.gameState === 'highscore_view') { closeHsView(); return; }
        if (state.gameState === 'start') { state.gameState = 'playing'; return; }
        if (state.gameState === 'gameover' || state.gameState === 'victory') { resetGame(); return; }
        if (state.balls.some(b => b.stuck)) { releaseAllStuckBalls(); return; }
        const touch  = e.touches[0];
        touchStartX  = touch.clientX;
        paddleStartX = state.paddleX;
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        state.paddleX = paddleStartX + (touch.clientX - touchStartX);
        state.paddleX = Math.max(0, Math.min(CANVAS_WIDTH - state.currentPaddleWidth, state.paddleX));
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        touchStartX  = 0;
        paddleStartX = 0;
    });

    const btnLeft  = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    if (btnLeft && btnRight) {
        function handleStateOnButtonPress() {
            if (state.gameState === 'highscore_view') { closeHsView(); return true; }
            if (state.gameState === 'start') {
                state.gameState = 'playing';
                return true;
            }
            if (state.gameState === 'gameover' || state.gameState === 'victory') {
                resetGame();
                return true;
            }
            if (state.balls.some(b => b.stuck) && state.gameState === 'playing') {
                releaseAllStuckBalls();
                return true;
            }
            return false;
        }

        ['mousedown', 'touchstart'].forEach(evtName => {
            btnLeft.addEventListener(evtName, (e) => {
                e.preventDefault();
                if (!handleStateOnButtonPress()) keys[KEY_LEFT] = true;
            }, { passive: false });
            btnRight.addEventListener(evtName, (e) => {
                e.preventDefault();
                if (!handleStateOnButtonPress()) keys[KEY_RIGHT] = true;
            }, { passive: false });
        });

        ['mouseup', 'touchend', 'touchcancel', 'mouseleave'].forEach(evtName => {
            btnLeft.addEventListener(evtName,  () => { keys[KEY_LEFT]  = false; });
            btnRight.addEventListener(evtName, () => { keys[KEY_RIGHT] = false; });
        });
    }
}
