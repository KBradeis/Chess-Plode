// src/components/Board.tsx
//
// The wooden board frame, rank/file labels, and the 8x8 grid of Square
// components. All the "is this move legal" logic lives in src/game.ts --
// this file only turns that data into highlighted squares.

import { useState } from "react";
import Square from "./Square";
import { sameSquare, squareName, findKingSquare } from "../game";
import type { BoardGrid, Square as SquareType, Move, Color } from "../game";

interface BoardProps {
  board: BoardGrid;
  selected: SquareType | null;
  legalDestinations: Move[];
  turn: Color;
  inCheck: boolean;
  onSquareClick: (sq: SquareType) => void;
}

export default function Board({
  board,
  selected,
  legalDestinations,
  turn,
  inCheck,
  onSquareClick,
}: BoardProps) {
  const [hovered, setHovered] = useState<SquareType | null>(null);

  const kingSquare = inCheck ? findKingSquare(board, turn) : null;
  const isLight = (r: number, c: number) => (r + c) % 2 === 0;

  return (
    <div
      className="relative"
      style={{
        padding: "14px",
        background: "linear-gradient(135deg, #2c1f0a 0%, #4a3420 30%, #3a2a14 60%, #2c1f0a 100%)",
        borderRadius: "4px",
        boxShadow:
          "0 0 0 2px #c9a227, 0 0 0 4px #4a3420, 0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,162,39,0.3)",
      }}
    >
      <div
        className="absolute inset-0 rounded pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, rgba(45,90,49,0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(30,60,33,0.25) 0%, transparent 50%)",
        }}
      />

      <div className="absolute left-2 top-[14px] flex flex-col" style={{ height: "calc(100% - 28px)" }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: "rgba(201,162,39,0.6)", fontFamily: "Cinzel, serif", fontSize: "9px" }}
          >
            {8 - i}
          </div>
        ))}
      </div>

      <div className="absolute bottom-2 left-[14px] flex flex-row" style={{ width: "calc(100% - 28px)" }}>
        {["a", "b", "c", "d", "e", "f", "g", "h"].map((f) => (
          <div
            key={f}
            className="flex-1 flex items-center justify-center text-xs"
            style={{ color: "rgba(201,162,39,0.6)", fontFamily: "Cinzel, serif", fontSize: "9px" }}
          >
            {f}
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(8, 1fr)", gap: 0 }}>
        {board.map((row, r) =>
          row.map((piece, c) => {
            const sq: SquareType = { r, c };
            const destinationMove = legalDestinations.find((m) => sameSquare(m.to, sq));
            const isCapture = !!destinationMove && (!!destinationMove.captured || destinationMove.isEnPassant);
            return (
              <Square
                key={`${r}-${c}`}
                piece={piece}
                isLight={isLight(r, c)}
                isSelected={sameSquare(selected, sq)}
                isLegalDestination={!!destinationMove}
                isCapture={isCapture}
                isKingInCheck={!!kingSquare && sameSquare(kingSquare, sq)}
                isHovered={sameSquare(hovered, sq)}
                label={squareName(sq)}
                onClick={() => onSquareClick(sq)}
                onMouseEnter={() => setHovered(sq)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
