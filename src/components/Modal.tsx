// src/components/Modal.tsx
//
// Two overlays, sharing one jungle-styled frame: the promotion piece
// picker (task 1.3) and the checkmate/stalemate end-of-game message.
// Neither one decides anything about chess rules -- they just display
// what src/game.ts has already worked out from rules.js.

import type { ReactNode } from "react";
import {
  COLOR_NAMES,
  PIECE_NAMES,
  PIECE_SYMBOLS,
  PROMOTION_PIECES,
} from "../game";
import type { Color, GameStatus, PendingPromotion, PromotionPiece } from "../game";

function ModalFrame({ children, onBackdropClick }: { children: ReactNode; onBackdropClick?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(5,14,6,0.75)" }}
      onClick={onBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col items-center gap-4 px-8 py-7"
        style={{
          background: "linear-gradient(135deg, #2c1f0a 0%, #4a3420 30%, #3a2a14 60%, #2c1f0a 100%)",
          borderRadius: "8px",
          boxShadow:
            "0 0 0 2px #c9a227, 0 0 0 4px #4a3420, 0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,162,39,0.3)",
          minWidth: "280px",
          maxWidth: "90vw",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PromotionModal({
  pending,
  onChoose,
  onCancel,
}: {
  pending: PendingPromotion;
  onChoose: (piece: PromotionPiece) => void;
  onCancel: () => void;
}) {
  return (
    <ModalFrame onBackdropClick={onCancel}>
      <h2
        className="text-lg uppercase text-center"
        style={{ color: "#c9a227", fontFamily: "Cinzel, serif", letterSpacing: "0.15em" }}
      >
        Promote Your Pawn
      </h2>
      <p
        className="text-xs text-center"
        style={{ color: "rgba(196,169,110,0.75)", fontFamily: "Lora, serif" }}
      >
        {COLOR_NAMES[pending.color]}&rsquo;s pawn reached the last rank. Choose its new piece.
      </p>
      <div className="flex gap-3 mt-1">
        {PROMOTION_PIECES.filter((p) => pending.choices[p]).map((p) => (
          <button
            key={p}
            onClick={() => onChoose(p)}
            className="flex flex-col items-center justify-center gap-1 cursor-pointer transition-transform hover:scale-105"
            style={{
              width: "64px",
              height: "76px",
              background: "linear-gradient(135deg, #c4a96e 0%, #a8904f 50%, #c4a96e 100%)",
              borderRadius: "6px",
              border: "2px solid #c9a227",
            }}
          >
            <span
              style={{
                fontSize: "34px",
                lineHeight: 1,
                color: pending.color === "w" ? "#f5efe0" : "#1a1008",
                textShadow: pending.color === "w" ? "0 1px 3px rgba(0,0,0,0.6)" : "none",
              }}
            >
              {PIECE_SYMBOLS[pending.color][p]}
            </span>
            <span style={{ fontSize: "9px", color: "#2c2416", fontFamily: "Lora, serif" }}>
              {PIECE_NAMES[p]}
            </span>
          </button>
        ))}
      </div>
    </ModalFrame>
  );
}

export function GameOverModal({
  status,
  winner,
  onNewGame,
}: {
  status: GameStatus;
  winner: Color | null;
  onNewGame: () => void;
}) {
  const title = status === "checkmate" ? "Checkmate" : "Stalemate";
  const detail =
    status === "checkmate"
      ? `${winner ? COLOR_NAMES[winner] : ""} wins the game.`
      : "Neither side can move -- the game is a draw.";

  return (
    <ModalFrame>
      <h2
        className="text-2xl uppercase text-center"
        style={{
          color: "#c9a227",
          fontFamily: "Cinzel, serif",
          letterSpacing: "0.15em",
          textShadow: "0 2px 12px rgba(0,0,0,0.8)",
        }}
      >
        {title}
      </h2>
      <p className="text-sm text-center" style={{ color: "rgba(196,169,110,0.85)", fontFamily: "Lora, serif" }}>
        {detail}
      </p>
      <button
        onClick={onNewGame}
        className="mt-1 px-6 py-2 uppercase text-sm cursor-pointer transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #e8c840 0%, #c9a227 100%)",
          color: "#2c1f0a",
          borderRadius: "4px",
          fontFamily: "Cinzel, serif",
          letterSpacing: "0.1em",
          border: "none",
        }}
      >
        New Game
      </button>
    </ModalFrame>
  );
}
