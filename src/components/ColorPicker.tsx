// src/components/ColorPicker.tsx
//
// Shown once, before a Vs Computer game starts: the player picks White or
// Black, and the computer takes the other side. Styled to match the same
// wood-and-gold frame used everywhere else (Board.tsx, Modal.tsx) so it
// reads as part of one design system rather than a bolted-on screen.

import { COLOR_NAMES, PIECE_SYMBOLS } from "../game";
import type { Color } from "../game";

const CHOICES: Color[] = ["w", "b"];

export default function ColorPicker({ onChoose }: { onChoose: (color: Color) => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center mb-1">
        <h1
          className="text-2xl font-semibold uppercase"
          style={{
            color: "#c9a227",
            textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(201,162,39,0.3)",
            fontFamily: "Cinzel, serif",
            letterSpacing: "0.2em",
          }}
        >
          Choose Your Side
        </h1>
        <p
          className="text-xs mt-1"
          style={{ color: "rgba(196,169,110,0.6)", fontFamily: "Lora, serif", letterSpacing: "0.1em" }}
        >
          The computer plays whichever color you don&rsquo;t
        </p>
      </div>

      <div className="flex gap-6">
        {CHOICES.map((color) => (
          <button
            key={color}
            onClick={() => onChoose(color)}
            className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-105"
            style={{
              width: "140px",
              height: "160px",
              background: "linear-gradient(135deg, #2c1f0a 0%, #4a3420 30%, #3a2a14 60%, #2c1f0a 100%)",
              borderRadius: "6px",
              boxShadow: "0 0 0 2px #c9a227, 0 0 0 4px #4a3420, 0 12px 30px rgba(0,0,0,0.7)",
            }}
          >
            <span
              style={{
                fontSize: "64px",
                lineHeight: 1,
                color: color === "w" ? "#f5efe0" : "#1a1008",
                textShadow:
                  color === "w"
                    ? "0 2px 6px rgba(0,0,0,0.7), 0 0 12px rgba(255,240,180,0.3)"
                    : "0 2px 4px rgba(0,0,0,0.9)",
              }}
            >
              {PIECE_SYMBOLS[color].K}
            </span>
            <span
              style={{
                color: "#c9a227",
                fontFamily: "Cinzel, serif",
                fontSize: "13px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {COLOR_NAMES[color]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
