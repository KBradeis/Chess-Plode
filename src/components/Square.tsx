// src/components/Square.tsx
//
// One square of the board: background, texture, legal-move / capture /
// check highlighting, and the piece glyph. Purely presentational -- every
// bit of "is this legal" it displays is handed to it as a prop by Board.tsx,
// which gets it from the game state in src/game.ts.

import type { CSSProperties } from "react";
import { PIECE_SYMBOLS, type Piece } from "../game";

interface SquareProps {
  piece: Piece | null;
  isLight: boolean;
  isSelected: boolean;
  isLegalDestination: boolean;
  isCapture: boolean;
  isKingInCheck: boolean;
  isHovered: boolean;
  label: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export default function Square({
  piece,
  isLight,
  isSelected,
  isLegalDestination,
  isCapture,
  isKingInCheck,
  isHovered,
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SquareProps) {
  const baseLight = "linear-gradient(135deg, #c4a96e 0%, #a8904f 50%, #c4a96e 100%)";
  const baseDark = "linear-gradient(135deg, #2c2416 0%, #1e3320 50%, #2c2416 100%)";

  let background: string;
  if (isKingInCheck) {
    background = "linear-gradient(135deg, #c94a38 0%, #7a1f18 100%)";
  } else if (isSelected) {
    background = isLight
      ? "linear-gradient(135deg, #e8c840 0%, #c9a227 100%)"
      : "linear-gradient(135deg, #4a8c50 0%, #2d6b35 100%)";
  } else if (isHovered) {
    background = isLight
      ? "linear-gradient(135deg, #d4ba7e 0%, #bfa45f 100%)"
      : "linear-gradient(135deg, #3d6b42 0%, #2a5230 100%)";
  } else {
    background = isLight ? baseLight : baseDark;
  }

  const style: CSSProperties = {
    width: "clamp(48px, 7vw, 72px)",
    height: "clamp(48px, 7vw, 72px)",
    background,
    boxShadow: isKingInCheck
      ? "inset 0 0 0 2px rgba(255,120,90,0.95)"
      : isSelected
        ? "inset 0 0 0 2px rgba(201,162,39,0.8)"
        : undefined,
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative cursor-pointer transition-all duration-150"
      style={style}
      role="button"
      aria-label={piece ? `${label}, ${piece.color === "w" ? "White" : "Black"} ${piece.type}` : label}
    >
      {!isLight && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 40%, rgba(77,140,80,0.4) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(45,90,49,0.3) 0%, transparent 35%)",
          }}
        />
      )}
      {isLight && (
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(88deg, transparent 0px, transparent 3px, rgba(100,60,10,0.4) 3px, rgba(100,60,10,0.4) 4px)",
          }}
        />
      )}

      {isLegalDestination && !isCapture && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full"
            style={{
              width: "28%",
              height: "28%",
              background: "rgba(240,192,64,0.55)",
              boxShadow: "0 0 8px rgba(240,192,64,0.5)",
            }}
          />
        </div>
      )}

      {isLegalDestination && isCapture && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 3px rgba(240,192,64,0.8)" }}
        />
      )}

      {piece && (
        <div
          className="absolute inset-0 flex items-center justify-center select-none"
          style={{ animation: isSelected ? "piece-float 2s ease-in-out infinite" : undefined }}
        >
          <span
            style={{
              fontSize: "clamp(22px, 3.5vw, 40px)",
              lineHeight: 1,
              color: piece.color === "w" ? "#f5efe0" : "#1a1008",
              textShadow:
                piece.color === "w"
                  ? "0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(255,240,180,0.3)"
                  : "0 1px 2px rgba(0,0,0,0.9), 0 -1px 0 rgba(100,60,0,0.5)",
              filter: isSelected ? "drop-shadow(0 0 6px rgba(201,162,39,0.8))" : undefined,
            }}
          >
            {PIECE_SYMBOLS[piece.color][piece.type]}
          </span>
        </div>
      )}
    </div>
  );
}
