// game-core.js — Pure game logic, no DOM / side-effects.
// Dual-environment pattern: works in both browser and Node.js / Jest.
(function(exports) {

  /**
   * buildBricks(rows, cols)
   * Returns a 2-D array [rows][cols] where every cell is `true` (alive).
   */
  function buildBricks(rows, cols) {
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
  function checkVictory(bricks) {
    return bricks.every(row => row.every(cell => !cell));
  }

  /**
   * computeWallCollisions(ballX, ballY, ballVX, ballVY, ballRadius, canvasWidth, canvasHeight)
   * Applies bounces on the three walls (left, right, top) with position correction.
   * Detects exit through the bottom edge.
   * Returns { x, y, vx, vy, lost } — lost:true when the ball exits through the bottom.
   */
  function computeWallCollisions(ballX, ballY, ballVX, ballVY, ballRadius, canvasWidth, canvasHeight) {
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
  function computePaddleBounce(
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
  function computeBrickCollision(
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
  function computeRowPoints(rowIndex, rowPoints) {
    return rowPoints[rowIndex];
  }

  // Export all public functions
  exports.buildBricks            = buildBricks;
  exports.checkVictory           = checkVictory;
  exports.computeWallCollisions  = computeWallCollisions;
  exports.computePaddleBounce    = computePaddleBounce;
  exports.computeBrickCollision  = computeBrickCollision;
  exports.computeRowPoints       = computeRowPoints;

})(typeof module !== 'undefined' ? module.exports : (window.GameCore = {}));
