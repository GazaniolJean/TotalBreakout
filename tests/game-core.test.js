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
const SPEED_MAG  = Math.sqrt(4 * 4 + 4 * 4); // ~ 5.656

// Power-up defaults (mirror index.html constants)
const POWERUP_SIZE = 20;

// Speed power-up constants (mirror index.html — US-10)
const BALL_SPEED_MAG = Math.sqrt(4 * 4 + 4 * 4); // ~ 5.656
const SPEED_FAST_MULT = 1.6;
const SPEED_SLOW_MULT = 0.55;

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

// ---------------------------------------------------------------------------
// checkPowerUpCollection - US-09
// ---------------------------------------------------------------------------
describe('checkPowerUpCollection - US-09', () => {
  // Reusable factory: capsule with top-left at (x, y) and default POWERUP_SIZE.
  function makeCapsule(x, y, size = POWERUP_SIZE) {
    return { x, y, type: 'test', color: '#FFFFFF', label: 'T', size };
  }

  test('capsule fully inside the paddle horizontal range and touching its top: returns true', () => {
    // Paddle at (350, 560), 100x12. Capsule sitting just on top, fully overlapping.
    const capsule = makeCapsule(400, PAD_Y); // top-left inside paddle, y == paddleTop
    expect(GameCore.checkPowerUpCollection(capsule, 350, PAD_Y, PAD_W, PAD_H)).toBe(true);
  });

  test('capsule partially overlapping the paddle (right edge): returns true', () => {
    // Capsule extends 5 px past the paddle's left edge from the outside.
    // Paddle left = 350, capsule right = 350 + 5 -> 5 px of horizontal overlap.
    const capsule = makeCapsule(350 - POWERUP_SIZE + 5, PAD_Y + 2);
    expect(GameCore.checkPowerUpCollection(capsule, 350, PAD_Y, PAD_W, PAD_H)).toBe(true);
  });

  test('capsule clearly above the paddle (no vertical overlap): returns false', () => {
    // Capsule sits 50 px above the paddle - no overlap at all.
    const capsule = makeCapsule(400, PAD_Y - POWERUP_SIZE - 50);
    expect(GameCore.checkPowerUpCollection(capsule, 350, PAD_Y, PAD_W, PAD_H)).toBe(false);
  });

  test('capsule next to the paddle horizontally (no horizontal overlap): returns false', () => {
    // Capsule at x = 470 (past paddle right edge 350+100=450), same vertical row.
    const capsule = makeCapsule(470, PAD_Y + 2);
    expect(GameCore.checkPowerUpCollection(capsule, 350, PAD_Y, PAD_W, PAD_H)).toBe(false);
  });

  test('capsule edges flush with paddle edges (touching, no real overlap): returns false', () => {
    // Capsule right edge exactly equals paddle left edge: no positive-area overlap.
    const capsule = makeCapsule(350 - POWERUP_SIZE, PAD_Y + 2);
    expect(GameCore.checkPowerUpCollection(capsule, 350, PAD_Y, PAD_W, PAD_H)).toBe(false);
  });

  test('falls back to default size 20 when capsule.size is missing', () => {
    // Capsule object lacking the size field still uses a sensible 20 px square.
    const capsule = { x: 400, y: PAD_Y, type: 'test', color: '#FFFFFF', label: 'T' };
    expect(GameCore.checkPowerUpCollection(capsule, 350, PAD_Y, PAD_W, PAD_H)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeSpeedEffect - US-10
// ---------------------------------------------------------------------------
describe('computeSpeedEffect - US-10', () => {
  test('fast multiplier (1.6) scales BALL_SPEED_MAG correctly within 0.001', () => {
    const result = GameCore.computeSpeedEffect(BALL_SPEED_MAG, SPEED_FAST_MULT);
    expect(result).toBeCloseTo(BALL_SPEED_MAG * 1.6, 3);
  });

  test('slow multiplier (0.55) scales BALL_SPEED_MAG correctly within 0.001', () => {
    const result = GameCore.computeSpeedEffect(BALL_SPEED_MAG, SPEED_SLOW_MULT);
    expect(result).toBeCloseTo(BALL_SPEED_MAG * 0.55, 3);
  });

  test('multiplier 1.0 returns exactly baseSpeed (used at effect expiration)', () => {
    expect(GameCore.computeSpeedEffect(BALL_SPEED_MAG, 1.0)).toBe(BALL_SPEED_MAG);
  });

  test('multiplier 1.0 returns exactly baseSpeed for arbitrary positive input', () => {
    expect(GameCore.computeSpeedEffect(12.345, 1.0)).toBe(12.345);
  });

  test('result is strictly positive for positive baseSpeed and positive multiplier', () => {
    expect(GameCore.computeSpeedEffect(BALL_SPEED_MAG, SPEED_FAST_MULT)).toBeGreaterThan(0);
    expect(GameCore.computeSpeedEffect(BALL_SPEED_MAG, SPEED_SLOW_MULT)).toBeGreaterThan(0);
    expect(GameCore.computeSpeedEffect(0.0001, 0.55)).toBeGreaterThan(0);
  });

  test('fast effect produces a value strictly greater than baseSpeed', () => {
    expect(GameCore.computeSpeedEffect(BALL_SPEED_MAG, SPEED_FAST_MULT))
      .toBeGreaterThan(BALL_SPEED_MAG);
  });

  test('slow effect produces a value strictly lower than baseSpeed', () => {
    expect(GameCore.computeSpeedEffect(BALL_SPEED_MAG, SPEED_SLOW_MULT))
      .toBeLessThan(BALL_SPEED_MAG);
  });

  // CR-01: duration stacking logic for same-type power-up collection is in
  // activateEffect() in index.html — tested manually (DOM/game loop dependency).
});

describe('stickyBallX — US-14', () => {
  test('returns paddleX + hitOffset', () => {
    expect(GameCore.stickyBallX(350, 100, 30)).toBe(380);
  });
  test('hitOffset = 0: ball is at paddle left edge', () => {
    expect(GameCore.stickyBallX(350, 100, 0)).toBe(350);
  });
  test('hitOffset = paddleWidth: ball is at paddle right edge', () => {
    expect(GameCore.stickyBallX(350, 100, 100)).toBe(450);
  });
  test('hitOffset = paddleWidth/2: ball is at paddle centre', () => {
    expect(GameCore.stickyBallX(350, 100, 50)).toBe(400);
  });
  test('negative hitOffset: ball is left of paddle', () => {
    expect(GameCore.stickyBallX(350, 100, -10)).toBe(340);
  });
});

// ---------------------------------------------------------------------------
// US-15 — Extra life power-up
// ---------------------------------------------------------------------------
// AC-01..AC-05: instant lives increment (Math.min(lives+1, MAX_LIVES)) lives
// entirely in index.html (activateEffect). No pure function extracted.
// Tested manually: collect capsule when lives < MAX_LIVES → lives++, HUD updates.
//                  collect capsule when lives === MAX_LIVES → no change.

// ---------------------------------------------------------------------------
// US-12 — Multiball power-up
// ---------------------------------------------------------------------------
describe('spawnExtraBalls — US-12', () => {
  const SPEED = Math.sqrt(32); // same as BALL_SPEED_MAG
  const sourceBall = { x: 400, y: 300, vx: 4, vy: -4, stuck: false, stickyTimer: 0, stickyHitOffset: 0 };

  test('AC-09: returns count-1 extra balls', () => {
    const extras = GameCore.spawnExtraBalls(sourceBall, 3, 20, SPEED);
    expect(extras.length).toBe(2);
  });

  test('AC-02: each extra ball has the correct speed magnitude', () => {
    const extras = GameCore.spawnExtraBalls(sourceBall, 3, 20, SPEED);
    extras.forEach(b => {
      const mag = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      expect(mag).toBeCloseTo(SPEED, 2);
    });
  });

  test('AC-09: does not mutate sourceBall', () => {
    const original = { ...sourceBall };
    GameCore.spawnExtraBalls(sourceBall, 3, 20, SPEED);
    expect(sourceBall.vx).toBe(original.vx);
    expect(sourceBall.vy).toBe(original.vy);
  });
});

// ---------------------------------------------------------------------------
// computeBrickCollisionPenetrating — US-13
// ---------------------------------------------------------------------------
describe('computeBrickCollisionPenetrating — US-13', () => {
  const B_OFFSET_X = 32, B_OFFSET_Y = 60;
  const B_W = 70, B_H = 20, B_GAP = 4;
  const BALL_R = 8;

  function brickCentre(r, c) {
    return {
      cx: B_OFFSET_X + c * (B_W + B_GAP) + B_W / 2,
      by: B_OFFSET_Y + r * (B_H + B_GAP)
    };
  }

  test('AC-03: penetration=0 behaves like computeBrickCollision (bounce)', () => {
    const bricks = GameCore.buildBricks(5, 10);
    const { cx, by } = brickCentre(0, 0);
    const result = GameCore.computeBrickCollisionPenetrating(
      cx, by - BALL_R + 2, 0, 3, BALL_R,
      bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP, 0
    );
    expect(result).not.toBeNull();
    expect(result.vy).toBeLessThan(0); // bounced upward
    expect(result.destroyedBricks.length).toBe(1);
  });

  test('AC-02: penetration>0 does not change velocity', () => {
    const bricks = GameCore.buildBricks(5, 10);
    const { cx, by } = brickCentre(0, 0);
    const result = GameCore.computeBrickCollisionPenetrating(
      cx, by - BALL_R + 2, 0, 3, BALL_R,
      bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP, 2
    );
    expect(result).not.toBeNull();
    expect(result.vx).toBe(0);
    expect(result.vy).toBe(3); // unchanged
  });

  test('AC-02: remainingPenetration decremented by hit count', () => {
    const bricks = GameCore.buildBricks(5, 10);
    const { cx, by } = brickCentre(0, 0);
    const result = GameCore.computeBrickCollisionPenetrating(
      cx, by - BALL_R + 2, 0, 3, BALL_R,
      bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP, 3
    );
    expect(result.remainingPenetration).toBe(3 - result.destroyedBricks.length);
  });

  test('AC-09: destroyed bricks (false) are not included', () => {
    const bricks = GameCore.buildBricks(5, 10);
    bricks[0][0] = false;
    const { cx, by } = brickCentre(0, 0);
    const result = GameCore.computeBrickCollisionPenetrating(
      cx, by - BALL_R + 2, 0, 3, BALL_R,
      bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP, 2
    );
    // brick[0][0] is false — should not appear in destroyedBricks
    if (result !== null) {
      const found = result.destroyedBricks.find(b => b.row === 0 && b.col === 0);
      expect(found).toBeUndefined();
    } else {
      expect(result).toBeNull();
    }
  });

  test('returns null when no brick overlaps', () => {
    const bricks = GameCore.buildBricks(5, 10);
    const result = GameCore.computeBrickCollisionPenetrating(
      400, 500, 0, 3, BALL_R,
      bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP, 2
    );
    expect(result).toBeNull();
  });

  test('does not mutate bricks array', () => {
    const bricks = GameCore.buildBricks(5, 10);
    const { cx, by } = brickCentre(0, 0);
    GameCore.computeBrickCollisionPenetrating(
      cx, by - BALL_R + 2, 0, 3, BALL_R,
      bricks, B_OFFSET_X, B_OFFSET_Y, B_W, B_H, B_GAP, 2
    );
    expect(bricks[0][0]).toBe(true);
  });
});

describe('computeExplosionChain — US-16', () => {
  function makeBrickTypes(rows, cols, explosivePositions = []) {
    const t = [];
    for (let r = 0; r < rows; r++) {
      t[r] = [];
      for (let c = 0; c < cols; c++) t[r][c] = 'normal';
    }
    explosivePositions.forEach(([r, c]) => { t[r][c] = 'explosive'; });
    return t;
  }

  test('returns empty array when no neighbours are alive', () => {
    const bricks = [[false, false], [false, false]];
    const types  = makeBrickTypes(2, 2);
    expect(GameCore.computeExplosionChain(bricks, types, 0, 0, 2, 2)).toEqual([]);
  });

  test('destroys all 8 alive neighbours of a normal brick', () => {
    const bricks = GameCore.buildBricks(3, 3);
    bricks[1][1] = false; // initiator already destroyed
    const types = makeBrickTypes(3, 3);
    const chain = GameCore.computeExplosionChain(bricks, types, 1, 1, 3, 3);
    expect(chain.length).toBe(8);
  });

  test('chain reaction: explosive neighbour spreads further', () => {
    const bricks = GameCore.buildBricks(1, 4);
    bricks[0][0] = false; // initiator
    const types = makeBrickTypes(1, 4, [[0, 1]]);
    const chain = GameCore.computeExplosionChain(bricks, types, 0, 0, 1, 4);
    const cols = chain.map(b => b.col).sort();
    expect(cols).toContain(1);
    expect(cols).toContain(2);
  });

  test('does not mutate bricks or brickTypes', () => {
    const bricks = GameCore.buildBricks(3, 3);
    const types  = makeBrickTypes(3, 3, [[1, 1]]);
    GameCore.computeExplosionChain(bricks, types, 1, 1, 3, 3);
    expect(bricks[0][0]).toBe(true);
    expect(types[1][1]).toBe('explosive');
  });

  test('does not include already-destroyed bricks in chain', () => {
    const bricks = GameCore.buildBricks(2, 2);
    bricks[0][1] = false; // already destroyed
    const types = makeBrickTypes(2, 2);
    const chain = GameCore.computeExplosionChain(bricks, types, 0, 0, 2, 2);
    const found = chain.find(b => b.row === 0 && b.col === 1);
    expect(found).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Architecture refactoring v2-review — no new pure functions added.
// R1..R8 are in index.html only. All 72 existing tests remain valid.
// ---------------------------------------------------------------------------
