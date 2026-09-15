// rules.js — the one place that knows the rules of chess.
//
// Every mode (hot-seat, the computer opponent, the online server) calls
// into this file to find out what's legal and to apply moves. Nothing
// else in the project is allowed to decide chess legality on its own.
// See ProductSpec.md §5.2 for why, and FEATUREROADMAP_workplan.md 0.2/0.3
// for how this gets proven correct (the perft test in rules.test.js).
//
// A "position" is a plain object: { board, turn, castling, enPassant }.
//   board      — 8x8 array of rows. board[0] is the black back rank
//                (rank 8), board[7] is the white back rank (rank 1);
//                each cell is null or { type: "K"|"Q"|"R"|"B"|"N"|"P",
//                color: "w"|"b" }. This matches the board orientation
//                already used in src/App.tsx, so wiring them together
//                in Phase 1 is a straight import, not a translation.
//   turn       — "w" or "b": whose move it is.
//   castling   — { wK, wQ, bK, bQ }: whether each side can still castle
//                on that side (kingside/queenside), regardless of
//                whether a specific castling move happens to be legal
//                right now (blocked by a piece, in check, etc).
//   enPassant  — null, or { r, c }: the square a pawn just skipped over
//                with a two-square move — the square an en passant
//                capture would land on. Only valid for the very next
//                move, per the real rule.
//
// A "move" is a plain object: { from: {r,c}, to: {r,c}, piece,
// captured, promotion, isEnPassant, isCastle }. `promotion` is null or
// one of "Q"/"R"/"B"/"N" — a pawn reaching the last rank produces one
// move per promotion choice, not one move you configure afterward, so
// getLegalMoves() already lists every distinct choice. `isCastle` is
// null, "K" (kingside), or "Q" (queenside).

export const WHITE = "w";
export const BLACK = "b";

const PROMOTION_PIECES = ["Q", "R", "B", "N"];

function opponent(color) {
  return color === WHITE ? BLACK : WHITE;
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export function createInitialPosition() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRank[c], color: BLACK };
    board[1][c] = { type: "P", color: BLACK };
    board[6][c] = { type: "P", color: WHITE };
    board[7][c] = { type: backRank[c], color: WHITE };
  }
  return {
    board,
    turn: WHITE,
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
  };
}

// --- Square-attack detection --------------------------------------------
//
// Used both for check detection and for castling's "can't move through
// check" rule. Answers: does `byColor` attack square (r, c) in this
// position — independent of whose turn it actually is.

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];
const DIAGONAL_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHOGONAL_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function isSquareAttacked(position, r, c, byColor) {
  const { board } = position;

  const pawnDir = byColor === WHITE ? -1 : 1;
  for (const dc of [-1, 1]) {
    const pr = r - pawnDir;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === "P") return true;
    }
  }

  for (const [dr, dc] of KNIGHT_OFFSETS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === "N") return true;
    }
  }

  for (const [dr, dc] of KING_OFFSETS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === "K") return true;
    }
  }

  for (const [dr, dc] of DIAGONAL_DIRS) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === "B" || p.type === "Q")) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  for (const [dr, dc] of ORTHOGONAL_DIRS) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === "R" || p.type === "Q")) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  return false;
}

function findKing(position, color) {
  const { board } = position;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === "K") return { r, c };
    }
  }
  return null; // should never happen in a legal game
}

export function isInCheck(position, color) {
  const king = findKing(position, color);
  if (!king) return false;
  return isSquareAttacked(position, king.r, king.c, opponent(color));
}

// --- Pseudo-legal move generation ---------------------------------------
//
// "Pseudo-legal" means the move follows the piece's movement pattern,
// but we haven't yet checked whether making it would leave the mover's
// own king in check. getLegalMoves() below does that filtering, which
// is also what catches pins and "you can't move into check" — one
// mechanism handles every case, rather than special-casing pins.

function makePlainMove(piece, fr, fc, tr, tc, captured) {
  return {
    from: { r: fr, c: fc },
    to: { r: tr, c: tc },
    piece,
    captured: captured || null,
    promotion: null,
    isEnPassant: false,
    isCastle: null,
  };
}

function addSlidingMoves(position, r, c, dirs, moves) {
  const { board } = position;
  const piece = board[r][c];
  for (const [dr, dc] of dirs) {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push(makePlainMove(piece, r, c, nr, nc, null));
      } else {
        if (target.color !== piece.color) {
          moves.push(makePlainMove(piece, r, c, nr, nc, target));
        }
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function generatePawnMoves(position, r, c, moves) {
  const { board, enPassant } = position;
  const piece = board[r][c];
  const dir = piece.color === WHITE ? -1 : 1;
  const startRow = piece.color === WHITE ? 6 : 1;
  const promotionRow = piece.color === WHITE ? 0 : 7;

  function push(tr, tc, captured, isEnPassant) {
    if (tr === promotionRow) {
      for (const promo of PROMOTION_PIECES) {
        moves.push({
          from: { r, c }, to: { r: tr, c: tc }, piece,
          captured: captured || null, promotion: promo,
          isEnPassant: !!isEnPassant, isCastle: null,
        });
      }
    } else {
      moves.push({
        from: { r, c }, to: { r: tr, c: tc }, piece,
        captured: captured || null, promotion: null,
        isEnPassant: !!isEnPassant, isCastle: null,
      });
    }
  }

  const oneR = r + dir;
  if (inBounds(oneR, c) && !board[oneR][c]) {
    push(oneR, c, null, false);
    const twoR = r + 2 * dir;
    if (r === startRow && !board[twoR][c]) {
      push(twoR, c, null, false);
    }
  }

  for (const dc of [-1, 1]) {
    const tr = r + dir, tc = c + dc;
    if (!inBounds(tr, tc)) continue;
    const target = board[tr][tc];
    if (target && target.color !== piece.color) {
      push(tr, tc, target, false);
    } else if (enPassant && enPassant.r === tr && enPassant.c === tc && !target) {
      push(tr, tc, board[r][tc], true);
    }
  }
}

function generateCastlingMoves(position, moves) {
  const { board, turn, castling } = position;
  const row = turn === WHITE ? 7 : 0;
  const kingsideRight = turn === WHITE ? castling.wK : castling.bK;
  const queensideRight = turn === WHITE ? castling.wQ : castling.bQ;
  const king = board[row][4];
  if (!king || king.type !== "K" || king.color !== turn) return;

  const opp = opponent(turn);
  if (isSquareAttacked(position, row, 4, opp)) return; // can't castle out of check

  if (kingsideRight) {
    const rook = board[row][7];
    const clear = !board[row][5] && !board[row][6];
    if (
      rook && rook.type === "R" && rook.color === turn && clear &&
      !isSquareAttacked(position, row, 5, opp) &&
      !isSquareAttacked(position, row, 6, opp)
    ) {
      moves.push({
        from: { r: row, c: 4 }, to: { r: row, c: 6 }, piece: king,
        captured: null, promotion: null, isEnPassant: false, isCastle: "K",
      });
    }
  }

  if (queensideRight) {
    const rook = board[row][0];
    const clear = !board[row][1] && !board[row][2] && !board[row][3];
    if (
      rook && rook.type === "R" && rook.color === turn && clear &&
      !isSquareAttacked(position, row, 3, opp) &&
      !isSquareAttacked(position, row, 2, opp)
    ) {
      moves.push({
        from: { r: row, c: 4 }, to: { r: row, c: 2 }, piece: king,
        captured: null, promotion: null, isEnPassant: false, isCastle: "Q",
      });
    }
  }
}

function generatePseudoLegalMoves(position) {
  const { board, turn } = position;
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.color !== turn) continue;

      switch (piece.type) {
        case "P":
          generatePawnMoves(position, r, c, moves);
          break;
        case "N":
          for (const [dr, dc] of KNIGHT_OFFSETS) {
            const nr = r + dr, nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.color !== piece.color) {
              moves.push(makePlainMove(piece, r, c, nr, nc, target));
            }
          }
          break;
        case "B":
          addSlidingMoves(position, r, c, DIAGONAL_DIRS, moves);
          break;
        case "R":
          addSlidingMoves(position, r, c, ORTHOGONAL_DIRS, moves);
          break;
        case "Q":
          addSlidingMoves(position, r, c, DIAGONAL_DIRS, moves);
          addSlidingMoves(position, r, c, ORTHOGONAL_DIRS, moves);
          break;
        case "K":
          for (const [dr, dc] of KING_OFFSETS) {
            const nr = r + dr, nc = c + dc;
            if (!inBounds(nr, nc)) continue;
            const target = board[nr][nc];
            if (!target || target.color !== piece.color) {
              moves.push(makePlainMove(piece, r, c, nr, nc, target));
            }
          }
          break;
      }
    }
  }

  generateCastlingMoves(position, moves);
  return moves;
}

// --- Applying a move ------------------------------------------------------
//
// Pure: returns a brand-new position, never mutates the one you passed in.
// That matters for the AI (Phase 2), which needs to try a move, look at
// the result, and then try a different move from the *original* position.

const ROOK_HOME = {
  w: { K: { r: 7, c: 7 }, Q: { r: 7, c: 0 } },
  b: { K: { r: 0, c: 7 }, Q: { r: 0, c: 0 } },
};

export function makeMove(position, move) {
  const board = cloneBoard(position.board);
  const { from, to, piece } = move;

  if (move.isEnPassant) {
    // The captured pawn sits beside the mover, not on the destination
    // square: same row as `from`, same column as `to`.
    board[from.r][to.c] = null;
  }

  board[from.r][from.c] = null;
  board[to.r][to.c] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;

  if (move.isCastle === "K") {
    const row = from.r;
    board[row][5] = board[row][7];
    board[row][7] = null;
  } else if (move.isCastle === "Q") {
    const row = from.r;
    board[row][3] = board[row][0];
    board[row][0] = null;
  }

  const castling = { ...position.castling };
  if (piece.type === "K") {
    if (piece.color === WHITE) { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  if (piece.type === "R") {
    for (const color of [WHITE, BLACK]) {
      for (const side of ["K", "Q"]) {
        const home = ROOK_HOME[color][side];
        if (from.r === home.r && from.c === home.c) castling[color + side] = false;
      }
    }
  }
  // A rook captured on its home square loses that side's castling right
  // too, even though the rook itself never moved.
  for (const color of [WHITE, BLACK]) {
    for (const side of ["K", "Q"]) {
      const home = ROOK_HOME[color][side];
      if (to.r === home.r && to.c === home.c) castling[color + side] = false;
    }
  }

  let enPassant = null;
  if (piece.type === "P" && Math.abs(to.r - from.r) === 2) {
    enPassant = { r: (from.r + to.r) / 2, c: from.c };
  }

  return { board, turn: opponent(position.turn), castling, enPassant };
}

// --- Legal moves ------------------------------------------------------
//
// Every pseudo-legal move, minus anything that would leave the mover's
// own king in check.

export function getLegalMoves(position) {
  const pseudo = generatePseudoLegalMoves(position);
  return pseudo.filter((move) => {
    const next = makeMove(position, move);
    return !isInCheck(next, position.turn);
  });
}

export function getGameStatus(position) {
  const inCheck = isInCheck(position, position.turn);
  const hasMoves = getLegalMoves(position).length > 0;
  if (hasMoves) return "ongoing";
  return inCheck ? "checkmate" : "stalemate";
}
