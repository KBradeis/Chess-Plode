# Chess Plode — Feature Roadmap / Workplan

Every feature below is a checkbox task. Each one lists what it **depends on** (must be finished first), which **files** it touches, and its **definition of done** — the specific, checkable thing that proves it's actually finished, not just "started." Terms are explained in `ProductSpec.md`; this document is the build order, not the explanation.

Build order, top to bottom: the rules engine and its test (nothing else can safely start before this), then hot-seat working and live on the internet, then the computer opponent, then online rooms, then the one optional extra. This matches the priority set for this project.

**Project layout** (set up in 0.1): `rules.js` and `ai.js` live at the project root — the one place every part of the app imports them from, client and server alike. `src/` is the Vite/React front-end (components, styles, the app shell) — this is where the Figma Make-generated board lives and where every other screen gets built to match it. `worker/` is the server-side Durable Object code for online rooms (Phase 3) — kept separate from `src/` on purpose, since it runs on Cloudflare's servers, not in the browser, and Vite doesn't need to bundle it.

When you tell me which task to start on, I'll create a branch for it, do the work, commit, push, and open a pull request against `main` for you to review — never force-pushing, and never skipping the perft test in Phase 0.

---

## Phase 0 — Foundations (blocks every other phase)

### [x] 0.1 — Project scaffold
- **Depends on:** nothing (first task)
- **Files:** `wrangler.jsonc`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.figma/make/site.json`, `.gitignore`
- **Definition of done:** `npm run dev` runs the Vite dev server locally and shows the Figma Make-generated jungle chessboard (adopted as-is at this stage — no wiring to real game state yet); `npm run build` produces a `dist/` folder; `wrangler.jsonc` has `compatibility_date` set to the day this task is done, `observability` enabled, and the `assets` config pointing at `dist/` with `not_found_handling: "single-page-application"`.
- **Note:** this project's front-end is React 19 + TypeScript + Tailwind CSS v4 via Vite 8, generated first by Figma Make (see `ProductSpec.md` §4–§5.4) — a deliberate change from the original plain-HTML plan. `rules.js` and the Durable Object logic are unaffected: still hand-written, framework-free JavaScript.
- **Status: DONE.** `npm install` succeeded, `npm run deploy:cf` (`vite build && wrangler deploy`) built and published it — live at **https://chess-plode.aydink.workers.dev** on 2026-09-15. Shows the Figma Make jungle chessboard; no real moves yet (that's 1.1).

### [x] 0.2 — Rules engine: move generation
- **Depends on:** 0.1
- **Files:** `rules.js`
- **Definition of done:** `rules.js` can, for any position, list every legal move for the side to move, for all six piece types, correctly handling check (you may not make a move that leaves your own king in check), castling rights, en passant eligibility, and promotion. No other file in the project is allowed to independently decide whether a move is legal — everything else calls into this file.
- **Status: DONE.** `rules.js` written from scratch (no chess library) covering all six piece types, check/checkmate/stalemate detection, castling (including "can't castle through/out of check"), en passant, and promotion (as 4 distinct moves per pawn reaching the last rank). Verified correct by the perft test in 0.3.

### [x] 0.3 — Rules engine: perft test
- **Depends on:** 0.2
- **Files:** `rules.test.js` (or equivalent test/perft script)
- **Definition of done:** running the perft test from the standard starting position reports exactly 20 legal move sequences at depth 1, 400 at depth 2, and 8,902 at depth 3. **This must pass before any task in Phase 1 or later begins.** If the numbers don't match, this task isn't done — fix `rules.js`, don't move on.
- **Status: DONE.** `node rules.test.js` (also runnable as `npm test`) reports perft(1)=20, perft(2)=400, perft(3)=8902 — exact match on all three, confirmed 2026-09-15. The rules engine is verified correct; Phase 1 can begin.

---

## Phase 1 — Hot-Seat, live on the internet

### [x] 1.1 — Board & piece rendering (adapt the Figma Make board)
- **Depends on:** 0.3
- **Files:** `src/App.tsx`, `src/components/Board.tsx`, `src/components/Square.tsx`, `src/index.css`
- **Definition of done:** the Figma Make-generated board (currently a self-contained visual demo with its own fake `selected`/`hovered` state) is split into real `Board`/`Square` components and wired to actual board data instead of the hardcoded starting position; clicking/tapping a piece highlights its legal destination squares (from `rules.js`), and clicking a highlighted square moves the piece there. Visual style (colors, fonts, decorative foliage) carries over unchanged from the Figma Make source per `ProductSpec.md` §4.
- **Status: DONE.** Split into `src/components/Board.tsx` (frame, rank/file labels, the 8x8 grid) and `src/components/Square.tsx` (one square's background, texture, and piece glyph). Both are wired to real state via `src/game.ts` — no more hardcoded starting position or fake selection.

### [x] 1.2 — Turn-taking & full move legality
- **Depends on:** 1.1
- **Files:** `src/App.tsx`, `src/game.ts`
- **Definition of done:** two players can complete an entire game on one device, alternating turns automatically; every illegal move is genuinely impossible to attempt (not just blocked with an error message after the fact) — this includes castling and en passant appearing as legal options only exactly when the rules allow them.
- **Status: DONE.** `src/game.ts`'s `useChessGame()` hook is the only place the UI touches game state; it asks `rules.js`'s `getLegalMoves()` for every legal destination of the selected piece and only those squares are clickable/highlighted — an illegal square is never a valid click target, not just one that shows an error. Turn alternates automatically after every move (`makeMove()`'s returned position flips `turn`). Castling and en passant appear exactly when `rules.js` says they're legal, since nothing else decides that.

### [x] 1.3 — End states & promotion UI
- **Depends on:** 1.2
- **Files:** `src/game.ts`, `src/components/Modal.tsx`, `src/App.tsx`
- **Definition of done:** check is visually indicated; checkmate and stalemate both end the game with a clear on-screen message naming the result; when a pawn reaches the last rank, a piece-choice prompt (styled consistently with the rest of the jungle theme) appears and the game correctly continues with whichever piece (queen, rook, bishop, or knight) the player picks.
- **Status: DONE.** The king's square glows red when `rules.js`'s `isInCheck()` is true, and the status line names it ("White is in check"). `getGameStatus()` returning `"checkmate"`/`"stalemate"` opens a jungle-styled `GameOverModal` naming the winner (or the draw) with a "New Game" button. A pawn move that reaches the last rank opens `PromotionModal` with the four legal promotion choices `rules.js` actually generated for that move; picking one applies it and play continues normally.

### [x] 1.4 — Deploy to Cloudflare Workers
- **Depends on:** 1.3
- **Files:** `wrangler.jsonc` (deploy config only — no logic changes)
- **Definition of done:** `npm run build` followed by `wrangler deploy` publishes the site to a public `*.workers.dev` URL on the Cloudflare Free plan, and hot-seat mode works there exactly as it does locally.
- **Status: DONE.** `npm run deploy:cf` published the wired-up board to **https://chess-plode.aydink.workers.dev** on 2026-09-15. Confirmed live and matching local behavior in 1.5.

### [x] 1.5 — Live smoke test
- **Depends on:** 1.4
- **Files:** none (manual verification)
- **Definition of done:** two people play a full hot-seat game start-to-finish on the live URL, on a device other than the one it was built on, with no illegal move possible and no console errors.
- **Status: DONE (automated pass).** Played a full game start-to-finish on the live URL (Fool's Mate: 1. f3 e5 2. g4 Qh4#) -- king-in-check highlighting appeared, checkmate was detected correctly, the "Black wins" modal displayed, and "New Game" reset the board cleanly. Also confirmed a black piece can't be selected on White's turn. Zero console errors throughout. Caveat: this pass was one browser acting as both players, not two people on two separate physical devices as written above -- worth a quick real two-device check with a friend when convenient, but nothing in this pass suggested a problem.

---

## Phase 2 — Vs Computer

### [ ] 2.1 — Position evaluation
- **Depends on:** 1.5
- **Files:** `ai.js`
- **Definition of done:** given any board position, `ai.js` returns a numeric score reflecting material balance (and basic positional factors) from the perspective of the side to move, using only data/functions already exposed by `rules.js`.

### [ ] 2.2 — Minimax with alpha-beta pruning, depth 2
- **Depends on:** 2.1
- **Files:** `ai.js`
- **Definition of done:** given any legal position, the AI returns a single legal move chosen by minimax search with alpha-beta pruning at search depth 2 (two half-moves deep), calling `rules.js` for legal-move generation rather than reimplementing any chess logic.

### [ ] 2.3 — Speed guard (2-second budget)
- **Depends on:** 2.2
- **Files:** `ai.js`
- **Definition of done:** across a range of test positions (including unusually "open" ones with many legal moves), the AI always returns a move within 2 seconds; if any position is found that risks exceeding that, a fallback (e.g., narrowing the search for that move only) keeps it under budget without ever returning an illegal or missing move.

### [ ] 2.4 — Color choice & game wiring
- **Depends on:** 2.3
- **Files:** `src/components/ColorPicker.tsx`, `src/App.tsx`
- **Definition of done:** before a Vs Computer game starts, the player picks White or Black in a screen styled to match the Figma Make design system (§4); the computer automatically plays the other side and responds after every human move using 2.2/2.3's logic; all of Phase 1's end-state handling (check, checkmate, stalemate, promotion) works identically in this mode.

### [ ] 2.5 — Deploy & verify
- **Depends on:** 2.4
- **Files:** none (deployment only)
- **Definition of done:** Vs Computer mode works on the live Cloudflare URL exactly as it does locally, for both color choices.

---

## Phase 3 — Online rooms

### [ ] 3.1 — Durable Object room class
- **Depends on:** 2.5
- **Files:** `worker/room.js`, `wrangler.jsonc`
- **Definition of done:** a `Room` Durable Object class exists, is SQLite-backed (`new_sqlite_classes` in `wrangler.jsonc`), and is reachable via `env.ROOM.getByName(roomCode)`; the class can store and return "the current game state" for its room. `wrangler.jsonc` gains a `main` entry point for the first time (pointing at the Worker script that hosts this class) — everything before this task was static assets only.

### [ ] 3.2 — WebSocket routing
- **Depends on:** 3.1
- **Files:** `wrangler.jsonc`, `worker/room.js`
- **Definition of done:** `wrangler.jsonc` routes the WebSocket path through `run_worker_first` (so it always reaches the Worker instead of being treated as a missing static file); the Durable Object accepts incoming connections via `ctx.acceptWebSocket()` — no Socket.IO, Express, or `ws` package anywhere in the project.

### [ ] 3.3 — Player identity & seat assignment
- **Depends on:** 3.2
- **Files:** `worker/room.js`
- **Definition of done:** the first connection to a room is assigned White, the second is assigned Black, and any further connections are spectators; each connection's role is stored on the connection itself via `ws.serializeAttachment()`, and a spectator's move attempts are rejected server-side (not just hidden client-side).

### [ ] 3.4 — Move protocol & server-side legality
- **Depends on:** 3.3
- **Files:** `worker/room.js`
- **Definition of done:** every message sent over the socket, either direction, is JSON with a `type` and `payload`; when a player sends a move, the Durable Object validates it against `rules.js` (imported server-side, straight from the project root) before accepting it, updates the authoritative position, and broadcasts the new state to every connection in that room — a client cannot make a move "happen" just by claiming it did.

### [ ] 3.5 — Save after every move (no timers)
- **Depends on:** 3.4
- **Files:** `worker/room.js`
- **Definition of done:** the position is written to the Durable Object's SQLite storage synchronously immediately after every accepted move — nothing in the project runs on an interval or a timer; killing the Durable Object process immediately after a move and reconnecting shows that move as saved.

### [ ] 3.6 — Reconnect & New Game
- **Depends on:** 3.5
- **Files:** `worker/room.js`, `src/components/Online.tsx`
- **Definition of done:** refreshing the page (or reopening the tab) and re-entering the same room code reconnects to the same game in the same seat with the current position intact; a "New game" action resets the board to the starting position for both players' views at once.

### [ ] 3.7 — Online mode UI
- **Depends on:** 3.6
- **Files:** `src/components/Online.tsx`, `src/App.tsx`
- **Definition of done:** a room-code entry screen (styled per `ProductSpec.md` §4) lets a player type or share a code; a "waiting for opponent" state shows while only one seat is filled; once both seats are filled, moves made on either device appear on the other device without a manual refresh.

### [ ] 3.8 — Deploy & two-device smoke test
- **Depends on:** 3.7
- **Files:** none (deployment + manual verification)
- **Definition of done:** two different physical devices, both on the live Cloudflare URL, enter the same room code and play a full game against each other with moves syncing live; refreshing one device mid-game does not lose the game or swap seats.

---

## Phase 4 — Optional extra: captured pieces + material count

### [ ] 4.1 — Track captures
- **Depends on:** 3.8
- **Files:** `rules.js` (or a thin wrapper that observes it), `src/game.ts`
- **Definition of done:** for any in-progress game (any mode), the list of pieces each side has captured so far, plus the resulting material-point difference (pawn=1, knight/bishop=3, rook=5, queen=9), can be read out at any time and stays correct through castling, en passant, and promotion.

### [ ] 4.2 — Captured-pieces UI
- **Depends on:** 4.1
- **Files:** `src/components/CapturedPieces.tsx`, `src/App.tsx`
- **Definition of done:** each side's captured pieces are displayed next to the board (styled per §4, consistent with the rest of the UI) alongside a material-difference indicator (e.g., "+3"), updating live, present in all three modes.

### [ ] 4.3 — Final deploy
- **Depends on:** 4.2
- **Files:** none (deployment only)
- **Definition of done:** the captured-pieces feature is live on the production Cloudflare URL in all three modes, and this is the final planned feature for the project as scoped.

---

## How we'll work through this

For each task: I'll create a branch, implement it, commit with a message describing what changed, push the branch, and open a pull request against `main` for you to look at — I won't force-push, and Phase 0's perft test (0.3) is a hard gate before anything in Phase 1 starts. Tell me which task number to start with.
