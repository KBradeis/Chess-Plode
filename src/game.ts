// src/game.ts
//
// The hot-seat game state machine. This file is the ONLY place in the
// front-end that touches rules.js directly -- Board.tsx, Square.tsx, and
// Modal.tsx only ever see the results (whose turn it is, which squares are
// legal to click, whether the game has ended) through the useChessGame()
// hook below. That mirrors the rule from ProductSpec.md/roadmap: rules.js
// alone decides legality; nothing else re-implements or second-guesses it.

import { useMemo, useState } from "react";
import {
  createInitialPosition,
  getLegalMoves,
  makeMove,
  getGameStatus,
  isInCheck,
} from "../rules.js";

export type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
export type Color = "w" | "b";

export interface Piece {
  type: PieceType;
  color: Color;
}

export type BoardGrid = (Piece | null)[][];

export interface Square {
  r: number;
  c: number;
}

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export type PromotionPiece = "Q" | "R" | "B" | "N";

export interface Position {
  board: BoardGrid;
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured: Piece | null;
  promotion: PromotionPiece | null;
  isEnPassant: boolean;
  isCastle: "K" | "Q" | null;
}

export type GameStatus = "ongoing" | "checkmate" | "stalemate";

export interface PendingPromotion {
  from: Square;
  to: Square;
  color: Color;
  // One entry per promotion choice legal for this from->to pawn move.
  choices: Partial<Record<PromotionPiece, Move>>;
}

export const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" },
};

export const PIECE_NAMES: Record<PieceType, string> = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight",
  P: "Pawn",
};

export const COLOR_NAMES: Record<Color, string> = { w: "White", b: "Black" };

export const PROMOTION_PIECES: PromotionPiece[] = ["Q", "R", "B", "N"];

const FILES = "abcdefgh";

export function squareName(sq: Square): string {
  return `${FILES[sq.c]}${8 - sq.r}`;
}

export function sameSquare(a: Square | null, b: Square | null): boolean {
  if (!a || !b) return a === b;
  return a.r === b.r && a.c === b.c;
}

// A pure display helper -- it does not decide anything about legality, it
// just answers "where is this king right now" so the UI can highlight it
// when in check. The actual check detection still comes from rules.js.
export function findKingSquare(board: BoardGrid, color: Color): Square | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "K" && piece.color === color) return { r, c };
    }
  }
  return null;
}

export interface ChessGame {
  position: Position;
  status: GameStatus;
  inCheck: boolean;
  turn: Color;
  selected: Square | null;
  legalDestinations: Move[];
  pendingPromotion: PendingPromotion | null;
  selectSquare: (sq: Square) => void;
  choosePromotion: (piece: PromotionPiece) => void;
  cancelPromotion: () => void;
  resetGame: () => void;
}

export function useChessGame(): ChessGame {
  const [position, setPosition] = useState<Position>(() => createInitialPosition() as Position);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const allLegalMoves = useMemo(() => getLegalMoves(position) as Move[], [position]);
  const status = useMemo(() => getGameStatus(position) as GameStatus, [position]);
  const inCheck = useMemo(() => isInCheck(position, position.turn) as boolean, [position]);

  const legalDestinations = useMemo(() => {
    if (!selected) return [];
    return allLegalMoves.filter((m) => sameSquare(m.from, selected));
  }, [allLegalMoves, selected]);

  function applyMove(move: Move) {
    const next = makeMove(position, move) as Position;
    setPosition(next);
    setSelected(null);
    setPendingPromotion(null);
  }

  function selectSquare(sq: Square) {
    if (status !== "ongoing" || pendingPromotion) return;

    if (selected) {
      if (sameSquare(selected, sq)) {
        setSelected(null);
        return;
      }

      const movesToSquare = legalDestinations.filter((m) => sameSquare(m.to, sq));
      if (movesToSquare.length > 0) {
        if (movesToSquare.length > 1) {
          // More than one legal move landing on the same square only
          // happens for the four promotion choices of one pawn move.
          const choices: Partial<Record<PromotionPiece, Move>> = {};
          for (const m of movesToSquare) {
            if (m.promotion) choices[m.promotion] = m;
          }
          setPendingPromotion({ from: selected, to: sq, color: position.turn, choices });
          setSelected(null);
          return;
        }
        applyMove(movesToSquare[0]);
        return;
      }
    }

    const piece = position.board[sq.r][sq.c];
    if (piece && piece.color === position.turn) {
      setSelected(sq);
    } else {
      setSelected(null);
    }
  }

  function choosePromotion(piece: PromotionPiece) {
    if (!pendingPromotion) return;
    const move = pendingPromotion.choices[piece];
    if (move) applyMove(move);
  }

  function cancelPromotion() {
    setPendingPromotion(null);
  }

  function resetGame() {
    setPosition(createInitialPosition() as Position);
    setSelected(null);
    setPendingPromotion(null);
  }

  return {
    position,
    status,
    inCheck,
    turn: position.turn,
    selected,
    legalDestinations,
    pendingPromotion,
    selectSquare,
    choosePromotion,
    cancelPromotion,
    resetGame,
  };
}
