// ai.js — the Vs Computer opponent.
//
// This runs entirely in the player's browser (see ProductSpec.md §5.3): no
// server involved. It only ever *selects* a move -- every legality
// question ("is this move allowed") still goes through rules.js, the same
// as hot-seat and (eventually) the online server. This file never decides
// what's legal, only what's good.
//
// Algorithm: minimax with alpha-beta pruning, written in "negamax" form
// (a standard simplification: instead of separate max-for-white /
// min-for-black code paths, every node maximizes from the perspective of
// whoever's turn it is, and each level negates the score before handing it
// up -- mathematically identical to plain minimax, just less code to get
// wrong). Search depth 2 means: the computer's own candidate move, then
// your best reply to it -- two half-moves, per ProductSpec.md's Glossary.

import { getLegalMoves, makeMove, isInCheck, WHITE, BLACK } from "./rules.js";

const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

// A small "basic positional factor" per ProductSpec.md 2.1: pieces near the
// center of the board are worth a little more than the same piece in a
// corner. This is deliberately simple (no full piece-square tables) --
// enough to make the computer prefer active, central play over material-
// equal alternatives, without pretending to be a strong engine.
function centerBonus(r, c) {
  const distance = Math.abs(r - 3.5) + Math.abs(c - 3.5);
  return Math.max(0, 0.4 - 0.1 * distance);
}

// Returns a score from the perspective of the side to move: positive means
// *that* side is better off, negative means worse. Uses only the board and
// whose turn it is -- both already exposed by rules.js's Position shape.
export function evaluatePosition(position) {
  const { board, turn } = position;
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const value = PIECE_VALUES[piece.type] + (piece.type === "K" ? 0 : centerBonus(r, c));
      score += piece.color === turn ? value : -value;
    }
  }
  return score;
}

// Cheap move ordering (captures first, biggest capture first) so
// alpha-beta pruning has a better chance of cutting off bad branches
// early. This never changes which move is eventually chosen, only how
// quickly the search gets there.
function captureValue(move) {
  if (move.isEnPassant) return PIECE_VALUES.P;
  return move.captured ? PIECE_VALUES[move.captured.type] : 0;
}

function orderMoves(moves) {
  return [...moves].sort((a, b) => captureValue(b) - captureValue(a));
}

// How being checkmated at this node is scored, from the mated side's own
// perspective (very bad). Mates found with more search depth still
// remaining are *sooner* mates (fewer plies were needed to reach them), so
// they get a slightly harsher penalty here -- which, once negated back up
// the tree, makes the side delivering mate prefer the faster win.
function checkmateScore(remainingDepth) {
  return -1000 - remainingDepth;
}

function negamax(position, depth, alpha, beta, deadline) {
  const moves = getLegalMoves(position);

  if (moves.length === 0) {
    return isInCheck(position, position.turn) ? checkmateScore(depth) : 0; // stalemate = 0, a draw
  }
  if (depth === 0) {
    return evaluatePosition(position);
  }

  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    if (Date.now() > deadline) break; // speed guard -- see chooseMove()
    const next = makeMove(position, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, deadline);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // alpha-beta cutoff
  }
  return best;
}

// The 2-second budget from ProductSpec.md §3.2 / 2.3. We aim to finish
// well inside it (1.5s) and, if some unusually "open" position ever
// threatened to blow past that, `deadline` below stops the search from
// going any deeper -- it still always returns the best legal move found
// so far, never an illegal one and never nothing at all.
const TIME_BUDGET_MS = 1500;

export function chooseMove(position, depth = 2) {
  const legalMoves = getLegalMoves(position);
  if (legalMoves.length === 0) return null; // game already over -- nothing to choose

  const ordered = orderMoves(legalMoves);
  const deadline = Date.now() + TIME_BUDGET_MS;

  // Always have a legal move ready to return, even if the clock runs out
  // before the loop below finishes evaluating every candidate.
  let bestMove = ordered[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of ordered) {
    const next = makeMove(position, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, deadline);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (score > alpha) alpha = score;
    if (Date.now() > deadline) break;
  }

  return bestMove;
}

export { WHITE, BLACK };
