// src/input.js — Keyboard, mouse and touch input handling.

import { CANVAS_WIDTH, KEY_LEFT, KEY_RIGHT, PADDLE_SPEED } from './constants.js';
import { state } from './state.js';

// keys: tracks which keys are currently held down
export const keys = {};

/**
 * initInput(canvas, callbacks)
 * Registers all event listeners. Call once at boot.
 * callbacks: { resetGame, releaseStickyBall }
 * — passed in to avoid circular imports (these functions live in other modules).
 */
export function initInput(canvas, { resetGame, releaseStickyBall }) {
    function releaseAllStuckBalls() {
        state.balls.forEach(ball => { if (ball.stuck) releaseStickyBall(ball); });
    }

    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (state.balls.some(b => b.stuck) && state.gameState === 'playing') {
            releaseAllStuckBalls();
            return;
        }
        if (state.gameState === 'start' && !e.key.startsWith('F') && e.key !== 'Dead') {
            state.gameState = 'playing';
            return;
        }
        if (e.key === ' ' && (state.gameState === 'gameover' || state.gameState === 'victory')) {
            resetGame();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousedown', () => {
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

    // -----------------------------------------------------------------------
    // V3 — Mobile directional buttons (#btnLeft / #btnRight)
    // Press/hold moves the paddle; handles game state transitions on first tap.
    // -----------------------------------------------------------------------
    const btnLeft  = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    if (btnLeft && btnRight) {
        /**
         * handleStateOnButtonPress()
         * Returns true if the press was consumed by a state transition
         * (start, gameover, victory, sticky), so the button should NOT
         * set a movement key.
         */
        function handleStateOnButtonPress() {
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

        // Release on any end / cancel / leave event
        ['mouseup', 'touchend', 'touchcancel', 'mouseleave'].forEach(evtName => {
            btnLeft.addEventListener(evtName,  () => { keys[KEY_LEFT]  = false; });
            btnRight.addEventListener(evtName, () => { keys[KEY_RIGHT] = false; });
        });
    }
}
