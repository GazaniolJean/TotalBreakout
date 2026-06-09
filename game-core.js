// game-core.js — Pure game logic, no DOM / side-effects.
// ES module with named exports. Browser compatibility shim at the bottom
// keeps window.GameCore available for index.html during the ESM migration
// (steps 1-7). The shim is removed in step 8.

export function buildBricks(rows, cols) {
  const bricks = [];
  for (let r = 0; r < rows; r++) {
    bricks[r] = [];
    for (let c = 0; c < cols; c++) {
      bricks[r][c] = true;
    }
  }
  return bricks;
}

export function checkVictory(bricks) {
  return bricks.every(row => row.every(cell => !cell));
}

export function computeWallCollisions(ballX, ballY, ballVX, ballVY, ballRadius, canvasWidth, canvasHeight) {
  let x = ballX, y = ballY, vx = ballVX, vy = ballVY;
  if (x - ballRadius < 0 && vx < 0) { x = ballRadius; vx = -vx; }
  if (x + ballRadius > canvasWidth && vx > 0) { x = canvasWidth - ballRadius; vx = -vx; }
  if (y - ballRadius < 0 && vy < 0) { y = ballRadius; vy = -vy; }
  if (y - ballRadius > canvasHeight) { return { x, y, vx, vy, lost: true }; }
  return { x, y, vx, vy, lost: false };
}

export function computePaddleBounce(
  ballX, ballY, ballVX, ballVY, ballRadius,
  paddleX, paddleY, paddleWidth, paddleHeight,
  maxBounceAngle, speedMag
) {
  if (ballVY <= 0) { return { vx: ballVX, vy: ballVY, y: ballY }; }
  const ballOverlapsPaddle =
    ballY + ballRadius >= paddleY &&
    ballY - ballRadius <= paddleY + paddleHeight &&
    ballX >= paddleX &&
    ballX <= paddleX + paddleWidth;
  if (!ballOverlapsPaddle) { return { vx: ballVX, vy: ballVY, y: ballY }; }
  const hitPosition = (ballX - paddleX) / paddleWidth;
  let newVX = (hitPosition - 0.5) * 2 * maxBounceAngle;
  let newVY = -Math.abs(ballVY);
  const mag = Math.sqrt(newVX * newVX + newVY * newVY);
  const vx  = (newVX / mag) * speedMag;
  const vy  = (newVY / mag) * speedMag;
  const y = paddleY - ballRadius;
  return { vx, vy, y };
}

export function computeBrickCollision(
  ballX, ballY, ballVX, ballVY, ballRadius,
  bricks, brickOffsetX, brickOffsetY,
  brickWidth, brickHeight, brickGap
) {
  const rows = bricks.length;
  if (rows === 0) return null;
  const cols = bricks[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!bricks[r][c]) continue;
      const brickX = brickOffsetX + c * (brickWidth  + brickGap);
      const brickY = brickOffsetY + r * (brickHeight + brickGap);
      if (
        ballX + ballRadius > brickX &&
        ballX - ballRadius < brickX + brickWidth &&
        ballY + ballRadius > brickY &&
        ballY - ballRadius < brickY + brickHeight
      ) {
        const overlapLeft   = (ballX + ballRadius) - brickX;
        const overlapRight  = (brickX + brickWidth)  - (ballX - ballRadius);
        const overlapTop    = (ballY + ballRadius) - brickY;
        const overlapBottom = (brickY + brickHeight) - (ballY - ballRadius);
        const minOverlapH = Math.min(overlapLeft, overlapRight);
        const minOverlapV = Math.min(overlapTop, overlapBottom);
        let vx = ballVX, vy = ballVY, x = ballX, y = ballY;
        if (minOverlapH < minOverlapV) {
          vx = -ballVX;
          x = overlapLeft < overlapRight ? brickX - ballRadius : brickX + brickWidth + ballRadius;
        } else {
          vy = -ballVY;
          y = overlapTop < overlapBottom ? brickY - ballRadius : brickY + brickHeight + ballRadius;
        }
        return { vx, vy, x, y, hitRow: r, hitCol: c };
      }
    }
  }
  return null;
}

export function computeRowPoints(rowIndex, rowPoints) {
  return rowPoints[rowIndex];
}

export function computeSpeedEffect(baseSpeed, multiplier) {
  return baseSpeed * multiplier;
}

export function checkPowerUpCollection(capsule, paddleX, paddleY, paddleWidth, paddleHeight) {
  const size = (capsule && typeof capsule.size === 'number') ? capsule.size : 20;
  return (
    capsule.x + size > paddleX &&
    capsule.x < paddleX + paddleWidth &&
    capsule.y + size > paddleY &&
    capsule.y < paddleY + paddleHeight
  );
}

export function stickyBallX(paddleX, paddleWidth, hitOffset) {
  return paddleX + hitOffset;
}

export function spawnExtraBalls(sourceBall, count, spreadDeg, speedMag) {
  const extraBalls = [];
  const baseAngle = Math.atan2(sourceBall.vy, sourceBall.vx);
  const spreadRad = (spreadDeg * Math.PI) / 180;
  for (let i = 1; i < count; i++) {
    const sign  = i % 2 === 1 ? 1 : -1;
    const steps = Math.ceil(i / 2);
    const angle = baseAngle + sign * steps * spreadRad;
    extraBalls.push({
      x: sourceBall.x, y: sourceBall.y,
      vx: Math.cos(angle) * speedMag,
      vy: Math.sin(angle) * speedMag,
      stuck: false, stickyTimer: 0, stickyHitOffset: 0
    });
  }
  return extraBalls;
}

export function computeBrickCollisionPenetrating(
  ballX, ballY, ballVX, ballVY, ballRadius,
  bricks, brickOffsetX, brickOffsetY,
  brickWidth, brickHeight, brickGap,
  penetration
) {
  const rows = bricks.length;
  if (rows === 0) return null;
  const cols = bricks[0].length;
  if (penetration === 0) {
    const standard = computeBrickCollision(
      ballX, ballY, ballVX, ballVY, ballRadius,
      bricks, brickOffsetX, brickOffsetY, brickWidth, brickHeight, brickGap
    );
    if (!standard) return null;
    return {
      vx: standard.vx, vy: standard.vy, x: standard.x, y: standard.y,
      destroyedBricks: [{ row: standard.hitRow, col: standard.hitCol }],
      remainingPenetration: 0
    };
  }
  const destroyedBricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!bricks[r][c]) continue;
      const brickX = brickOffsetX + c * (brickWidth  + brickGap);
      const brickY = brickOffsetY + r * (brickHeight + brickGap);
      if (
        ballX + ballRadius > brickX && ballX - ballRadius < brickX + brickWidth &&
        ballY + ballRadius > brickY && ballY - ballRadius < brickY + brickHeight
      ) {
        destroyedBricks.push({ row: r, col: c });
      }
    }
  }
  if (destroyedBricks.length === 0) return null;
  return {
    vx: ballVX, vy: ballVY, x: ballX, y: ballY,
    destroyedBricks,
    remainingPenetration: Math.max(0, penetration - destroyedBricks.length)
  };
}

export function computeExplosionChain(bricks, brickTypes, startRow, startCol, rows, cols) {
  const destroyed = [];
  const visited   = new Set();
  const queue     = [{ row: startRow, col: startCol }];
  visited.add(`${startRow},${startCol}`);
  while (queue.length > 0) {
    const { row, col } = queue.shift();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (!bricks[nr][nc]) continue;
        destroyed.push({ row: nr, col: nc });
        if (brickTypes[nr][nc].type === 'explosive') {
          queue.push({ row: nr, col: nc });
        }
      }
    }
  }
  return destroyed;
}

/**
 * applyHitToBrick(brickState)                                      US-23
 * Pure: decrements hitsLeft by 1. Returns { newHitsLeft, destroyed }.
 * AC-08: does NOT mutate brickState.
 */
export function applyHitToBrick(brickState) {
  const newHitsLeft = brickState.hitsLeft - 1;
  return { newHitsLeft, destroyed: newHitsLeft <= 0 };
}

export function computeTimeMultiplier(elapsedMs) {
  const PHASE1_MS = 120000;
  const PHASE2_MS = 180000;
  const PHASE3_MS = 240000;
  if (elapsedMs <= 0)         return 3.0;
  if (elapsedMs < PHASE1_MS)  return 3.0 - 2.0 * (elapsedMs / PHASE1_MS);
  if (elapsedMs < PHASE2_MS)  return 1.0;
  if (elapsedMs < PHASE3_MS)  return 1.0 - 0.9 * ((elapsedMs - PHASE2_MS) / (PHASE3_MS - PHASE2_MS));
  return 0.1;
}

export function computeComboMultiplier(comboCount) {
  return 1 + comboCount * 0.1;
}

/**
 * insertHighScore(scores, entry)                                  US-22
 * Pure: inserts entry, returns new array sorted desc by score, max 10 entries.
 * AC-09: does NOT mutate input array.
 */
export function insertHighScore(scores, entry) {
  const newScores = [...scores, entry];
  newScores.sort((a, b) => b.score - a.score);
  return newScores.slice(0, 10);
}

/**
 * brickFromLayoutCode(code)                                        US-24
 * Maps a fixed-layout cell code to a brick descriptor, or null for an empty cell.
 *   null | 0 | '' | '.'      → empty (no brick)
 *   'N' | 'normal'           → normal brick
 *   'E' | 'explosive'        → explosive brick
 *   '2' | 'multihit2'        → resistant brick (maxHits 2)
 *   '3' | 'multihit3'        → armored brick   (maxHits 3)
 */
function brickFromLayoutCode(code) {
  switch (code) {
    case 'N': case 'normal':    return { type: 'normal',    hitsLeft: 1, maxHits: 1 };
    case 'E': case 'explosive': return { type: 'explosive', hitsLeft: 1, maxHits: 1 };
    case '2': case 'multihit2': return { type: 'multihit',  hitsLeft: 2, maxHits: 2 };
    case '3': case 'multihit3': return { type: 'multihit',  hitsLeft: 3, maxHits: 3 };
    default:                    return null; // empty cell
  }
}

/**
 * buildLevelGrid(config, rows, cols, rng)                          US-24
 * Pure: builds a fresh brick grid from a LEVEL_CONFIG entry.
 * Returns { bricks, brickTypes } where bricks[r][c] is a boolean (alive) and
 * brickTypes[r][c] = { type, hitsLeft, maxHits }. Replaces the previous inline
 * generation logic (state.js makeBrickTypes). Does NOT mutate config.
 *
 * - config.layout === null → procedural grid using config.explosive_chance,
 *   config.multihit2_chance and config.multihit3_chance. All cells alive.
 * - config.layout is a 2-D array → fixed layout; rows/cols derive from it.
 *   Each cell is a code understood by brickFromLayoutCode (null = empty).
 *
 * rng defaults to Math.random; inject a deterministic generator in tests.
 */
export function buildLevelGrid(config, rows = 5, cols = 10, rng = Math.random) {
  // --- Fixed layout path (reserved for the v5 editor) ---
  if (Array.isArray(config.layout)) {
    const layout = config.layout;
    const bricks = [];
    const brickTypes = [];
    for (let r = 0; r < layout.length; r++) {
      bricks[r] = [];
      brickTypes[r] = [];
      for (let c = 0; c < layout[r].length; c++) {
        const desc = brickFromLayoutCode(layout[r][c]);
        bricks[r][c] = desc !== null;
        brickTypes[r][c] = desc !== null ? desc : { type: 'normal', hitsLeft: 1, maxHits: 1 };
      }
    }
    return { bricks, brickTypes };
  }

  // --- Procedural path ---
  // A single uniform roll selects among explosive / multihit3 / multihit2 / normal
  // so each probability is exact and independent.
  const tExplosive = config.explosive_chance;
  const tMH3       = tExplosive + config.multihit3_chance;
  const tMH2       = tMH3       + config.multihit2_chance;
  const bricks = [];
  const brickTypes = [];
  for (let r = 0; r < rows; r++) {
    bricks[r] = [];
    brickTypes[r] = [];
    for (let c = 0; c < cols; c++) {
      bricks[r][c] = true;
      const roll = rng();
      let type = 'normal', maxHits = 1;
      if      (roll < tExplosive) { type = 'explosive'; }
      else if (roll < tMH3)       { type = 'multihit'; maxHits = 3; }
      else if (roll < tMH2)       { type = 'multihit'; maxHits = 2; }
      brickTypes[r][c] = { type, hitsLeft: maxHits, maxHits };
    }
  }
  return { bricks, brickTypes };
}

// ---------------------------------------------------------------------------
// Browser compatibility shim — temporary, removed in step 8
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.GameCore = {
    buildBricks,
    checkVictory,
    computeWallCollisions,
    computePaddleBounce,
    computeBrickCollision,
    computeRowPoints,
    computeSpeedEffect,
    checkPowerUpCollection,
    stickyBallX,
    spawnExtraBalls,
    computeBrickCollisionPenetrating,
    computeExplosionChain,
    computeTimeMultiplier,
    computeComboMultiplier,
    applyHitToBrick,
    insertHighScore,  // US-22
    buildLevelGrid,   // US-24
  };
}
