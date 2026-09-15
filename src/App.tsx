import { useMemo } from "react";
import type { CSSProperties } from "react";
import Board from "./components/Board";
import { PromotionModal, GameOverModal } from "./components/Modal";
import { useChessGame, COLOR_NAMES } from "./game";

function Leaf({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <div className={`absolute pointer-events-none ${className}`} style={style}>
      <svg viewBox="0 0 80 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M40 5 C20 20, 5 50, 8 80 C11 105, 30 115, 40 118 C50 115, 69 105, 72 80 C75 50, 60 20, 40 5Z"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M40 10 C40 10, 38 50, 40 118"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M40 30 C30 35, 15 40, 10 55" stroke="rgba(0,0,0,0.2)" strokeWidth="1" fill="none" />
        <path d="M40 50 C50 55, 65 58, 70 72" stroke="rgba(0,0,0,0.2)" strokeWidth="1" fill="none" />
        <path d="M40 70 C28 74, 14 76, 10 88" stroke="rgba(0,0,0,0.2)" strokeWidth="1" fill="none" />
      </svg>
    </div>
  );
}

function FernLeaf({ style, className }: { style?: CSSProperties; className?: string }) {
  const fronds = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div className={`absolute pointer-events-none ${className}`} style={style}>
      <svg viewBox="0 0 160 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path d="M80 190 C80 190, 78 100, 80 10" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.7" />
        {fronds.map((i) => {
          const y = 20 + i * 18;
          const side = i % 2 === 0 ? -1 : 1;
          const len = 30 + Math.sin(i * 0.8) * 12;
          return (
            <path
              key={i}
              d={`M80 ${y} Q${80 + side * len * 0.6} ${y - 8}, ${80 + side * len} ${y - 18}`}
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.65"
            />
          );
        })}
      </svg>
    </div>
  );
}

function VineDecor({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={`absolute pointer-events-none ${className}`} style={style}>
      <svg viewBox="0 0 40 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <path
          d="M20 0 C25 30, 15 60, 20 90 C25 120, 15 150, 20 180 C25 210, 15 240, 20 270 C22 285, 20 300, 20 300"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.6"
        />
        {[30, 80, 130, 180, 230].map((y, i) => (
          <ellipse key={i} cx={i % 2 === 0 ? 28 : 12} cy={y} rx="6" ry="4" fill="currentColor" opacity="0.4" transform={`rotate(${i % 2 === 0 ? 20 : -20} ${i % 2 === 0 ? 28 : 12} ${y})`} />
        ))}
      </svg>
    </div>
  );
}

export default function App() {
  const game = useChessGame();

  const winner = game.status === "checkmate" ? (game.turn === "w" ? "b" : "w") : null;

  const statusText = useMemo(() => {
    if (game.status === "checkmate" && winner) return `Checkmate — ${COLOR_NAMES[winner]} wins`;
    if (game.status === "stalemate") return "Stalemate — draw";
    if (game.inCheck) return `${COLOR_NAMES[game.turn]} is in check`;
    return `${COLOR_NAMES[game.turn]} to move`;
  }, [game.status, game.turn, game.inCheck, winner]);

  const statusIsUrgent = game.inCheck || game.status !== "ongoing";

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, #050e06 0%, #0d1f0e 40%, #1a3a1c 100%)" }}>

      {/* Background jungle photo with heavy overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1470058869958-2a77ade41c02?w=1600&h=900&fit=crop&auto=format"
          alt="Lush jungle canopy background"
          className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(5,14,6,0.7) 0%, rgba(13,31,14,0.5) 50%, rgba(5,14,6,0.85) 100%)" }} />
      </div>

      {/* Dappled light rays */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" style={{ animation: "dapple 8s ease-in-out infinite" }}>
        {[
          { left: "15%", width: "80px", height: "60%", top: "0", rotate: "12deg", opacity: 0.06 },
          { left: "35%", width: "50px", height: "45%", top: "0", rotate: "-5deg", opacity: 0.05 },
          { left: "60%", width: "90px", height: "70%", top: "0", rotate: "8deg", opacity: 0.07 },
          { left: "78%", width: "60px", height: "50%", top: "0", rotate: "-15deg", opacity: 0.05 },
        ].map((ray, i) => (
          <div key={i} className="absolute" style={{
            left: ray.left, top: ray.top, width: ray.width, height: ray.height,
            background: `linear-gradient(180deg, rgba(255,240,180,${ray.opacity * 2}) 0%, rgba(255,240,180,${ray.opacity}) 60%, transparent 100%)`,
            transform: `rotate(${ray.rotate})`,
            transformOrigin: "top center",
          }} />
        ))}
      </div>

      {/* Far-back foliage layer */}
      <div className="absolute inset-0 z-1 pointer-events-none">
        <Leaf className="text-[#1a4020]" style={{ top: "-2%", left: "-3%", width: "22vw", height: "30vh", animation: "sway-slow 9s ease-in-out infinite", transformOrigin: "bottom center" }} />
        <Leaf className="text-[#1e4a24]" style={{ top: "-5%", right: "-4%", width: "25vw", height: "35vh", animation: "sway-slow 11s ease-in-out infinite reverse", transformOrigin: "bottom right" }} />
        <FernLeaf className="text-[#173d1b]" style={{ top: "5%", left: "5%", width: "14vw", height: "22vh", animation: "sway 13s ease-in-out infinite", transformOrigin: "bottom center" }} />
        <FernLeaf className="text-[#1a4220]" style={{ top: "0%", right: "8%", width: "12vw", height: "20vh", animation: "sway 10s ease-in-out infinite reverse", transformOrigin: "bottom center" }} />
      </div>

      {/* Mid foliage — sides */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Left side leaves */}
        <Leaf className="text-[#2d6b35]" style={{ top: "10%", left: "-5%", width: "20vw", height: "28vh", animation: "sway 7s ease-in-out infinite", transformOrigin: "bottom left" }} />
        <Leaf className="text-[#265e2e]" style={{ top: "35%", left: "-8%", width: "24vw", height: "26vh", animation: "sway 9s ease-in-out infinite 1s", transformOrigin: "bottom left" }} />
        <Leaf className="text-[#22552a]" style={{ top: "58%", left: "-4%", width: "18vw", height: "24vh", animation: "sway 8s ease-in-out infinite 0.5s", transformOrigin: "bottom left" }} />
        <Leaf className="text-[#30703a]" style={{ bottom: "-5%", left: "5%", width: "22vw", height: "28vh", animation: "sway-slow 12s ease-in-out infinite", transformOrigin: "top center" }} />

        {/* Right side leaves */}
        <Leaf className="text-[#2d6b35]" style={{ top: "8%", right: "-5%", width: "22vw", height: "30vh", animation: "sway 8s ease-in-out infinite reverse", transformOrigin: "bottom right" }} />
        <Leaf className="text-[#265e2e]" style={{ top: "32%", right: "-8%", width: "26vw", height: "28vh", animation: "sway 10s ease-in-out infinite 2s reverse", transformOrigin: "bottom right" }} />
        <Leaf className="text-[#22552a]" style={{ bottom: "10%", right: "-5%", width: "20vw", height: "26vh", animation: "sway 7s ease-in-out infinite 1.5s reverse", transformOrigin: "bottom right" }} />
        <Leaf className="text-[#30703a]" style={{ bottom: "-5%", right: "8%", width: "24vw", height: "30vh", animation: "sway-slow 11s ease-in-out infinite reverse", transformOrigin: "top center" }} />

        {/* Ferns */}
        <FernLeaf className="text-[#2d6b35]" style={{ top: "15%", left: "8%", width: "10vw", height: "18vh", animation: "sway 6s ease-in-out infinite 0.3s", transformOrigin: "bottom center" }} />
        <FernLeaf className="text-[#265e2e]" style={{ top: "12%", right: "10%", width: "9vw", height: "16vh", animation: "sway 7s ease-in-out infinite reverse", transformOrigin: "bottom center" }} />
        <FernLeaf className="text-[#30703a]" style={{ bottom: "5%", left: "18%", width: "11vw", height: "20vh", animation: "sway 8s ease-in-out infinite 1s", transformOrigin: "bottom center" }} />
        <FernLeaf className="text-[#2a6330]" style={{ bottom: "3%", right: "20%", width: "10vw", height: "18vh", animation: "sway 9s ease-in-out infinite 0.7s reverse", transformOrigin: "bottom center" }} />

        {/* Vines */}
        <VineDecor className="text-[#2d5a31]" style={{ top: 0, left: "12%", width: "3vw", height: "50vh", animation: "sway-slow 14s ease-in-out infinite" }} />
        <VineDecor className="text-[#265228]" style={{ top: 0, right: "15%", width: "3vw", height: "55vh", animation: "sway-slow 12s ease-in-out infinite reverse" }} />
      </div>

      {/* Ground mist */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: "25%", animation: "fog-drift 16s ease-in-out infinite", background: "linear-gradient(180deg, transparent 0%, rgba(30,80,35,0.15) 60%, rgba(13,40,14,0.35) 100%)" }} />

      {/* Chess board area */}
      <div className="relative z-20 flex flex-col items-center gap-4">
        {/* Board title */}
        <div className="text-center mb-1">
          <h1
            className="text-2xl font-semibold uppercase"
            style={{ color: "#c9a227", textShadow: "0 2px 12px rgba(0,0,0,0.8), 0 0 30px rgba(201,162,39,0.3)", fontFamily: "Cinzel, serif", letterSpacing: "0.2em" }}>
            Jungle Chess
          </h1>
          <p className="text-xs mt-1" style={{ color: "rgba(196,169,110,0.6)", fontFamily: "Lora, serif", letterSpacing: "0.1em" }}>
            Deep in the canopy, the game begins
          </p>
        </div>

        <Board
          board={game.position.board}
          selected={game.selected}
          legalDestinations={game.legalDestinations}
          turn={game.turn}
          inCheck={game.inCheck}
          onSquareClick={game.selectSquare}
        />

        {/* Status bar */}
        <div className="flex items-center gap-4 h-6">
          <p style={{
            color: statusIsUrgent ? "#e8734a" : "rgba(201,162,39,0.8)",
            fontFamily: "Lora, serif",
            fontStyle: "italic",
            fontSize: "13px",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}>
            {statusText}
          </p>
          <button
            onClick={game.resetGame}
            className="cursor-pointer transition-transform hover:scale-105"
            style={{
              background: "transparent",
              border: "1px solid rgba(201,162,39,0.6)",
              color: "rgba(201,162,39,0.9)",
              borderRadius: "3px",
              padding: "2px 10px",
              fontFamily: "Cinzel, serif",
              fontSize: "10px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            New Game
          </button>
        </div>
      </div>

      {/* Foreground large leaves — over board edges */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        <Leaf className="text-[#3d7a45]" style={{ bottom: "-8%", left: "-2%", width: "28vw", height: "38vh", animation: "sway 6s ease-in-out infinite", transformOrigin: "bottom left" }} />
        <Leaf className="text-[#357040]" style={{ bottom: "-10%", right: "-3%", width: "30vw", height: "40vh", animation: "sway 7s ease-in-out infinite 1s reverse", transformOrigin: "bottom right" }} />
        <Leaf className="text-[#4a8c50]" style={{ top: "-3%", left: "5%", width: "16vw", height: "22vh", animation: "sway 8s ease-in-out infinite 0.5s", transformOrigin: "top center" }} />
        <Leaf className="text-[#3d7a45]" style={{ top: "-5%", right: "8%", width: "18vw", height: "25vh", animation: "sway 9s ease-in-out infinite 2s reverse", transformOrigin: "top center" }} />
        {/* Corner giant leaves */}
        <Leaf className="text-[#2d6b35]" style={{ top: "25%", left: "-6%", width: "20vw", height: "28vh", animation: "sway 10s ease-in-out infinite 1s", transformOrigin: "bottom left", opacity: 0.9 }} />
        <Leaf className="text-[#2d6b35]" style={{ top: "22%", right: "-6%", width: "20vw", height: "26vh", animation: "sway 11s ease-in-out infinite 0.8s reverse", transformOrigin: "bottom right", opacity: 0.9 }} />
      </div>

      {/* Firefly particles */}
      <div className="absolute inset-0 z-25 pointer-events-none">
        {[
          { x: "20%", y: "30%", delay: "0s" },
          { x: "75%", y: "25%", delay: "1.5s" },
          { x: "15%", y: "65%", delay: "3s" },
          { x: "85%", y: "55%", delay: "0.8s" },
          { x: "45%", y: "80%", delay: "2.2s" },
          { x: "60%", y: "15%", delay: "4s" },
        ].map((ff, i) => (
          <div key={i} className="absolute rounded-full" style={{
            left: ff.x, top: ff.y,
            width: "4px", height: "4px",
            background: "#c9e850",
            boxShadow: "0 0 6px 2px rgba(180,220,40,0.6)",
            animation: `dapple ${3 + i * 0.7}s ease-in-out infinite ${ff.delay}`,
          }} />
        ))}
      </div>

      {game.pendingPromotion && (
        <PromotionModal
          pending={game.pendingPromotion}
          onChoose={game.choosePromotion}
          onCancel={game.cancelPromotion}
        />
      )}

      {game.status !== "ongoing" && (
        <GameOverModal status={game.status} winner={winner} onNewGame={game.resetGame} />
      )}
    </div>
  );
}
