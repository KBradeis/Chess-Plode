// rules.test.js — perft (performance test) for rules.js.
//
// Perft counts how many legal move sequences exist from a position out to
// a fixed depth. From the standard starting position the correct counts
// are well known and used industry-wide to check a chess move generator:
// 20 at depth 1, 400 at depth 2, 8,902 at depth 3. A single subtle bug (a
// missed en passant, a castling rule applied when it shouldn't be, a pin
// handled wrong) throws these counts off in a way that's nearly invisible
// just by eyeballing a few games, but immediately obvious here.
//
// Run with: node rules.test.js — no test framework needed, since
// package.json already has "type": "module".

import { createInitialPosition, getLegalMoves, makeMove } from "./rules.js";

function perft(position, depth) {
  if (depth === 0) return 1;
  const moves = getLegalMoves(position);
  if (depth === 1) return moves.length;
  let count = 0;
  for (const move of moves) {
    const next = makeMove(position, move);
    count += perft(next, depth - 1);
  }
  return count;
}

const EXPECTED = { 1: 20, 2: 400, 3: 8902 };

let allPassed = true;
for (const depthStr of Object.keys(EXPECTED)) {
  const depth = Number(depthStr);
  const expected = EXPECTED[depth];
  const start = createInitialPosition();
  const actual = perft(start, depth);
  const pass = actual === expected;
  if (!pass) allPassed = false;
  console.log(`perft(${depth}): expected ${expected}, got ${actual} -- ${pass ? "PASS" : "FAIL"}`);
}

if (allPassed) {
  console.log("\nAll perft checks passed. rules.js move generation is verified correct through depth 3.");
  process.exit(0);
} else {
  console.log("\nPerft mismatch -- rules.js has a bug. Do not proceed past task 0.3 until this passes.");
  process.exit(1);
}
