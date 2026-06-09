// src/highscore.js — High score persistence and entry management (US-22)

import { HS_STORAGE_KEY, HS_MAX_ENTRIES } from './constants.js';
import { insertHighScore } from './game-core.js';

function makePlaceholders(count) {
    return Array.from({ length: count }, () => ({
        initials: 'AAA',
        score: null,
        level: 1,
    }));
}

export function loadHighScores() {
    try {
        const raw = localStorage.getItem(HS_STORAGE_KEY);
        if (!raw) return makePlaceholders(HS_MAX_ENTRIES);
        const parsed = JSON.parse(raw);
        while (parsed.length < HS_MAX_ENTRIES) {
            parsed.push({ initials: 'AAA', score: null, level: 1 });
        }
        return parsed.slice(0, HS_MAX_ENTRIES);
    } catch {
        return makePlaceholders(HS_MAX_ENTRIES);
    }
}

export function saveHighScores(scores) {
    try {
        localStorage.setItem(HS_STORAGE_KEY, JSON.stringify(scores));
    } catch {
        // fail silently
    }
}

export function isTopScore(score) {
    if (score <= 0) return false;
    const scores = loadHighScores();
    const real = scores.filter(s => s.score !== null);
    if (real.length < HS_MAX_ENTRIES) return true;
    return score > real[real.length - 1].score;
}

export function confirmEntry(initials, score, level) {
    const existing = loadHighScores().filter(s => s.score !== null);
    const entry = { initials, score, level };
    const newReal = insertHighScore(existing, entry);
    const padded = [...newReal];
    while (padded.length < HS_MAX_ENTRIES) {
        padded.push({ initials: 'AAA', score: null, level: 1 });
    }
    saveHighScores(padded);
    return newReal.indexOf(entry);
}
