// game-core.js — Pure game logic, no DOM / side-effects.
// ES module with named exports. Browser compatibility shim at the bottom
// keeps window.GameCore available for index.html during the ESM migration
// (steps 1-7). The shim is removed in step 8.

/**
 * buildBricks(rows, cols)
 * Returns a 2-D array [rows][cols] where every cell is `true` (alive).
 */
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

/**
 * checkVictory(bricks)
 * Returns true if every cell in the 2-D bricks array is false (all destroyed).
 */
export function checkVictory(bricks) {
  return bricks.every(row => row.every(cell => !cell));
}

/**
 * computeWallCollisions(ballX, ballY, ballVX, ballVY, ballRadius, canvasWidth, canvasHeight)
 * Applies bounces on the three walls (left, right, top) with position correction.
 * Detects exit through the bottom edge.
 * Returns { x, y, vx, vy, lost } — lost:true when the ball exits through the bottom.
 */
export function computeWallCollisions(ballX, ballY, ballVX, ballVY, ballRadius, canvasWidth, canvasHeight) {
  let x = ballX, y = ballY, vx = ballVX, vy = ballVY;

  // Left wall — only bounce if moving left (vx < 0) to avoid double-bounce
  if (x - ballRadius < 0 && vx < 0) {
    x  = ballRadius;
    vx = -vx;
  }
  // Right wall — only bounce if moving right (vx > 0)
  if (x + ballRadius > canvasWidth && vx > 0) {
    x  = canvasWidth - ballRadius;
    vx = -vx;
  }
  // Top wall — only bounce if moving up (vy < 0)
  if (y - ballRadius < 0 && vy < 0) {
    y  = ballRadius;
    vy = -vy;
  }

  // Bottom exit — ball lost
  if (y - ballRadius > canvasHeight) {
    return { x, y, vx, vy, lost: true };
  }

  return { x, y, vx, vy, lost: false };
}

/**
 * computePaddleBounce(ballX, ballY, ballVX, ballVY, ballRadius,
 *                     paddleX, paddleY, paddleWidth, paddleHeight,
 *                     maxBounceAngle, speedMag)
 * Computes a variable-angle paddle bounce.
 * Only fires when the ball is moving downward (ballVY > 0) and overlaps the paddle.
 * Returns { vx, vy, y } — unchanged if no collision.
 */
export function computePaddleBounce(
  ballX, ballY, ballVX, ballVY, ballRadius,
  paddleX, paddleY, paddleWidth, paddleHeight,
  maxBounceAngle, speedMag
) {
  // Guard: ball must be moving downward
  if (ballVY <= 0) {
    return { vx: ballVX, vy: ballVY, y: ballY };
  }

  // AABB overlap test between ball and paddle
  const ballOverlapsPaddle =
    ballY + ballRadius >= paddleY &&
    ballY - ballRadius <= paddleY + paddleHeight &&
    ballX >= paddleX &&
    ballX <= paddleX + paddleWidth;

  if (!ballOverlapsPaddle) {
    return { vx: ballVX, vy: ballVY, y: ballY };
  }

  // hitPosition: 0.0 = left edge, 1.0 = right edge
  const hitPosition = (ballX - paddleX) / paddleWidth;

  // Compute new velocity direction
  let newVX = (hitPosition - 0.5) * 2 * maxBounceAngle;
  let newVY = -Math.abs(ballVY); // always send ball upward

  // Renormalise to keep constant speed magnitude
  const mag = Math.sqrt(newVX * newVX + newVY * newVY);
  const vx  = (newVX / mag) * speedMag;
  const vy  = (newVY / mag) * speedMag;

  // Position correction: place ball just above paddle surface
  const y = paddleY - ballRadius;

  return { vx, vy, y };
}

/**
 * computeBrickCollision(ballX, ballY, ballVX, ballVY, ballRadius,
 *                       bricks, brickOffsetX, brickOffsetY,
 *                       brickWidth, brickHeight, brickGap)
 * Scans the bricks array for an AABB collision.
 * Resolves the collision axis by minimum overlap depth.
 * Does NOT mutate the bricks array — the caller must set bricks[r][c] = false.
 * Returns { vx, vy, x, y, hitRow, hitCol } for the first hit brick, or null.
 */
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
      if (!bricks[r][c]) continue; // already destroyed

      const brickX = brickOffsetX + c * (brickWidth  + brickGap);
      const brickY = brickOffsetY + r * (brickHeight + brickGap);

      // AABB overlap test
      if (
        ballX + ballRadius > brickX &&
        ballX - ballRadius < brickX + brickWidth &&
        ballY + ballRadius > brickY &&
        ballY - ballRadius < brickY + brickHeight
      ) {
        // Overlap depths on each side
        const overlapLeft   = (ballX + ballRadius) - brickX;
        const overlapRight  = (brickX + brickWidth)  - (ballX - ballRadius);
        const overlapTop    = (ballY + ballRadius) - brickY;
        const overlapBottom = (brickY + brickHeight) - (ballY - ballRadius);

        const minOverlapH = Math.min(overlapLeft, overlapRight);
        const minOverlapV = Math.min(overlapTop, overlapBottom);

        let vx = ballVX, vy = ballVY, x = ballX, y = ballY;

        if (minOverlapH < minOverlapV) {
          // Horizontal collision — reflect vx and correct x position
          vx = -ballVX;
          if (overlapLeft < overlapRight) {
            x = brickX - ballRadius; // hit from left
          } else {
            x = brickX + brickWidth + ballRadius; // hit from right
          }
        } else {
          // Vertical collision — reflect vy and correct y position
          vy = -ballVY;
          if (overlapTop < overlapBottom) {
            y = brickY - ballRadius; // hit from above
          } else {
            y = brickY + brickHeight + ballRadius; // hit from below
          }
        }

        return { vx, vy, x, y, hitRow: r, hitCol: c };
      }
    }
  }

  return null; // no collision
}

/**
 * computeRowPoints(rowIndex, rowPoints)
 * Simple lookup: returns rowPoints[rowIndex].
 */
export function computeRowPoints(rowIndex, rowPoints) {
  return rowPoints[rowIndex];
}

/**
 * computeSpeedEffect(baseSpeed, multiplier)
 * Pure scalar multiplication used by US-10 speed power-ups (fast / slow).
 * The caller renormalises the ball velocity vector so direction is preserved
 * (AC-03) and applies the result on the same frame the capsule is collected
 * (AC-05). Restoring base speed at expiration (AC-04) is just a call with
 * multiplier === 1.0.
 */
export function computeSpeedEffect(baseSpeed, multiplier) {
  return baseSpeed * multiplier;
}

/**
 * checkPowerUpCollection(capsule, paddleX, paddleY, paddleWidth, paddleHeight)
 * Pure AABB overlap test between a falling power-up capsule and the paddle.
 * The capsule is expected to expose { x, y } as its top-left corner, plus a
 * `size` field; if `size` is absent we fall back to a default of 20 (matches
 * POWERUP_SIZE in index.html). This keeps the helper self-contained for
 * testing while staying compatible with the live capsule objects.
 * Returns true when the two rectangles overlap, false otherwise.
 */
export function checkPowerUpCollection(capsule, paddleX, paddleY, paddleWidth, paddleHeight) {
  const size = (capsule && typeof capsule.size === 'number') ? capsule.size : 20;
  const capsuleLeft   = capsule.x;
  const capsuleRight  = capsule.x + size;
  const capsuleTop    = capsule.y;
  const capsuleBottom = capsule.y + size;

  const paddleLeft   = paddleX;
  const paddleRight  = paddleX + paddleWidth;
  const paddleTop    = paddleY;
  const paddleBottom = paddleY + paddleHeight;

  // Standard AABB overlap test — strict inequality so that a 0-area touch
  // (edges flush, no real overlap) does not count as a collection.
  return (
    capsuleRight  > paddleLeft  &&
    capsuleLeft   < paddleRight &&
    capsuleBottom > paddleTop   &&
    capsuleTop    < paddleBottom
  );
}

/**
 * stickyBallX(paddleX, paddleWidth, hitOffset)
 * Returns the ball X position while glued to the paddle.
 * hitOffset = ballX - paddleX at the moment of sticking.
 * Pure function — no side effects.
 * paddleWidth is accepted for symmetry with computePaddleBounce and future
 * extensibility, but is not used in this simple calculation.
 */
export function stickyBallX(paddleX, paddleWidth, hitOffset) {
  return paddleX + hitOffset;
}

/**
 * spawnExtraBalls(sourceBall, count, spreadDeg, speedMag)
 * Returns an array of (count - 1) new ball objects spawned from sourceBall,
 * each offset by ±spreadDeg from the source direction (AC-02).
 * Does NOT mutate sourceBall or the balls array — caller does the push.
 */
export function spawnExtraBalls(sourceBall, count, spreadDeg, speedMag) {
  const extraBalls = [];
  const baseAngle = Math.atan2(sourceBall.vy, sourceBall.vx);
  const spreadRad = (spreadDeg * Math.PI) / 180;

  for (let i = 1; i < count; i++) {
    // Alternate sign: +spread, -spread, +2*spread, -2*spread, …
    const sign  = i % 2 === 1 ? 1 : -1;
    const steps = Math.ceil(i / 2);
    const angle = baseAngle + sign * steps * spreadRad;
    extraBalls.push({
      x: sourceBall.x,
      y: sourceBall.y,
      vx: Math.cos(angle) * speedMag,
      vy: Math.sin(angle) * speedMag,
      stuck: false,
      stickyTimer: 0,
      stickyHitOffset: 0
    });
  }
  return extraBalls;
}

/**
 * computeBrickCollisionPenetrating(ballX, ballY, ballVX, ballVY, ballRadius,
 *   bricks, brickOffsetX, brickOffsetY, brickWidth, brickHeight, brickGap,
 *   penetration)
 * Penetrating variant of computeBrickCollision (US-13).
 * When penetration > 0: collects ALL alive bricks overlapping the ball AABB,
 * marks them for destruction without bouncing, decrements penetration by count.
 * When penetration === 0: falls back to standard single-brick bounce.
 * Does NOT mutate bricks or ball — caller applies the returned state.
 * Returns { vx, vy, x, y, destroyedBricks: [{row,col}], remainingPenetration }
 * or null if no overlap found.
 */
export function computeBrickCollisionPenetrating(
  ballX, ballY, ballVX, ballVY, ballRadius,
  bricks, brickOffsetX, brickOffsetY,
  brickWidth, brickHeight, brickGap,
  penetration
) {
  const rows = bricks.length;
  if (rows === 0) return null;
  const cols = bricks[0].length;

  // penetration === 0: standard single-bounce behaviour
  if (penetration === 0) {
    const standard = computeBrickCollision(
      ballX, ballY, ballVX, ballVY, ballRadius,
      bricks, brickOffsetX, brickOffsetY, brickWidth, brickHeight, brickGap
    );
    if (!standard) return null;
    return {
      vx: standard.vx, vy: standard.vy,
      x: standard.x,  y: standard.y,
      destroyedBricks: [{ row: standard.hitRow, col: standard.hitCol }],
      remainingPenetration: 0
    };
  }

  // penetration > 0: collect ALL overlapping alive bricks (AC-07)
  const destroyedBricks = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!bricks[r][c]) continue; // already destroyed (AC-09)
      const brickX = brickOffsetX + c * (brickWidth  + brickGap);
      const brickY = brickOffsetY + r * (brickHeight + brickGap);
      if (
        ballX + ballRadius > brickX &&
        ballX - ballRadius < brickX + brickWidth &&
        ballY + ballRadius > brickY &&
        ballY - ballRadius < brickY + brickHeight
      ) {
        destroyedBricks.push({ row: r, col: c });
      }
    }
  }

  if (destroyedBricks.length === 0) return null;

  // No bounce — trajectory unchanged (AC-02)
  return {
    vx: ballVX, vy: ballVY,
    x: ballX,   y: ballY,
    destroyedBricks,
    remainingPenetration: Math.max(0, penetration - destroyedBricks.length)
  };
}

/**
 * computeExplosionChain(bricks, brickTypes, startRow, startCol, rows, cols)
 * BFS from (startRow, startCol): collects all alive bricks destroyed by chain
 * reaction. Explosive neighbours trigger further expansion.
 * Does NOT include (startRow, startCol) itself — caller handles the initiator.
 * Does NOT mutate bricks or brickTypes.
 * Returns [{row, col}] of all chain-destroyed bricks (may be empty).
 */
export function computeExplosionChain(bricks, brickTypes, startRow, startCol, rows, cols) {
  const destroyed = [];
  const visited   = new Set();
  const queue     = [{ row: startRow, col: startCol }];
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const { row, col } = queue.shift();
    // Explore the 8 neighbours
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        visited.add(key);
        if (!bricks[nr][nc]) continue; // already destroyed
        destroyed.push({ row: nr, col: nc });
        // If this neighbour is explosive, add to queue for further expansion
        // brickTypes cells are objects { type, hitsLeft, maxHits } (US-23)
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
 * Pure function: decrements hitsLeft by 1 without mutating the object.
 * Returns { newHitsLeft, destroyed } where destroyed is true when hitsLeft
 * reaches 0.  Caller is responsible for updating state and awarding score.
 *
 * AC-08: does NOT mutate brickState.
 */
export function applyHitToBrick(brickState) {
  const newHitsLeft = brickState.hitsLeft - 1;
  return { newHitsLeft, destroyed: newHitsLeft <= 0 };
}

/**
 * computeTimeMultiplier(elapsedMs)
 * Returns a score multiplier based on elapsed time in the current level:
 *   0   – 2 min : 3.0 → 1.0  (linear decrease)
 *   2   – 3 min : 1.0         (flat)
 *   3   – 4 min : 1.0 → 0.1  (linear decrease)
 *   > 4 min     : 0.1         (floor)
 */
export function computeTimeMultiplier(elapsedMs) {
  const PHASE1_MS = 120000; // 2 min
  const PHASE2_MS = 180000; // 3 min
  const PHASE3_MS = 240000; // 4 min
  if (elapsedMs <= 0)         return 3.0;
  if (elapsedMs < PHASE1_MS)  return 3.0 - 2.0 * (elapsedMs / PHASE1_MS);
  if (elapsedMs < PHASE2_MS)  return 1.0;
  if (elapsedMs < PHASE3_MS)  return 1.0 - 0.9 * ((elapsedMs - PHASE2_MS) / (PHASE3_MS - PHASE2_MS));
  return 0.1;
}

/**
 * computeComboMultiplier(comboCount)
 * Each successful paddle-return after at least one brick hit adds +0.1 to the
 * multiplier. comboCount 0 → ×1.0, count 5 → ×1.5, count 10 → ×2.0, etc.
 */
export function computeComboMultiplier(comboCount) {
  return 1 + comboCount * 0.1;
}

// ---------------------------------------------------------------------------
// Browser compatibility shim — temporary, removed in step 8
// Keeps window.GameCore intact so index.html works without modification.
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
  };
}
