// tests/game-core.test.js — Unit tests for game-core.js (pure logic, no DOM)
'use strict';

const GameCore = require('../game-core');

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const CANVAS_W  = 800;
const CANVAS_H  = 600;
const BALL_R    = 8;
const ROW_PTS   = [50, 40, 30, 20, 10];

// Brick layout matching index.html defaults
const B_OFFSET_X = 32;
const B_OFFSET_Y = 60;
const B_W        = 70;
const B_H        = 20;
const B_GAP      = 4;

// Paddle defaults
const PAD_W      = 100;
const PAD_H      = 12;
const PAD_Y      = 560;
const MAX_ANGLE  = 5;
const SPEED_MAG  = Math.sqrt(4 * 4 + 4 * 4); // ≈ 5.656

// ---------------------------------------------------------------------------
// buildBricks
// ---------------------------------------------------------------------------
describe('buildBricks', () => {
  test('returns an array with the correct number of rows', () => {
    const b = GameCore.buildBricks(5, 10);
    expect(b.length).toBe(5);
  });

  test('each row has the correct number of columns', () => {
    const b = GameCore.buildBricks(5, 10);
    b.forEach(row => expect(row.length).toBe(10));
  });

  test('all cells are initialised to true', () => {
    const b = GameCore.buildBricks(3, 4);
    b.forEach(row => row.forEach(cell => expect(cell).toBe(true)));
  });

  test('works for a 1x1 grid', () => {
    const b = GameCore.buildBricks(1, 1);
    expect(b[0][0]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkVictory
// ---------------------------------------------------------------------------
describe('checkVictory', () => {
  test('returns false when at least one brick is true', () => {
    const b = GameCore.buildBricks(2, 2);
    expect(GameCore.checkVictory(b)).toBe(false);
  });

  test('returns false when only one brick survives', () => {
    const b = [[false, false], [false, true]];
    expect(GameCore.checkVictory(b)).toBe(false);
  });

  test('returns true when every brick is false', () => {
    const b = [[false, false], [false, false]];
    expect(GameCore.checkVictory(b)).toBe(true);
  });

  test('works on a 1x1 grid that is already destroyed', () => {
    expect(GameCore.checkVictory([[false]])).toBe(true);
  });

  test('works on a 1x1 grid that is still alive', () => {
    expect(GameCore.checkVictory([[true]])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// computeWallCollisions
// ---------------------------------------------------------------------------
describe('computeWallCollisions', () => {
  test('ball exits left wall: vx is inverted and x is corrected', () => {
    const r = GameCore.computeWallCollisions(-2, 300, -3, 2, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.vx).toBeGreaterThan(0);
    expect(r.x).toBe(BALL_R);
    expect(r.lost).toBe(false);
  });

  test('ball exits right wall: vx is inverted and x is corrected', () => {
    const r = GameCore.computeWallCollisions(CANVAS_W + 2, 300, 3, 2, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.vx).toBeLessThan(0);
    expect(r.x).toBe(CANVAS_W - BALL_R);
    expect(r.lost).toBe(false);
  });

  test('ball exits top wall: vy is inverted and y is corrected', () => {
    const r = GameCore.computeWallCollisions(400, -2, 2, -3, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.vy).toBeGreaterThan(0);
    expect(r.y).toBe(BALL_R);
    expect(r.lost).toBe(false);
  });

  test('ball exits through the bottom: lost is true', () => {
    const r = GameCore.computeWallCollisions(400, CANVAS_H + BALL_R + 1, 2, 3, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.lost).toBe(true);
  });

  test('ball at centre with no wall contact: position and velocity unchanged', () => {
    const r = GameCore.computeWallCollisions(400, 300, 3, -3, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.x).toBe(400);
    expect(r.y).toBe(300);
    expect(r.vx).toBe(3);
    expect(r.vy).toBe(-3);
    expect(r.lost).toBe(false);
  });

  test('ball touching left wall but moving right (vx > 0): no bounce occurs', () => {
    const r = GameCore.computeWallCollisions(BALL_R - 1, 300, 3, 2, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.vx).toBe(3);
  });

  test('ball touching right wall but moving left (vx < 0): no bounce occurs', () => {
    const r = GameCore.computeWallCollisions(CANVAS_W - BALL_R + 1, 300, -3, 2, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.vx).toBe(-3);
  });

  test('ball touching top wall but moving downward (vy > 0): no bounce occurs', () => {
    const r = GameCore.computeWallCollisions(400, BALL_R - 1, 2, 3, BALL_R, CANVAS_W, CANVAS_H);
    expect(r.vy).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computePaddleBounce
// ---------------------------------------------------------------------------
describe('computePaddleBounce', () => {
  function paddleHit(ballX, paddleX = 350) {
    return GameCore.computePaddleBounce(
      ballX, PAD_Y,
      2, 3,
      BALL_R,
      paddleX, PAD_Y, PAD_W, PAD_H,
      MAX_ANGLE, SPEED_MAG
    );
  }

  test('hit at centre: vx is approximately 0 (quasi-vertical)', () => {
    const r = paddleHit(350 + 50);
    expect(Math.abs(r.vx)).toBeLessThan(0.1);
  });

  test('hit at left edge: ball departs to the left (vx < 0)', () => {
    const r = paddleHit(350);
    expect(r.vx).toBeLessThan(0);
  });

  test('hit at right edge: ball departs to the right (vx > 0)', () => {
    const r = paddleHit(350 + 100);
    expect(r.vx).toBeGreaterThan(0);
  });

  test('speed magnitude is preserved after bounce (tolerance 0.01)', () => {
    const r = paddleHit(350 + 30);
    const mag = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
    expect(mag).toBeCloseTo(SPEED_MAG, 2);
  });

  test('vy is always negative after bounce (ball goes upward)', () => {
    const r = paddleHit(350 + 50);
    expect(r.vy).toBeLessThan(0);
  });

  test('y is corrected to paddleY - ballRadius after bounce', () => {
    const r = paddleHit(350 + 50);
    expect(r.y).toBe(PAD_Y - BALL_R);
  });

  test('ball moving upward (vy < 0): no bounce, values unchanged', () => {
    const r = GameCore.computePaddleBounce(
      400, PAD_Y, 2, -3, BALL_R,
      350, PAD_Y, PAD_W, PAD_H,
      MAX_ANGLE, SPEED_MAG
    );
    expect(r.vx).toBe(2);
    expect(r.vy).toBe(-3);
    expect(r.y).toBe(PAD_Y);
  });

  test('ball is outside the paddle x-range: no bounce', () => {
    const r = GameCore.computePaddleBounce(
      700, PAD_Y, 2, 3, BALL_R,
      350, PAD_Y, PAD_W, PAD_H,
      MAX_ANGLE, SPEED_MAG
    );
    expect(r.vx).toBe(2);
    expect(r.vy).toBe(3);
  });

  test('ball is above the paddle (no vertical overlap): no bounce', () => {
    const r = GameCore.computePaddleBounce(
      400, PAD_Y - 50, 2, 3, BALL_R,
      350, PAD_Y, PAD_W, PAD_H,
      MAX_ANGLE, SPEED_MAG
    );
    expect(r.vx).toBe(2);
    expect(r.vy).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeBrickCollision
// ---------------------------------------------------------------------------
describe('computeBrickCollision', () => {
  function brickCentre(r, c) {
    const bx = B_OFFSET_X + c * (B_W + B_GAP);
    const by = B_OFFSET_Y + r * (B_H + B_GAP);
    return { bx, by, cx: bx + B_W / 2, cy: by + B_H / 2 };
  }

  test('returns null when bricks array is empty', () => {
    const r = GameCore.computeBrickCollision(
      400, 200, 2, -3, BALL_R, [], B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).toBeNull();
  });

  test('returns null when all bricks are destroyed (false)', () => {
    const bricks = [[false, false], [false, false]];
    const r = GameCore.computeBrickCollision(
      400, 200, 2, -3, BALL_R, bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).toBeNull();
  });

  test('ball approaching from above: vy is inverted', () => {
    const { cx, by } = brickCentre(0, 0);
    const ballY = by - BALL_R + 2;
    const bricks = GameCore.buildBricks(5, 10);
    const r = GameCore.computeBrickCollision(
      cx, ballY, 0, 3, BALL_R, bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).not.toBeNull();
    expect(r.vy).toBeLessThan(0);
    expect(r.hitRow).toBe(0);
    expect(r.hitCol).toBe(0);
  });

  test('ball approaching from the side: vx is inverted', () => {
    const { bx, cy } = brickCentre(0, 0);
    const ballX = bx + B_W + BALL_R - 2;
    const bricks = GameCore.buildBricks(5, 10);
    const r = GameCore.computeBrickCollision(
      ballX, cy, -4, 0, BALL_R, bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).not.toBeNull();
    expect(r.vx).toBeGreaterThan(0);
    expect(r.hitRow).toBe(0);
    expect(r.hitCol).toBe(0);
  });

  test('function does NOT mutate the bricks array', () => {
    const { cx, by } = brickCentre(0, 0);
    const ballY = by - BALL_R + 2;
    const bricks = GameCore.buildBricks(5, 10);
    GameCore.computeBrickCollision(
      cx, ballY, 0, 3, BALL_R, bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(bricks[0][0]).toBe(true);
  });

  test('returns null when ball is far from all bricks', () => {
    const bricks = GameCore.buildBricks(5, 10);
    const r = GameCore.computeBrickCollision(
      400, 500, 2, 3, BALL_R, bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).toBeNull();
  });

  test('returns hitRow and hitCol identifying the correct brick', () => {
    // Ball center at by+5: inside row=2 without overlapping row=1 above
    // (row=1 bottom = by-4, ball top = by+5-8 = by-3 > by-4)
    const { cx, by } = brickCentre(2, 5);
    const ballY = by + 5;
    const bricks = GameCore.buildBricks(5, 10);
    const r = GameCore.computeBrickCollision(
      cx, ballY, 0, 3, BALL_R, bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).not.toBeNull();
    expect(r.hitRow).toBe(2);
    expect(r.hitCol).toBe(5);
  });

  test('returns null when the only brick in range is already destroyed', () => {
    const singleBrick = [[false]];
    const { cx, by } = brickCentre(0, 0);
    const r = GameCore.computeBrickCollision(
      cx, by - BALL_R + 2, 0, 3, BALL_R, singleBrick, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP
    );
    expect(r).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeRowPoints
// ---------------------------------------------------------------------------
describe('computeRowPoints', () => {
  test('returns 50 for row 0 (top row, highest value)', () => {
    expect(GameCore.computeRowPoints(0, ROW_PTS)).toBe(50);
  });

  test('returns 40 for row 1', () => {
    expect(GameCore.computeRowPoints(1, ROW_PTS)).toBe(40);
  });

  test('returns 30 for row 2', () => {
    expect(GameCore.computeRowPoints(2, ROW_PTS)).toBe(30);
  });

  test('returns 20 for row 3', () => {
    expect(GameCore.computeRowPoints(3, ROW_PTS)).toBe(20);
  });

  test('returns 10 for row 4 (bottom row, lowest value)', () => {
    expect(GameCore.computeRowPoints(4, ROW_PTS)).toBe(10);
  });

  test('works with a custom points array', () => {
    expect(GameCore.computeRowPoints(2, [100, 75, 50, 25])).toBe(50);
  });
});
